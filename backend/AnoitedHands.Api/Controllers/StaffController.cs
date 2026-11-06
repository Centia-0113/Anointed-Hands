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

    public static readonly object PasswordChangeRequired = new
    {
        message = "Please set your own password before viewing client details.",
        code = "password_change_required",
    };

    /// <summary>Stylist id, or an error result if the account isn't a usable staff login yet.</summary>
    private async Task<(int? StylistId, ActionResult? Error)> ResolveAsync()
    {
        var user = await _auth.GetUserAsync(User.UserId()!.Value);
        if (user?.StylistId == null) return (null, Forbid());
        if (user.MustChangePassword) return (null, StatusCode(StatusCodes.Status403Forbidden, PasswordChangeRequired));
        return (user.StylistId, null);
    }

    [HttpGet("bookings")]
    public async Task<ActionResult<List<BookingDto>>> MyBookings()
    {
        var (id, error) = await ResolveAsync();
        return error ?? Ok(await _bookings.GetBookingsForStylistAsync(id!.Value));
    }

    [HttpGet("clients")]
    public async Task<ActionResult<List<StaffClientDto>>> MyClients()
    {
        var (id, error) = await ResolveAsync();
        return error ?? Ok(await _bookings.GetClientsForStylistAsync(id!.Value));
    }
}
