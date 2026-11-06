using AnoitedHands.Api.Data;
using AnoitedHands.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Services;

/// <summary>Standard trading hours. Mon-Fri 9AM-6PM, Sat 10AM-5PM, closed Sundays.</summary>
public static class OpeningHours
{
    public const int SlotMinutes = 30;

    public static (TimeSpan Open, TimeSpan Close)? Standard(DateTime date) => date.DayOfWeek switch
    {
        DayOfWeek.Sunday => null,
        DayOfWeek.Saturday => (TimeSpan.FromHours(10), TimeSpan.FromHours(17)),
        _ => (TimeSpan.FromHours(9), TimeSpan.FromHours(18)),
    };
}

public record DayHours(DateTime Date, bool IsOpen, TimeSpan? Open, TimeSpan? Close, bool IsSpecial, string? Note);

/// <summary>
/// Opening hours for a given date: standard hours, overridden by any special day the admin has set
/// (e.g. opening on a Sunday, closing on a public holiday).
/// </summary>
public interface IScheduleService
{
    Task<DayHours> GetHoursAsync(DateTime date);
}

public class ScheduleService : IScheduleService
{
    private readonly AnoitedHandsDbContext _context;

    public ScheduleService(AnoitedHandsDbContext context)
    {
        _context = context;
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

        var standard = OpeningHours.Standard(day);
        return standard == null
            ? new DayHours(day, false, null, null, false, null)
            : new DayHours(day, true, standard.Value.Open, standard.Value.Close, false, null);
    }
}
