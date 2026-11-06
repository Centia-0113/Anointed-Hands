using System.Net;
using System.Net.Mail;

namespace AnoitedHands.Api.Services;

public interface IEmailSender
{
    Task SendAsync(string to, string subject, string htmlBody);
}

/// <summary>
/// Sends email through SMTP when "Smtp:Host" is configured; otherwise writes the email
/// (including any links) to the API console so the flows can be tested locally.
/// </summary>
public class EmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailSender> _logger;

    public EmailSender(IConfiguration config, ILogger<EmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        var host = _config["Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            _logger.LogWarning(
                "SMTP not configured - email NOT sent. To: {To} | Subject: {Subject}\n{Body}",
                to, subject, htmlBody);
            return;
        }

        var from = _config["Smtp:From"] ?? _config["Smtp:Username"] ?? "no-reply@anointedhands.co.za";
        using var message = new MailMessage(new MailAddress(from, "Anointed Hands"), new MailAddress(to))
        {
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
        };

        using var client = new SmtpClient(host, _config.GetValue("Smtp:Port", 587))
        {
            EnableSsl = _config.GetValue("Smtp:EnableSsl", true),
            Credentials = string.IsNullOrWhiteSpace(_config["Smtp:Username"])
                ? null
                : new NetworkCredential(_config["Smtp:Username"], _config["Smtp:Password"]),
        };

        try
        {
            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            // Don't fail the user's request because the mail server hiccupped
            _logger.LogError(ex, "Failed to send email to {To} ({Subject})", to, subject);
        }
    }

    /// <summary>Simple branded pink & gold email layout with a call-to-action button.</summary>
    public static string Layout(string heading, string intro, string buttonText, string link, string footnote) => $"""
        <div style="background:#fdeef3;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#4a0d29">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #f0dc97;overflow:hidden">
            <div style="height:6px;background:linear-gradient(90deg,#e6c766,#c9a227,#e6c766)"></div>
            <div style="padding:32px">
              <p style="margin:0 0 4px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#a8841c;font-weight:bold">Anointed Hands</p>
              <h1 style="margin:0 0 16px;font-family:Georgia,serif;color:#9e1450">{WebUtility.HtmlEncode(heading)}</h1>
              <p style="line-height:1.6">{WebUtility.HtmlEncode(intro)}</p>
              <p style="text-align:center;margin:28px 0">
                <a href="{link}" style="background:#c2185b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:bold;display:inline-block">{WebUtility.HtmlEncode(buttonText)}</a>
              </p>
              <p style="font-size:13px;color:#7a1040">Or paste this link into your browser:<br><span style="word-break:break-all">{link}</span></p>
              <p style="font-size:13px;color:#7a1040">{WebUtility.HtmlEncode(footnote)}</p>
            </div>
          </div>
        </div>
        """;
}
