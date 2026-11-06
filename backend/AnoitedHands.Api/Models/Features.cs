namespace AnoitedHands.Api.Models;

/// <summary>A photo of the salon's work shown in the public gallery.</summary>
public class GalleryItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // Hair, Nails, Facials, Brows & Lashes, Salon
    public string ImagePath { get; set; } = string.Empty; // e.g. /uploads/gallery/abc.jpg
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A client's review, either of the salon overall (ServiceId null) or of one service.</summary>
public class Review
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? ServiceId { get; set; }
    public int Rating { get; set; } // 1-5
    public string Comment { get; set; } = string.Empty;
    public bool IsVerifiedClient { get; set; } // had a paid booking for the service
    public bool IsVisible { get; set; } = true; // admin can hide
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public User? User { get; set; }
    public Service? Service { get; set; }
}

public static class ReportTypes
{
    public const string Concern = "Concern";
    public const string LostItem = "Lost Item";
    public const string Other = "Other";
    public static readonly string[] All = { Concern, LostItem, Other };
}

public static class ReportStatuses
{
    public const string Open = "Open";
    public const string InProgress = "In Progress";
    public const string Resolved = "Resolved";
    public static readonly string[] All = { Open, InProgress, Resolved };
}

/// <summary>A concern, complaint or lost-item report from a client.</summary>
public class SupportReport
{
    public int Id { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty; // e.g. RPT-1106-482
    public int? UserId { get; set; }
    public string Type { get; set; } = ReportTypes.Concern;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime? VisitDate { get; set; }
    public string? ItemDescription { get; set; } // lost items
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = ReportStatuses.Open;
    public string? AdminNotes { get; set; } // visible to the client as the salon's response
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>Simple key/value settings editable at runtime (e.g. the in-salon ordering code).</summary>
public class AppSetting
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

/// <summary>
/// A date with non-standard hours: a special Sunday opening, a public-holiday closure, or shorter hours.
/// </summary>
public class SpecialDay
{
    public int Id { get; set; }
    public DateTime Date { get; set; } // date only
    public bool IsClosed { get; set; }
    public TimeSpan? OpensAt { get; set; }
    public TimeSpan? ClosesAt { get; set; }
    public string? Note { get; set; } // e.g. "Festive season Sunday"
}
