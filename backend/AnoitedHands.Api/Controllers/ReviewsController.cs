using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly AnoitedHandsDbContext _context;

    public ReviewsController(AnoitedHandsDbContext context)
    {
        _context = context;
    }

    /// <summary>Public, visible reviews with the average rating. Optional filter by service.</summary>
    [HttpGet]
    public async Task<ActionResult<ReviewSummaryDto>> GetPublic([FromQuery] int? serviceId)
    {
        var query = Base().Where(r => r.IsVisible);
        if (serviceId != null) query = query.Where(r => r.ServiceId == serviceId);
        var reviews = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();

        return Ok(new ReviewSummaryDto
        {
            Count = reviews.Count,
            Average = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(r => r.Rating), 1),
            Reviews = reviews.Select(r => ToDto(r, User.UserId())).ToList(),
        });
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<List<ReviewDto>>> GetMine()
    {
        var id = User.UserId()!.Value;
        var reviews = await Base().Where(r => r.UserId == id).OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(reviews.Select(r => ToDto(r, id)));
    }

    /// <summary>All reviews including hidden ones (admin).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpGet("all")]
    public async Task<ActionResult<List<ReviewDto>>> GetAll()
    {
        var reviews = await Base().OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(reviews.Select(r => ToDto(r, null)));
    }

    /// <summary>Create or update the signed-in client's review (one per service, plus one overall).</summary>
    [Authorize]
    [EnableRateLimiting(RateLimits.Forms)]
    [HttpPost]
    public async Task<ActionResult<ReviewDto>> Upsert([FromBody] CreateReviewDto dto)
    {
        if (User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Stylist))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Reviews can only be written by clients." });
        var userId = User.UserId()!.Value;
        if (dto.Rating is < 1 or > 5)
            return BadRequest(new { message = "Please choose a rating from 1 to 5 stars." });
        var comment = (dto.Comment ?? "").Trim();
        if (comment.Length < 5)
            return BadRequest(new { message = "Please write a few words about your experience." });
        if (comment.Length > 1000)
            return BadRequest(new { message = "Reviews can be up to 1000 characters." });
        if (dto.ServiceId != null && !await _context.Services.AnyAsync(s => s.Id == dto.ServiceId))
            return BadRequest(new { message = "Unknown service." });

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return Unauthorized();

        // Verified = they have a paid or completed booking (for this service, if one was chosen)
        var email = user.EmailConfirmed ? user.Email : null;
        var paid = _context.Bookings.Where(b => (b.IsPaid || b.Status == BookingStatuses.Completed) &&
            (b.UserId == userId || (email != null && b.UserId == null && b.CustomerEmail.ToLower() == email)));
        if (dto.ServiceId != null) paid = paid.Where(b => b.ServiceId == dto.ServiceId);
        var verified = await paid.AnyAsync();

        var review = await _context.Reviews.FirstOrDefaultAsync(r => r.UserId == userId && r.ServiceId == dto.ServiceId);
        if (review == null)
        {
            review = new Review { UserId = userId, ServiceId = dto.ServiceId };
            _context.Reviews.Add(review);
        }
        else
        {
            review.UpdatedAt = DateTime.UtcNow;
        }
        review.Rating = dto.Rating;
        review.Comment = comment;
        review.IsVerifiedClient = verified;
        await _context.SaveChangesAsync();

        var saved = await Base().FirstAsync(r => r.Id == review.Id);
        return Ok(ToDto(saved, userId));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id}/visibility")]
    public async Task<IActionResult> SetVisibility(int id, [FromBody] ReviewVisibilityDto dto)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null) return NotFound();
        review.IsVisible = dto.IsVisible;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Delete a review: the author or an admin.</summary>
    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null || (!User.IsInRole(Roles.Admin) && review.UserId != User.UserId()))
            return NotFound();
        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private IQueryable<Review> Base() => _context.Reviews.Include(r => r.User).Include(r => r.Service);

    private static ReviewDto ToDto(Review r, int? currentUserId) => new()
    {
        Id = r.Id,
        ReviewerName = DisplayName(r.User?.Name),
        ServiceId = r.ServiceId,
        ServiceName = r.Service?.Name,
        Rating = r.Rating,
        Comment = r.Comment,
        IsVerifiedClient = r.IsVerifiedClient,
        IsVisible = r.IsVisible,
        IsMine = currentUserId != null && r.UserId == currentUserId,
        CreatedAt = DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc),
    };

    /// <summary>"Lerato Mokoena" → "Lerato M." so full names aren't published.</summary>
    private static string DisplayName(string? name)
    {
        var parts = (name ?? "Client").Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 1 ? $"{parts[0]} {char.ToUpperInvariant(parts[^1][0])}." : parts.FirstOrDefault() ?? "Client";
    }
}
