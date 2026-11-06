using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Services;

public interface IBookingService
{
    Task<BookingDto> CreateBookingAsync(CreateBookingDto dto, int? userId);
    Task<List<BookingDto>> GetAllBookingsAsync();
    Task<BookingDto?> GetBookingByIdAsync(int id);
    Task<List<BookingDto>> GetBookingsForUserAsync(int userId, string? verifiedEmail);
    Task<List<BookingDto>> GetBookingsForStylistAsync(int stylistId);
    Task<List<StaffClientDto>> GetClientsForStylistAsync(int stylistId);
    Task<bool> IsOwnerAsync(int bookingId, int userId, string? verifiedEmail);
    Task<List<BookingDto>> SearchBookingsAsync(string customerName, string paymentReference);
    Task<bool> MarkDepositPaidAsync(int bookingId);
    Task<bool> MarkBookingAsPaidAsync(int bookingId, string paymentReference);
    Task<bool> CancelBookingAsync(int bookingId);
    Task<bool> MarkRefundedAsync(int bookingId);
    Task<bool> SetStatusAsync(int bookingId, string status);
    Task<List<DateTime>> GetAvailableSlotsAsync(int stylistId, int serviceId, DateTime date, int? ignoreBookingId = null);
}

public class BookingService : IBookingService
{
    private readonly AnoitedHandsDbContext _context;
    private readonly IScheduleService _schedule;
    private readonly IEmailSender _email;
    private readonly IConfiguration _config;

    public BookingService(AnoitedHandsDbContext context, IScheduleService schedule, IEmailSender email, IConfiguration config)
    {
        _context = context;
        _schedule = schedule;
        _email = email;
        _config = config;
    }

    // ------------------------------------------------------------------ create

    public async Task<BookingDto> CreateBookingAsync(CreateBookingDto dto, int? userId)
    {
        var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == dto.ServiceId && s.IsActive)
            ?? throw new ArgumentException("Selected service is not available.");
        var stylist = await _context.Stylists.FirstOrDefaultAsync(s => s.Id == dto.StylistId && s.IsActive)
            ?? throw new ArgumentException("Selected stylist is not available.");

        var hours = await _schedule.GetHoursAsync(dto.BookingDateTime);
        if (!hours.IsOpen)
            throw new ArgumentException(dto.BookingDateTime.DayOfWeek == DayOfWeek.Sunday
                ? "The salon is closed on this Sunday. Please choose another day."
                : "The salon is closed on this day. Please choose another day.");

        var start = dto.BookingDateTime.TimeOfDay;
        if (start < hours.Open!.Value || start.Add(TimeSpan.FromMinutes(service.DurationMinutes)) > hours.Close!.Value)
            throw new ArgumentException($"That time is outside our opening hours that day ({hours.Open:hh\\:mm}-{hours.Close:hh\\:mm}).");

        var freeSlots = await GetAvailableSlotsAsync(dto.StylistId, dto.ServiceId, dto.BookingDateTime);
        if (!freeSlots.Contains(dto.BookingDateTime))
            throw new ArgumentException("That time is no longer available. Please choose another slot.");

        var price = Pricing.Effective(service.Price, service.DiscountPercent, service.DiscountEndsOn);
        var booking = new Booking
        {
            CustomerName = dto.CustomerName.Trim(),
            CustomerEmail = dto.CustomerEmail.Trim(),
            CustomerPhone = string.IsNullOrWhiteSpace(dto.CustomerPhone) ? null : dto.CustomerPhone.Trim(),
            ServiceId = dto.ServiceId,
            StylistId = dto.StylistId,
            BookingDateTime = dto.BookingDateTime,
            PaymentReference = $"AH-B{Random.Shared.Next(10000, 99999)}",
            Notes = dto.Notes,
            UserId = userId,
            Price = price,
            DepositAmount = Pricing.Deposit(price),
            DepositDueAt = Pricing.DepositDueAt(DateTime.Now, dto.BookingDateTime),
            Status = BookingStatuses.AwaitingDeposit,
            Service = service,
            Stylist = stylist,
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        await SendDepositEmailAsync(booking);
        return MapToDto(booking);
    }

