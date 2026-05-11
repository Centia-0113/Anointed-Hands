using Microsoft.AspNetCore.Mvc;
using AnoitedHands.Api.Services;
using AnoitedHands.Api.DTOs;

namespace AnoitedHands.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpGet]
    public async Task<ActionResult<List<BookingDto>>> GetAllBookings()
    {
        var bookings = await _bookingService.GetAllBookingsAsync();
        return Ok(bookings);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BookingDto>> GetBooking(int id)
    {
        var booking = await _bookingService.GetBookingByIdAsync(id);
        if (booking == null)
            return NotFound();

        return Ok(booking);
    }

    [HttpPost]
    public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] CreateBookingDto dto)
    {
        var booking = await _bookingService.CreateBookingAsync(dto);
        return CreatedAtAction(nameof(GetBooking), new { id = booking.Id }, booking);
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<BookingDto>>> SearchBookings(
        [FromQuery] string? customerName,
        [FromQuery] string? paymentReference)
    {
        var bookings = await _bookingService.SearchBookingsAsync(
            customerName ?? "",
            paymentReference ?? "");

        return Ok(bookings);
    }

    [HttpGet("available-slots")]
    public async Task<ActionResult<List<DateTime>>> GetAvailableSlots(
        [FromQuery] int stylistId,
        [FromQuery] int serviceId,
        [FromQuery] DateTime date)
    {
        var slots = await _bookingService.GetAvailableSlotsAsync(stylistId, serviceId, date);
        return Ok(slots);
    }

    [HttpPost("{id}/mark-paid")]
    public async Task<IActionResult> MarkBookingAsPaid(int id, [FromBody] MarkPaidDto dto)
    {
        var result = await _bookingService.MarkBookingAsPaidAsync(id, dto.PaymentReference);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        var result = await _bookingService.CancelBookingAsync(id);
        if (!result)
            return NotFound();

        return NoContent();
    }
}
