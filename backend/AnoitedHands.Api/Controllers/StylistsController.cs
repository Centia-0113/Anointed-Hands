using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StylistsController : ControllerBase
{
    private readonly AnoitedHandsDbContext _context;

    public StylistsController(AnoitedHandsDbContext context)
    {
        _context = context;
    }

    /// <summary>Active stylists (public, for booking).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<StylistDto>>> GetStylists()
    {
        var stylists = await _context.Stylists.Where(s => s.IsActive).OrderBy(s => s.Name).ToListAsync();
        return Ok(stylists.Select(s => new StylistDto
        {
            Id = s.Id,
            Name = s.Name,
            Specialization = s.Specialization,
            PhotoUrl = s.PhotoUrl,
            IsActive = s.IsActive,
        }));
    }

    /// <summary>All stylists with contact details and their staff login (admin).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<StylistAdminDto>>> GetAll()
    {
        var stylists = await _context.Stylists.OrderBy(s => s.Name).ToListAsync();
        var logins = await _context.Users.Where(u => u.Role == Roles.Stylist && u.StylistId != null)
            .ToDictionaryAsync(u => u.StylistId!.Value, u => u.Email);
        return Ok(stylists.Select(s => ToAdminDto(s, logins.GetValueOrDefault(s.Id))));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StylistDto>> GetStylist(int id)
    {
        var s = await _context.Stylists.FindAsync(id);
        if (s == null) return NotFound();
        return Ok(new StylistDto { Id = s.Id, Name = s.Name, Specialization = s.Specialization, PhotoUrl = s.PhotoUrl, IsActive = s.IsActive });
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<StylistAdminDto>> Create([FromBody] SaveStylistDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { message = "Please enter the stylist's name." });
        var stylist = new Stylist();
        Apply(stylist, dto);
        _context.Stylists.Add(stylist);
        await _context.SaveChangesAsync();
        return Ok(ToAdminDto(stylist, null));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id}")]
    public async Task<ActionResult<StylistAdminDto>> Update(int id, [FromBody] SaveStylistDto dto)
    {
        var stylist = await _context.Stylists.FindAsync(id);
        if (stylist == null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { message = "Please enter the stylist's name." });
        Apply(stylist, dto);
        await _context.SaveChangesAsync();

        var login = await _context.Users.Where(u => u.StylistId == id).Select(u => u.Email).FirstOrDefaultAsync();
        return Ok(ToAdminDto(stylist, login));
    }

    /// <summary>Create (or reset) the staff login for a stylist so they can see their bookings and clients.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id}/account")]
    public async Task<IActionResult> CreateAccount(int id, [FromBody] CreateStaffAccountDto dto)
    {
        var stylist = await _context.Stylists.FindAsync(id);
        if (stylist == null) return NotFound();

        var email = (dto.Email ?? "").Trim().ToLowerInvariant();
        if (!email.Contains('@')) return BadRequest(new { message = "Please enter a valid email for the login." });
        if ((dto.Password ?? "").Length < 8) return BadRequest(new { message = "The temporary password must be at least 8 characters." });

        var hasher = new PasswordHasher<User>();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.StylistId == id)
                   ?? await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user != null && user.StylistId != id && user.Role != Roles.Customer)
            return BadRequest(new { message = "That email already belongs to another staff or admin account." });
        if (user != null && user.Email != email && await _context.Users.AnyAsync(u => u.Email == email && u.Id != user.Id))
            return BadRequest(new { message = "That email is already in use." });

        if (user == null)
        {
            user = new User { Name = stylist.Name };
            _context.Users.Add(user);
        }
        else
        {
            user.TokenVersion++; // sign out any existing sessions
        }

        user.Email = email;
        user.Name = stylist.Name;
        user.Role = Roles.Stylist;
        user.StylistId = id;
        user.EmailConfirmed = true;
        user.FailedLoginCount = 0;
        user.LockoutEndUtc = null;
        user.PasswordHash = hasher.HashPassword(user, dto.Password!);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Login ready: {email}. Ask {stylist.Name.Split(' ')[0]} to change the password after signing in." });
    }

    /// <summary>Remove a stylist's staff login (e.g. when they leave).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id}/account")]
    public async Task<IActionResult> RemoveAccount(int id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.StylistId == id && u.Role == Roles.Stylist);
        if (user == null) return NotFound();
        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static void Apply(Stylist s, SaveStylistDto dto)
    {
        s.Name = dto.Name.Trim();
        s.Specialization = (dto.Specialization ?? "").Trim();
        s.Email = (dto.Email ?? "").Trim();
        s.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
        s.IsActive = dto.IsActive;
    }

    private static StylistAdminDto ToAdminDto(Stylist s, string? login) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Specialization = s.Specialization,
        PhotoUrl = s.PhotoUrl,
        IsActive = s.IsActive,
        Email = s.Email,
        PhoneNumber = s.PhoneNumber,
        LoginEmail = login,
    };
}
