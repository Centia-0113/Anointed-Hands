using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnoitedHands.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly IAuthService _auth;

    public BookingsController(IBookingService bookingService, IAuthService auth)
    {
        _bookingService = bookingService;
        _auth = auth;
    }

    /// <summary>The signed-in user's email if verified (used to include their guest bookings).</summary>
    private async Task<string?> VerifiedEmailAsync()
    {
        var user = await _auth.GetUserAsync(User.UserId()!.Value);
        return user is { EmailConfirmed: true } ? user.Email : null;
    }

    private async Task<bool> CanAccessAsync(int bookingId) =>
        User.IsInRole(Roles.Admin) ||
        await _bookingService.IsOwnerAsync(bookingId, User.UserId()!.Value, await VerifiedEmailAsync());

    /// <summary>All bookings (admin only).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<ActionResult<List<BookingDto>>> GetAllBookings()
    {
        return Ok(await _bookingService.GetAllBookingsAsync());
    }

    /// <summary>The signed-in customer's own bookings.</summary>
    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<List<BookingDto>>> GetMyBookings()
    {
        return Ok(await _bookingService.GetBookingsForUserAsync(User.UserId()!.Value, await VerifiedEmailAsync()));
    }

    /// <summary>A single booking: admins see any, customers only their own.</summary>
    [Authorize]
    [HttpGet("{id}")]
    public async Task<ActionResult<BookingDto>> GetBooking(int id)
    {
        if (!await CanAccessAsync(id))
            return NotFound();

        var booking = await _bookingService.GetBookingByIdAsync(id);
        if (booking == null)
            return NotFound();

        return Ok(booking);
    }

    /// <summary>Create a booking. Open to guests; linked to the account when signed in.</summary>
    [HttpPost]
    public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] CreateBookingDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CustomerName) || string.IsNullOrWhiteSpace(dto.CustomerEmail))
            return BadRequest(new { message = "Name and email are required." });
        if (dto.BookingDateTime <= DateTime.Now)
            return BadRequest(new { message = "Please choose a time in the future." });
        if (OpeningHours.IsClosed(dto.BookingDateTime))
            return BadRequest(new { message = "The salon is closed on Sundays. Please choose another day." });

        BookingDto booking;
        try
        {
            booking = await _bookingService.CreateBookingAsync(dto, User.UserId());
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        return CreatedAtAction(nameof(GetBooking), new { id = booking.Id }, booking);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("search")]
    public async Task<ActionResult<List<BookingDto>>> SearchBookings(
        [FromQuery] string? customerName,
        [FromQuery] string? paymentReference)
    {
        var bookings = await _bookingService.SearchBookingsAsync(customerName ?? "", paymentReference ?? "");
        return Ok(bookings);
    }

    [HttpGet("available-slots")]
    public async Task<ActionResult<List<DateTime>>> GetAvailableSlots(
        [FromQuery] int stylistId,
        [FromQuery] int serviceId,
        [FromQuery] DateTime date)
    {
        return Ok(await _bookingService.GetAvailableSlotsAsync(stylistId, serviceId, date));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id}/mark-paid")]
    public async Task<IActionResult> MarkBookingAsPaid(int id, [FromBody] MarkPaidDto dto)
    {
        var result = await _bookingService.MarkBookingAsPaidAsync(id, dto.PaymentReference ?? "");
        return result ? NoContent() : NotFound();
    }

    /// <summary>Cancel a booking: admins any time; customers their own unpaid, upcoming bookings.</summary>
    [Authorize]
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        if (!User.IsInRole(Roles.Admin))
        {
            if (!await CanAccessAsync(id))
                return NotFound();

            var booking = await _bookingService.GetBookingByIdAsync(id);
            if (booking == null) return NotFound();
            if (booking.IsPaid)
                return BadRequest(new { message = "This booking is already paid. Please contact the salon to cancel." });
            if (booking.BookingDateTime <= DateTime.Now)
                return BadRequest(new { message = "Past appointments can't be cancelled." });
        }

        var result = await _bookingService.CancelBookingAsync(id);
        return result ? NoContent() : NotFound();
    }
}
