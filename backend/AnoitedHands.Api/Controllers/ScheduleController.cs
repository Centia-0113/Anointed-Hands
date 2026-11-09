using System.Globalization;
using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Controllers;

/// <summary>Opening hours, special Sunday openings and closures.</summary>
[ApiController]
[Route("api/[controller]")]
public class ScheduleController : ControllerBase
{
    private readonly AnoitedHandsDbContext _context;
    private readonly IScheduleService _schedule;

    public ScheduleController(AnoitedHandsDbContext context, IScheduleService schedule)
    {
        _context = context;
        _schedule = schedule;
    }

    /// <summary>Whether the salon is open on a date, and its hours.</summary>
    [HttpGet("day")]
    public async Task<ActionResult<DayHoursDto>> GetDay([FromQuery] DateTime date)
    {
        var h = await _schedule.GetHoursAsync(date);
        return Ok(new DayHoursDto
        {
            Date = h.Date.ToString("yyyy-MM-dd"),
            IsOpen = h.IsOpen,
            Opens = Fmt(h.Open),
            Closes = Fmt(h.Close),
            IsSpecial = h.IsSpecial,
            Note = h.Note,
        });
    }

    /// <summary>Upcoming special days (public, e.g. "Open Sunday 15 Nov 10:00-14:00").</summary>
    [HttpGet("special-days")]
    public async Task<ActionResult<List<SpecialDayDto>>> GetSpecialDays()
    {
        var today = DateTime.Today;
        var days = await _context.SpecialDays.Where(d => d.Date >= today).OrderBy(d => d.Date).ToListAsync();
        return Ok(days.Select(ToDto));
    }

    /// <summary>Add or replace the special hours for a date (admin).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost("special-days")]
    public async Task<ActionResult<SpecialDayDto>> Save([FromBody] SaveSpecialDayDto dto)
    {
        var date = dto.Date.Date;
        if (date < DateTime.Today) return BadRequest(new { message = "Please choose today or a future date." });

        TimeSpan? opens = null, closes = null;
        if (!dto.IsClosed)
        {
            if (!TryParse(dto.Opens, out var o) || !TryParse(dto.Closes, out var c))
                return BadRequest(new { message = "Please enter opening and closing times (e.g. 10:00 and 14:00)." });
            if (c <= o) return BadRequest(new { message = "Closing time must be after opening time." });
            if (o.Minutes % 30 != 0 || c.Minutes % 30 != 0)
                return BadRequest(new { message = "Please use times on the hour or half hour." });
            opens = o;
            closes = c;
        }

        if (dto.IsClosed)
        {
            var booked = await _context.Bookings.CountAsync(b => b.BookingDateTime >= date && b.BookingDateTime < date.AddDays(1)
                && !BookingStatuses.Released.Contains(b.Status));
            if (booked > 0)
                return BadRequest(new { message = $"There are {booked} active booking(s) on this day. Cancel or move them first." });
        }

        var day = await _context.SpecialDays.FirstOrDefaultAsync(d => d.Date == date);
        if (day == null)
        {
            day = new SpecialDay { Date = date };
            _context.SpecialDays.Add(day);
        }
        day.IsClosed = dto.IsClosed;
        day.OpensAt = opens;
        day.ClosesAt = closes;
        day.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
        await _context.SaveChangesAsync();
        return Ok(ToDto(day));
    }

    /// <summary>Remove a special day so the standard hours apply again (admin).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("special-days/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var day = await _context.SpecialDays.FindAsync(id);
        if (day == null) return NotFound();

        // Don't strand bookings made for a special Sunday opening
        if (!day.IsClosed && !(await _schedule.GetStandardHoursAsync(day.Date)).IsOpen)
        {
            var booked = await _context.Bookings.CountAsync(b => b.BookingDateTime >= day.Date && b.BookingDateTime < day.Date.AddDays(1)
                && !BookingStatuses.Released.Contains(b.Status));
            if (booked > 0)
                return BadRequest(new { message = $"There are {booked} active booking(s) on this special opening. Cancel them first." });
        }

        _context.SpecialDays.Remove(day);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static bool TryParse(string? s, out TimeSpan t) =>
        TimeSpan.TryParseExact(s ?? "", @"hh\:mm", CultureInfo.InvariantCulture, out t) && t < TimeSpan.FromHours(24);

    private static string? Fmt(TimeSpan? t) => t?.ToString(@"hh\:mm");

    private static SpecialDayDto ToDto(SpecialDay d) => new()
    {
        Id = d.Id,
        Date = d.Date.ToString("yyyy-MM-dd"),
        IsClosed = d.IsClosed,
        Opens = Fmt(d.OpensAt),
        Closes = Fmt(d.ClosesAt),
        Note = d.Note,
    };
}
