import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { SiteSettings } from "../../types";
import { siteApi } from "../../services/api";
import { DAY_NAMES, useSite } from "../../context/SiteContext";
import { apiErrorMessage } from "../../utils/format";
import { AdminPageHeader } from "../../components/AdminLayout";
import { ChangePasswordForm } from "../../components/ChangePasswordForm";
import { useAuth } from "../../context/AuthContext";

const panel = "rounded-2xl p-6 bg-white/5 ring-1 ring-gold-500/30";
const input = "!bg-white/10 !text-white !border-blush-700 focus:!border-gold-400 placeholder-blush-200/40";
const label = "!text-gold-200";

/** Loads the site settings for editing and saves them; shared by the content and hours pages. */
const useEditableSite = () => {
  const { setSite } = useSite();
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    siteApi
      .get()
      .then((s) => {
        setForm(s);
        setSaved(JSON.stringify(s));
      })
      .catch((e) => toast.error(apiErrorMessage(e, "Couldn't load website settings")));
  }, []);

  const dirty = !!form && JSON.stringify(form) !== saved;

  const save = async (successMessage: string) => {
    if (!form) return;
    setBusy(true);
    try {
      const result = await siteApi.save(form);
      setForm(result);
      setSaved(JSON.stringify(result));
      setSite(result); // update the live website straight away
      toast.success(successMessage);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save"));
    } finally {
      setBusy(false);
    }
  };

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return { form, setForm, dirty, busy, save };
};

const Field: React.FC<{
  id: string;
  title: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
}> = ({ id, title, hint, value, onChange, type = "text", multiline, placeholder, required, className }) => (
  <div className={className}>
    <label htmlFor={id} className={label}>{title}</label>
    {multiline ? (
      <textarea id={id} rows={3} className={input} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input id={id} type={type} required={required} className={input} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    )}
    {hint && <p className="text-xs text-blush-200/60 mt-1">{hint}</p>}
  </div>
);

const SaveBar: React.FC<{ dirty: boolean; busy: boolean }> = ({ dirty, busy }) => (
  <div className="sticky bottom-4 z-10 flex justify-end">
    <div className={`flex items-center gap-4 rounded-full px-5 py-3 shadow-gold ${dirty ? "bg-blush-800 ring-2 ring-gold-400" : "bg-blush-900/80 ring-1 ring-gold-500/30"}`}>
      <span className="text-sm text-blush-100">{dirty ? "You have unsaved changes" : "All changes saved"}</span>
      <button type="submit" disabled={!dirty || busy} className="btn-gold disabled:opacity-40">
        {busy ? "Saving…" : "Save Changes"}
      </button>
    </div>
  </div>
);

// ====================================================================== Website content

export const AdminContentPage: React.FC = () => {
  const { form, setForm, dirty, busy, save } = useEditableSite();
  if (!form) return <p className="text-blush-200/70">Loading…</p>;
  const set = (patch: Partial<SiteSettings>) => setForm({ ...form, ...patch });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save("Website updated");
      }}
      className="space-y-6 max-w-4xl"
    >
      <AdminPageHeader title="Website Content" subtitle="Change what clients see on the website – no code needed. Changes go live as soon as you save.">
        <a href="/" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full text-sm font-bold border border-gold-500/60 text-gold-200 hover:bg-white/10">
          Preview website ↗
        </a>
      </AdminPageHeader>

      <section className={panel}>
        <h2 className="text-2xl text-gold-300 mb-4">Announcement Banner</h2>
        <Field
          id="announcement"
          title="Message shown across the top of every page (leave empty to hide)"
          placeholder="e.g. Festive specials: 15% off all lash services until 31 December!"
          value={form.announcement}
          onChange={(announcement) => set({ announcement })}
        />
      </section>

      <section className={panel}>
        <h2 className="text-2xl text-gold-300 mb-4">Business Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field id="name" title="Business name" required value={form.businessName} onChange={(businessName) => set({ businessName })} />
          <Field id="tagline" title="Tagline (under the logo)" value={form.tagline} onChange={(tagline) => set({ tagline })} />
          <Field id="phone" title="Phone" type="tel" value={form.phone} onChange={(phone) => set({ phone })} />
          <Field id="email" title="Contact email" type="email" value={form.email} onChange={(email) => set({ email })} />
          <Field id="address" title="Address" className="md:col-span-2" placeholder="e.g. 12 Florida Road, Morningside, Durban" value={form.address} onChange={(address) => set({ address })} />
          <Field id="whatsapp" title="WhatsApp number" hint="Shown as a chat link, e.g. 27821234567" value={form.whatsApp} onChange={(whatsApp) => set({ whatsApp })} />
          <Field id="instagram" title="Instagram" hint="Username or full link" value={form.instagram} onChange={(instagram) => set({ instagram })} />
          <Field id="facebook" title="Facebook" hint="Page name or full link" value={form.facebook} onChange={(facebook) => set({ facebook })} />
        </div>
      </section>

      <section className={panel}>
        <h2 className="text-2xl text-gold-300 mb-4">Homepage</h2>
        <div className="space-y-4">
          <Field id="heroTitle" title="Main heading" value={form.heroTitle} onChange={(heroTitle) => set({ heroTitle })} />
          <Field id="heroSubtitle" title="Introduction" multiline value={form.heroSubtitle} onChange={(heroSubtitle) => set({ heroSubtitle })} />
          <Field id="about" title="About us" multiline hint="Shown in the 'About us' section of the homepage." value={form.aboutText} onChange={(aboutText) => set({ aboutText })} />
        </div>
      </section>

      <section className={panel}>
        <h2 className="text-2xl text-gold-300 mb-1">Payments &amp; Deposits</h2>
        <p className="text-sm text-blush-200/80 mb-4">Shown on every scan-to-pay QR code, booking confirmation and deposit email.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field id="bank" title="Bank" placeholder="e.g. FNB" value={form.bankName} onChange={(bankName) => set({ bankName })} />
          <Field id="accName" title="Account name" value={form.accountName} onChange={(accountName) => set({ accountName })} />
          <Field id="accNo" title="Account number" value={form.accountNumber} onChange={(accountNumber) => set({ accountNumber })} />
          <Field id="branch" title="Branch code" value={form.branchCode} onChange={(branchCode) => set({ branchCode })} />
          <Field
            id="scan"
            title="Scan-to-pay link (optional)"
            className="md:col-span-2"
            placeholder="https://pos.snapscan.io/qr/YOUR-ID?id={reference}&amount={amountCents}"
            hint="From SnapScan / Zapper / PayShap. Use {reference}, {amount} or {amountCents}. Leave empty to show your EFT details in the QR code."
            value={form.scanToPayUrl}
            onChange={(scanToPayUrl) => set({ scanToPayUrl })}
          />
          <div>
            <label htmlFor="depPct" className={label}>Booking deposit (% of price)</label>
            <input id="depPct" type="number" min={0} max={100} className={input} value={form.depositPercent} onChange={(e) => set({ depositPercent: parseInt(e.target.value || "0") })} />
            <p className="text-xs text-blush-200/60 mt-1">Set to 0 to stop asking for deposits.</p>
          </div>
          <div>
            <label htmlFor="depHrs" className={label}>Deposit must be paid within (hours)</label>
            <input id="depHrs" type="number" min={1} max={168} className={input} value={form.depositHours} onChange={(e) => set({ depositHours: parseInt(e.target.value || "1") })} />
            <p className="text-xs text-blush-200/60 mt-1">Unpaid bookings are released after this.</p>
          </div>
          <Field
            id="policy"
            title="Deposit & cancellation policy (shown to clients)"
            className="md:col-span-2"
            multiline
            value={form.cancellationPolicy}
            onChange={(cancellationPolicy) => set({ cancellationPolicy })}
          />
        </div>
      </section>

      <p className="text-sm text-blush-200/70">
        Opening hours are edited under <a href="/admin/hours" className="font-bold text-gold-200 hover:underline">Opening Hours</a>; prices under{" "}
        <a href="/admin/services" className="font-bold text-gold-200 hover:underline">Services &amp; Menu</a>.
      </p>

      <SaveBar dirty={dirty} busy={busy} />
    </form>
  );
};

