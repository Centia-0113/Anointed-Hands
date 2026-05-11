namespace AnoitedHands.Api.Models;

public class Order
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty; // e.g., "AH-10234"
    public string CustomerName { get; set; } = string.Empty;
    public string Status { get; set; } = "Received"; // Received, Preparing, Ready, Completed, Cancelled
    public string PaymentReference { get; set; } = string.Empty;
    public bool IsPaid { get; set; } = false;
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    
    // Items in order
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int CafeItemId { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    
    // Navigation
    public Order? Order { get; set; }
    public CafeItem? CafeItem { get; set; }
}
