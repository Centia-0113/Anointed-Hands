using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AnoitedHands.Api.Data;
using AnoitedHands.Api.DTOs;
using AnoitedHands.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace AnoitedHands.Api.Services;

public static class JwtSettings
{
    public const string Issuer = "AnointedHands";
    public const string Audience = "AnointedHands";
    public const string VersionClaim = "ver";

    public static SymmetricSecurityKey SigningKey(IConfiguration config)
    {
        var key = config["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
            throw new InvalidOperationException(
                "Jwt:Key is missing or shorter than 32 characters. Set it with: dotnet user-secrets set \"Jwt:Key\" \"<long random string>\"");
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
    }
}

public static class ClaimsPrincipalExtensions
{
    /// <summary>The signed-in user's id, or null for anonymous requests.</summary>
    public static int? UserId(this ClaimsPrincipal principal) =>
        int.TryParse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id) ? id : null;
}

/// <summary>Thrown for auth problems the user should see (wrong password, expired link, locked out...).</summary>
public class AuthException : Exception
{
    public int StatusCode { get; }
    public AuthException(string message, int statusCode = StatusCodes.Status400BadRequest) : base(message)
    {
        StatusCode = statusCode;
    }
}

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<UserDto?> GetUserAsync(int id);
    Task<AuthResponseDto> ChangePasswordAsync(int userId, ChangePasswordDto dto);
    Task SendVerificationEmailAsync(int userId);
    Task<UserDto> VerifyEmailAsync(string token);
    Task RequestPasswordResetAsync(string email);
    Task ResetPasswordAsync(ResetPasswordDto dto);
    Task<bool> IsTokenVersionCurrentAsync(int userId, int version);
    Task EnsureAdminAsync();
}

