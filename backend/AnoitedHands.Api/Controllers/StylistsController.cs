using Microsoft.AspNetCore.Mvc;
using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<StylistDto>>> GetStylists()
    {
        var stylists = await _context.Stylists
            .Where(s => s.IsActive)
            .Select(s => new StylistDto
            {
                Id = s.Id,
                Name = s.Name,
                Specialization = s.Specialization,
                PhotoUrl = s.PhotoUrl,
                IsActive = s.IsActive
            })
            .ToListAsync();

        return Ok(stylists);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StylistDto>> GetStylist(int id)
    {
        var stylist = await _context.Stylists.FindAsync(id);
        if (stylist == null)
            return NotFound();

        return Ok(new StylistDto
        {
            Id = stylist.Id,
            Name = stylist.Name,
            Specialization = stylist.Specialization,
            PhotoUrl = stylist.PhotoUrl,
            IsActive = stylist.IsActive
        });
    }
}
