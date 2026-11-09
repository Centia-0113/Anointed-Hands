import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CafeItem, SaveCafeItem, SaveService, Service, SpecialDay, StylistAdmin } from "../types";
import { cafeItemsApi, scheduleApi, servicesApi, stylistsApi } from "../services/api";
import { apiErrorMessage, formatRand } from "../utils/format";

const panel = "rounded-2xl p-6 bg-white/5 ring-1 ring-gold-500/30";
const input = "!bg-white/10 !text-white !border-blush-700 focus:!border-gold-400 placeholder-blush-200/50";
const label = "!text-gold-200";
const th = "px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gold-300";
const td = "px-4 py-3 align-top";
const ghostBtn = "px-4 py-2 rounded-full text-sm font-bold border border-gold-500/60 text-gold-200 hover:bg-white/10 disabled:opacity-50";

const todayIso = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const DiscountCell: React.FC<{ price: number; finalPrice: number; pct?: number | null; active: boolean; endsOn?: string | null }> = ({
  price,
  finalPrice,
  pct,
  active,
  endsOn,
}) => (
  <>
    <p className="font-bold">
      {formatRand(finalPrice)}
      {active && finalPrice < price && <span className="ml-2 text-xs line-through text-blush-200/60">{formatRand(price)}</span>}
    </p>
    {pct ? (
      <p className={`text-xs ${active ? "text-gold-300" : "text-blush-200/60"}`}>
        {pct}% off{endsOn ? ` until ${new Date(endsOn).toLocaleDateString([], { day: "numeric", month: "short" })}` : ""}
        {!active && " (ended)"}
      </p>
    ) : null}
  </>
);

/** Shared discount inputs (percentage + optional end date). */
const DiscountFields: React.FC<{
  pct: string;
  endsOn: string;
  onChange: (pct: string, endsOn: string) => void;
}> = ({ pct, endsOn, onChange }) => (
  <>
    <div>
      <label className={label}>Discount % (optional)</label>
      <input className={input} type="number" min={0} max={90} step={1} placeholder="e.g. 15" value={pct} onChange={(e) => onChange(e.target.value, endsOn)} />
    </div>
    <div>
      <label className={label}>Discount ends (optional)</label>
      <input className={input} type="date" min={todayIso()} value={endsOn} disabled={!pct || pct === "0"} onChange={(e) => onChange(pct, e.target.value)} />
    </div>
  </>
);

// ====================================================================== Services & café menu

type ServiceForm = { id?: number; name: string; description: string; price: string; duration: string; category: string; pct: string; endsOn: string; isActive: boolean };
type CafeForm = { id?: number; name: string; description: string; price: string; category: string; pct: string; endsOn: string; isActive: boolean; isOutOfStock: boolean };

const emptyService: ServiceForm = { name: "", description: "", price: "", duration: "60", category: "Hair", pct: "", endsOn: "", isActive: true };
const emptyCafe: CafeForm = { name: "", description: "", price: "", category: "Cakes", pct: "", endsOn: "", isActive: true, isOutOfStock: false };

