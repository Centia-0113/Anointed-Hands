using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController : ControllerBase
{
    private readonly AnoitedHandsDbContext _context;

    public ServicesController(AnoitedHandsDbContext context)
    {
        _context = context;
    }

    /// <summary>Active services (public).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ServiceDto>>> GetServices()
    {
        var services = await _context.Services.Where(s => s.IsActive).ToListAsync();
        // Sorted in memory: SQLite can't ORDER BY decimal columns
        return Ok(services.OrderBy(s => s.Category).ThenBy(s => s.Price).Select(ToDto));
    }

    /// <summary>All services including hidden ones (admin).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<ServiceDto>>> GetAll()
    {
        var services = await _context.Services.OrderBy(s => s.Category).ThenBy(s => s.Name).ToListAsync();
        return Ok(services.Select(ToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ServiceDto>> GetService(int id)
    {
        var service = await _context.Services.FindAsync(id);
        return service == null ? NotFound() : Ok(ToDto(service));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<ServiceDto>> Create([FromBody] SaveServiceDto dto)
    {
        var error = Validate(dto);
        if (error != null) return BadRequest(new { message = error });

        var service = new Service();
        Apply(service, dto);
        _context.Services.Add(service);
        await _context.SaveChangesAsync();
        return Ok(ToDto(service));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id}")]
    public async Task<ActionResult<ServiceDto>> Update(int id, [FromBody] SaveServiceDto dto)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null) return NotFound();
        var error = Validate(dto);
        if (error != null) return BadRequest(new { message = error });

        Apply(service, dto); // existing bookings keep the price they were booked at
        await _context.SaveChangesAsync();
        return Ok(ToDto(service));
    }

    private static string? Validate(SaveServiceDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return "Please enter a service name.";
        if (string.IsNullOrWhiteSpace(dto.Category)) return "Please enter a category (e.g. Hair, Nails, Facials).";
        if (dto.Price <= 0 || dto.Price > 100000) return "Please enter a valid price.";
        if (dto.DurationMinutes < 15 || dto.DurationMinutes > 600 || dto.DurationMinutes % 15 != 0)
            return "Duration must be between 15 minutes and 10 hours, in 15-minute steps.";
        if (dto.DiscountPercent is < 0 or > 90) return "Discount must be between 0% and 90%.";
        return null;
    }

    private static void Apply(Service s, SaveServiceDto dto)
    {
        s.Name = dto.Name.Trim();
        s.Description = (dto.Description ?? "").Trim();
        s.Price = Math.Round(dto.Price, 2);
        s.DurationMinutes = dto.DurationMinutes;
        s.Category = dto.Category.Trim();
        s.DiscountPercent = dto.DiscountPercent is > 0 ? dto.DiscountPercent : null;
        s.DiscountEndsOn = s.DiscountPercent == null ? null : dto.DiscountEndsOn?.Date;
        s.IsActive = dto.IsActive;
    }

    public static ServiceDto ToDto(Service s)
    {
        var final = Pricing.Effective(s.Price, s.DiscountPercent, s.DiscountEndsOn);
        return new ServiceDto
        {
            Id = s.Id,
            Name = s.Name,
            Description = s.Description,
            Price = s.Price,
            FinalPrice = final,
            DiscountPercent = s.DiscountPercent,
            DiscountEndsOn = s.DiscountEndsOn,
            IsDiscountActive = Pricing.IsDiscountActive(s.DiscountPercent, s.DiscountEndsOn),
            DepositAmount = Pricing.Deposit(final),
            DurationMinutes = s.DurationMinutes,
            Category = s.Category,
            ImageUrl = s.ImageUrl,
            IsActive = s.IsActive,
        };
    }
}
