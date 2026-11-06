using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnoitedHands.Api.Controllers;

/// <summary>For signed-in stylists: their own appointments and clients only.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = Roles.Stylist)]
public class StaffController : ControllerBase
{
    private readonly IBookingService _bookings;
    private readonly IAuthService _auth;

    public StaffController(IBookingService bookings, IAuthService auth)
    {
        _bookings = bookings;
        _auth = auth;
    }

    private async Task<int?> StylistIdAsync() => (await _auth.GetUserAsync(User.UserId()!.Value))?.StylistId;

    [HttpGet("bookings")]
    public async Task<ActionResult<List<BookingDto>>> MyBookings()
    {
        var id = await StylistIdAsync();
        return id == null ? Forbid() : Ok(await _bookings.GetBookingsForStylistAsync(id.Value));
    }

    [HttpGet("clients")]
    public async Task<ActionResult<List<StaffClientDto>>> MyClients()
    {
        var id = await StylistIdAsync();
        return id == null ? Forbid() : Ok(await _bookings.GetClientsForStylistAsync(id.Value));
    }
}
