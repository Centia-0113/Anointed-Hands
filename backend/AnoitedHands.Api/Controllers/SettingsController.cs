using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AnoitedHands.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly ISiteSettingsService _site;
    private readonly ISalonCodeService _salonCode;

    public SettingsController(ISiteSettingsService site, ISalonCodeService salonCode)
    {
        _site = site;
        _salonCode = salonCode;
    }

    /// <summary>Banking details and optional scan-to-pay link template shown with payment QR codes.</summary>
    [HttpGet("payment")]
    public async Task<ActionResult<PaymentInfoDto>> GetPaymentInfo()
    {
        var s = await _site.GetAsync();
        return Ok(new PaymentInfoDto
        {
            BusinessName = s.BusinessName,
            BankName = s.BankName,
            AccountName = s.AccountName,
            AccountNumber = s.AccountNumber,
            BranchCode = s.BranchCode,
            ScanToPayUrlTemplate = string.IsNullOrWhiteSpace(s.ScanToPayUrl) ? null : s.ScanToPayUrl,
        });
    }

    /// <summary>The current in-salon ordering code (admin, for printing the table QR code).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpGet("salon-code")]
    public async Task<ActionResult<SalonCodeDto>> GetSalonCode() =>
        Ok(new SalonCodeDto { Code = await _salonCode.GetCodeAsync() });

    /// <summary>Issue a new in-salon code; old printed QR codes stop working.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost("salon-code/regenerate")]
    public async Task<ActionResult<SalonCodeDto>> RegenerateSalonCode() =>
        Ok(new SalonCodeDto { Code = await _salonCode.RegenerateAsync() });

    /// <summary>Check a code scanned/entered by a client (rate-limited against guessing).</summary>
    [EnableRateLimiting(RateLimits.Auth)]
    [HttpPost("salon-code/check")]
    public async Task<IActionResult> CheckSalonCode([FromBody] SalonCodeDto dto) =>
        Ok(new { valid = await _salonCode.IsValidAsync(dto.Code) });
}