    private async Task SendDepositEmailAsync(Booking b)
    {
        var site = (_config["App:FrontendUrl"] ?? "http://localhost:3000").TrimEnd('/');
        var bank = _config.GetSection("CompanySettings");
        await _email.SendAsync(b.CustomerEmail, $"Secure your booking - deposit {b.PaymentReference}", EmailSender.Layout(
            "Almost there! Secure your booking",
            $"Thank you for booking {b.Service?.Name} with {b.Stylist?.Name} on {b.BookingDateTime:dddd d MMMM 'at' HH:mm}. " +
            $"Please pay the refundable 10% deposit of R{b.DepositAmount:0.00} by {b.DepositDueAt:dddd d MMMM HH:mm} to secure your slot. " +
            $"EFT to {bank["BankName"]}, account {bank["BankAccount"]}, branch {bank["BranchCode"]}, reference {b.PaymentReference}. " +
            $"The balance of R{b.Price - b.DepositAmount:0.00} is payable at your appointment.",
            "Scan to pay / view booking", $"{site}/account",
            "Unpaid bookings are released automatically when the deadline passes. Your deposit is refunded if you cancel."));
    }

    // ------------------------------------------------------------------ queries

    public async Task<List<BookingDto>> GetAllBookingsAsync()
    {
        var bookings = await WithDetails(_context.Bookings)
            .OrderByDescending(b => b.BookingDateTime)
            .ToListAsync();
        return bookings.Select(MapToDto).ToList();
    }

    public async Task<BookingDto?> GetBookingByIdAsync(int id)
    {
        var booking = await WithDetails(_context.Bookings).FirstOrDefaultAsync(b => b.Id == id);
        return booking != null ? MapToDto(booking) : null;
    }

    /// <summary>
    /// Bookings made while signed in, plus guest bookings made with the same email once that
    /// email has been verified (so nobody can see someone else's bookings by registering their address).
    /// </summary>
    public async Task<List<BookingDto>> GetBookingsForUserAsync(int userId, string? verifiedEmail)
    {
        var bookings = await WithDetails(OwnedBy(userId, verifiedEmail))
            .OrderByDescending(b => b.BookingDateTime)
            .ToListAsync();
        return bookings.Select(MapToDto).ToList();
    }

    public async Task<List<BookingDto>> GetBookingsForStylistAsync(int stylistId)
    {
        var bookings = await WithDetails(_context.Bookings)
            .Where(b => b.StylistId == stylistId)
            .OrderBy(b => b.BookingDateTime)
            .ToListAsync();
        return bookings.Select(MapToDto).ToList();
    }

    /// <summary>The stylist's clients (grouped by email) with their visit history with that stylist.</summary>
    public async Task<List<StaffClientDto>> GetClientsForStylistAsync(int stylistId)
    {
        var bookings = await WithDetails(_context.Bookings)
            .Where(b => b.StylistId == stylistId)
            .ToListAsync();
        var now = DateTime.Now;

        return bookings
            .GroupBy(b => b.CustomerEmail.Trim().ToLowerInvariant())
            .Select(g =>
            {
                var ordered = g.OrderByDescending(b => b.BookingDateTime).ToList();
                var latest = ordered.First();
                var active = g.Where(b => !BookingStatuses.Released.Contains(b.Status)).ToList();
                return new StaffClientDto
                {
                    Name = latest.CustomerName,
                    Email = latest.CustomerEmail,
                    Phone = ordered.Select(b => b.CustomerPhone).FirstOrDefault(p => !string.IsNullOrWhiteSpace(p)),
                    TotalBookings = g.Count(),
                    CompletedVisits = g.Count(b => b.Status == BookingStatuses.Completed),
                    NoShows = g.Count(b => b.Status == BookingStatuses.NoShow),
                    LastVisit = active.Where(b => b.BookingDateTime < now && b.Status != BookingStatuses.NoShow)
                        .Select(b => (DateTime?)b.BookingDateTime).Max(),
                    NextAppointment = active.Where(b => b.BookingDateTime >= now)
                        .Select(b => (DateTime?)b.BookingDateTime).Min(),
                    TotalSpent = g.Sum(b => b.RefundStatus == RefundStatuses.Refunded ? 0 : b.AmountPaid),
                    Bookings = ordered.Select(MapToDto).ToList(),
                };
            })
            .OrderBy(c => c.NextAppointment ?? DateTime.MaxValue)
            .ThenByDescending(c => c.LastVisit)
            .ToList();
    }

