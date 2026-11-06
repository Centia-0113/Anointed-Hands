using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Services;

public interface IBookingService
{
    Task<BookingDto> CreateBookingAsync(CreateBookingDto dto, int? userId);
    Task<List<BookingDto>> GetBookingsForUserAsync(int userId, string? verifiedEmail);
    Task<bool> IsOwnerAsync(int bookingId, int userId, string? verifiedEmail);
    Task<List<BookingDto>> GetAllBookingsAsync();
    Task<BookingDto?> GetBookingByIdAsync(int id);
    Task<List<BookingDto>> SearchBookingsAsync(string customerName, string paymentReference);
    Task<bool> MarkBookingAsPaidAsync(int bookingId, string paymentReference);
    Task<bool> CancelBookingAsync(int bookingId);
    Task<List<DateTime>> GetAvailableSlotsAsync(int stylistId, int serviceId, DateTime date);
}

public class BookingService : IBookingService
{
    private readonly AnoitedHandsDbContext _context;

    public BookingService(AnoitedHandsDbContext context)
    {
        _context = context;
    }

    public async Task<BookingDto> CreateBookingAsync(CreateBookingDto dto, int? userId)
    {
        var service = await _context.Services.FindAsync(dto.ServiceId)
            ?? throw new ArgumentException("Selected service does not exist.");
        var stylist = await _context.Stylists.FindAsync(dto.StylistId)
            ?? throw new ArgumentException("Selected stylist does not exist.");

        if (OpeningHours.IsClosed(dto.BookingDateTime))
            throw new ArgumentException("The salon is closed on Sundays. Please choose another day.");

        var hours = OpeningHours.For(dto.BookingDateTime)!.Value;
        var start = dto.BookingDateTime.TimeOfDay;
        if (start < hours.Open || start.Add(TimeSpan.FromMinutes(service.DurationMinutes)) > hours.Close)
            throw new ArgumentException("That time is outside our opening hours (Mon-Fri 9AM-6PM, Sat 10AM-5PM).");

        var freeSlots = await GetAvailableSlotsAsync(dto.StylistId, dto.ServiceId, dto.BookingDateTime);
        if (!freeSlots.Contains(dto.BookingDateTime))
            throw new ArgumentException("That time is no longer available. Please choose another slot.");

        var paymentRef = $"AH-B{Random.Shared.Next(10000, 99999)}";

        var booking = new Booking
        {
            CustomerName = dto.CustomerName,
            CustomerEmail = dto.CustomerEmail,
            CustomerPhone = dto.CustomerPhone,
            ServiceId = dto.ServiceId,
            StylistId = dto.StylistId,
            BookingDateTime = dto.BookingDateTime,
            PaymentReference = paymentRef,
            Notes = dto.Notes,
            UserId = userId,
            Service = service,
            Stylist = stylist
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        return MapToDto(booking);
    }

    public async Task<List<BookingDto>> GetAllBookingsAsync()
    {
        var bookings = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Stylist)
            .OrderByDescending(b => b.BookingDateTime)
            .ToListAsync();

        return bookings.Select(MapToDto).ToList();
    }

    /// <summary>
    /// Bookings made while signed in, plus guest bookings made with the same email once that
    /// email has been verified (so nobody can see someone else's bookings by registering their address).
    /// </summary>
    public async Task<List<BookingDto>> GetBookingsForUserAsync(int userId, string? verifiedEmail)
    {
        var bookings = await OwnedBy(userId, verifiedEmail)
            .Include(b => b.Service)
            .Include(b => b.Stylist)
            .OrderByDescending(b => b.BookingDateTime)
            .ToListAsync();

        return bookings.Select(MapToDto).ToList();
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

    public async Task<BookingDto?> GetBookingByIdAsync(int id)
    {
        var booking = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Stylist)
            .FirstOrDefaultAsync(b => b.Id == id);

        return booking != null ? MapToDto(booking) : null;
    }

    public async Task<List<BookingDto>> SearchBookingsAsync(string customerName, string paymentReference)
    {
        var query = _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Stylist)
            .AsQueryable();

        if (!string.IsNullOrEmpty(customerName))
            query = query.Where(b => b.CustomerName.Contains(customerName));

        if (!string.IsNullOrEmpty(paymentReference))
            query = query.Where(b => b.PaymentReference.Contains(paymentReference));

        var bookings = await query.ToListAsync();
        return bookings.Select(MapToDto).ToList();
    }

    public async Task<bool> MarkBookingAsPaidAsync(int bookingId, string paymentReference)
    {
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null) return false;

        booking.IsPaid = true;
        booking.Status = "Confirmed";
        if (!string.IsNullOrWhiteSpace(paymentReference))
            booking.PaymentReference = paymentReference.Trim();

        _context.Bookings.Update(booking);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CancelBookingAsync(int bookingId)
    {
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null) return false;

        booking.Status = "Cancelled";
        _context.Bookings.Update(booking);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<DateTime>> GetAvailableSlotsAsync(int stylistId, int serviceId, DateTime date)
    {
        var service = await _context.Services.FindAsync(serviceId);
        if (service == null) return new();

        var dayStart = date.Date;
        var dayEnd = dayStart.AddDays(1);
        var bookingsOnDate = await _context.Bookings
            .Include(b => b.Service)
            .Where(b => b.StylistId == stylistId
                && b.BookingDateTime >= dayStart
                && b.BookingDateTime < dayEnd
                && b.Status != "Cancelled")
            .ToListAsync();

        var slots = new List<DateTime>();
        var hours = OpeningHours.For(date);
        if (hours == null) return slots; // closed (Sunday)
        var startTime = date.Date.Add(hours.Value.Open);
        var endTime = date.Date.Add(hours.Value.Close);

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

    private static BookingDto MapToDto(Booking booking)
    {
        return new BookingDto
        {
            Id = booking.Id,
            CustomerName = booking.CustomerName,
            CustomerEmail = booking.CustomerEmail,
            CustomerPhone = booking.CustomerPhone,
            ServiceId = booking.ServiceId,
            ServiceName = booking.Service?.Name ?? "",
            ServicePrice = booking.Service?.Price ?? 0,
            StylistId = booking.StylistId,
            StylistName = booking.Stylist?.Name ?? "",
            BookingDateTime = booking.BookingDateTime,
            Status = booking.Status,
            PaymentReference = booking.PaymentReference,
            IsPaid = booking.IsPaid,
            Notes = booking.Notes,
            CreatedAt = DateTime.SpecifyKind(booking.CreatedAt, DateTimeKind.Utc)
        };
    }
}
