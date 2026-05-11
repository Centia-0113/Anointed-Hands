using Microsoft.EntityFrameworkCore;
using AnoitedHands.Api.Models;

namespace AnoitedHands.Api.Data;

public class AnoitedHandsDbContext : DbContext
{
    public AnoitedHandsDbContext(DbContextOptions<AnoitedHandsDbContext> options)
        : base(options)
    {
    }

    public DbSet<Service> Services { get; set; }
    public DbSet<CafeItem> CafeItems { get; set; }
    public DbSet<Stylist> Stylists { get; set; }
    public DbSet<Booking> Bookings { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Payment> Payments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Booking relationships
        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Service)
            .WithMany()
            .HasForeignKey(b => b.ServiceId);

        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Stylist)
            .WithMany()
            .HasForeignKey(b => b.StylistId);

        // Order relationships
        modelBuilder.Entity<Order>()
            .HasMany(o => o.Items)
            .WithOne(oi => oi.Order)
            .HasForeignKey(oi => oi.OrderId);

        modelBuilder.Entity<OrderItem>()
            .HasOne(oi => oi.CafeItem)
            .WithMany()
            .HasForeignKey(oi => oi.CafeItemId);

        // Seed initial data
        SeedData(modelBuilder);
    }

    private void SeedData(ModelBuilder modelBuilder)
    {
        // Seed Stylists
        modelBuilder.Entity<Stylist>().HasData(
            new Stylist { Id = 1, Name = "Zara Malik", Email = "zara@anoitedhandsalon.com", Specialization = "Hair", IsActive = true },
            new Stylist { Id = 2, Name = "Keisha Brown", Email = "keisha@anoitedhandsalon.com", Specialization = "Nails", IsActive = true },
            new Stylist { Id = 3, Name = "Amara Jones", Email = "amara@anoitedhandsalon.com", Specialization = "Facials", IsActive = true }
        );

        // Seed Services
        modelBuilder.Entity<Service>().HasData(
            new Service { Id = 1, Name = "Hair Wash & Blow Dry", Description = "Professional wash, conditioning, and blow dry", Price = 45.00m, DurationMinutes = 45, Category = "Hair", IsActive = true },
            new Service { Id = 2, Name = "Weave Installation", Description = "Full weave installation with styling", Price = 150.00m, DurationMinutes = 180, Category = "Hair", IsActive = true },
            new Service { Id = 3, Name = "Manicure", Description = "Full manicure with polish", Price = 30.00m, DurationMinutes = 60, Category = "Nails", IsActive = true },
            new Service { Id = 4, Name = "Pedicure", Description = "Full pedicure with polish", Price = 35.00m, DurationMinutes = 60, Category = "Nails", IsActive = true },
            new Service { Id = 5, Name = "Facial Treatment", Description = "Deep cleansing facial with extracts", Price = 60.00m, DurationMinutes = 75, Category = "Facials", IsActive = true }
        );

        // Seed Café Items
        modelBuilder.Entity<CafeItem>().HasData(
            new CafeItem { Id = 1, Name = "Chocolate Cake Slice", Description = "Rich chocolate cake with ganache", Price = 5.00m, Category = "Cakes", IsActive = true, IsOutOfStock = false },
            new CafeItem { Id = 2, Name = "Blueberry Muffin", Description = "Fresh blueberry muffin", Price = 4.00m, Category = "Muffins", IsActive = true, IsOutOfStock = false },
            new CafeItem { Id = 3, Name = "Glazed Donut", Description = "Classic glazed donut", Price = 2.50m, Category = "Donuts", IsActive = true, IsOutOfStock = false },
            new CafeItem { Id = 4, Name = "Iced Coffee", Description = "Cold brew iced coffee", Price = 3.50m, Category = "Refreshments", IsActive = true, IsOutOfStock = false },
            new CafeItem { Id = 5, Name = "Fresh Orange Juice", Description = "Freshly squeezed orange juice", Price = 4.50m, Category = "Refreshments", IsActive = true, IsOutOfStock = false }
        );
    }
}