    public async Task<bool> IsOwnerAsync(int bookingId, int userId, string? verifiedEmail) =>
        await OwnedBy(userId, verifiedEmail).AnyAsync(b => b.Id == bookingId);

    private IQueryable<Booking> OwnedBy(int userId, string? verifiedEmail)
    {
        if (string.IsNullOrWhiteSpace(verifiedEmail))
            return _context.Bookings.Where(b => b.UserId == userId);

        var email = verifiedEmail.Trim().ToLower();
        return _context.Bookings.Where(b =>
            b.UserId == userId || (b.UserId == null && b.CustomerEmail.ToLower() == email));
    }

    public async Task<List<BookingDto>> SearchBookingsAsync(string customerName, string paymentReference)
    {
        var query = WithDetails(_context.Bookings);
        if (!string.IsNullOrEmpty(customerName))
            query = query.Where(b => b.CustomerName.Contains(customerName));
        if (!string.IsNullOrEmpty(paymentReference))
            query = query.Where(b => b.PaymentReference.Contains(paymentReference));

        var bookings = await query.ToListAsync();
        return bookings.Select(MapToDto).ToList();
    }

    // ------------------------------------------------------------------ payments & status

    public async Task<bool> MarkDepositPaidAsync(int bookingId)
    {
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null) return false;
        if (booking.DepositPaidAt != null) return true;

        booking.DepositPaidAt = DateTime.UtcNow;
        booking.AmountPaid = Math.Max(booking.AmountPaid, booking.DepositAmount);
        // Re-secure an expired booking only if the slot is still free
        if (booking.Status == BookingStatuses.AwaitingDeposit ||
            (booking.Status == BookingStatuses.Expired && await IsSlotFreeAsync(booking)))
            booking.Status = BookingStatuses.Confirmed;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkBookingAsPaidAsync(int bookingId, string paymentReference)
    {
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null) return false;

        var now = DateTime.UtcNow;
        booking.IsPaid = true;
        booking.FullyPaidAt ??= now;
        booking.DepositPaidAt ??= now;
        booking.AmountPaid = booking.Price;
        if (booking.Status == BookingStatuses.AwaitingDeposit ||
            (booking.Status == BookingStatuses.Expired && await IsSlotFreeAsync(booking)))
            booking.Status = BookingStatuses.Confirmed;
        if (!string.IsNullOrWhiteSpace(paymentReference))
            booking.PaymentReference = paymentReference.Trim();

        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>Cancels a booking. Any money received becomes a refund due.</summary>
    public async Task<bool> CancelBookingAsync(int bookingId)
    {
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null) return false;
        if (booking.Status == BookingStatuses.Cancelled) return true;

