using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using AnoitedHands.Api.Data;
using AnoitedHands.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AnoitedHands.Api.Services;

public class StatementLine
{
    public int Line { get; set; }
    public string? Date { get; set; }
    public string Description { get; set; } = "";
    public decimal? Amount { get; set; }
}

public class StatementResult
{
    public int RowsRead { get; set; }
    public int RowsWithReference { get; set; }
    public bool Applied { get; set; }
    public List<StatementMatch> Matches { get; set; } = new();
}

public class StatementMatch : PaymentOutcome
{
    public int Line { get; set; }
    public string? Date { get; set; }
    public string Description { get; set; } = "";
}

/// <summary>
/// Reads a bank statement CSV (FNB, Standard Bank, Absa, Capitec, Nedbank … exports), finds payment references
/// such as "AH-B12345" in each money-in line, and applies the payments. Run as a preview first, then apply.
/// </summary>
public interface IStatementImporter
{
    Task<StatementResult> ImportAsync(Stream csv, bool apply);
}

public class StatementImporter : IStatementImporter
{
    private static readonly string[] HeaderWords = { "date", "amount", "credit", "debit", "description", "reference", "balance", "narrative", "details", "transaction" };

    private readonly AnoitedHandsDbContext _context;
    private readonly IPaymentService _payments;

    public StatementImporter(AnoitedHandsDbContext context, IPaymentService payments)
    {
        _context = context;
        _payments = payments;
    }

