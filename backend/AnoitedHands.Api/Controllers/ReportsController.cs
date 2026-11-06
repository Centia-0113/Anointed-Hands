using System.Net;
using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Controllers;

/// <summary>Concerns, complaints and lost-item reports.</summary>
[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly AnoitedHandsDbContext _context;
    private readonly IEmailSender _email;
    private readonly IConfiguration _config;

    public ReportsController(AnoitedHandsDbContext context, IEmailSender email, IConfiguration config)
    {
        _context = context;
        _email = email;
        _config = config;
    }

    /// <summary>Submit a report. Open to guests; linked to the account when signed in.</summary>
    [EnableRateLimiting(RateLimits.Forms)]
    [HttpPost]
    public async Task<ActionResult<SupportReportDto>> Create([FromBody] CreateReportDto dto)
    {
        if (!ReportTypes.All.Contains(dto.Type))
            return BadRequest(new { message = "Please choose what you're reporting." });
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email) || !dto.Email.Contains('@'))
            return BadRequest(new { message = "Please enter your name and a valid email so we can get back to you." });
        var message = (dto.Message ?? "").Trim();
        if (message.Length < 10)
            return BadRequest(new { message = "Please give us a little more detail (at least 10 characters)." });
        if (message.Length > 2000)
            return BadRequest(new { message = "Please keep your message under 2000 characters." });
        if (dto.Type == ReportTypes.LostItem && string.IsNullOrWhiteSpace(dto.ItemDescription))
            return BadRequest(new { message = "Please describe the item you lost." });

        var report = new SupportReport
        {
            ReferenceNumber = $"RPT-{DateTime.UtcNow:MMdd}-{Random.Shared.Next(100, 999)}",
            UserId = User.UserId(),
            Type = dto.Type,
            Name = dto.Name.Trim(),
            Email = dto.Email.Trim(),
            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
            VisitDate = dto.VisitDate?.Date,
            ItemDescription = string.IsNullOrWhiteSpace(dto.ItemDescription) ? null : dto.ItemDescription.Trim(),
            Message = message,
        };
        _context.SupportReports.Add(report);
        await _context.SaveChangesAsync();

        // Let the salon know
        var adminEmail = _config["Admin:Email"];
        if (!string.IsNullOrWhiteSpace(adminEmail))
        {
            var link = $"{(_config["App:FrontendUrl"] ?? "http://localhost:3000").TrimEnd('/')}/admin";
            await _email.SendAsync(adminEmail, $"New {report.Type.ToLower()} report {report.ReferenceNumber}",
                EmailSender.Layout($"New {report.Type.ToLower()} report",
                    $"{report.Name} ({report.Email}) wrote: {Truncate(report.Message, 300)}",
                    "Open the dashboard", link, $"Reference {report.ReferenceNumber}"));
        }

        return Ok(ToDto(report));
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<List<SupportReportDto>>> GetMine()
    {
        var id = User.UserId();
        var reports = await _context.SupportReports.Where(r => r.UserId == id)
            .OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(reports.Select(ToDto));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<ActionResult<List<SupportReportDto>>> GetAll()
    {
        var reports = await _context.SupportReports.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(reports.Select(ToDto));
    }

    /// <summary>Update status and the salon's response (admin). The client is emailed the update.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateReportDto dto)
    {
        if (!ReportStatuses.All.Contains(dto.Status))
            return BadRequest(new { message = "Unknown status." });
        var report = await _context.SupportReports.FindAsync(id);
        if (report == null) return NotFound();

        var notesChanged = (dto.AdminNotes ?? "").Trim() != (report.AdminNotes ?? "");
        var statusChanged = dto.Status != report.Status;
        report.Status = dto.Status;
        report.AdminNotes = string.IsNullOrWhiteSpace(dto.AdminNotes) ? null : dto.AdminNotes.Trim();
        report.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (statusChanged || notesChanged)
        {
            var link = $"{(_config["App:FrontendUrl"] ?? "http://localhost:3000").TrimEnd('/')}/help";
            await _email.SendAsync(report.Email, $"Update on your report {report.ReferenceNumber}",
                EmailSender.Layout($"Your report is now: {report.Status}",
                    report.AdminNotes ?? "We've updated the status of your report.",
                    "View on our website", link,
                    $"Reference {report.ReferenceNumber}. Reply to this email if you need anything else."));
        }
        return NoContent();
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";

    private static SupportReportDto ToDto(SupportReport r) => new()
    {
        Id = r.Id,
        ReferenceNumber = r.ReferenceNumber,
        Type = r.Type,
        Name = r.Name,
        Email = r.Email,
        Phone = r.Phone,
        VisitDate = r.VisitDate,
        ItemDescription = r.ItemDescription,
        Message = r.Message,
        Status = r.Status,
        AdminNotes = r.AdminNotes,
        CreatedAt = DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc),
        UpdatedAt = r.UpdatedAt == null ? null : DateTime.SpecifyKind(r.UpdatedAt.Value, DateTimeKind.Utc),
    };
}