        booking.Status = BookingStatuses.Cancelled;
        booking.CancelledAt = DateTime.UtcNow;
        if (booking.AmountPaid > 0 && booking.RefundStatus == RefundStatuses.None)
            booking.RefundStatus = RefundStatuses.Due;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkRefundedAsync(int bookingId)
    {
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null || booking.RefundStatus != RefundStatuses.Due) return false;
        booking.RefundStatus = RefundStatuses.Refunded;
        booking.RefundedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>Completed / No Show / Confirmed (used by staff after the appointment).</summary>
    public async Task<bool> SetStatusAsync(int bookingId, string status)
    {
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null) return false;
        booking.Status = status;
        await _context.SaveChangesAsync();
        return true;
    }

    // ------------------------------------------------------------------ availability

    public async Task<List<DateTime>> GetAvailableSlotsAsync(int stylistId, int serviceId, DateTime date, int? ignoreBookingId = null)
    {
        var slots = new List<DateTime>();
        var service = await _context.Services.FindAsync(serviceId);
        if (service == null) return slots;

        var hours = await _schedule.GetHoursAsync(date);
        if (!hours.IsOpen) return slots;

        var dayStart = date.Date;
        var dayEnd = dayStart.AddDays(1);
        var bookingsOnDate = await _context.Bookings
            .Include(b => b.Service)
            .Where(b => b.StylistId == stylistId
                && b.BookingDateTime >= dayStart
                && b.BookingDateTime < dayEnd
                && !BookingStatuses.Released.Contains(b.Status)
                && (ignoreBookingId == null || b.Id != ignoreBookingId))
            .ToListAsync();

        var startTime = dayStart.Add(hours.Open!.Value);
        var endTime = dayStart.Add(hours.Close!.Value);

        // A slot is free when the appointment fits before closing and doesn't overlap an existing booking
        for (var slot = startTime; slot.AddMinutes(service.DurationMinutes) <= endTime; slot = slot.AddMinutes(OpeningHours.SlotMinutes))
        {
            var slotEnd = slot.AddMinutes(service.DurationMinutes);
            var overlaps = bookingsOnDate.Any(b =>
                b.BookingDateTime < slotEnd &&
                b.BookingDateTime.AddMinutes(b.Service?.DurationMinutes ?? 30) > slot);

            if (!overlaps && slot > DateTime.Now)
                slots.Add(slot);
        }

        return slots;
    }

    private async Task<bool> IsSlotFreeAsync(Booking b) =>
        (await GetAvailableSlotsAsync(b.StylistId, b.ServiceId, b.BookingDateTime, b.Id)).Contains(b.BookingDateTime)
        || b.BookingDateTime <= DateTime.Now;

    // ------------------------------------------------------------------ mapping

    private static IQueryable<Booking> WithDetails(IQueryable<Booking> q) =>
        q.Include(b => b.Service).Include(b => b.Stylist);

    private static DateTime? Utc(DateTime? d) => d == null ? null : DateTime.SpecifyKind(d.Value, DateTimeKind.Utc);

    private static BookingDto MapToDto(Booking b) => new()
    {
        Id = b.Id,
        CustomerName = b.CustomerName,
        CustomerEmail = b.CustomerEmail,
        CustomerPhone = b.CustomerPhone,
        ServiceId = b.ServiceId,
        ServiceName = b.Service?.Name ?? "",
        ServicePrice = b.Price,
        DurationMinutes = b.Service?.DurationMinutes ?? 0,
        StylistId = b.StylistId,
        StylistName = b.Stylist?.Name ?? "",
        BookingDateTime = b.BookingDateTime,
        Status = b.Status,
        PaymentReference = b.PaymentReference,
        IsPaid = b.IsPaid,
        Notes = b.Notes,
        CreatedAt = DateTime.SpecifyKind(b.CreatedAt, DateTimeKind.Utc),
        DepositAmount = b.DepositAmount,
        DepositDueAt = b.DepositDueAt,
        DepositPaid = b.DepositPaidAt != null,
        DepositPaidAt = Utc(b.DepositPaidAt),
        FullyPaidAt = Utc(b.FullyPaidAt),
        AmountPaid = b.AmountPaid,
        BalanceDue = b.IsPaid ? 0 : Math.Max(0, b.Price - b.AmountPaid),
        RefundStatus = b.RefundStatus,
        RefundedAt = Utc(b.RefundedAt),
        CancelledAt = Utc(b.CancelledAt),
    };
}
