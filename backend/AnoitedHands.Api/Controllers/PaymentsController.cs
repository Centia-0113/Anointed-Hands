using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AnoitedHands.Api.Controllers;

/// <summary>Online payments (PayFast) and bank-statement matching, so deposits confirm themselves.</summary>
[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _payments;
    private readonly IPayFastService _payFast;
    private readonly IStatementImporter _statements;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(IPaymentService payments, IPayFastService payFast, IStatementImporter statements, ILogger<PaymentsController> logger)
    {
        _payments = payments;
        _payFast = payFast;
        _statements = statements;
        _logger = logger;
    }

    /// <summary>Which online payment methods are switched on (public).</summary>
    [HttpGet("methods")]
    public async Task<IActionResult> Methods()
    {
        var s = await _payFast.GetSettingsAsync();
        return Ok(new { payFast = s.IsConfigured, sandbox = s.IsConfigured && s.Sandbox });
    }

    /// <summary>What's owed for a reference, for the pay page (public; shows only amount and description).</summary>
    [EnableRateLimiting(RateLimits.Auth)]
    [HttpGet("payable/{reference}")]
    public async Task<IActionResult> Payable(string reference)
    {
        var item = await _payments.GetPayableAsync(reference);
        if (item == null) return NotFound(new { message = "Nothing is owing on this reference – it may already be paid, or the booking was released." });
        return Ok(new { item.Reference, item.Kind, item.Amount, item.Description });
    }

    /// <summary>Signed PayFast checkout form for a reference (public). The browser posts it to PayFast.</summary>
    [EnableRateLimiting(RateLimits.Auth)]
    [HttpPost("payfast/checkout/{reference}")]
    public async Task<IActionResult> Checkout(string reference)
    {
        var item = await _payments.GetPayableAsync(reference);
        if (item == null) return NotFound(new { message = "Nothing is owing on this reference – it may already be paid, or the booking was released." });
        var form = await _payFast.BuildCheckoutAsync(item);
        if (form == null) return BadRequest(new { message = "Online payment isn't available right now. Please pay by EFT using your reference." });
        return Ok(new
        {
            processUrl = form.ProcessUrl,
            fields = form.Fields.Select(f => new { name = f.Key, value = f.Value }),
            amount = form.Amount,
            description = form.Description,
            kind = form.Kind,
            sandbox = form.Sandbox,
        });
    }

    /// <summary>PayFast instant transaction notification (ITN). Called by PayFast's servers, not browsers.</summary>
    [HttpPost("payfast/notify")]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> Notify()
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync();
        var (ok, message) = await _payFast.HandleNotificationAsync(body, HttpContext.Connection.RemoteIpAddress);
        if (!ok) _logger.LogWarning("Rejected PayFast notification: {Message}", message);
        else _logger.LogInformation("PayFast notification: {Message}", message);
        return Ok(); // PayFast only needs a 200
    }

    /// <summary>Payment status for the "thank you" page after PayFast (public, minimal).</summary>
    [HttpGet("status/{reference}")]
    public async Task<IActionResult> Status(string reference)
    {
        var status = await _payments.GetStatusAsync(reference);
        return status == null ? NotFound() : Ok(status);
    }

    // ------------------------------------------------------------------ admin

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("payfast/settings")]
    public async Task<IActionResult> GetSettings()
    {
        var s = await _payFast.GetSettingsAsync();
        return Ok(new
        {
            s.Enabled,
            s.Sandbox,
            s.MerchantId,
            hasMerchantKey = s.MerchantKey.Length > 0,
            hasPassphrase = s.Passphrase.Length > 0,
            s.SiteUrl,
            s.ApiUrl,
            notifyUrl = $"{s.ApiUrl}/api/payments/payfast/notify",
            publiclyReachable = !IsLocal(s.ApiUrl),
        });
    }

    public class SavePayFastDto
    {
        public bool Enabled { get; set; }
        public bool Sandbox { get; set; }
        public string? MerchantId { get; set; }
        /// <summary>Leave empty to keep the saved key.</summary>
        public string? MerchantKey { get; set; }
        /// <summary>Leave empty to keep the saved passphrase.</summary>
        public string? Passphrase { get; set; }
        public bool ClearPassphrase { get; set; }
        public string? SiteUrl { get; set; }
        public string? ApiUrl { get; set; }
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("payfast/settings")]
    public async Task<IActionResult> SaveSettings([FromBody] SavePayFastDto dto)
    {
        var s = await _payFast.GetSettingsAsync();
        s.Enabled = dto.Enabled;
        s.Sandbox = dto.Sandbox;
        s.MerchantId = (dto.MerchantId ?? "").Trim();
        if (!string.IsNullOrWhiteSpace(dto.MerchantKey)) s.MerchantKey = dto.MerchantKey.Trim();
        if (dto.ClearPassphrase) s.Passphrase = "";
        else if (!string.IsNullOrWhiteSpace(dto.Passphrase)) s.Passphrase = dto.Passphrase.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SiteUrl)) s.SiteUrl = dto.SiteUrl.Trim().TrimEnd('/');
        if (!string.IsNullOrWhiteSpace(dto.ApiUrl)) s.ApiUrl = dto.ApiUrl.Trim().TrimEnd('/');

        if (s.Enabled && (s.MerchantId.Length == 0 || s.MerchantKey.Length == 0))
            return BadRequest(new { message = "Enter your PayFast merchant ID and merchant key to switch PayFast on." });
        if (!Uri.IsWellFormedUriString(s.SiteUrl, UriKind.Absolute) || !Uri.IsWellFormedUriString(s.ApiUrl, UriKind.Absolute))
            return BadRequest(new { message = "Website and API addresses must be full links, e.g. https://anointedhands.co.za" });

        await _payFast.SaveSettingsAsync(s);
        return await GetSettings();
    }

    /// <summary>
    /// Upload a bank statement CSV. With apply=false it only previews what would be matched;
    /// with apply=true the matching bookings and orders are updated.
    /// </summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost("statement")]
    [RequestSizeLimit(3 * 1024 * 1024)]
    public async Task<IActionResult> ImportStatement([FromForm] IFormFile? file, [FromQuery] bool apply = false)
    {
        if (file == null || file.Length == 0) return BadRequest(new { message = "Please choose your bank statement file (CSV)." });
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".csv" or ".txt"))
            return BadRequest(new { message = "Please download the statement from your bank as a CSV file." });

        await using var stream = file.OpenReadStream();
        return Ok(await _statements.ImportAsync(stream, apply));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("recent")]
    public async Task<IActionResult> Recent() => Ok(await _payments.RecentAsync(50));

    private static bool IsLocal(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var u) && (u.IsLoopback || u.Host.EndsWith(".local") || u.Host.StartsWith("192.168.") || u.Host.StartsWith("10."));
}
