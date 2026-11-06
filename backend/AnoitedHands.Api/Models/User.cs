namespace AnoitedHands.Api.Models;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Customer = "Customer";
}

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty; // stored lower-case, unique
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = Roles.Customer;
    public bool EmailConfirmed { get; set; }

    /// <summary>Bumped on password change/reset; sign-in tokens carrying an older value are rejected.</summary>
    public int TokenVersion { get; set; }

    // Brute-force protection
    public int FailedLoginCount { get; set; }
    public DateTime? LockoutEndUtc { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class TokenPurposes
{
    public const string VerifyEmail = "VerifyEmail";
    public const string ResetPassword = "ResetPassword";
}

/// <summary>One-time token for email verification or password reset. Only a SHA-256 hash is stored.</summary>
public class UserToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? UsedAtUtc { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
