namespace AnoitedHands.Api.Models;

public class Payment
{
    public int Id { get; set; }
    public string PaymentReference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Type { get; set; } = string.Empty; // "Booking" or "Order"
    public int RelatedId { get; set; } // Booking or Order ID
    public string Status { get; set; } = "Pending"; // Pending, Confirmed, Cancelled, Refunded
    public DateTime PaymentDateTime { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
