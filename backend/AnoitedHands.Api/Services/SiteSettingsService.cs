using System.Globalization;
using System.Text.Json;
using AnoitedHands.Api.Data;
using AnoitedHands.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace AnoitedHands.Api.Services;

/// <summary>Opening hours for one weekday (0 = Sunday … 6 = Saturday).</summary>
public class WeeklyHours
{
    public int Day { get; set; }
    public bool IsOpen { get; set; }
    public string Opens { get; set; } = "09:00";
    public string Closes { get; set; } = "18:00";
}

/// <summary>
/// Everything about the business the admin can change from the dashboard without touching code:
/// contact details, homepage text, weekly hours, banking details and deposit rules.
/// </summary>
public class SiteSettings
{
    // Business
    public string BusinessName { get; set; } = "Anointed Hands";
    public string Tagline { get; set; } = "Salon & Café";
    public string Phone { get; set; } = "+27 31 000 0000";
    public string Email { get; set; } = "contact@anoitedhandsalon.com";
    public string Address { get; set; } = "";
    public string WhatsApp { get; set; } = "";
    public string Instagram { get; set; } = "";
    public string Facebook { get; set; } = "";

    // Homepage & announcements
    public string HeroTitle { get; set; } = "Welcome to Anointed Hands";
    public string HeroSubtitle { get; set; } =
        "Premium salon and café services in one elegant space. Book your appointment, order delicious treats, and experience beauty and wellness like never before.";
    public string AboutText { get; set; } =
        "Experienced stylists offering hair, nails, facials, brows and lashes – with a café serving cakes, pastries and drinks while you're pampered.";
    public string Announcement { get; set; } = "";

    // Payments & deposits
    public string BankName { get; set; } = "";
    public string AccountName { get; set; } = "Anointed Hands";
    public string AccountNumber { get; set; } = "";
    public string BranchCode { get; set; } = "";
    public string ScanToPayUrl { get; set; } = "";
    public int DepositPercent { get; set; } = 10;
    public int DepositHours { get; set; } = 24;
    public string CancellationPolicy { get; set; } =
        "Your deposit secures your booking and is refunded if you cancel. The balance is paid at your appointment.";

    // Weekly opening hours
    public List<WeeklyHours> Hours { get; set; } = DefaultHours();

    public static List<WeeklyHours> DefaultHours() => Enumerable.Range(0, 7).Select(d => d switch
    {
        0 => new WeeklyHours { Day = 0, IsOpen = false, Opens = "10:00", Closes = "14:00" },
        6 => new WeeklyHours { Day = 6, IsOpen = true, Opens = "10:00", Closes = "17:00" },
        _ => new WeeklyHours { Day = d, IsOpen = true, Opens = "09:00", Closes = "18:00" },
    }).ToList();

    public WeeklyHours HoursFor(DayOfWeek day) =>
        Hours.FirstOrDefault(h => h.Day == (int)day) ?? DefaultHours()[(int)day];

    public static bool TryParseTime(string? s, out TimeSpan t) =>
        TimeSpan.TryParseExact(s ?? "", @"hh\:mm", CultureInfo.InvariantCulture, out t) && t < TimeSpan.FromHours(24);
}

public interface ISiteSettingsService
{
    Task<SiteSettings> GetAsync();
    Task<SiteSettings> SaveAsync(SiteSettings settings);
}

public class SiteSettingsService : ISiteSettingsService
{
    private const string Key = "SiteSettings";
    private const string CacheKey = "site-settings";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly AnoitedHandsDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _config;

    public SiteSettingsService(AnoitedHandsDbContext context, IMemoryCache cache, IConfiguration config)
    {
        _context = context;
        _cache = cache;
        _config = config;
    }

    public async Task<SiteSettings> GetAsync()
    {
        if (_cache.TryGetValue(CacheKey, out SiteSettings? cached) && cached != null) return Clone(cached);

        var row = await _context.AppSettings.FindAsync(Key);
        var settings = row == null ? FromConfig() : JsonSerializer.Deserialize<SiteSettings>(row.Value, Json) ?? FromConfig();
        Normalise(settings);
        _cache.Set(CacheKey, settings, TimeSpan.FromMinutes(10));
        return Clone(settings);
    }

