namespace AnoitedHands.Api.Models;

public class CafeItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Category { get; set; } = string.Empty; // Cakes, Muffins, Donuts, Refreshments
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>Optional percentage off (1-90). Applies until DiscountEndsOn (inclusive) when set.</summary>
    public int? DiscountPercent { get; set; }
    public DateTime? DiscountEndsOn { get; set; }
    public bool IsOutOfStock { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
