using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AnoitedHands.Api.Data;
using AnoitedHands.Api.Models;

namespace AnoitedHands.Api.Services;

/// <summary>PayFast merchant settings, edited by the admin in the Back Office (key and passphrase are write-only).</summary>
public class PayFastSettings
{
    public bool Enabled { get; set; }
    public bool Sandbox { get; set; } = true;
    public string MerchantId { get; set; } = "";
    public string MerchantKey { get; set; } = "";
    public string Passphrase { get; set; } = "";
    /// <summary>Public address of the website, e.g. https://anointedhands.co.za (for return links).</summary>
    public string SiteUrl { get; set; } = "";
    /// <summary>Public address of this API, e.g. https://api.anointedhands.co.za (PayFast posts payment notifications here).</summary>
    public string ApiUrl { get; set; } = "";

    public string Host => Sandbox ? "sandbox.payfast.co.za" : "www.payfast.co.za";
    public string ProcessUrl => $"https://{Host}/eng/process";
    public bool IsConfigured => Enabled && MerchantId.Length > 0 && MerchantKey.Length > 0;
}

public record CheckoutForm(string ProcessUrl, List<KeyValuePair<string, string>> Fields, decimal Amount, string Description, string Kind, bool Sandbox);

public interface IPayFastService
{
    Task<PayFastSettings> GetSettingsAsync();
    Task SaveSettingsAsync(PayFastSettings settings);
    Task<CheckoutForm?> BuildCheckoutAsync(PayableItem item);
    /// <summary>Validates and processes a PayFast ITN (instant transaction notification).</summary>
    Task<(bool Ok, string Message)> HandleNotificationAsync(string rawBody, IPAddress? remoteIp);
}

public class PayFastService : IPayFastService
{
    private const string Key = "PayFast";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly string[] PayFastHosts = { "www.payfast.co.za", "sandbox.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za" };

    private readonly AnoitedHandsDbContext _context;
    private readonly IPaymentService _payments;
    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _config;
    private readonly ILogger<PayFastService> _logger;

    public PayFastService(AnoitedHandsDbContext context, IPaymentService payments, IHttpClientFactory http, IConfiguration config, ILogger<PayFastService> logger)
    {
        _context = context;
        _payments = payments;
        _http = http;
        _config = config;
        _logger = logger;
    }

    // ------------------------------------------------------------------ settings

    public async Task<PayFastSettings> GetSettingsAsync()
    {
        var row = await _context.AppSettings.FindAsync(Key);
        var s = row == null ? new PayFastSettings() : JsonSerializer.Deserialize<PayFastSettings>(row.Value, Json) ?? new PayFastSettings();
        if (string.IsNullOrWhiteSpace(s.SiteUrl)) s.SiteUrl = _config["App:FrontendUrl"] ?? "http://localhost:3000";
        if (string.IsNullOrWhiteSpace(s.ApiUrl)) s.ApiUrl = _config["App:ApiUrl"] ?? _config["Urls"] ?? "http://localhost:5000";
        s.SiteUrl = s.SiteUrl.TrimEnd('/');
        s.ApiUrl = s.ApiUrl.TrimEnd('/');
        return s;
    }

    public async Task SaveSettingsAsync(PayFastSettings s)
    {
        var json = JsonSerializer.Serialize(s, Json);
        var row = await _context.AppSettings.FindAsync(Key);
        if (row == null) _context.AppSettings.Add(new AppSetting { Key = Key, Value = json });
        else row.Value = json;
        await _context.SaveChangesAsync();
    }

    // ------------------------------------------------------------------ checkout

    public async Task<CheckoutForm?> BuildCheckoutAsync(PayableItem item)
    {
        var s = await GetSettingsAsync();
        if (!s.IsConfigured) return null;

        var firstName = new string((item.CustomerName.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "")
            .Where(c => char.IsLetter(c) || c == '-' || c == '\'').ToArray());
        var itemName = Clean(item.Description, 100);

        // Order matters: PayFast signs the fields in this exact sequence
        var fields = new List<KeyValuePair<string, string>>
        {
            new("merchant_id", s.MerchantId),
            new("merchant_key", s.MerchantKey),
            new("return_url", $"{s.SiteUrl}/payment/return?ref={item.Reference}"),
            new("cancel_url", $"{s.SiteUrl}/payment/cancel?ref={item.Reference}"),
            new("notify_url", $"{s.ApiUrl}/api/payments/payfast/notify"),
            new("name_first", firstName),
            new("email_address", item.CustomerEmail ?? ""),
            new("m_payment_id", item.Reference),
            new("amount", item.Amount.ToString("0.00", CultureInfo.InvariantCulture)),
            new("item_name", itemName),
            new("custom_str1", item.Kind),
        };
        fields = fields.Where(f => !string.IsNullOrWhiteSpace(f.Value)).ToList();
        fields.Add(new("signature", Sign(fields, s.Passphrase)));

        return new CheckoutForm(s.ProcessUrl, fields, item.Amount, item.Description, item.Kind, s.Sandbox);
    }

