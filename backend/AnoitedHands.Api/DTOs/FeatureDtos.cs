namespace AnoitedHands.Api.DTOs;

public class GalleryItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ReviewDto
{
    public int Id { get; set; }
    public string ReviewerName { get; set; } = string.Empty; // "Lerato M."
    public int? ServiceId { get; set; }
    public string? ServiceName { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public bool IsVerifiedClient { get; set; }
    public bool IsVisible { get; set; }
    public bool IsMine { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ReviewSummaryDto
{
    public double Average { get; set; }
    public int Count { get; set; }
    public List<ReviewDto> Reviews { get; set; } = new();
}

public class CreateReviewDto
{
    public int? ServiceId { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
}

public class ReviewVisibilityDto
{
    public bool IsVisible { get; set; }
}

public class CreateReportDto
{
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime? VisitDate { get; set; }
    public string? ItemDescription { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class SupportReportDto
{
    public int Id { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime? VisitDate { get; set; }
    public string? ItemDescription { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AdminNotes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class UpdateReportDto
{
    public string Status { get; set; } = string.Empty;
    public string? AdminNotes { get; set; }
}

public class PaymentInfoDto
{
    public string BusinessName { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string BranchCode { get; set; } = string.Empty;
    /// <summary>Optional QR payment link with {reference}, {amount} and {amountCents} placeholders.</summary>
    public string? ScanToPayUrlTemplate { get; set; }
}

public class SalonCodeDto
{
    public string Code { get; set; } = string.Empty;
}
