namespace AnoitedHands.Api.Models;

public static class BookingStatuses
{
    public const string AwaitingDeposit = "Awaiting Deposit"; // slot held until DepositDueAt
    public const string Confirmed = "Confirmed";               // deposit received
    public const string Completed = "Completed";
    public const string NoShow = "No Show";
    public const string Cancelled = "Cancelled";
    public const string Expired = "Expired";                   // deposit not paid in time

    /// <summary>Statuses that no longer hold a time slot.</summary>
    public static readonly string[] Released = { Cancelled, Expired };
}

public static class RefundStatuses
{
    public const string None = "None";
    public const string Due = "Refund Due";
    public const string Refunded = "Refunded";
}

public class Booking
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public int ServiceId { get; set; }
    public int StylistId { get; set; }
    public DateTime BookingDateTime { get; set; } // salon local time
    public string Status { get; set; } = BookingStatuses.AwaitingDeposit;
    public string PaymentReference { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int? UserId { get; set; } // set when booked by a signed-in customer
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Pricing & payments
    public decimal Price { get; set; }            // price at time of booking (after any discount)
    public decimal DepositAmount { get; set; }    // 10% refundable deposit
    public DateTime DepositDueAt { get; set; }    // salon local time
    public DateTime? DepositPaidAt { get; set; }
    public bool IsPaid { get; set; }              // paid in full
    public DateTime? FullyPaidAt { get; set; }
    public decimal AmountPaid { get; set; }
    public string RefundStatus { get; set; } = RefundStatuses.None;
    public DateTime? RefundedAt { get; set; }
    public DateTime? CancelledAt { get; set; }

    // Navigation
    public Service? Service { get; set; }
    public Stylist? Stylist { get; set; }
}
