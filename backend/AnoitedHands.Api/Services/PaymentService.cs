using System.Text.RegularExpressions;
using AnoitedHands.Api.Data;
using AnoitedHands.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Services;

public static class PaymentActions
{
    public const string DepositPaid = "Deposit paid";
    public const string PaidInFull = "Paid in full";
    public const string OrderPaid = "Order paid";
    public const string Underpaid = "Amount too low";
    public const string AlreadyPaid = "Already paid";
    public const string NeedsReview = "Needs review";
    public const string Duplicate = "Already recorded";
    public const string NotFound = "No matching booking or order";
}

/// <summary>What happened (or would happen, in a preview) when a payment was matched.</summary>
public class PaymentOutcome
{
    public string Reference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Type { get; set; } // Booking / Order
    public int? TargetId { get; set; }
    public string? Customer { get; set; }
    public string Action { get; set; } = PaymentActions.NotFound;
    public string Message { get; set; } = string.Empty;
    /// <summary>True when the booking/order was (or would be) updated.</summary>
    public bool Applied { get; set; }
}

/// <summary>Kind of payment PayFast collects for a reference, and how much.</summary>
public record PayableItem(string Reference, string Type, int Id, string Kind, decimal Amount, string Description, string CustomerName, string? CustomerEmail);

public interface IPaymentService
{
    /// <summary>Applies money received against a reference. With <paramref name="dryRun"/> nothing is saved.</summary>
    Task<PaymentOutcome> ApplyAsync(string reference, decimal amount, string provider, string? transactionId, DateTime paidAt, bool dryRun = false, string? notes = null);
    /// <summary>What is currently owed for a reference (deposit, balance or café order), or null if nothing.</summary>
    Task<PayableItem?> GetPayableAsync(string reference);
    /// <summary>Public, minimal payment status for a reference.</summary>
    Task<object?> GetStatusAsync(string reference);
    Task<List<Payment>> RecentAsync(int count);
}

public class PaymentService : IPaymentService
{
    private static readonly Regex RefPattern = new(@"\bA\s*H\s*[-\s]?\s*([BC])\s*-?\s*(\d{5})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly AnoitedHandsDbContext _context;
    private readonly IBookingService _bookings;
    private readonly IOrderService _orders;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(AnoitedHandsDbContext context, IBookingService bookings, IOrderService orders, ILogger<PaymentService> logger)
    {
        _context = context;
        _bookings = bookings;
        _orders = orders;
        _logger = logger;
    }

    /// <summary>Finds a payment reference like "AH-B12345" in free text ("AHB12345", "ah b 12345" …) and normalises it.</summary>
    public static string? FindReference(string text)
    {
        var m = RefPattern.Match(text ?? "");
        return m.Success ? $"AH-{m.Groups[1].Value.ToUpperInvariant()}{m.Groups[2].Value}" : null;
    }

    public async Task<PayableItem?> GetPayableAsync(string reference)
    {
        var refNorm = FindReference(reference);
        if (refNorm == null) return null;

        var booking = await _context.Bookings.Include(b => b.Service).FirstOrDefaultAsync(b => b.PaymentReference == refNorm);
        if (booking != null)
        {
            if (booking.IsPaid || booking.Status == BookingStatuses.Cancelled || booking.Status == BookingStatuses.NoShow) return null;
            if (booking.Status == BookingStatuses.Expired) return null; // slot released – client must book again
            var service = booking.Service?.Name ?? "Salon booking";
            if (booking.DepositPaidAt == null && booking.DepositAmount > 0)
                return new PayableItem(refNorm, "Booking", booking.Id, "deposit", booking.DepositAmount,
                    $"Deposit: {service} {booking.BookingDateTime:d MMM HH:mm}", booking.CustomerName, booking.CustomerEmail);
            var balance = booking.Price - booking.AmountPaid;
            return balance > 0
                ? new PayableItem(refNorm, "Booking", booking.Id, "balance", balance,
                    $"Balance: {service} {booking.BookingDateTime:d MMM HH:mm}", booking.CustomerName, booking.CustomerEmail)
                : null;
        }

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.PaymentReference == refNorm);
        if (order != null && !order.IsPaid && order.Status != "Cancelled")
            return new PayableItem(refNorm, "Order", order.Id, "order", order.TotalAmount, $"Café order {order.OrderNumber}", order.CustomerName, null);
        return null;
    }

    public async Task<object?> GetStatusAsync(string reference)
    {
        var refNorm = FindReference(reference);
        if (refNorm == null) return null;
        var b = await _context.Bookings.FirstOrDefaultAsync(x => x.PaymentReference == refNorm);
        if (b != null)
            return new { reference = refNorm, type = "Booking", status = b.Status, depositPaid = b.DepositPaidAt != null, paidInFull = b.IsPaid };
        var o = await _context.Orders.FirstOrDefaultAsync(x => x.PaymentReference == refNorm);
        if (o != null)
            return new { reference = refNorm, type = "Order", status = o.Status, depositPaid = o.IsPaid, paidInFull = o.IsPaid };
        return null;
    }

    public Task<List<Payment>> RecentAsync(int count) =>
        _context.Payments.OrderByDescending(p => p.CreatedAt).Take(count).ToListAsync();

