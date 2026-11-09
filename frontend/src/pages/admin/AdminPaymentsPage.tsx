import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { PayFastSettingsView, PaymentRecord, StatementMatch, paymentsApi } from "../../services/api";
import { apiErrorMessage, formatRand } from "../../utils/format";
import { AdminPageHeader } from "../../components/AdminLayout";

const panel = "rounded-2xl p-6 bg-white/5 ring-1 ring-gold-500/30";
const input = "!bg-white/10 !text-white !border-blush-700 focus:!border-gold-400 placeholder-blush-200/40";
const label = "!text-gold-200";
const th = "px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gold-300";
const td = "px-4 py-3 align-top";

const actionBadge = (m: { action: string; applied: boolean }) =>
  m.applied ? "badge-paid" : m.action === "Already recorded" || m.action === "Already paid" ? "badge-info" : m.action.startsWith("No matching") ? "badge" : "badge-pending";

// ====================================================================== PayFast

const PayFastCard: React.FC = () => {
  const [view, setView] = useState<PayFastSettingsView | null>(null);
  const [form, setForm] = useState({ enabled: false, sandbox: true, merchantId: "", merchantKey: "", passphrase: "", clearPassphrase: false, siteUrl: "", apiUrl: "" });
  const [busy, setBusy] = useState(false);

  const apply = (v: PayFastSettingsView) => {
    setView(v);
    setForm({ enabled: v.enabled, sandbox: v.sandbox, merchantId: v.merchantId, merchantKey: "", passphrase: "", clearPassphrase: false, siteUrl: v.siteUrl, apiUrl: v.apiUrl });
  };

  useEffect(() => {
    paymentsApi.getPayFast().then(apply).catch((e) => toast.error(apiErrorMessage(e, "Couldn't load PayFast settings")));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      apply(
        await paymentsApi.savePayFast({
          ...form,
          merchantKey: form.merchantKey || undefined,
          passphrase: form.passphrase || undefined,
        })
      );
      toast.success(form.enabled ? "PayFast is on – deposits will confirm automatically" : "PayFast settings saved");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save PayFast settings"));
    } finally {
      setBusy(false);
    }
  };

  if (!view) return <div className={panel}>Loading…</div>;

  return (
    <form onSubmit={save} className={`${panel} space-y-4`}>
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h2 className="text-2xl text-gold-300">PayFast – automatic confirmation</h2>
          <p className="text-sm text-blush-200/80 max-w-2xl">
            Clients pay deposits, balances and café orders with instant EFT or card. PayFast tells the website the moment the money is in,
            and the booking updates itself.
          </p>
        </div>
        {view.enabled ? (
          <span className={view.sandbox ? "badge-pending" : "badge-paid"}>{view.sandbox ? "On – test mode" : "On – live"}</span>
        ) : (
          <span className="badge">Off</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={label}>Merchant ID</label>
          <input className={input} value={form.merchantId} onChange={(e) => setForm({ ...form, merchantId: e.target.value })} placeholder="From PayFast → Settings → Developer" />
        </div>
        <div>
          <label className={label}>Merchant key</label>
          <input
            className={`${input} font-mono`}
            type="password"
            autoComplete="off"
            value={form.merchantKey}
            onChange={(e) => setForm({ ...form, merchantKey: e.target.value })}
            placeholder={view.hasMerchantKey ? "•••••• saved – type to replace" : "Merchant key"}
          />
        </div>
        <div>
          <label className={label}>Passphrase (recommended)</label>
          <input
            className={`${input} font-mono`}
            type="password"
            autoComplete="off"
            value={form.passphrase}
            onChange={(e) => setForm({ ...form, passphrase: e.target.value, clearPassphrase: false })}
            placeholder={view.hasPassphrase ? "•••••• saved – type to replace" : "Same as in your PayFast account"}
          />
          {view.hasPassphrase && (
            <label className="flex items-center gap-2 !text-xs !text-blush-200 !mt-1 cursor-pointer">
              <input type="checkbox" className="!w-4 !h-4" checked={form.clearPassphrase} onChange={(e) => setForm({ ...form, clearPassphrase: e.target.checked, passphrase: "" })} />
              Remove saved passphrase
            </label>
          )}
        </div>
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={label}>Website address</label>
            <input className={input} value={form.siteUrl} onChange={(e) => setForm({ ...form, siteUrl: e.target.value })} placeholder="https://anointedhands.co.za" />
            <p className="text-xs text-blush-200/60 mt-1">Where clients return after paying.</p>
          </div>
          <div>
            <label className={label}>Booking system (API) address</label>
            <input className={input} value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} placeholder="https://api.anointedhands.co.za" />
            <p className="text-xs text-blush-200/60 mt-1">
              PayFast sends payment confirmations to <span className="font-mono break-all">{view.notifyUrl}</span>
            </p>
          </div>
        </div>
      </div>

      {!view.publiclyReachable && (
        <p className="text-sm rounded-lg px-4 py-3 bg-gold-400/15 ring-1 ring-gold-400/50 text-gold-100">
          ⚠️ The booking system address is on this computer (localhost), so PayFast can't reach it to confirm payments. Automatic
          confirmation starts working once the site is online at a public address – until then, use the statement upload below.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 !mb-0 !text-blush-100 cursor-pointer">
          <input type="checkbox" className="!w-5 !h-5 accent-pink-600" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          Accept payments with PayFast
        </label>
        <label className="flex items-center gap-2 !mb-0 !text-blush-100 cursor-pointer">
          <input type="checkbox" className="!w-5 !h-5 accent-pink-600" checked={form.sandbox} onChange={(e) => setForm({ ...form, sandbox: e.target.checked })} />
          Test mode (PayFast sandbox – no real money)
        </label>
      </div>

      <button type="submit" disabled={busy} className="btn-gold disabled:opacity-50">
        {busy ? "Saving…" : "Save PayFast Settings"}
      </button>
    </form>
  );
};

// ====================================================================== Bank statement

const StatementCard: React.FC<{ onApplied: () => void }> = ({ onApplied }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ rowsRead: number; rowsWithReference: number; applied: boolean; matches: StatementMatch[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const run = async (apply: boolean) => {
    if (!file) return toast.error("Choose your statement file first");
    setBusy(true);
    try {
      const res = await paymentsApi.importStatement(file, apply);
      setPreview(res);
      if (apply) {
        const n = res.matches.filter((m) => m.applied).length;
        toast.success(n ? `${n} payment${n === 1 ? "" : "s"} applied` : "Nothing new to apply");
        onApplied();
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't read the statement"));
    } finally {
      setBusy(false);
    }
  };

  const toApply = preview && !preview.applied ? preview.matches.filter((m) => m.applied).length : 0;

  return (
    <div className={`${panel} space-y-4`}>
      <div>
        <h2 className="text-2xl text-gold-300">Match EFT Payments from a Bank Statement</h2>
        <p className="text-sm text-blush-200/80 max-w-2xl">
          For clients who pay by normal EFT. Download a statement from your online banking as <strong>CSV</strong> and upload it here. Every
          payment with a reference like <span className="font-mono">AH-B12345</span> is matched to its booking or café order. You'll see a
          preview first; uploading the same statement again won't count anything twice.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.txt,text/csv"
          className={`${input} !w-auto file:mr-3 file:rounded-full file:border-0 file:bg-gold-400 file:px-4 file:py-1 file:font-bold file:text-blush-900`}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
          }}
        />
        <button onClick={() => run(false)} disabled={!file || busy} className="btn-gold disabled:opacity-40">
          {busy && !preview ? "Reading…" : "Check Statement"}
        </button>
      </div>

      {preview && (
        <div className="space-y-3">
          <p className="text-sm text-blush-100">
            {preview.applied ? "Applied. " : "Preview – nothing has changed yet. "}
            Read {preview.rowsRead} lines; {preview.rowsWithReference} contained a payment reference.
          </p>
          {preview.matches.length > 0 && (
            <div className="rounded-xl overflow-x-auto ring-1 ring-white/10">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className={th}>Reference</th>
                    <th className={th}>Amount</th>
                    <th className={th}>Client</th>
                    <th className={th}>Result</th>
                    <th className={th}>Statement line</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.matches.map((m) => (
                    <tr key={`${m.line}-${m.reference}`} className="border-t border-white/10">
                      <td className={`${td} font-mono text-gold-200`}>{m.reference}</td>
                      <td className={`${td} font-bold`}>{formatRand(m.amount)}</td>
                      <td className={td}>{m.customer ?? "—"}</td>
                      <td className={td}>
                        <span className={actionBadge(m)}>{m.action}</span>
                        <p className="text-xs text-blush-200/80 mt-1">{m.message}</p>
                      </td>
                      <td className={`${td} text-xs text-blush-200/70`}>
                        {m.date && <span className="mr-1">{m.date}</span>}
                        {m.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!preview.applied && (
            <div className="flex gap-3 items-center">
              <button onClick={() => run(true)} disabled={busy || toApply === 0} className="btn-gold disabled:opacity-40">
                {busy ? "Applying…" : toApply ? `Apply ${toApply} Payment${toApply === 1 ? "" : "s"}` : "Nothing to apply"}
              </button>
              <button
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                className="text-sm font-bold text-blush-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ====================================================================== Page

export const AdminPaymentsPage: React.FC = () => {
  const [recent, setRecent] = useState<PaymentRecord[]>([]);
  const load = useCallback(() => paymentsApi.recent().then(setRecent).catch(() => undefined), []);
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader title="Payments" subtitle="Deposits, balances and café orders are confirmed automatically when payments arrive." />
      <PayFastCard />
      <StatementCard onApplied={load} />

      <section className={panel}>
        <h2 className="text-2xl text-gold-300 mb-4">Received Payments</h2>
        {recent.length === 0 ? (
          <p className="text-blush-200/70">No automatic payments yet. Payments you mark by hand on the Bookings page aren't listed here.</p>
        ) : (
          <div className="rounded-xl overflow-x-auto ring-1 ring-white/10">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>Reference</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Via</th>
                  <th className={th}>Result</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-t border-white/10">
                    <td className={td}>{new Date(p.createdAt.endsWith("Z") ? p.createdAt : `${p.createdAt}Z`).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className={`${td} font-mono text-gold-200`}>{p.paymentReference}</td>
                    <td className={`${td} font-bold`}>{formatRand(p.amount)}</td>
                    <td className={td}>{p.provider}</td>
                    <td className={td}>
                      <span className={p.status === "Confirmed" ? "badge-paid" : "badge-pending"}>{p.status === "Confirmed" ? "Applied" : "Check"}</span>
                      <p className="text-xs text-blush-200/80 mt-1">{p.notes}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
