using Microsoft.AspNetCore.Mvc;
using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CafeItemDto>>> GetCafeItems()
    {
        var items = await _context.CafeItems
            .Where(c => c.IsActive)
            .Select(c => new CafeItemDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                Price = c.Price,
                Category = c.Category,
                ImageUrl = c.ImageUrl,
                IsActive = c.IsActive,
                IsOutOfStock = c.IsOutOfStock
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CafeItemDto>> GetCafeItem(int id)
    {
        var item = await _context.CafeItems.FindAsync(id);
        if (item == null)
            return NotFound();

        return Ok(new CafeItemDto
        {
            Id = item.Id,
            Name = item.Name,
            Description = item.Description,
            Price = item.Price,
            Category = item.Category,
            ImageUrl = item.ImageUrl,
            IsActive = item.IsActive,
            IsOutOfStock = item.IsOutOfStock
        });
    }
}
