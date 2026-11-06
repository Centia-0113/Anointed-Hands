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

public class DayHoursDto
{
    public string Date { get; set; } = string.Empty; // yyyy-MM-dd
    public bool IsOpen { get; set; }
    public string? Opens { get; set; }  // HH:mm
    public string? Closes { get; set; }
    public bool IsSpecial { get; set; }
    public string? Note { get; set; }
}

public class SpecialDayDto
{
    public int Id { get; set; }
    public string Date { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
    public string? Opens { get; set; }
    public string? Closes { get; set; }
    public string? Note { get; set; }
}

public class SaveSpecialDayDto
{
    public DateTime Date { get; set; }
    public bool IsClosed { get; set; }
    public string? Opens { get; set; }  // "10:00"
    public string? Closes { get; set; } // "14:00"
    public string? Note { get; set; }
}

/// <summary>A client as seen by their stylist: contact details plus visit history with that stylist.</summary>
public class StaffClientDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public int TotalBookings { get; set; }
    public int CompletedVisits { get; set; }
    public int NoShows { get; set; }
    public DateTime? LastVisit { get; set; }
    public DateTime? NextAppointment { get; set; }
    public decimal TotalSpent { get; set; }
    public List<BookingDto> Bookings { get; set; } = new();
}
