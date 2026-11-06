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
    private static readonly string[] StaffSettableStatuses =
        { BookingStatuses.Confirmed, BookingStatuses.Completed, BookingStatuses.NoShow };

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

    /// <summary>Stylist id of the signed-in staff member, or null.</summary>
    private async Task<int?> StaffStylistIdAsync()
    {
        if (!User.IsInRole(Roles.Stylist)) return null;
        return (await _auth.GetUserAsync(User.UserId()!.Value))?.StylistId;
    }

    private async Task<bool> CanAccessAsync(int bookingId)
    {
        if (User.IsInRole(Roles.Admin)) return true;
        var stylistId = await StaffStylistIdAsync();
        if (stylistId != null)
            return (await _bookingService.GetBookingByIdAsync(bookingId))?.StylistId == stylistId;
        return await _bookingService.IsOwnerAsync(bookingId, User.UserId()!.Value, await VerifiedEmailAsync());
    }

    /// <summary>All bookings (admin only).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<ActionResult<List<BookingDto>>> GetAllBookings() =>
        Ok(await _bookingService.GetAllBookingsAsync());

    /// <summary>The signed-in customer's own bookings.</summary>
    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<List<BookingDto>>> GetMyBookings() =>
        Ok(await _bookingService.GetBookingsForUserAsync(User.UserId()!.Value, await VerifiedEmailAsync()));

    [Authorize]
    [HttpGet("{id}")]
    public async Task<ActionResult<BookingDto>> GetBooking(int id)
    {
        if (!await CanAccessAsync(id)) return NotFound();
        var booking = await _bookingService.GetBookingByIdAsync(id);
        return booking == null ? NotFound() : Ok(booking);
    }

    /// <summary>Create a booking. Open to guests; linked to the account when signed in.</summary>
    [HttpPost]
    public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] CreateBookingDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CustomerName) || string.IsNullOrWhiteSpace(dto.CustomerEmail) || !dto.CustomerEmail.Contains('@'))
            return BadRequest(new { message = "Name and a valid email are required." });
        if (dto.BookingDateTime <= DateTime.Now)
            return BadRequest(new { message = "Please choose a time in the future." });

        try
        {
            var booking = await _bookingService.CreateBookingAsync(dto, User.UserId());
            return CreatedAtAction(nameof(GetBooking), new { id = booking.Id }, booking);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("search")]
    public async Task<ActionResult<List<BookingDto>>> SearchBookings([FromQuery] string? customerName, [FromQuery] string? paymentReference) =>
        Ok(await _bookingService.SearchBookingsAsync(customerName ?? "", paymentReference ?? ""));

    [HttpGet("available-slots")]
    public async Task<ActionResult<List<DateTime>>> GetAvailableSlots([FromQuery] int stylistId, [FromQuery] int serviceId, [FromQuery] DateTime date) =>
        Ok(await _bookingService.GetAvailableSlotsAsync(stylistId, serviceId, date));

    /// <summary>Record that the 10% deposit was received (admin). Secures the booking.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id}/deposit-paid")]
    public async Task<IActionResult> MarkDepositPaid(int id) =>
        await _bookingService.MarkDepositPaidAsync(id) ? NoContent() : NotFound();

    /// <summary>Record payment in full (admin).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id}/mark-paid")]
    public async Task<IActionResult> MarkBookingAsPaid(int id, [FromBody] MarkPaidDto dto) =>
        await _bookingService.MarkBookingAsPaidAsync(id, dto.PaymentReference ?? "") ? NoContent() : NotFound();

    /// <summary>Record that a due deposit refund has been paid back (admin).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id}/refunded")]
    public async Task<IActionResult> MarkRefunded(int id) =>
        await _bookingService.MarkRefundedAsync(id) ? NoContent() : BadRequest(new { message = "No refund is due on this booking." });

    /// <summary>Set Completed / No Show / Confirmed: admin, or the stylist the booking belongs to.</summary>
    [Authorize(Roles = Roles.Admin + "," + Roles.Stylist)]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateBookingStatusDto dto)
    {
        if (!StaffSettableStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Status must be Confirmed, Completed or No Show." });
        if (!await CanAccessAsync(id)) return NotFound();

        var booking = await _bookingService.GetBookingByIdAsync(id);
        if (booking == null) return NotFound();
        if (BookingStatuses.Released.Contains(booking.Status))
            return BadRequest(new { message = "This booking was cancelled or released." });
        if (dto.Status != BookingStatuses.Confirmed && booking.BookingDateTime > DateTime.Now)
            return BadRequest(new { message = "You can only mark an appointment completed or no-show once it has started." });

        await _bookingService.SetStatusAsync(id, dto.Status);
        return NoContent();
    }

    /// <summary>
    /// Cancel: admins any time; customers their own upcoming bookings that aren't paid in full.
    /// A paid deposit becomes refundable.
    /// </summary>
    [Authorize]
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        if (!User.IsInRole(Roles.Admin))
        {
            if (User.IsInRole(Roles.Stylist) || !await CanAccessAsync(id))
                return NotFound();

            var booking = await _bookingService.GetBookingByIdAsync(id);
            if (booking == null) return NotFound();
            if (booking.IsPaid)
                return BadRequest(new { message = "This booking is paid in full. Please contact the salon to cancel." });
            if (booking.BookingDateTime <= DateTime.Now)
                return BadRequest(new { message = "Past appointments can't be cancelled." });
            if (BookingStatuses.Released.Contains(booking.Status))
                return BadRequest(new { message = "This booking is already cancelled." });
        }

        return await _bookingService.CancelBookingAsync(id) ? NoContent() : NotFound();
    }
}
