using AnoitedHands.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Data;

/// <summary>
/// Adds the salon's own photos (wwwroot/images/gallery) to the gallery the first time the site runs.
/// Runs once only, so photos the admin removes later don't come back.
/// </summary>
public static class GallerySeeder
{
    private const string SeededKey = "GallerySeeded";

    private static readonly (string File, string Title, string Category)[] Photos =
    {
        ("copper-afro-outdoors.jpg", "Copper afro", "Hair"),
        ("sleek-lace-bob.jpg", "Sleek lace-front bob", "Hair"),
        ("natural-afro-smile.jpg", "Natural afro", "Hair"),
        ("afro-puff-bun.jpg", "Afro puff", "Hair"),
        ("copper-curly-afro.jpg", "Copper curly afro", "Hair"),
        ("sleek-straight-install.jpg", "Sleek straight install", "Hair"),
        ("big-natural-afro.jpg", "Big natural afro", "Hair"),
        ("high-afro-puff.jpg", "High afro puff", "Hair"),
    };

    public static async Task SeedAsync(AnoitedHandsDbContext db, IWebHostEnvironment env)
    {
        if (await db.AppSettings.AnyAsync(s => s.Key == SeededKey)) return;

        var folder = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "images", "gallery");
        var now = DateTime.UtcNow;
        var i = 0;
        foreach (var (file, title, category) in Photos)
        {
            if (!File.Exists(Path.Combine(folder, file))) continue;
            var path = $"/images/gallery/{file}";
            if (await db.GalleryItems.AnyAsync(g => g.ImagePath == path)) continue;
            // Stagger timestamps so the gallery keeps this order (newest first)
            db.GalleryItems.Add(new GalleryItem { Title = title, Category = category, ImagePath = path, CreatedAt = now.AddSeconds(-i++) });
        }

        db.AppSettings.Add(new AppSetting { Key = SeededKey, Value = now.ToString("O") });
        await db.SaveChangesAsync();
    }
}
