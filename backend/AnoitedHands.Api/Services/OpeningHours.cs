namespace AnoitedHands.Api.Services;

/// <summary>Salon trading hours. Mon-Fri 9AM-6PM, Sat 10AM-5PM, closed Sundays.</summary>
public static class OpeningHours
{
    public const int SlotMinutes = 30;

    /// <summary>Opening and closing time for a date, or null when the salon is closed.</summary>
    public static (TimeSpan Open, TimeSpan Close)? For(DateTime date) => date.DayOfWeek switch
    {
        DayOfWeek.Sunday => null,
        DayOfWeek.Saturday => (TimeSpan.FromHours(10), TimeSpan.FromHours(17)),
        _ => (TimeSpan.FromHours(9), TimeSpan.FromHours(18)),
    };

    public static bool IsClosed(DateTime date) => For(date) == null;
}