export const AdminCatalog: React.FC = () => {
  const [section, setSection] = useState<"services" | "cafe">("services");
  const [services, setServices] = useState<Service[]>([]);
  const [items, setItems] = useState<CafeItem[]>([]);
  const [serviceForm, setServiceForm] = useState<ServiceForm | null>(null);
  const [cafeForm, setCafeForm] = useState<CafeForm | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([servicesApi.getAllAdmin(), cafeItemsApi.getAllAdmin()]);
      setServices(s);
      setItems(c);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Couldn't load services and menu"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const serviceCategories = Array.from(new Set(["Hair", "Nails", "Facials", ...services.map((s) => s.category)]));
  const cafeCategories = Array.from(new Set(["Cakes", "Muffins", "Donuts", "Refreshments", ...items.map((i) => i.category)]));

  const editService = (s: Service) =>
    setServiceForm({
      id: s.id,
      name: s.name,
      description: s.description,
      price: String(s.price),
      duration: String(s.durationMinutes),
      category: s.category,
      pct: s.discountPercent ? String(s.discountPercent) : "",
      endsOn: s.discountEndsOn?.slice(0, 10) ?? "",
      isActive: s.isActive,
    });

  const editCafe = (c: CafeItem) =>
    setCafeForm({
      id: c.id,
      name: c.name,
      description: c.description,
      price: String(c.price),
      category: c.category,
      pct: c.discountPercent ? String(c.discountPercent) : "",
      endsOn: c.discountEndsOn?.slice(0, 10) ?? "",
      isActive: c.isActive,
      isOutOfStock: c.isOutOfStock,
    });

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm) return;
    const pct = serviceForm.pct ? parseInt(serviceForm.pct) : null;
    const body: SaveService = {
      name: serviceForm.name,
      description: serviceForm.description,
      price: parseFloat(serviceForm.price),
      durationMinutes: parseInt(serviceForm.duration),
      category: serviceForm.category,
      discountPercent: pct || null,
      discountEndsOn: pct && serviceForm.endsOn ? serviceForm.endsOn : null,
      isActive: serviceForm.isActive,
    };
    setBusy(true);
    try {
      if (serviceForm.id) await servicesApi.update(serviceForm.id, body);
      else await servicesApi.create(body);
      toast.success(serviceForm.id ? "Service updated" : "Service added");
      setServiceForm(null);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save the service"));
    } finally {
      setBusy(false);
    }
  };

  const saveCafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafeForm) return;
    const pct = cafeForm.pct ? parseInt(cafeForm.pct) : null;
    const body: SaveCafeItem = {
      name: cafeForm.name,
      description: cafeForm.description,
      price: parseFloat(cafeForm.price),
      category: cafeForm.category,
      discountPercent: pct || null,
      discountEndsOn: pct && cafeForm.endsOn ? cafeForm.endsOn : null,
      isActive: cafeForm.isActive,
      isOutOfStock: cafeForm.isOutOfStock,
    };
    setBusy(true);
    try {
      if (cafeForm.id) await cafeItemsApi.update(cafeForm.id, body);
      else await cafeItemsApi.create(body);
      toast.success(cafeForm.id ? "Menu item updated" : "Menu item added");
      setCafeForm(null);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save the menu item"));
    } finally {
      setBusy(false);
    }
  };

  /** Quick toggle without opening the form (stock / visibility). */
  const quickCafe = async (c: CafeItem, patch: Partial<SaveCafeItem>, msg: string) => {
    try {
      await cafeItemsApi.update(c.id, {
        name: c.name,
        description: c.description,
        price: c.price,
        category: c.category,
        discountPercent: c.discountPercent ?? null,
        discountEndsOn: c.discountEndsOn ?? null,
        isActive: c.isActive,
        isOutOfStock: c.isOutOfStock,
        ...patch,
      });
      toast.success(msg);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't update the item"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <button onClick={() => setSection("services")} className={section === "services" ? "chip-active" : "chip"}>
            Salon Services ({services.length})
          </button>
          <button onClick={() => setSection("cafe")} className={section === "cafe" ? "chip-active" : "chip"}>
            Café Menu ({items.length})
          </button>
        </div>
        {section === "services" ? (
          <button onClick={() => setServiceForm({ ...emptyService })} className="btn-gold text-sm">
            + Add Service
          </button>
        ) : (
          <button onClick={() => setCafeForm({ ...emptyCafe })} className="btn-gold text-sm">
            + Add Menu Item
          </button>
        )}
      </div>

      {/* ---------- service form */}
      {section === "services" && serviceForm && (
        <form onSubmit={saveService} className={`${panel} space-y-4`}>
          <h3 className="text-2xl text-gold-300">{serviceForm.id ? "Edit Service" : "New Service"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={label}>Name</label>
              <input className={input} required value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} />
            </div>
            <div>
              <label className={label}>Category</label>
              <input className={input} required list="service-cats" value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} />
              <datalist id="service-cats">
                {serviceCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="md:col-span-3">
              <label className={label}>Description</label>
              <input className={input} value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} />
            </div>
            <div>
              <label className={label}>Price (R)</label>
              <input className={input} required type="number" min={1} step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} />
            </div>
            <div>
              <label className={label}>Duration</label>
              <select className={input} value={serviceForm.duration} onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}>
                {Array.from({ length: 32 }, (_, i) => (i + 1) * 15).map((m) => (
                  <option key={m} value={m} className="text-blush-900">
                    {m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m} min`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 !mb-3 !text-blush-100 cursor-pointer">
                <input type="checkbox" className="!w-5 !h-5 accent-pink-600" checked={serviceForm.isActive} onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })} />
                Bookable on the website
              </label>
            </div>
            <DiscountFields pct={serviceForm.pct} endsOn={serviceForm.endsOn} onChange={(pct, endsOn) => setServiceForm({ ...serviceForm, pct, endsOn })} />
            {serviceForm.price && (
              <div className="flex items-end text-sm text-blush-100 pb-3">
                Clients pay{" "}
                <strong className="mx-1 text-gold-200">
                  {formatRand(Math.round(parseFloat(serviceForm.price) * (100 - (parseInt(serviceForm.pct) || 0))) / 100)}
                </strong>
                (deposit {formatRand(Math.ceil((parseFloat(serviceForm.price) * (100 - (parseInt(serviceForm.pct) || 0))) / 1000))})
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="btn-gold disabled:opacity-50">
              {busy ? "Saving…" : "Save Service"}
            </button>
            <button type="button" onClick={() => setServiceForm(null)} className={ghostBtn}>
              Cancel
            </button>
          </div>
          <p className="text-xs text-blush-200/70">Price changes apply to new bookings; existing bookings keep the price they were booked at.</p>
        </form>
      )}

      {/* ---------- café form */}
      {section === "cafe" && cafeForm && (
        <form onSubmit={saveCafe} className={`${panel} space-y-4`}>
          <h3 className="text-2xl text-gold-300">{cafeForm.id ? "Edit Menu Item" : "New Menu Item"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={label}>Name</label>
              <input className={input} required value={cafeForm.name} onChange={(e) => setCafeForm({ ...cafeForm, name: e.target.value })} />
            </div>
            <div>
              <label className={label}>Category</label>
              <input className={input} required list="cafe-cats" value={cafeForm.category} onChange={(e) => setCafeForm({ ...cafeForm, category: e.target.value })} />
              <datalist id="cafe-cats">
                {cafeCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="md:col-span-3">
              <label className={label}>Description</label>
              <input className={input} value={cafeForm.description} onChange={(e) => setCafeForm({ ...cafeForm, description: e.target.value })} />
            </div>
            <div>
              <label className={label}>Price (R)</label>
              <input className={input} required type="number" min={1} step="0.01" value={cafeForm.price} onChange={(e) => setCafeForm({ ...cafeForm, price: e.target.value })} />
            </div>
            <DiscountFields pct={cafeForm.pct} endsOn={cafeForm.endsOn} onChange={(pct, endsOn) => setCafeForm({ ...cafeForm, pct, endsOn })} />
            <label className="flex items-center gap-2 !text-blush-100 cursor-pointer">
              <input type="checkbox" className="!w-5 !h-5 accent-pink-600" checked={cafeForm.isActive} onChange={(e) => setCafeForm({ ...cafeForm, isActive: e.target.checked })} />
              Show on the menu
            </label>
            <label className="flex items-center gap-2 !text-blush-100 cursor-pointer">
              <input type="checkbox" className="!w-5 !h-5 accent-pink-600" checked={cafeForm.isOutOfStock} onChange={(e) => setCafeForm({ ...cafeForm, isOutOfStock: e.target.checked })} />
              Out of stock
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="btn-gold disabled:opacity-50">
              {busy ? "Saving…" : "Save Item"}
            </button>
            <button type="button" onClick={() => setCafeForm(null)} className={ghostBtn}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ---------- lists */}
      <div className="rounded-2xl overflow-x-auto bg-white/5 ring-1 ring-gold-500/30">
        {section === "services" ? (
          <table className="w-full min-w-[720px]">
            <thead className="bg-white/5">
              <tr>
                <th className={th}>Service</th>
                <th className={th}>Category</th>
                <th className={th}>Duration</th>
                <th className={th}>Price</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className={`border-t border-white/10 ${s.isActive ? "" : "opacity-50"}`}>
                  <td className={td}>
                    <p className="font-bold">{s.name}</p>
                    <p className="text-xs text-blush-200/70 max-w-xs">{s.description}</p>
                  </td>
                  <td className={td}>{s.category}</td>
                  <td className={td}>{s.durationMinutes} min</td>
                  <td className={td}>
                    <DiscountCell price={s.price} finalPrice={s.finalPrice} pct={s.discountPercent} active={s.isDiscountActive} endsOn={s.discountEndsOn} />
                  </td>
                  <td className={td}>{s.isActive ? <span className="badge-paid">Live</span> : <span className="badge-cancelled">Hidden</span>}</td>
                  <td className={td}>
                    <button onClick={() => editService(s)} className="btn-gold text-xs px-3 py-1.5">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[720px]">
            <thead className="bg-white/5">
              <tr>
                <th className={th}>Item</th>
                <th className={th}>Category</th>
                <th className={th}>Price</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className={`border-t border-white/10 ${c.isActive ? "" : "opacity-50"}`}>
                  <td className={td}>
                    <p className="font-bold">{c.name}</p>
                    <p className="text-xs text-blush-200/70 max-w-xs">{c.description}</p>
                  </td>
                  <td className={td}>{c.category}</td>
                  <td className={td}>
                    <DiscountCell price={c.price} finalPrice={c.finalPrice} pct={c.discountPercent} active={c.isDiscountActive} endsOn={c.discountEndsOn} />
                  </td>
                  <td className={td}>
                    {!c.isActive ? (
                      <span className="badge-cancelled">Hidden</span>
                    ) : c.isOutOfStock ? (
                      <span className="badge-pending">Out of stock</span>
                    ) : (
                      <span className="badge-paid">Available</span>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => editCafe(c)} className="btn-gold text-xs px-3 py-1.5">
                        Edit
                      </button>
                      <button
                        onClick={() => quickCafe(c, { isOutOfStock: !c.isOutOfStock }, c.isOutOfStock ? `${c.name} back in stock` : `${c.name} marked out of stock`)}
                        className="text-xs font-bold text-blush-300 hover:text-white"
                      >
                        {c.isOutOfStock ? "Back in stock" : "Out of stock"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ====================================================================== Staff

type StylistForm = {
  id?: number;
  name: string;
  specialization: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  // new employees only
  createLogin: boolean;
  loginEmail: string;
  temporaryPassword: string;
};

/** Random temporary password, e.g. "Kp7mQx2aRt" (no look-alike characters). */
const randomPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(10);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
};

/** Shown once after a login is created/reset so the admin can hand over the details. */
const CredentialsCard: React.FC<{ name: string; email: string; password: string; onClose: () => void }> = ({ name, email, password, onClose }) => {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Anointed Hands staff login\nWebsite: ${window.location.origin}/login\nEmail: ${email}\nTemporary password: ${password}\nYou'll be asked to choose your own password when you first sign in.`
      );
      toast.success("Login details copied");
    } catch {
      toast.error("Couldn't copy – please write them down");
    }
  };
  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-gold-300 to-gold-500 text-blush-900 shadow-gold">
      <p className="text-xs font-bold uppercase tracking-widest mb-1">Give these details to {name.split(" ")[0]}</p>
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-lg">
        <dt className="font-bold">Sign in at</dt>
        <dd className="font-mono break-all">{window.location.origin}/login</dd>
        <dt className="font-bold">Email</dt>
        <dd className="font-mono break-all">{email}</dd>
        <dt className="font-bold">Temporary password</dt>
        <dd className="font-mono text-2xl font-bold tracking-wider">{password}</dd>
      </dl>
      <p className="text-sm mt-3">
        They'll be asked to choose their own password the first time they sign in. This password won't be shown again – if it's lost,
        use <strong>Reset password</strong>.
      </p>
      <div className="flex gap-3 mt-4">
        <button onClick={copy} className="px-5 py-2 rounded-full font-bold bg-blush-900 text-gold-200 hover:bg-blush-800">
          Copy details
        </button>
        <button onClick={onClose} className="px-5 py-2 rounded-full font-bold border-2 border-blush-900 hover:bg-white/20">
          Done
        </button>
      </div>
    </div>
  );
};