    public async Task<PaymentOutcome> ApplyAsync(string reference, decimal amount, string provider, string? transactionId, DateTime paidAt, bool dryRun = false, string? notes = null)
    {
        var outcome = new PaymentOutcome { Reference = FindReference(reference) ?? reference, Amount = amount };
        const decimal tolerance = 0.01m;

        if (amount <= 0)
        {
            outcome.Action = PaymentActions.NeedsReview;
            outcome.Message = "Not a payment into the account.";
            return outcome;
        }

        if (!string.IsNullOrEmpty(transactionId) &&
            await _context.Payments.AnyAsync(p => p.Provider == provider && p.ProviderTransactionId == transactionId))
        {
            outcome.Action = PaymentActions.Duplicate;
            outcome.Message = "This payment was already recorded.";
            return outcome;
        }

        var booking = await _context.Bookings.Include(b => b.Service).FirstOrDefaultAsync(b => b.PaymentReference == outcome.Reference);
        if (booking != null)
        {
            outcome.Type = "Booking";
            outcome.TargetId = booking.Id;
            outcome.Customer = booking.CustomerName;
            var total = booking.AmountPaid + amount;

            if (booking.IsPaid)
            {
                outcome.Action = PaymentActions.AlreadyPaid;
                outcome.Message = $"Booking is already paid in full – R{amount:0.00} may need refunding.";
            }
            else if (booking.Status == BookingStatuses.Cancelled)
            {
                outcome.Action = PaymentActions.NeedsReview;
                outcome.Message = "Booking was cancelled – this payment should be refunded.";
                if (!dryRun)
                {
                    booking.AmountPaid = total;
                    booking.RefundStatus = RefundStatuses.Due;
                }
            }
            else if (total >= booking.Price - tolerance)
            {
                outcome.Action = PaymentActions.PaidInFull;
                outcome.Applied = true;
                outcome.Message = $"{booking.Service?.Name} on {booking.BookingDateTime:d MMM HH:mm} is paid in full.";
                if (!dryRun) await _bookings.MarkBookingAsPaidAsync(booking.Id, "");
            }
            else if (total >= booking.DepositAmount - tolerance)
            {
                outcome.Action = booking.DepositPaidAt == null ? PaymentActions.DepositPaid : PaymentActions.NeedsReview;
                outcome.Applied = true;
                outcome.Message = booking.DepositPaidAt == null
                    ? $"Deposit received – {booking.Service?.Name} on {booking.BookingDateTime:d MMM HH:mm} is secured."
                    : $"Part of the balance received (R{booking.Price - total:0.00} still owing).";
                if (!dryRun)
                {
                    // Same DbContext: the booking services update this tracked entity directly
                    await _bookings.MarkDepositPaidAsync(booking.Id);
                    booking.AmountPaid = total;
                }
            }
            else
            {
                outcome.Action = PaymentActions.Underpaid;
                outcome.Message = $"Received R{total:0.00} of the R{booking.DepositAmount:0.00} deposit.";
                if (!dryRun) booking.AmountPaid = total;
            }

            if (!dryRun)
            {
                // A late deposit for a released booking re-secures it only if the slot is still free
                if (booking.Status == BookingStatuses.Expired && outcome.Applied)
                {
                    booking.AmountPaid = total;
                    booking.RefundStatus = RefundStatuses.Due;
                    outcome.Action = PaymentActions.NeedsReview;
                    outcome.Applied = false;
                    outcome.Message = "Paid after the booking was released and the slot has been taken – refund due.";
                }
                await RecordAsync(outcome, provider, transactionId, paidAt, notes);
            }
            return outcome;
        }

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.PaymentReference == outcome.Reference);
        if (order != null)
        {
            outcome.Type = "Order";
            outcome.TargetId = order.Id;
            outcome.Customer = order.CustomerName;
            if (order.IsPaid)
            {
                outcome.Action = PaymentActions.AlreadyPaid;
                outcome.Message = "Order is already paid.";
            }
            else if (amount >= order.TotalAmount - tolerance)
            {
                outcome.Action = PaymentActions.OrderPaid;
                outcome.Applied = true;
                outcome.Message = $"Café order {order.OrderNumber} is paid.";
                if (!dryRun) await _orders.MarkOrderAsPaidAsync(order.Id, "");
            }
            else
            {
                outcome.Action = PaymentActions.Underpaid;
                outcome.Message = $"Received R{amount:0.00} of R{order.TotalAmount:0.00}.";
            }
            if (!dryRun) await RecordAsync(outcome, provider, transactionId, paidAt, notes);
            return outcome;
        }

        outcome.Message = "No booking or order has this reference.";
        return outcome;
    }

    private async Task RecordAsync(PaymentOutcome o, string provider, string? transactionId, DateTime paidAt, string? notes)
    {
        _context.Payments.Add(new Payment
        {
            PaymentReference = o.Reference,
            Amount = o.Amount,
            Type = o.Type ?? "",
            RelatedId = o.TargetId ?? 0,
            Status = o.Applied ? "Confirmed" : "Review",
            PaymentDateTime = paidAt,
            Provider = provider,
            ProviderTransactionId = transactionId,
            Notes = string.Join(" · ", new[] { o.Action, o.Message, notes }.Where(s => !string.IsNullOrWhiteSpace(s))),
        });
        await _context.SaveChangesAsync();
        _logger.LogInformation("{Provider} payment R{Amount} for {Reference}: {Action}", provider, o.Amount, o.Reference, o.Action);
    }
}