    public async Task<StatementResult> ImportAsync(Stream csv, bool apply)
    {
        using var reader = new StreamReader(csv, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var text = await reader.ReadToEndAsync();
        var rows = ParseCsv(text);
        var result = new StatementResult { RowsRead = rows.Count, Applied = apply };

        // Find the header row (if any) to locate the credit / amount / date / description columns
        int headerIdx = rows.FindIndex(r => r.Count(c => HeaderWords.Any(w => c.ToLowerInvariant().Contains(w))) >= 2);
        string[] header = headerIdx >= 0 ? rows[headerIdx].Select(c => c.Trim().ToLowerInvariant()).ToArray() : Array.Empty<string>();
        int Col(params string[] words) => Array.FindIndex(header, h => words.Any(w => h.Contains(w)));
        var creditCol = Col("credit", "money in", "paid in");
        var debitCol = Col("debit", "money out", "paid out");
        var amountCol = Col("amount");
        var dateCol = Col("date");
        var balanceCol = Col("balance");

        var seenInFile = new HashSet<string>();
        for (var i = 0; i < rows.Count; i++)
        {
            if (i <= headerIdx) continue;
            var row = rows[i];
            var rowText = string.Join(" ", row);
            var reference = PaymentService.FindReference(rowText);
            if (reference == null) continue;
            result.RowsWithReference++;

            var match = new StatementMatch
            {
                Line = i + 1,
                Reference = reference,
                Date = dateCol >= 0 && dateCol < row.Count ? row[dateCol].Trim() : row.FirstOrDefault(LooksLikeDate),
                Description = Truncate(string.Join(" | ", row.Where((c, idx) => idx != balanceCol && !string.IsNullOrWhiteSpace(c))), 160),
            };

            var amount = await PickAmountAsync(row, reference, creditCol, debitCol, amountCol, balanceCol);
            if (amount == null || amount <= 0)
            {
                match.Action = PaymentActions.NeedsReview;
                match.Message = amount < 0 ? "Money out, not a payment." : "Couldn't find the amount on this line.";
                match.Amount = amount ?? 0;
                result.Matches.Add(match);
                continue;
            }

            // Fingerprint the line so re-uploading the same statement doesn't double-count
            var fingerprint = Hash($"{match.Date}|{amount:0.00}|{reference}|{rowText}");
            if (!seenInFile.Add(fingerprint))
            {
                match.Amount = amount.Value;
                match.Action = PaymentActions.Duplicate;
                match.Message = "Same line appears twice in this file.";
                result.Matches.Add(match);
                continue;
            }

            var outcome = await _payments.ApplyAsync(reference, amount.Value, PaymentProviders.BankStatement, fingerprint, DateTime.UtcNow,
                dryRun: !apply, notes: $"Statement line {i + 1}");
            match.Amount = outcome.Amount;
            match.Type = outcome.Type;
            match.TargetId = outcome.TargetId;
            match.Customer = outcome.Customer;
            match.Action = outcome.Action;
            match.Message = outcome.Message;
            match.Applied = outcome.Applied;
            result.Matches.Add(match);
        }
        return result;
    }

    /// <summary>
    /// Uses the credit/amount column when the statement has headers; otherwise prefers a number on the line that equals
    /// what's owed (deposit, balance, price or order total), so the running balance isn't mistaken for the payment.
    /// </summary>
    private async Task<decimal?> PickAmountAsync(List<string> row, string reference, int creditCol, int debitCol, int amountCol, int balanceCol)
    {
        if (creditCol >= 0 && creditCol < row.Count)
        {
            var credit = ParseAmount(row[creditCol]);
            if (credit is > 0) return credit;
            if (debitCol >= 0 && debitCol < row.Count && ParseAmount(row[debitCol]) is > 0) return -1;
        }
        if (amountCol >= 0 && amountCol < row.Count && ParseAmount(row[amountCol]) is { } amt) return amt;

        var numbers = row.Where((c, i) => i != balanceCol && !LooksLikeDate(c)).Select(ParseAmount).Where(n => n != null).Select(n => n!.Value).ToList();
        if (numbers.Count == 0) return null;

        var expected = new List<decimal>();
        var b = await _context.Bookings.FirstOrDefaultAsync(x => x.PaymentReference == reference);
        if (b != null) expected.AddRange(new[] { b.DepositAmount, b.Price, b.Price - b.AmountPaid });
        var o = await _context.Orders.FirstOrDefaultAsync(x => x.PaymentReference == reference);
        if (o != null) expected.Add(o.TotalAmount);
        var exact = numbers.FirstOrDefault(n => expected.Any(e => Math.Abs(e - n) < 0.01m));
        return exact != 0 ? exact : numbers.First();
    }

    // ------------------------------------------------------------------ parsing helpers

    private static readonly Regex DateLike = new(@"^\s*(\d{1,4}[/\-. ]\d{1,2}[/\-. ]\d{1,4}|\d{1,2}\s+[A-Za-z]{3,9}(\s+\d{2,4})?|\d{8})\s*$", RegexOptions.Compiled);
    private static bool LooksLikeDate(string s) => DateLike.IsMatch(s ?? "");

    /// <summary>"R1 234,56" / "1,234.56" / "-250.00" / "250.00 Cr" → number; null if not a number.</summary>
    public static decimal? ParseAmount(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = raw.Trim();
        var negative = s.StartsWith("-") || s.EndsWith("-") || s.EndsWith("Dr", StringComparison.OrdinalIgnoreCase) || (s.StartsWith("(") && s.EndsWith(")"));
        s = Regex.Replace(s, @"(?i)\b(cr|dr)\b|[R\s ()+\-]", "");
        if (s.Length == 0 || !Regex.IsMatch(s, @"^[\d.,]+$")) return null;

        var lastDot = s.LastIndexOf('.');
        var lastComma = s.LastIndexOf(',');
        if (lastComma > lastDot && s.Length - lastComma - 1 == 2) s = s.Replace(".", "").Replace(',', '.'); // 1.234,56 or 1234,56
        else s = s.Replace(",", "");
        if (!decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var v)) return null;
        return negative ? -v : v;
    }

    private static List<List<string>> ParseCsv(string text)
    {
        var lines = text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
        var sample = string.Join("\n", lines.Take(20));
        var delimiter = new[] { ',', ';', '\t', '|' }.OrderByDescending(d => sample.Count(c => c == d)).First();

        var rows = new List<List<string>>();
        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var cells = new List<string>();
            var cur = new StringBuilder();
            var quoted = false;
            for (var i = 0; i < line.Length; i++)
            {
                var c = line[i];
                if (c == '"')
                {
                    if (quoted && i + 1 < line.Length && line[i + 1] == '"') { cur.Append('"'); i++; }
                    else quoted = !quoted;
                }
                else if (c == delimiter && !quoted) { cells.Add(cur.ToString().Trim()); cur.Clear(); }
                else cur.Append(c);
            }
            cells.Add(cur.ToString().Trim());
            rows.Add(cells);
        }
        return rows;
    }

    private static string Hash(string s) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(s)))[..32];
    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}
