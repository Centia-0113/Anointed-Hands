namespace AnoitedHands.Api.Models;

public static class PaymentProviders
{
    public const string PayFast = "PayFast";
    public const string BankStatement = "Bank statement";
}

/// <summary>A payment received against a booking or café order (from PayFast or a bank statement import).</summary>
public class Payment
{
    public int Id { get; set; }
    public string PaymentReference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Type { get; set; } = string.Empty; // "Booking" or "Order"
    public int RelatedId { get; set; } // Booking or Order ID
    public string Status { get; set; } = "Confirmed"; // Confirmed, Review (needs the admin's attention)
    public DateTime PaymentDateTime { get; set; }
    public string? Notes { get; set; }
    public string Provider { get; set; } = string.Empty;
    /// <summary>Provider's transaction id (PayFast pf_payment_id or a statement-row fingerprint); prevents double-counting.</summary>
    public string? ProviderTransactionId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
