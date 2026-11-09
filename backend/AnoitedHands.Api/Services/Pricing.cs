namespace AnoitedHands.Api.Services;

public static class Pricing
{
    /// <summary>True when the discount applies today (salon local date).</summary>
    public static bool IsDiscountActive(int? percent, DateTime? endsOn) =>
        percent is > 0 and <= 90 && (endsOn == null || endsOn.Value.Date >= DateTime.Today);

    /// <summary>Price after any active discount, rounded to cents.</summary>
    public static decimal Effective(decimal price, int? percent, DateTime? endsOn) =>
        IsDiscountActive(percent, endsOn)
            ? Math.Round(price * (100 - percent!.Value) / 100m, 2, MidpointRounding.AwayFromZero)
            : price;

    /// <summary>Deposit as a percentage of the price (set under Website Content), rounded up to the whole rand.</summary>
    public static decimal Deposit(decimal price, int percent) =>
        percent <= 0 ? 0 : Math.Min(price, Math.Ceiling(price * percent / 100m));

    /// <summary>Deposit is due N hours after booking, or before the appointment if that's sooner.</summary>
    public static DateTime DepositDueAt(DateTime bookedAtLocal, DateTime appointmentLocal, int hours)
    {
        var due = bookedAtLocal.AddHours(hours);
        return due < appointmentLocal ? due : appointmentLocal;
    }
}