public class AuthService : IAuthService
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromDays(7);
    private static readonly TimeSpan VerifyLinkLifetime = TimeSpan.FromHours(24);
    private static readonly TimeSpan ResetLinkLifetime = TimeSpan.FromHours(1);
    private const int MaxFailedLogins = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);
    private const int MinPasswordLength = 8;

    private readonly AnoitedHandsDbContext _context;
    private readonly IConfiguration _config;
    private readonly IEmailSender _email;
    private readonly ILogger<AuthService> _logger;
    private readonly PasswordHasher<User> _hasher = new();

    public AuthService(AnoitedHandsDbContext context, IConfiguration config, IEmailSender email, ILogger<AuthService> logger)
    {
        _context = context;
        _config = config;
        _email = email;
        _logger = logger;
    }

    private string FrontendUrl => (_config["App:FrontendUrl"] ?? "http://localhost:3000").TrimEnd('/');

    // ---------------------------------------------------------------- register / login

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var email = Normalize(dto.Email);
        if (string.IsNullOrWhiteSpace(dto.Name) || !email.Contains('@'))
            throw new AuthException("Please enter your name and a valid email address.");
        ValidatePassword(dto.Password);
        if (await _context.Users.AnyAsync(u => u.Email == email))
            throw new AuthException("An account with this email already exists. Please sign in.");

        var user = new User
        {
            Name = dto.Name.Trim(),
            Email = email,
            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
            Role = Roles.Customer,
        };
        user.PasswordHash = _hasher.HashPassword(user, dto.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await SendVerificationEmailAsync(user);
        return CreateResponse(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        const string invalid = "Incorrect email or password.";
        var email = Normalize(dto.Email);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            throw new AuthException(invalid, StatusCodes.Status401Unauthorized);

        if (user.LockoutEndUtc is { } lockedUntil && lockedUntil > DateTime.UtcNow)
        {
            var minutes = Math.Max(1, (int)Math.Ceiling((lockedUntil - DateTime.UtcNow).TotalMinutes));
            throw new AuthException(
                $"Too many failed attempts. Try again in {minutes} minute{(minutes == 1 ? "" : "s")}, or reset your password.",
                StatusCodes.Status423Locked);
        }

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password ?? "");
        if (result == PasswordVerificationResult.Failed)
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= MaxFailedLogins)
            {
                user.LockoutEndUtc = DateTime.UtcNow.Add(LockoutDuration);
                user.FailedLoginCount = 0;
                _logger.LogWarning("Account {Email} locked after repeated failed sign-ins", user.Email);
            }
            await _context.SaveChangesAsync();
            throw new AuthException(invalid, StatusCodes.Status401Unauthorized);
        }

        user.FailedLoginCount = 0;
        user.LockoutEndUtc = null;
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
            user.PasswordHash = _hasher.HashPassword(user, dto.Password!);
        await _context.SaveChangesAsync();

        return CreateResponse(user);
    }

    public async Task<UserDto?> GetUserAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        return user == null ? null : ToDto(user);
    }

    public async Task<bool> IsTokenVersionCurrentAsync(int userId, int version) =>
        await _context.Users.AnyAsync(u => u.Id == userId && u.TokenVersion == version);

    // ---------------------------------------------------------------- change password

    public async Task<AuthResponseDto> ChangePasswordAsync(int userId, ChangePasswordDto dto)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new AuthException("Account not found.", StatusCodes.Status401Unauthorized);

        if (_hasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword ?? "") == PasswordVerificationResult.Failed)
            throw new AuthException("Your current password is incorrect.");
        ValidatePassword(dto.NewPassword);
        if (dto.NewPassword == dto.CurrentPassword)
            throw new AuthException("Please choose a password different from your current one.");

        SetPassword(user, dto.NewPassword);
        await _context.SaveChangesAsync();

        // Other devices are signed out (token version bumped); this one gets a fresh token
        return CreateResponse(user);
    }

    // ---------------------------------------------------------------- email verification

    public async Task SendVerificationEmailAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new AuthException("Account not found.", StatusCodes.Status401Unauthorized);
        if (user.EmailConfirmed)
            throw new AuthException("Your email is already verified.");
        await SendVerificationEmailAsync(user);
    }

    private async Task SendVerificationEmailAsync(User user)
    {
        var token = await IssueTokenAsync(user, TokenPurposes.VerifyEmail, VerifyLinkLifetime);
        var link = $"{FrontendUrl}/verify-email?token={Uri.EscapeDataString(token)}";
        await _email.SendAsync(user.Email, "Verify your email - Anointed Hands", EmailSender.Layout(
            $"Welcome, {user.Name.Split(' ')[0]}!",
            "Please confirm your email address so we can link your bookings to your account.",
            "Verify my email", link,
            "This link expires in 24 hours. If you didn't create an account, you can ignore this email."));
    }

    public async Task<UserDto> VerifyEmailAsync(string token)
    {
        var record = await ConsumeTokenAsync(token, TokenPurposes.VerifyEmail)
            ?? throw new AuthException("This verification link is invalid or has expired. Request a new one from your account page.");

        record.User!.EmailConfirmed = true;
        await _context.SaveChangesAsync();
        return ToDto(record.User);
    }

    // ---------------------------------------------------------------- forgot / reset password

    public async Task RequestPasswordResetAsync(string email)
    {
        // Always behaves the same whether or not the account exists, so emails can't be probed
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == Normalize(email));
        if (user == null)
        {
            _logger.LogInformation("Password reset requested for unknown email");
            return;
        }

        var token = await IssueTokenAsync(user, TokenPurposes.ResetPassword, ResetLinkLifetime);
        var link = $"{FrontendUrl}/reset-password?token={Uri.EscapeDataString(token)}";
        await _email.SendAsync(user.Email, "Reset your password - Anointed Hands", EmailSender.Layout(
            "Reset your password",
            "We received a request to reset your Anointed Hands password. Click below to choose a new one.",
            "Choose a new password", link,
            "This link expires in 1 hour and can only be used once. If you didn't ask for this, you can ignore this email - your password won't change."));
    }

    public async Task ResetPasswordAsync(ResetPasswordDto dto)
    {
        ValidatePassword(dto.NewPassword);
        var record = await ConsumeTokenAsync(dto.Token, TokenPurposes.ResetPassword)
            ?? throw new AuthException("This reset link is invalid or has expired. Please request a new one.");

        var user = record.User!;
        SetPassword(user, dto.NewPassword);
        user.EmailConfirmed = true; // they proved they control the inbox
        user.FailedLoginCount = 0;
        user.LockoutEndUtc = null;
        await _context.SaveChangesAsync();
    }

    // ---------------------------------------------------------------- admin bootstrap

    /// <summary>Creates the admin account from configuration (Admin:Email / Admin:Password) if none exists.</summary>
    public async Task EnsureAdminAsync()
    {
        if (await _context.Users.AnyAsync(u => u.Role == Roles.Admin)) return;

        var email = _config["Admin:Email"];
        var password = _config["Admin:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("No admin account exists. Set Admin:Email and Admin:Password (user-secrets) and restart to create one.");
            return;
        }

        var admin = new User { Name = "Salon Admin", Email = Normalize(email), Role = Roles.Admin, EmailConfirmed = true };
        admin.PasswordHash = _hasher.HashPassword(admin, password);
        _context.Users.Add(admin);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Created admin account {Email}", admin.Email);
    }

    // ---------------------------------------------------------------- helpers

    private void SetPassword(User user, string newPassword)
    {
        user.PasswordHash = _hasher.HashPassword(user, newPassword);
        user.TokenVersion++; // invalidates existing sign-in tokens
    }

    private static void ValidatePassword(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < MinPasswordLength)
            throw new AuthException($"Password must be at least {MinPasswordLength} characters.");
    }

    /// <summary>Creates a one-time token (returned to email) and stores only its hash. Older unused tokens are revoked.</summary>
    private async Task<string> IssueTokenAsync(User user, string purpose, TimeSpan lifetime)
    {
        var now = DateTime.UtcNow;
        var previous = await _context.UserTokens
            .Where(t => t.UserId == user.Id && t.Purpose == purpose && t.UsedAtUtc == null)
            .ToListAsync();
        foreach (var t in previous) t.UsedAtUtc = now;

        var raw = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        _context.UserTokens.Add(new UserToken
        {
            UserId = user.Id,
            Purpose = purpose,
            TokenHash = Hash(raw),
            ExpiresAtUtc = now.Add(lifetime),
        });
        await _context.SaveChangesAsync();
        return raw;
    }

    /// <summary>Marks a valid token as used and returns it (with its user), or null if invalid/expired/used.</summary>
    private async Task<UserToken?> ConsumeTokenAsync(string? raw, string purpose)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var hash = Hash(raw.Trim());
        var record = await _context.UserTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.Purpose == purpose);

        if (record == null || record.UsedAtUtc != null || record.ExpiresAtUtc < DateTime.UtcNow || record.User == null)
            return null;

        record.UsedAtUtc = DateTime.UtcNow;
        return record;
    }

    private static string Hash(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

    private AuthResponseDto CreateResponse(User user)
    {
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = JwtSettings.Issuer,
            Audience = JwtSettings.Audience,
            Expires = DateTime.UtcNow.Add(TokenLifetime),
            SigningCredentials = new SigningCredentials(JwtSettings.SigningKey(_config), SecurityAlgorithms.HmacSha256),
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Sub] = user.Id.ToString(),
                [JwtRegisteredClaimNames.Email] = user.Email,
                ["name"] = user.Name,
                ["role"] = user.Role,
                [JwtSettings.VersionClaim] = user.TokenVersion.ToString(),
            },
        };
        var token = new JsonWebTokenHandler().CreateToken(descriptor);
        return new AuthResponseDto { Token = token, User = ToDto(user) };
    }

    private static UserDto ToDto(User u) => new()
    {
        Id = u.Id,
        Name = u.Name,
        Email = u.Email,
        Phone = u.Phone,
        Role = u.Role,
        EmailConfirmed = u.EmailConfirmed,
    };

    private static string Normalize(string? email) => (email ?? "").Trim().ToLowerInvariant();
}
