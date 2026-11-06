import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ReportType, SupportReport } from "../types";
import { reportsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../utils/format";

const TYPES: { value: ReportType; icon: string; title: string; text: string }[] = [
  { value: "Concern", icon: "💬", title: "Raise a Concern", text: "Something about your visit wasn't right" },
  { value: "Lost Item", icon: "🔎", title: "Lost Something?", text: "Tell us what you left behind" },
  { value: "Other", icon: "✉️", title: "Something Else", text: "Questions, ideas or feedback" },
];

export const statusBadge = (status: string) =>
  status === "Resolved" ? "badge-paid" : status === "In Progress" ? "badge-info" : "badge-pending";

const todayIso = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export const HelpPage: React.FC = () => {
  const { user } = useAuth();
  const [type, setType] = useState<ReportType>("Concern");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<SupportReport | null>(null);
  const [mine, setMine] = useState<SupportReport[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", visitDate: "", itemDescription: "", message: "" });
  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone || "" }));
    if (user.role !== "Admin") reportsApi.getMine().then(setMine).catch(() => undefined);
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const report = await reportsApi.create({
        type,
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        visitDate: form.visitDate || undefined,
        itemDescription: type === "Lost Item" ? form.itemDescription : undefined,
        message: form.message,
      });
      setSubmitted(report);
      setMine((m) => [report, ...m]);
      setForm((f) => ({ ...f, visitDate: "", itemDescription: "", message: "" }));
      toast.success("Thank you – we've received your report");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't send your report"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl text-center">Help &amp; Lost Property</h1>
        <div className="gold-rule" />
        <p className="text-center text-blush-900/70 mb-10">
          We're here to make every visit special. Let us know if anything went wrong or if you left something behind.
        </p>

        {submitted ? (
          <div className="card text-center max-w-xl mx-auto">
            <div className="text-5xl mb-3">💌</div>
            <h2 className="text-3xl mb-2">We've got it</h2>
            <p className="text-blush-900/70 mb-4">
              Your reference is{" "}
              <span className="font-mono font-bold text-blush-700">{submitted.referenceNumber}</span>. We'll contact
              you at {submitted.email}
              {submitted.type === "Lost Item" ? " as soon as we've checked the salon." : " as soon as possible."}
            </p>
            <button onClick={() => setSubmitted(null)} className="btn-secondary">
              Send another
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`card text-center p-5 ${type === t.value ? "!border-gold-500 ring-2 ring-blush-400" : "card-hover"}`}
                  aria-pressed={type === t.value}
                >
                  <div className="text-3xl mb-1">{t.icon}</div>
                  <p className="font-elegant text-xl font-bold text-blush-800">{t.title}</p>
                  <p className="text-xs text-blush-900/60">{t.text}</p>
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="card space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="h-name">Your name</label>
                  <input id="h-name" required value={form.name} onChange={(e) => update({ name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="h-email">Email</label>
                  <input id="h-email" type="email" required value={form.email} onChange={(e) => update({ email: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="h-phone">Phone (optional)</label>
                  <input id="h-phone" type="tel" value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="h-date">Date of your visit (optional)</label>
                  <input
                    id="h-date"
                    type="date"
                    max={todayIso()}
                    value={form.visitDate}
                    onChange={(e) => update({ visitDate: e.target.value })}
                  />
                </div>
              </div>

              {type === "Lost Item" && (
                <div>
                  <label htmlFor="h-item">What did you lose?</label>
                  <input
                    id="h-item"
                    required
                    placeholder="e.g. Gold hoop earring, black umbrella"
                    value={form.itemDescription}
                    onChange={(e) => update({ itemDescription: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label htmlFor="h-msg">{type === "Lost Item" ? "Where might you have left it?" : "Tell us what happened"}</label>
                <textarea
                  id="h-msg"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                  value={form.message}
                  onChange={(e) => update({ message: e.target.value })}
                />
              </div>

              <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-50">
                {busy ? "Sending…" : "Send to the Salon"}
              </button>
              {!user && (
                <p className="text-center text-sm text-blush-900/60">
                  <Link to="/login" state={{ from: "/help" }} className="font-bold text-blush-600 hover:underline">
                    Sign in
                  </Link>{" "}
                  to follow the status of your reports.
                </p>
              )}
            </form>
          </>
        )}

        {mine.length > 0 && (
          <section className="mt-12">
            <h2 className="text-3xl mb-4">Your Reports</h2>
            <div className="space-y-4">
              {mine.map((r) => (
                <div key={r.id} className="card">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-mono font-bold text-blush-700">{r.referenceNumber}</p>
                      <p className="text-sm text-blush-900/60">
                        {r.type} · {new Date(r.createdAt).toLocaleDateString([], { dateStyle: "medium" })}
                      </p>
                    </div>
                    <span className={`${statusBadge(r.status)} self-start`}>{r.status}</span>
                  </div>
                  {r.itemDescription && <p className="mt-2 font-bold">{r.itemDescription}</p>}
                  <p className="mt-2 text-blush-900/80 whitespace-pre-line">{r.message}</p>
                  {r.adminNotes && (
                    <div className="mt-3 rounded-lg p-3 bg-gold-50 border border-gold-200 text-sm">
                      <p className="font-bold text-gold-700 mb-0.5">Salon response</p>
                      <p className="whitespace-pre-line">{r.adminNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
