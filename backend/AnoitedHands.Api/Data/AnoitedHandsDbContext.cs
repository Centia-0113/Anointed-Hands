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
    public DbSet<User> Users { get; set; }
    public DbSet<UserToken> UserTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // On PostgreSQL keep this app's tables in their own schema inside the shared database
        if (Database.IsNpgsql())
            modelBuilder.HasDefaultSchema("anointed_hands");

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<UserToken>()
            .HasIndex(t => t.TokenHash)
            .IsUnique();
        modelBuilder.Entity<UserToken>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Booking>().HasIndex(b => b.UserId);
        modelBuilder.Entity<Booking>().HasIndex(b => b.CustomerEmail);
        modelBuilder.Entity<Order>().HasIndex(o => o.UserId);

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

        // Seed Services (prices in ZAR)
        modelBuilder.Entity<Service>().HasData(
            new Service { Id = 1, Name = "Wash & Blow Dry", Description = "Professional wash, deep conditioning and a silky blow dry", Price = 250.00m, DurationMinutes = 45, Category = "Hair", IsActive = true },
            new Service { Id = 2, Name = "Weave Installation", Description = "Full weave installation with cut and styling", Price = 850.00m, DurationMinutes = 180, Category = "Hair", IsActive = true },
            new Service { Id = 3, Name = "Knotless Braids", Description = "Medium knotless braids, waist length", Price = 950.00m, DurationMinutes = 240, Category = "Hair", IsActive = true },
            new Service { Id = 4, Name = "Gel Manicure", Description = "Cuticle care, shaping and long-lasting gel polish", Price = 280.00m, DurationMinutes = 60, Category = "Nails", IsActive = true },
            new Service { Id = 5, Name = "Spa Pedicure", Description = "Soak, scrub, massage and polish", Price = 320.00m, DurationMinutes = 60, Category = "Nails", IsActive = true },
            new Service { Id = 6, Name = "Signature Facial", Description = "Deep cleansing facial with extractions and a glow mask", Price = 450.00m, DurationMinutes = 75, Category = "Facials", IsActive = true }
        );

        // Seed Cafe Items (prices in ZAR)
        modelBuilder.Entity<CafeItem>().HasData(
            new CafeItem { Id = 1, Name = "Chocolate Cake Slice", Description = "Rich chocolate cake with ganache", Price = 45.00m, Category = "Cakes", IsActive = true, IsOutOfStock = false },
            new CafeItem { Id = 2, Name = "Red Velvet Cupcake", Description = "Cream cheese frosting with gold sprinkles", Price = 35.00m, Category = "Cakes", IsActive = true, IsOutOfStock = false },
            new CafeItem { Id = 3, Name = "Blueberry Muffin", Description = "Freshly baked blueberry muffin", Price = 30.00m, Category = "Muffins", IsActive = true, IsOutOfStock = false },
            new CafeItem { Id = 4, Name = "Glazed Donut", Description = "Classic glazed donut", Price = 20.00m, Category = "Donuts", IsActive = true, IsOutOfStock = false },
            new CafeItem { Id = 5, Name = "Iced Coffee", Description = "Cold brew over ice with milk", Price = 38.00m, Category = "Refreshments", IsActive = true, IsOutOfStock = false },
            new CafeItem { Id = 6, Name = "Rose Latte", Description = "Espresso, steamed milk and a hint of rose", Price = 42.00m, Category = "Refreshments", IsActive = true, IsOutOfStock = false },
            new CafeItem { Id = 7, Name = "Fresh Orange Juice", Description = "Freshly squeezed orange juice", Price = 32.00m, Category = "Refreshments", IsActive = true, IsOutOfStock = false }
        );
    }
}