export const AdminStaff: React.FC = () => {
  const [stylists, setStylists] = useState<StylistAdmin[]>([]);
  const [form, setForm] = useState<StylistForm | null>(null);
  const [resetFor, setResetFor] = useState<StylistAdmin | null>(null);
  const [reset, setReset] = useState({ email: "", password: "" });
  const [issued, setIssued] = useState<{ name: string; email: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => stylistsApi.getAllAdmin().then(setStylists).catch((e) => toast.error(apiErrorMessage(e, "Couldn't load staff"))),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  const newEmployee = () => {
    setIssued(null);
    setResetFor(null);
    setForm({
      name: "",
      specialization: "",
      email: "",
      phoneNumber: "",
      isActive: true,
      createLogin: true,
      loginEmail: "",
      temporaryPassword: randomPassword(),
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const body = { name: form.name, specialization: form.specialization, email: form.email, phoneNumber: form.phoneNumber, isActive: form.isActive };
      if (form.id) {
        await stylistsApi.update(form.id, body);
        toast.success("Employee updated");
      } else if (form.createLogin) {
        const loginEmail = form.loginEmail || form.email;
        await stylistsApi.create({ ...body, loginEmail, temporaryPassword: form.temporaryPassword });
        setIssued({ name: form.name, email: loginEmail.trim().toLowerCase(), password: form.temporaryPassword });
        toast.success(`${form.name.split(" ")[0]} added with a login`);
      } else {
        await stylistsApi.create(body);
        toast.success("Employee added (no login yet)");
      }
      setForm(null);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save"));
    } finally {
      setBusy(false);
    }
  };

  const saveReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor) return;
    setBusy(true);
    try {
      await stylistsApi.createAccount(resetFor.id, reset.email, reset.password);
      setIssued({ name: resetFor.name, email: reset.email.trim().toLowerCase(), password: reset.password });
      toast.success(resetFor.loginEmail ? "Temporary password set – they've been signed out" : "Login created");
      setResetFor(null);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save the login"));
    } finally {
      setBusy(false);
    }
  };

  const removeLogin = async (s: StylistAdmin) => {
    if (!window.confirm(`Remove ${s.name}'s login? They will no longer be able to sign in.`)) return;
    try {
      await stylistsApi.removeAccount(s.id);
      toast.success("Login removed");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't remove the login"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between flex-wrap gap-3">
        <p className="text-blush-100 max-w-2xl">
          Only you can add employees and create their logins. Each employee gets a <strong>temporary password</strong> from you and must
          choose their own when they first sign in. They then see only their own appointments and clients.
        </p>
        <button onClick={newEmployee} className="btn-gold text-sm">
          + Add Employee
        </button>
      </div>

      {issued && <CredentialsCard {...issued} onClose={() => setIssued(null)} />}

      {form && (
        <form onSubmit={save} className={`${panel} grid grid-cols-1 md:grid-cols-2 gap-4`}>
          <h3 className="md:col-span-2 text-2xl text-gold-300">{form.id ? "Edit Employee" : "New Employee"}</h3>
          <div>
            <label className={label}>Full name</label>
            <input className={input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className={label}>Specialisation</label>
            <input className={input} placeholder="e.g. Hair, Brows & Lashes" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
          </div>
          <div>
            <label className={label}>Contact email</label>
            <input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={input} type="tel" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 !text-blush-100 cursor-pointer">
            <input type="checkbox" className="!w-5 !h-5 accent-pink-600" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Taking bookings
          </label>

          {!form.id && (
            <div className="md:col-span-2 rounded-xl p-4 ring-1 ring-gold-500/40 bg-white/5 space-y-4">
              <label className="flex items-center gap-2 !text-gold-200 !mb-0 cursor-pointer">
                <input type="checkbox" className="!w-5 !h-5 accent-pink-600" checked={form.createLogin} onChange={(e) => setForm({ ...form, createLogin: e.target.checked })} />
                Create their login now
              </label>
              {form.createLogin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Login email</label>
                    <input
                      className={input}
                      type="email"
                      required
                      placeholder={form.email || "name@anointedhands.co.za"}
                      value={form.loginEmail}
                      onFocus={() => !form.loginEmail && form.email && setForm({ ...form, loginEmail: form.email })}
                      onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={label}>Temporary password</label>
                    <div className="flex gap-2">
                      <input
                        className={`${input} font-mono`}
                        required
                        minLength={8}
                        value={form.temporaryPassword}
                        onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
                      />
                      <button type="button" onClick={() => setForm({ ...form, temporaryPassword: randomPassword() })} className={ghostBtn}>
                        New
                      </button>
                    </div>
                    <p className="text-xs text-blush-200/70 mt-1">At least 8 characters. They'll replace it at first sign-in.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="md:col-span-2 flex gap-3">
            <button type="submit" disabled={busy} className="btn-gold disabled:opacity-50">
              {busy ? "Saving…" : form.id ? "Save Changes" : "Add Employee"}
            </button>
            <button type="button" onClick={() => setForm(null)} className={ghostBtn}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {resetFor && (
        <form onSubmit={saveReset} className={`${panel} grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-4 items-end`}>
          <h3 className="md:col-span-3 text-2xl text-gold-300">
            {resetFor.loginEmail ? `Reset password for ${resetFor.name}` : `Create login for ${resetFor.name}`}
          </h3>
          <div>
            <label className={label}>Login email</label>
            <input className={input} type="email" required value={reset.email} onChange={(e) => setReset({ ...reset, email: e.target.value })} />
          </div>
          <div>
            <label className={label}>New temporary password</label>
            <div className="flex gap-2">
              <input className={`${input} font-mono`} required minLength={8} value={reset.password} onChange={(e) => setReset({ ...reset, password: e.target.value })} />
              <button type="button" onClick={() => setReset({ ...reset, password: randomPassword() })} className={ghostBtn}>
                New
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-gold disabled:opacity-50">
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setResetFor(null)} className={ghostBtn}>
              Cancel
            </button>
          </div>
          {resetFor.loginEmail && (
            <p className="md:col-span-3 text-xs text-blush-200/70">
              They'll be signed out everywhere and must choose a new password at their next sign-in.
            </p>
          )}
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stylists.map((s) => (
          <div key={s.id} className={`${panel} ${s.isActive ? "" : "opacity-60"}`}>
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-elegant text-2xl font-bold text-gold-200">{s.name}</p>
                <p className="text-sm text-blush-100">{s.specialization || "—"}</p>
              </div>
              {s.isActive ? <span className="badge-paid self-start">Active</span> : <span className="badge-cancelled self-start">Inactive</span>}
            </div>
            <p className="text-xs text-blush-200/80 mt-2">
              {s.email || "No email"} {s.phoneNumber ? `· ${s.phoneNumber}` : ""}
            </p>
            <div className="text-sm mt-3">
              {s.loginEmail ? (
                <>
                  <p>
                    Login: <span className="font-mono text-gold-200">{s.loginEmail}</span>
                  </p>
                  {s.hasTemporaryPassword ? (
                    <span className="badge-pending mt-1">Temporary password – not signed in yet</span>
                  ) : (
                    <span className="badge-paid mt-1">Own password set</span>
                  )}
                </>
              ) : (
                <p className="text-blush-200/60">No login</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={() => {
                  setIssued(null);
                  setResetFor(null);
                  setForm({
                    id: s.id,
                    name: s.name,
                    specialization: s.specialization,
                    email: s.email,
                    phoneNumber: s.phoneNumber ?? "",
                    isActive: s.isActive,
                    createLogin: false,
                    loginEmail: "",
                    temporaryPassword: "",
                  });
                }}
                className="btn-gold text-xs px-3 py-1.5"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setIssued(null);
                  setForm(null);
                  setResetFor(s);
                  setReset({ email: s.loginEmail ?? s.email ?? "", password: randomPassword() });
                }}
                className="text-xs font-bold text-gold-200 hover:text-white"
              >
                {s.loginEmail ? "Reset password" : "Create login"}
              </button>
              {s.loginEmail && (
                <button onClick={() => removeLogin(s)} className="text-xs font-bold text-blush-300 hover:text-white">
                  Remove login
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ====================================================================== Opening hours / Sundays

export const AdminHours: React.FC = () => {
  const [days, setDays] = useState<SpecialDay[]>([]);
  const [form, setForm] = useState({ date: "", isClosed: false, opens: "10:00", closes: "14:00", note: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => scheduleApi.getSpecialDays().then(setDays).catch((e) => toast.error(apiErrorMessage(e, "Couldn't load opening hours"))), []);
  useEffect(() => {
    load();
  }, [load]);

  // Suggest the next Sunday
  const nextSunday = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await scheduleApi.save({
        date: form.date,
        isClosed: form.isClosed,
        opens: form.isClosed ? undefined : form.opens,
        closes: form.isClosed ? undefined : form.closes,
        note: form.note || undefined,
      });
      toast.success(form.isClosed ? "Closure saved" : "Special opening saved – clients can now book this day");
      setForm({ ...form, date: "", note: "" });
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: SpecialDay) => {
    if (!window.confirm("Remove this special day? Standard hours will apply again.")) return;
    try {
      await scheduleApi.remove(d.id);
      toast.success("Removed");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't remove"));
    }
  };

  const times = Array.from({ length: 29 }, (_, i) => {
    const mins = 7 * 60 + i * 30; // 07:00 – 21:00
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${mins % 60 ? "30" : "00"}`;
  });
  const isSundayDate = form.date && new Date(`${form.date}T12:00:00`).getDay() === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gold-300 mb-1">Special Days</h2>
        <p className="text-sm text-blush-200/80">Open on a Sunday, close for a public holiday, or change one day's hours. These override the weekly hours.</p>
      </div>

      <form onSubmit={save} className={`${panel} grid grid-cols-1 md:grid-cols-5 gap-4 items-end`}>
        <div>
          <label className={label}>Date</label>
          <input className={input} type="date" required min={todayIso()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <button type="button" onClick={() => setForm({ ...form, date: nextSunday(), isClosed: false })} className="mt-1 text-xs font-bold text-gold-200 hover:underline">
            Next Sunday
          </button>
        </div>
        <div>
          <label className={label}>This day</label>
          <select className={input} value={form.isClosed ? "closed" : "open"} onChange={(e) => setForm({ ...form, isClosed: e.target.value === "closed" })}>
            <option value="open" className="text-blush-900">Open</option>
            <option value="closed" className="text-blush-900">Closed</option>
          </select>
        </div>
        {!form.isClosed && (
          <>
            <div>
              <label className={label}>Opens</label>
              <select className={input} value={form.opens} onChange={(e) => setForm({ ...form, opens: e.target.value })}>
                {times.map((t) => (
                  <option key={t} className="text-blush-900">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Closes</label>
              <select className={input} value={form.closes} onChange={(e) => setForm({ ...form, closes: e.target.value })}>
                {times.map((t) => (
                  <option key={t} className="text-blush-900">{t}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className={form.isClosed ? "md:col-span-3" : ""}>
          <label className={label}>Note (shown to clients)</label>
          <input className={input} placeholder={form.isClosed ? "e.g. Public holiday" : "e.g. Festive Sunday"} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="md:col-span-5 flex items-center gap-4">
          <button type="submit" disabled={busy} className="btn-gold disabled:opacity-50">
            {busy ? "Saving…" : form.isClosed ? "Save Closure" : isSundayDate ? "Open This Sunday" : "Save Hours"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-2xl text-gold-300">Upcoming Special Days</h3>
        {days.length === 0 ? (
          <p className="text-blush-200/70">None – standard hours apply.</p>
        ) : (
          days.map((d) => (
            <div key={d.id} className={`${panel} !p-4 flex flex-wrap justify-between items-center gap-3`}>
              <div>
                <p className="font-bold">
                  {new Date(`${d.date}T12:00:00`).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-sm text-blush-100">
                  {d.isClosed ? <span className="badge-cancelled">Closed</span> : <span className="badge-paid">Open {d.opens} – {d.closes}</span>}
                  {d.note && <span className="ml-2">{d.note}</span>}
                </p>
              </div>
              <button onClick={() => remove(d)} className="text-xs font-bold text-blush-300 hover:text-white">
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
