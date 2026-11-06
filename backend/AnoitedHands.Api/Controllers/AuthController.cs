using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AnoitedHands.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting(RateLimits.Auth)]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("register")]
    public Task<IActionResult> Register([FromBody] RegisterDto dto) =>
        Handle(async () => Ok(await _auth.RegisterAsync(dto)));

    [HttpPost("login")]
    public Task<IActionResult> Login([FromBody] LoginDto dto) =>
        Handle(async () => Ok(await _auth.LoginAsync(dto)));

    [Authorize]
    [DisableRateLimiting]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var id = User.UserId();
        var user = id == null ? null : await _auth.GetUserAsync(id.Value);
        return user == null ? Unauthorized() : Ok(user);
    }

    [Authorize]
    [HttpPost("change-password")]
    public Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto) =>
        Handle(async () => Ok(await _auth.ChangePasswordAsync(User.UserId()!.Value, dto)));

    [Authorize]
    [HttpPost("resend-verification")]
    public Task<IActionResult> ResendVerification() =>
        Handle(async () =>
        {
            await _auth.SendVerificationEmailAsync(User.UserId()!.Value);
            return Ok(new { message = "Verification email sent. Please check your inbox." });
        });

    [HttpPost("verify-email")]
    public Task<IActionResult> VerifyEmail([FromBody] TokenDto dto) =>
        Handle(async () => Ok(await _auth.VerifyEmailAsync(dto.Token)));

    [HttpPost("forgot-password")]
    public Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto) =>
        Handle(async () =>
        {
            await _auth.RequestPasswordResetAsync(dto.Email);
            return Ok(new { message = "If an account exists for that email, a reset link is on its way." });
        });

    [HttpPost("reset-password")]
    public Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto) =>
        Handle(async () =>
        {
            await _auth.ResetPasswordAsync(dto);
            return Ok(new { message = "Password updated. You can now sign in." });
        });

    private async Task<IActionResult> Handle(Func<Task<IActionResult>> action)
    {
        try
        {
            return await action();
        }
        catch (AuthException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }
}