// ====================================================================== Weekly hours (used on the Opening Hours page)

export const WeeklyHoursEditor: React.FC = () => {
  const { form, setForm, dirty, busy, save } = useEditableSite();
  if (!form) return <p className="text-blush-200/70">Loading…</p>;

  const times = Array.from({ length: 33 }, (_, i) => {
    const mins = 6 * 60 + i * 30; // 06:00 – 22:00
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${mins % 60 ? "30" : "00"}`;
  });
  const update = (day: number, patch: Partial<SiteSettings["hours"][number]>) =>
    setForm({ ...form, hours: form.hours.map((h) => (h.day === day ? { ...h, ...patch } : h)) });

  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save("Opening hours updated");
      }}
      className={panel}
    >
      <h2 className="text-2xl text-gold-300 mb-1">Weekly Hours</h2>
      <p className="text-sm text-blush-200/80 mb-4">Your normal hours every week. Clients can only book within these times.</p>
      <div className="divide-y divide-white/10">
        {order.map((d) => {
          const h = form.hours.find((x) => x.day === d)!;
          return (
            <div key={d} className="py-3 grid grid-cols-[110px,auto,1fr] sm:grid-cols-[140px,auto,1fr] items-center gap-4">
              <span className="font-bold">{DAY_NAMES[d]}</span>
              <label className="flex items-center gap-2 !mb-0 !text-blush-100 cursor-pointer">
                <input type="checkbox" className="!w-5 !h-5 accent-pink-600" checked={h.isOpen} onChange={(e) => update(d, { isOpen: e.target.checked })} />
                Open
              </label>
              {h.isOpen ? (
                <div className="flex items-center gap-2">
                  <select className={`${input} !w-auto !py-1.5`} value={h.opens} onChange={(e) => update(d, { opens: e.target.value })}>
                    {times.map((t) => <option key={t} className="text-blush-900">{t}</option>)}
                  </select>
                  <span className="text-blush-200">to</span>
                  <select className={`${input} !w-auto !py-1.5`} value={h.closes} onChange={(e) => update(d, { closes: e.target.value })}>
                    {times.map((t) => <option key={t} className="text-blush-900">{t}</option>)}
                  </select>
                </div>
              ) : (
                <span className="text-blush-200/60">Closed</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button type="submit" disabled={!dirty || busy} className="btn-gold disabled:opacity-40">
          {busy ? "Saving…" : "Save Weekly Hours"}
        </button>
        {dirty && <span className="text-sm text-gold-200">Unsaved changes</span>}
      </div>
    </form>
  );
};

// ====================================================================== Account

export const AdminAccountPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="max-w-xl">
      <AdminPageHeader title="Account & Password" subtitle={`Signed in as ${user?.email}`} />
      <div className={panel}>
        <ChangePasswordForm dark />
      </div>
    </div>
  );
};
