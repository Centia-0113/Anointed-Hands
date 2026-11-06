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
    private readonly IConfiguration _config;
    private readonly ISalonCodeService _salonCode;

    public SettingsController(IConfiguration config, ISalonCodeService salonCode)
    {
        _config = config;
        _salonCode = salonCode;
    }

    /// <summary>Banking details and optional scan-to-pay link template shown with payment QR codes.</summary>
    [HttpGet("payment")]
    public ActionResult<PaymentInfoDto> GetPaymentInfo()
    {
        var c = _config.GetSection("CompanySettings");
        return Ok(new PaymentInfoDto
        {
            BusinessName = c["Name"] ?? "Anointed Hands",
            BankName = c["BankName"] ?? "",
            AccountName = c["AccountName"] ?? c["Name"] ?? "",
            AccountNumber = c["BankAccount"] ?? "",
            BranchCode = c["BranchCode"] ?? "",
            ScanToPayUrlTemplate = string.IsNullOrWhiteSpace(c["ScanToPayUrl"]) ? null : c["ScanToPayUrl"],
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
