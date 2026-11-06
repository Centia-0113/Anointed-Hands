namespace AnoitedHands.Api.DTOs;

public class ServiceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }          // regular price
    public decimal FinalPrice { get; set; }     // after any active discount
    public int? DiscountPercent { get; set; }   // as configured (may be expired)
    public DateTime? DiscountEndsOn { get; set; }
    public bool IsDiscountActive { get; set; }
    public decimal DepositAmount { get; set; }  // 10% of FinalPrice
    public int DurationMinutes { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>Create/update a service (admin).</summary>
public class SaveServiceDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; }
    public string Category { get; set; } = string.Empty;
    public int? DiscountPercent { get; set; }
    public DateTime? DiscountEndsOn { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CafeItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal FinalPrice { get; set; }
    public int? DiscountPercent { get; set; }
    public DateTime? DiscountEndsOn { get; set; }
    public bool IsDiscountActive { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; }
    public bool IsOutOfStock { get; set; }
}

/// <summary>Create/update a café menu item (admin).</summary>
public class SaveCafeItemDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string Category { get; set; } = string.Empty;
    public int? DiscountPercent { get; set; }
    public DateTime? DiscountEndsOn { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsOutOfStock { get; set; }
}

public class StylistDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>Stylist as seen by the admin, including contact details and login.</summary>
public class StylistAdminDto : StylistDto
{
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? LoginEmail { get; set; } // staff account linked to this stylist, if any
}

public class SaveStylistDto
{
    public string Name { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateStaffAccountDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class BookingDto
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public decimal ServicePrice { get; set; } // price charged for this booking
    public int DurationMinutes { get; set; }
    public int StylistId { get; set; }
    public string StylistName { get; set; } = string.Empty;
    public DateTime BookingDateTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentReference { get; set; } = string.Empty;
    public bool IsPaid { get; set; } // paid in full
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public decimal DepositAmount { get; set; }
    public DateTime DepositDueAt { get; set; }
    public bool DepositPaid { get; set; }
    public DateTime? DepositPaidAt { get; set; }
    public DateTime? FullyPaidAt { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal BalanceDue { get; set; }
    public string RefundStatus { get; set; } = string.Empty;
    public DateTime? RefundedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
}

public class UpdateBookingStatusDto
{
    public string Status { get; set; } = string.Empty;
}

public class CreateBookingDto
{
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public int ServiceId { get; set; }
    public int StylistId { get; set; }
    public DateTime BookingDateTime { get; set; }
    public string? Notes { get; set; }
}

public class OrderDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentReference { get; set; } = string.Empty;
    public bool IsPaid { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
}

public class CreateOrderDto
{
    public string CustomerName { get; set; } = string.Empty;
    /// <summary>In-salon code from the table QR; required so only clients in the salon can order.</summary>
    public string? SalonCode { get; set; }
    public List<OrderItemCreateDto> Items { get; set; } = new();
    public string? Notes { get; set; }
}

public class OrderItemDto
{
    public int Id { get; set; }
    public int CafeItemId { get; set; }
    public string CafeItemName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}

public class OrderItemCreateDto
{
    public int CafeItemId { get; set; }
    public int Quantity { get; set; }
}

public class MarkPaidDto
{
    public string? PaymentReference { get; set; }
}

public class RegisterDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Password { get; set; } = string.Empty;
}

public class LoginDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class UserDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool EmailConfirmed { get; set; }
    public int? StylistId { get; set; }
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = new();
}

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class ForgotPasswordDto
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class TokenDto
{
    public string Token { get; set; } = string.Empty;
}
