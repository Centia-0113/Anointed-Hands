using AnoitedHands.Api.Models;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AnoitedHands.Api.Controllers;

/// <summary>Website content and business settings the admin edits from the dashboard.</summary>
[ApiController]
[Route("api/[controller]")]
public class SiteController : ControllerBase
{
    private readonly ISiteSettingsService _settings;

    public SiteController(ISiteSettingsService settings)
    {
        _settings = settings;
    }

    /// <summary>Public: everything the website displays (business info, homepage text, hours, payment details).</summary>
    [HttpGet]
    public async Task<ActionResult<SiteSettings>> Get() => Ok(await _settings.GetAsync());

    /// <summary>Save website content (admin).</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPut]
    public async Task<ActionResult<SiteSettings>> Save([FromBody] SiteSettings settings)
    {
        try
        {
            return Ok(await _settings.SaveAsync(settings));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