    public async Task<SiteSettings> SaveAsync(SiteSettings settings)
    {
        Validate(settings);
        Normalise(settings);

        var json = JsonSerializer.Serialize(settings, Json);
        var row = await _context.AppSettings.FindAsync(Key);
        if (row == null) _context.AppSettings.Add(new AppSetting { Key = Key, Value = json });
        else row.Value = json;
        await _context.SaveChangesAsync();

        _cache.Set(CacheKey, settings, TimeSpan.FromMinutes(10));
        return Clone(settings);
    }

    /// <summary>First run: seed from appsettings.json CompanySettings so existing config carries over.</summary>
    private SiteSettings FromConfig()
    {
        var c = _config.GetSection("CompanySettings");
        var s = new SiteSettings();
        string Pick(string? value, string fallback) =>
            string.IsNullOrWhiteSpace(value) || value.EndsWith("_HERE") || value == "YOUR_BANK" ? fallback : value;

        s.BusinessName = Pick(c["Name"], s.BusinessName);
        s.Email = Pick(c["ContactEmail"], s.Email);
        s.Phone = Pick(c["PhoneNumber"], s.Phone);
        s.BankName = Pick(c["BankName"], "");
        s.AccountName = Pick(c["AccountName"], s.AccountName);
        s.AccountNumber = Pick(c["BankAccount"], "");
        s.BranchCode = Pick(c["BranchCode"], "");
        s.ScanToPayUrl = Pick(c["ScanToPayUrl"], "");
        return s;
    }

    private static void Validate(SiteSettings s)
    {
        if (string.IsNullOrWhiteSpace(s.BusinessName)) throw new ArgumentException("Please enter the business name.");
        if (!string.IsNullOrWhiteSpace(s.Email) && !s.Email.Contains('@')) throw new ArgumentException("Please enter a valid contact email.");
        if (s.DepositPercent is < 0 or > 100) throw new ArgumentException("The deposit must be between 0% and 100%.");
        if (s.DepositHours is < 1 or > 168) throw new ArgumentException("The deposit deadline must be between 1 hour and 7 days.");
        if (!string.IsNullOrWhiteSpace(s.ScanToPayUrl) && !s.ScanToPayUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("The scan-to-pay link must start with https://");

        if (s.Hours == null || s.Hours.Select(h => h.Day).Distinct().Count() != 7 || s.Hours.Any(h => h.Day is < 0 or > 6))
            throw new ArgumentException("Please provide opening hours for all seven days.");
        foreach (var h in s.Hours.Where(h => h.IsOpen))
        {
            var name = CultureInfo.InvariantCulture.DateTimeFormat.GetDayName((DayOfWeek)h.Day);
            if (!SiteSettings.TryParseTime(h.Opens, out var o) || !SiteSettings.TryParseTime(h.Closes, out var c))
                throw new ArgumentException($"Please enter valid opening and closing times for {name}.");
            if (c <= o) throw new ArgumentException($"{name}: closing time must be after opening time.");
            if (o.Minutes % 30 != 0 || c.Minutes % 30 != 0)
                throw new ArgumentException($"{name}: please use times on the hour or half hour.");
        }
    }

    private static void Normalise(SiteSettings s)
    {
        if (s.Hours == null || s.Hours.Count != 7) s.Hours = SiteSettings.DefaultHours();
        s.Hours = s.Hours.OrderBy(h => h.Day).ToList();
        foreach (var p in typeof(SiteSettings).GetProperties().Where(p => p.PropertyType == typeof(string)))
            p.SetValue(s, ((string?)p.GetValue(s) ?? "").Trim());
    }

    private static SiteSettings Clone(SiteSettings s) =>
        JsonSerializer.Deserialize<SiteSettings>(JsonSerializer.Serialize(s, Json), Json)!;
}
