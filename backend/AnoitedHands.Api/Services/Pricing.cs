namespace AnoitedHands.Api.Services;

public static class Pricing
{
    public const decimal DepositRate = 0.10m;
    public static readonly TimeSpan DepositWindow = TimeSpan.FromHours(24);

    /// <summary>True when the discount applies today (salon local date).</summary>
    public static bool IsDiscountActive(int? percent, DateTime? endsOn) =>
        percent is > 0 and <= 90 && (endsOn == null || endsOn.Value.Date >= DateTime.Today);

    /// <summary>Price after any active discount, rounded to cents.</summary>
    public static decimal Effective(decimal price, int? percent, DateTime? endsOn) =>
        IsDiscountActive(percent, endsOn)
            ? Math.Round(price * (100 - percent!.Value) / 100m, 2, MidpointRounding.AwayFromZero)
            : price;

    /// <summary>10% deposit, rounded up to the whole rand.</summary>
    public static decimal Deposit(decimal price) => Math.Ceiling(price * DepositRate);

    /// <summary>Deposit is due 24 hours after booking, or before the appointment if that's sooner.</summary>
    public static DateTime DepositDueAt(DateTime bookedAtLocal, DateTime appointmentLocal)
    {
        var due = bookedAtLocal.Add(DepositWindow);
        return due < appointmentLocal ? due : appointmentLocal;
    }
}
