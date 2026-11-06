using AnoitedHands.Api.Data;
using AnoitedHands.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Services;

/// <summary>
/// Every few minutes, releases bookings whose 10% deposit wasn't paid by the deadline
/// (status → Expired) so the time slot becomes available again, and emails the client.
/// </summary>
public class DepositExpiryService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<DepositExpiryService> _logger;

    public DepositExpiryService(IServiceScopeFactory scopes, ILogger<DepositExpiryService> logger)
    {
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ExpireOverdueAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Deposit expiry check failed");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    private async Task ExpireOverdueAsync(CancellationToken ct)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AnoitedHandsDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        var now = DateTime.Now;
        var overdue = await db.Bookings
            .Include(b => b.Service)
            .Where(b => b.Status == BookingStatuses.AwaitingDeposit && b.DepositDueAt < now)
            .ToListAsync(ct);
        if (overdue.Count == 0) return;

        foreach (var b in overdue)
        {
            b.Status = BookingStatuses.Expired;
            b.CancelledAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        _logger.LogInformation("Released {Count} booking(s) with unpaid deposits", overdue.Count);

        var site = (config["App:FrontendUrl"] ?? "http://localhost:3000").TrimEnd('/');
        foreach (var b in overdue)
        {
            await email.SendAsync(b.CustomerEmail, "Your booking has been released - Anointed Hands", EmailSender.Layout(
                "Your booking was released",
                $"We didn't receive the deposit for your {b.Service?.Name} on {b.BookingDateTime:dddd d MMMM 'at' HH:mm}, so the time slot has been released. You're welcome to book again.",
                "Book again", $"{site}/booking",
                $"Reference {b.PaymentReference}. If you paid and this is a mistake, please reply to this email."));
        }
    }
}