    // ------------------------------------------------------------------ notifications (ITN)

    public async Task<(bool Ok, string Message)> HandleNotificationAsync(string rawBody, IPAddress? remoteIp)
    {
        var s = await GetSettingsAsync();
        var data = ParseForm(rawBody);
        string Get(string k) => data.FirstOrDefault(p => p.Key == k).Value ?? "";

        // 1. Signature over every field except the signature itself, in the order received
        var signed = data.Where(p => p.Key != "signature").ToList();
        var paramString = ParamString(signed, includeEmpty: true);
        var expected = Md5(string.IsNullOrEmpty(s.Passphrase) ? paramString : $"{paramString}&passphrase={PhpUrlEncode(s.Passphrase.Trim())}");
        if (!string.Equals(expected, Get("signature"), StringComparison.OrdinalIgnoreCase))
            return (false, "Invalid signature");

        // 2. It's for our merchant account
        if (Get("merchant_id") != s.MerchantId)
            return (false, "Merchant id mismatch");

        // 3. It came from PayFast, and PayFast confirms the data (can be relaxed only for local testing)
        var verify = _config.GetValue("PayFast:VerifySource", true);
        if (verify)
        {
            if (!await IsPayFastAddressAsync(remoteIp))
                return (false, $"Notification not from a PayFast server ({remoteIp})");
            if (!await ServerConfirmsAsync(s.Host, paramString))
                return (false, "PayFast did not confirm the notification");
        }

        if (!string.Equals(Get("payment_status"), "COMPLETE", StringComparison.OrdinalIgnoreCase))
            return (true, $"Ignored status {Get("payment_status")}");

        if (!decimal.TryParse(Get("amount_gross"), NumberStyles.Number, CultureInfo.InvariantCulture, out var amount))
            return (false, "Invalid amount");

        var outcome = await _payments.ApplyAsync(Get("m_payment_id"), amount, PaymentProviders.PayFast, Get("pf_payment_id"), DateTime.UtcNow,
            notes: $"PayFast {Get("pf_payment_id")}");
        return (true, $"{outcome.Action}: {outcome.Message}");
    }

    private async Task<bool> IsPayFastAddressAsync(IPAddress? ip)
    {
        if (ip == null) return false;
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        foreach (var host in PayFastHosts)
        {
            try
            {
                var addresses = await Dns.GetHostAddressesAsync(host);
                if (addresses.Any(a => a.Equals(ip))) return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not resolve {Host}", host);
            }
        }
        return false;
    }

    private async Task<bool> ServerConfirmsAsync(string host, string paramString)
    {
        try
        {
            var client = _http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(15);
            var response = await client.PostAsync($"https://{host}/eng/query/validate",
                new StringContent(paramString, Encoding.UTF8, "application/x-www-form-urlencoded"));
            var body = (await response.Content.ReadAsStringAsync()).Trim();
            return body.Equals("VALID", StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PayFast server validation failed");
            return false;
        }
    }

    // ------------------------------------------------------------------ helpers

    public static string Sign(IEnumerable<KeyValuePair<string, string>> fields, string? passphrase)
    {
        var s = ParamString(fields, includeEmpty: false);
        if (!string.IsNullOrWhiteSpace(passphrase)) s += $"&passphrase={PhpUrlEncode(passphrase.Trim())}";
        return Md5(s);
    }

    private static string ParamString(IEnumerable<KeyValuePair<string, string>> fields, bool includeEmpty) =>
        string.Join("&", fields
            .Where(f => includeEmpty || !string.IsNullOrWhiteSpace(f.Value))
            .Select(f => $"{f.Key}={PhpUrlEncode((f.Value ?? "").Trim())}"));

    /// <summary>Encodes exactly like PHP's urlencode (what PayFast uses): spaces as '+', uppercase %XX.</summary>
    public static string PhpUrlEncode(string value)
    {
        var sb = new StringBuilder();
        foreach (var b in Encoding.UTF8.GetBytes(value))
        {
            var c = (char)b;
            if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.')
                sb.Append(c);
            else if (c == ' ')
                sb.Append('+');
            else
                sb.Append('%').Append(b.ToString("X2"));
        }
        return sb.ToString();
    }

    private static List<KeyValuePair<string, string>> ParseForm(string body) =>
        (body ?? "").Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(pair =>
            {
                var i = pair.IndexOf('=');
                var k = i < 0 ? pair : pair[..i];
                var v = i < 0 ? "" : pair[(i + 1)..];
                return new KeyValuePair<string, string>(WebUtility.UrlDecode(k), WebUtility.UrlDecode(v));
            })
            .ToList();

    private static string Md5(string s) => Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(s))).ToLowerInvariant();

    private static string Clean(string s, int max)
    {
        var cleaned = new string((s ?? "").Where(c => char.IsLetterOrDigit(c) || " -:.,&'".Contains(c)).ToArray()).Trim();
        return cleaned.Length > max ? cleaned[..max] : cleaned;
    }
}
