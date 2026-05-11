using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Services;

public interface IBookingService
{
    Task<BookingDto> CreateBookingAsync(CreateBookingDto dto);
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

    public async Task<BookingDto> CreateBookingAsync(CreateBookingDto dto)
    {
        var paymentRef = $"AH-{DateTime.UtcNow.Ticks % 100000}";
        
        var booking = new Booking
        {
            CustomerName = dto.CustomerName,
            CustomerEmail = dto.CustomerEmail,
            CustomerPhone = dto.CustomerPhone,
            ServiceId = dto.ServiceId,
            StylistId = dto.StylistId,
            BookingDateTime = dto.BookingDateTime,
            PaymentReference = paymentRef,
            Notes = dto.Notes
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        return await MapToDto(booking);
    }

    public async Task<List<BookingDto>> GetAllBookingsAsync()
    {
        var bookings = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Stylist)
            .OrderByDescending(b => b.BookingDateTime)
            .ToListAsync();

        return await Task.WhenAll(bookings.Select(MapToDto)).ContinueWith(t => t.Result.ToList());
    }

    public async Task<BookingDto?> GetBookingByIdAsync(int id)
    {
        var booking = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Stylist)
            .FirstOrDefaultAsync(b => b.Id == id);

        return booking != null ? await MapToDto(booking) : null;
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
        return await Task.WhenAll(bookings.Select(MapToDto)).ContinueWith(t => t.Result.ToList());
    }

    public async Task<bool> MarkBookingAsPaidAsync(int bookingId, string paymentReference)
    {
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null) return false;

        booking.IsPaid = true;
        booking.Status = "Confirmed";
        booking.PaymentReference = paymentReference;

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

        var bookingsOnDate = await _context.Bookings
            .Where(b => b.StylistId == stylistId 
                && b.BookingDateTime.Date == date.Date 
                && b.Status != "Cancelled")
            .ToListAsync();

        var slots = new List<DateTime>();
        var startTime = date.Date.AddHours(9);
        var endTime = date.Date.AddHours(18);

        for (var slot = startTime; slot <= endTime; slot = slot.AddMinutes(30))
        {
            var isBooked = bookingsOnDate.Any(b => 
                b.BookingDateTime <= slot && 
                b.BookingDateTime.AddMinutes(service.DurationMinutes) > slot);

            if (!isBooked)
                slots.Add(slot);
        }

        return slots;
    }

    private async Task<BookingDto> MapToDto(Booking booking)
    {
        return new BookingDto
        {
            Id = booking.Id,
            CustomerName = booking.CustomerName,
            CustomerEmail = booking.CustomerEmail,
            CustomerPhone = booking.CustomerPhone,
            ServiceId = booking.ServiceId,
            StylistId = booking.StylistId,
            BookingDateTime = booking.BookingDateTime,
            Status = booking.Status,
            PaymentReference = booking.PaymentReference,
            IsPaid = booking.IsPaid,
            Notes = booking.Notes
        };
    }
}
