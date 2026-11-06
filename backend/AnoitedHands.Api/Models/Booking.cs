namespace AnoitedHands.Api.Models;

public class Booking
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public int ServiceId { get; set; }
    public int StylistId { get; set; }
    public DateTime BookingDateTime { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Confirmed, Completed, Cancelled
    public string PaymentReference { get; set; } = string.Empty;
    public bool IsPaid { get; set; } = false;
    public string? Notes { get; set; }
    public int? UserId { get; set; } // set when booked by a signed-in customer
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Service? Service { get; set; }
    public Stylist? Stylist { get; set; }
}
