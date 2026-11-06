using System.Security.Cryptography;
using AnoitedHands.Api.Data;
using AnoitedHands.Api.Models;

namespace AnoitedHands.Api.Services;

/// <summary>
/// The in-salon ordering code. It is printed as a QR code on tables / at the counter, so only
/// people physically in the salon can place café orders. Admins can rotate it at any time.
/// </summary>
public interface ISalonCodeService
{
    Task<string> GetCodeAsync();
    Task<string> RegenerateAsync();
    Task<bool> IsValidAsync(string? code);
}

public class SalonCodeService : ISalonCodeService
{
    private const string SettingKey = "SalonOrderCode";
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
    private const int Length = 6;

    private readonly AnoitedHandsDbContext _context;

    public SalonCodeService(AnoitedHandsDbContext context)
    {
        _context = context;
    }

    public async Task<string> GetCodeAsync()
    {
        var setting = await _context.AppSettings.FindAsync(SettingKey);
        return setting?.Value ?? await RegenerateAsync();
    }

    public async Task<string> RegenerateAsync()
    {
        var code = new string(Enumerable.Range(0, Length)
            .Select(_ => Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)])
            .ToArray());

        var setting = await _context.AppSettings.FindAsync(SettingKey);
        if (setting == null)
            _context.AppSettings.Add(new AppSetting { Key = SettingKey, Value = code });
        else
            setting.Value = code;

        await _context.SaveChangesAsync();
        return code;
    }

    public async Task<bool> IsValidAsync(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;
        var current = await GetCodeAsync();
        return CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(current),
            System.Text.Encoding.UTF8.GetBytes(code.Trim().ToUpperInvariant()));
    }
}
