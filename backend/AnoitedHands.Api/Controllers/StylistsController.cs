using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Controllers;

/// <summary>
/// Stylists (employees). Only the admin can add employees and create their logins; each login starts
/// with a temporary password the employee must replace at first sign-in.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class StylistsController : ControllerBase
{
    private const int MinPasswordLength = 8;
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
            .ToDictionaryAsync(u => u.StylistId!.Value);
        return Ok(stylists.Select(s => ToAdminDto(s, logins.GetValueOrDefault(s.Id))));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StylistDto>> GetStylist(int id)
    {
        var s = await _context.Stylists.FindAsync(id);
        if (s == null) return NotFound();
        return Ok(new StylistDto { Id = s.Id, Name = s.Name, Specialization = s.Specialization, PhotoUrl = s.PhotoUrl, IsActive = s.IsActive });
    }

    /// <summary>Add an employee (admin). Optionally creates their login with a temporary password in the same step.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<StylistAdminDto>> Create([FromBody] SaveStylistDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { message = "Please enter the employee's name." });

        var wantsLogin = !string.IsNullOrWhiteSpace(dto.LoginEmail) || !string.IsNullOrWhiteSpace(dto.TemporaryPassword);
        if (wantsLogin)
        {
            var error = await ValidateLoginAsync(dto.LoginEmail, dto.TemporaryPassword, null);
            if (error != null) return BadRequest(new { message = error });
        }

        await using var tx = await _context.Database.BeginTransactionAsync();
        var stylist = new Stylist();
        Apply(stylist, dto);
        _context.Stylists.Add(stylist);
        await _context.SaveChangesAsync();

        User? login = null;
        if (wantsLogin)
            login = await UpsertLoginAsync(stylist, dto.LoginEmail!, dto.TemporaryPassword!);

        await tx.CommitAsync();
        return Ok(ToAdminDto(stylist, login));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id}")]
    public async Task<ActionResult<StylistAdminDto>> Update(int id, [FromBody] SaveStylistDto dto)
    {
        var stylist = await _context.Stylists.FindAsync(id);
        if (stylist == null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { message = "Please enter the employee's name." });
        Apply(stylist, dto);

        // Keep the login's display name in sync
        var login = await _context.Users.FirstOrDefaultAsync(u => u.StylistId == id && u.Role == Roles.Stylist);
        if (login != null) login.Name = stylist.Name;

        await _context.SaveChangesAsync();
        return Ok(ToAdminDto(stylist, login));
    }

    /// <summary>
    /// Create a login for an existing employee, or reset it with a new temporary password (admin).
    /// The employee must choose their own password at their next sign-in; existing sessions are signed out.
    /// </summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id}/account")]
    public async Task<IActionResult> CreateAccount(int id, [FromBody] CreateStaffAccountDto dto)
    {
        var stylist = await _context.Stylists.FindAsync(id);
        if (stylist == null) return NotFound();

        var error = await ValidateLoginAsync(dto.Email, dto.Password, id);
        if (error != null) return BadRequest(new { message = error });

        var user = await UpsertLoginAsync(stylist, dto.Email, dto.Password);
        return Ok(new
        {
            message = $"Login ready for {stylist.Name.Split(' ')[0]}: {user.Email}. They'll be asked to choose their own password when they first sign in.",
        });
    }

    /// <summary>Remove an employee's login (e.g. when they leave).</summary>
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

    // ------------------------------------------------------------------ helpers

    private async Task<string?> ValidateLoginAsync(string? rawEmail, string? password, int? stylistId)
    {
        var email = Normalize(rawEmail);
        if (!email.Contains('@')) return "Please enter a valid email for the employee's login.";
        if ((password ?? "").Length < MinPasswordLength)
            return $"The temporary password must be at least {MinPasswordLength} characters.";

        var existing = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        var isThisStylistsLogin = existing != null && stylistId != null && existing.StylistId == stylistId;
        if (existing != null && !isThisStylistsLogin)
            return existing.Role == Roles.Customer
                ? "That email is already used by a client account. Please use the employee's work email."
                : "That email already belongs to another staff or admin account.";
        return null;
    }

    private async Task<User> UpsertLoginAsync(Stylist stylist, string rawEmail, string temporaryPassword)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.StylistId == stylist.Id && u.Role == Roles.Stylist);
        if (user == null)
        {
            user = new User();
            _context.Users.Add(user);
        }
        else
        {
            user.TokenVersion++; // sign out any existing sessions
        }

        user.Email = Normalize(rawEmail);
        user.Name = stylist.Name;
        user.Role = Roles.Stylist;
        user.StylistId = stylist.Id;
        user.EmailConfirmed = true;
        user.MustChangePassword = true; // temporary password set by the admin
        user.FailedLoginCount = 0;
        user.LockoutEndUtc = null;
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, temporaryPassword);
        await _context.SaveChangesAsync();
        return user;
    }

    private static string Normalize(string? email) => (email ?? "").Trim().ToLowerInvariant();

    private static void Apply(Stylist s, SaveStylistDto dto)
    {
        s.Name = dto.Name.Trim();
        s.Specialization = (dto.Specialization ?? "").Trim();
        s.Email = (dto.Email ?? "").Trim();
        s.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
        s.IsActive = dto.IsActive;
    }

    private static StylistAdminDto ToAdminDto(Stylist s, User? login) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Specialization = s.Specialization,
        PhotoUrl = s.PhotoUrl,
        IsActive = s.IsActive,
        Email = s.Email,
        PhoneNumber = s.PhoneNumber,
        LoginEmail = login?.Email,
        HasTemporaryPassword = login?.MustChangePassword ?? false,
    };
}
