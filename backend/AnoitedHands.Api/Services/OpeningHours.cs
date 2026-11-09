using AnoitedHands.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Services;

public static class OpeningHours
{
    public const int SlotMinutes = 30;
}

public record DayHours(DateTime Date, bool IsOpen, TimeSpan? Open, TimeSpan? Close, bool IsSpecial, string? Note);

/// <summary>
/// Opening hours for a given date: the weekly hours the admin set under Website Content, overridden by
/// any special day (e.g. opening on a Sunday, closing on a public holiday).
/// </summary>
public interface IScheduleService
{
    Task<DayHours> GetHoursAsync(DateTime date);
    /// <summary>Normal weekly hours for that weekday, ignoring special days.</summary>
    Task<DayHours> GetStandardHoursAsync(DateTime date);
}

public class ScheduleService : IScheduleService
{
    private readonly AnoitedHandsDbContext _context;
    private readonly ISiteSettingsService _settings;

    public ScheduleService(AnoitedHandsDbContext context, ISiteSettingsService settings)
    {
        _context = context;
        _settings = settings;
    }

    public async Task<DayHours> GetHoursAsync(DateTime date)
    {
        var day = date.Date;
        var special = await _context.SpecialDays.FirstOrDefaultAsync(s => s.Date == day);
        if (special != null)
        {
            return special.IsClosed || special.OpensAt == null || special.ClosesAt == null
                ? new DayHours(day, false, null, null, true, special.Note)
                : new DayHours(day, true, special.OpensAt, special.ClosesAt, true, special.Note);
        }
        return await GetStandardHoursAsync(day);
    }

    public async Task<DayHours> GetStandardHoursAsync(DateTime date)
    {
        var day = date.Date;
        var weekly = (await _settings.GetAsync()).HoursFor(day.DayOfWeek);
        if (weekly.IsOpen && SiteSettings.TryParseTime(weekly.Opens, out var o) && SiteSettings.TryParseTime(weekly.Closes, out var c) && c > o)
            return new DayHours(day, true, o, c, false, null);
        return new DayHours(day, false, null, null, false, null);
    }
}
