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
public class CafeItemsController : ControllerBase
{
    private readonly AnoitedHandsDbContext _context;

    public CafeItemsController(AnoitedHandsDbContext context)
    {
        _context = context;
    }

    /// <summary>Active menu items (public).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CafeItemDto>>> GetCafeItems()
    {
        var items = await _context.CafeItems.Where(c => c.IsActive)
            .OrderBy(c => c.Category).ThenBy(c => c.Name).ToListAsync();
        return Ok(items.Select(ToDto));
    }

    /// <summary>All menu items including hidden ones (admin).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<CafeItemDto>>> GetAll()
    {
        var items = await _context.CafeItems.OrderBy(c => c.Category).ThenBy(c => c.Name).ToListAsync();
        return Ok(items.Select(ToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CafeItemDto>> GetCafeItem(int id)
    {
        var item = await _context.CafeItems.FindAsync(id);
        return item == null ? NotFound() : Ok(ToDto(item));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<CafeItemDto>> Create([FromBody] SaveCafeItemDto dto)
    {
        var error = Validate(dto);
        if (error != null) return BadRequest(new { message = error });

        var item = new CafeItem();
        Apply(item, dto);
        _context.CafeItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id}")]
    public async Task<ActionResult<CafeItemDto>> Update(int id, [FromBody] SaveCafeItemDto dto)
    {
        var item = await _context.CafeItems.FindAsync(id);
        if (item == null) return NotFound();
        var error = Validate(dto);
        if (error != null) return BadRequest(new { message = error });

        Apply(item, dto);
        await _context.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    private static string? Validate(SaveCafeItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return "Please enter an item name.";
        if (string.IsNullOrWhiteSpace(dto.Category)) return "Please enter a category (e.g. Cakes, Refreshments).";
        if (dto.Price <= 0 || dto.Price > 10000) return "Please enter a valid price.";
        if (dto.DiscountPercent is < 0 or > 90) return "Discount must be between 0% and 90%.";
        return null;
    }

    private static void Apply(CafeItem c, SaveCafeItemDto dto)
    {
        c.Name = dto.Name.Trim();
        c.Description = (dto.Description ?? "").Trim();
        c.Price = Math.Round(dto.Price, 2);
        c.Category = dto.Category.Trim();
        c.DiscountPercent = dto.DiscountPercent is > 0 ? dto.DiscountPercent : null;
        c.DiscountEndsOn = c.DiscountPercent == null ? null : dto.DiscountEndsOn?.Date;
        c.IsActive = dto.IsActive;
        c.IsOutOfStock = dto.IsOutOfStock;
    }

    public static CafeItemDto ToDto(CafeItem c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Description = c.Description,
        Price = c.Price,
        FinalPrice = Pricing.Effective(c.Price, c.DiscountPercent, c.DiscountEndsOn),
        DiscountPercent = c.DiscountPercent,
        DiscountEndsOn = c.DiscountEndsOn,
        IsDiscountActive = Pricing.IsDiscountActive(c.DiscountPercent, c.DiscountEndsOn),
        Category = c.Category,
        ImageUrl = c.ImageUrl,
        IsActive = c.IsActive,
        IsOutOfStock = c.IsOutOfStock,
    };
}
