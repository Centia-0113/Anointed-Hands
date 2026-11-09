using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GalleryController : ControllerBase
{
    private const long MaxBytes = 5 * 1024 * 1024; // 5 MB
    public static readonly string[] Categories = { "Hair", "Nails", "Facials", "Brows & Lashes", "Salon" };

    private readonly AnoitedHandsDbContext _context;
    private readonly IWebHostEnvironment _env;

    public GalleryController(AnoitedHandsDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    [HttpGet]
    public async Task<ActionResult<List<GalleryItemDto>>> GetAll()
    {
        var items = await _context.GalleryItems.OrderByDescending(g => g.CreatedAt).ToListAsync();
        return Ok(items.Select(ToDto));
    }

    [HttpGet("categories")]
    public ActionResult<string[]> GetCategories() => Ok(Categories);

    /// <summary>Upload a photo (admin only). multipart/form-data: file, title, category.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    [RequestSizeLimit(MaxBytes + 64 * 1024)]
    public async Task<ActionResult<GalleryItemDto>> Upload([FromForm] IFormFile? file, [FromForm] string? title, [FromForm] string? category)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Please choose a photo to upload." });
        if (file.Length > MaxBytes)
            return BadRequest(new { message = "Photos must be 5 MB or smaller." });
        if (string.IsNullOrWhiteSpace(category) || !Categories.Contains(category))
            return BadRequest(new { message = "Please choose a valid category." });

        // Check the actual file signature, not just the extension
        var ext = await DetectImageExtensionAsync(file);
        if (ext == null)
            return BadRequest(new { message = "Only JPG, PNG or WebP images are allowed." });

        var folder = Path.Combine(WebRoot(), "uploads", "gallery");
        Directory.CreateDirectory(folder);
        var fileName = $"{Guid.NewGuid():N}{ext}";
        await using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
        {
            await file.CopyToAsync(stream);
        }

        var item = new GalleryItem
        {
            Title = string.IsNullOrWhiteSpace(title) ? category : title.Trim()[..Math.Min(title.Trim().Length, 120)],
            Category = category,
            ImagePath = $"/uploads/gallery/{fileName}",
        };
        _context.GalleryItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _context.GalleryItems.FindAsync(id);
        if (item == null) return NotFound();

        if (item.ImagePath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            var path = Path.Combine(WebRoot(), item.ImagePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
        }

        _context.GalleryItems.Remove(item);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private string WebRoot() => _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");

    private static GalleryItemDto ToDto(GalleryItem g) => new()
    {
        Id = g.Id,
        Title = g.Title,
        Category = g.Category,
        ImageUrl = g.ImagePath,
        CreatedAt = DateTime.SpecifyKind(g.CreatedAt, DateTimeKind.Utc),
    };

    private static async Task<string?> DetectImageExtensionAsync(IFormFile file)
    {
        var header = new byte[12];
        await using var s = file.OpenReadStream();
        var read = await s.ReadAsync(header);
        if (read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) return ".jpg";
        if (read >= 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) return ".png";
        if (read >= 12 && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
            && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') return ".webp";
        return null;
    }
}
