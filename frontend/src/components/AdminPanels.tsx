import React, { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { GalleryItem, Review, SupportReport } from "../types";
import { assetUrl, galleryApi, reportsApi, reviewsApi, settingsApi } from "../services/api";
import { apiErrorMessage } from "../utils/format";
import { Stars } from "./StarRating";

const panel = "rounded-2xl p-6 bg-white/5 ring-1 ring-gold-500/30";
const darkInput = "!bg-white/10 !text-white !border-blush-700 focus:!border-gold-400";
const darkLabel = "!text-gold-200";

// ------------------------------------------------------------------ Gallery

export const AdminGallery: React.FC = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => galleryApi.getAll().then(setItems), []);

  useEffect(() => {
    load().catch((e) => toast.error(apiErrorMessage(e, "Couldn't load gallery")));
    galleryApi.getCategories().then((c) => {
      setCategories(c);
      setCategory((cur) => cur || c[0] || "");
    });
  }, [load]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a photo first");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photos must be 5 MB or smaller");
      return;
    }
    setBusy(true);
    try {
      await galleryApi.upload(file, title, category);
      toast.success("Photo added to the gallery");
      setTitle("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Upload failed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: GalleryItem) => {
    if (!window.confirm(`Remove "${item.title}" from the gallery?`)) return;
    try {
      await galleryApi.remove(item.id);
      toast.success("Photo removed");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't remove photo"));
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={upload} className={`${panel} grid grid-cols-1 md:grid-cols-[1fr,auto] gap-6`}>
        <div className="space-y-4">
          <h2 className="text-2xl text-gold-300">Add a Photo</h2>
          <div>
            <label htmlFor="g-file" className={darkLabel}>Photo (JPG, PNG or WebP, up to 5 MB)</label>
            <input
              id="g-file"
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={`${darkInput} file:mr-3 file:rounded-full file:border-0 file:bg-gold-400 file:px-4 file:py-1 file:font-bold file:text-blush-900`}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="g-title" className={darkLabel}>Caption</label>
              <input
                id="g-title"
                maxLength={120}
                placeholder="e.g. Knotless braids"
                className={darkInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="g-cat" className={darkLabel}>Category</label>
              <select id="g-cat" className={darkInput} value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} className="text-blush-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-gold disabled:opacity-50">
            {busy ? "Uploading…" : "Upload Photo"}
          </button>
        </div>
        <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden ring-1 ring-gold-500/40 bg-white/5 flex items-center justify-center text-blush-200/60 text-sm">
          {preview ? <img src={preview} alt="Preview" className="w-full h-full object-cover" /> : "Preview"}
        </div>
      </form>

      {items.length === 0 ? (
        <p className="text-center text-blush-200/70 py-6">No photos yet. The public gallery shows "coming soon" until you add some.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl overflow-hidden ring-1 ring-gold-500/30 bg-white/5">
              <img src={assetUrl(item.imageUrl)} alt={item.title} className="w-full h-36 object-cover" />
              <div className="p-3">
                <p className="font-bold text-sm truncate">{item.title}</p>
                <p className="text-xs text-gold-300">{item.category}</p>
                <button onClick={() => remove(item)} className="mt-2 text-xs font-bold text-blush-300 hover:text-white">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ Reviews

export const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);

  const load = useCallback(
    () => reviewsApi.getAll().then(setReviews).catch((e) => toast.error(apiErrorMessage(e, "Couldn't load reviews"))),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (r: Review) => {
    try {
      await reviewsApi.setVisibility(r.id, !r.isVisible);
      toast.success(r.isVisible ? "Review hidden from the website" : "Review published");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't update review"));
    }
  };

  const remove = async (r: Review) => {
    if (!window.confirm("Permanently delete this review?")) return;
    try {
      await reviewsApi.remove(r.id);
      toast.success("Review deleted");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't delete review"));
    }
  };

  if (reviews.length === 0) return <p className="text-center text-blush-200/70 py-10">No reviews yet.</p>;

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className={`${panel} ${r.isVisible ? "" : "opacity-60"}`}>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <Stars value={r.rating} />
              <p className="font-bold">
                {r.reviewerName}
                {r.isVerifiedClient && <span className="ml-2 text-xs text-emerald-300">✓ Verified client</span>}
              </p>
              <p className="text-xs text-blush-200/70">
                {r.serviceName ?? "Salon overall"} · {new Date(r.createdAt).toLocaleDateString([], { dateStyle: "medium" })}
              </p>
            </div>
            <div className="flex gap-2 items-start">
              <span className={r.isVisible ? "badge-paid" : "badge-cancelled"}>{r.isVisible ? "Published" : "Hidden"}</span>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line">{r.comment}</p>
          <div className="mt-4 flex gap-4">
            <button onClick={() => toggle(r)} className="btn-gold text-xs px-3 py-1.5">
              {r.isVisible ? "Hide" : "Publish"}
            </button>
            <button onClick={() => remove(r)} className="text-xs font-bold text-blush-300 hover:text-white">
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ------------------------------------------------------------------ Reports

const STATUSES = ["Open", "In Progress", "Resolved"];

const ReportCard: React.FC<{ report: SupportReport; onSaved: () => void }> = ({ report, onSaved }) => {
  const [status, setStatus] = useState(report.status as string);
  const [notes, setNotes] = useState(report.adminNotes ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = status !== report.status || notes !== (report.adminNotes ?? "");

  const save = async () => {
    setBusy(true);
    try {
      await reportsApi.update(report.id, status, notes);
      toast.success("Report updated – the client has been emailed");
      onSaved();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't update report"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={panel}>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="font-mono font-bold text-gold-200">{report.referenceNumber}</p>
          <p className="text-sm">
            <span className={report.type === "Lost Item" ? "badge-info" : report.type === "Concern" ? "badge-pending" : "badge"}>
              {report.type}
            </span>{" "}
            <span className="text-blush-200/70">
              {new Date(report.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold">{report.name}</p>
          <a href={`mailto:${report.email}`} className="text-gold-200 hover:underline">
            {report.email}
          </a>
          {report.phone && <p className="text-blush-200/80">{report.phone}</p>}
        </div>
      </div>
      {report.visitDate && (
        <p className="mt-2 text-sm text-blush-200/80">
          Visit: {new Date(report.visitDate).toLocaleDateString([], { dateStyle: "medium" })}
        </p>
      )}
      {report.itemDescription && <p className="mt-2 font-bold">Item: {report.itemDescription}</p>}
      <p className="mt-2 whitespace-pre-line">{report.message}</p>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-[180px,1fr,auto] gap-3 items-end">
        <div>
          <label className={darkLabel}>Status</label>
          <select className={darkInput} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} className="text-blush-900">
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={darkLabel}>Response to client</label>
          <input
            className={darkInput}
            placeholder="e.g. We found your earring – collect it at reception"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button onClick={save} disabled={!dirty || busy} className="btn-gold text-sm disabled:opacity-40">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
};

export const AdminReports: React.FC<{ onCountChange?: (open: number) => void }> = ({ onCountChange }) => {
  const [reports, setReports] = useState<SupportReport[]>([]);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const load = useCallback(async () => {
    try {
      const data = await reportsApi.getAll();
      setReports(data);
      onCountChange?.(data.filter((r) => r.status !== "Resolved").length);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Couldn't load reports"));
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = filter === "active" ? reports.filter((r) => r.status !== "Resolved") : reports;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setFilter("active")} className={filter === "active" ? "chip-active" : "chip"}>
          Open &amp; in progress
        </button>
        <button onClick={() => setFilter("all")} className={filter === "all" ? "chip-active" : "chip"}>
          All ({reports.length})
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="text-center text-blush-200/70 py-10">Nothing needs attention. 🎉</p>
      ) : (
        shown.map((r) => <ReportCard key={`${r.id}-${r.updatedAt ?? ""}`} report={r} onSaved={load} />)
      )}
    </div>
  );
};

// ------------------------------------------------------------------ In-salon ordering QR

export const AdminSalonQr: React.FC = () => {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    settingsApi
      .getSalonCode()
      .then(setCode)
      .catch((e) => toast.error(apiErrorMessage(e, "Couldn't load the salon code")));
  }, []);

  const orderUrl = `${window.location.origin}/order?code=${code}`;

  const regenerate = async () => {
    if (!window.confirm("Create a new code? Printed QR codes with the old code will stop working.")) return;
    setBusy(true);
    try {
      setCode(await settingsApi.regenerateSalonCode());
      toast.success("New code created – print the new QR code");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't create a new code"));
    } finally {
      setBusy(false);
    }
  };

  const printSign = () => {
    const svg = document.getElementById("salon-qr")?.outerHTML ?? "";
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Café QR</title><style>
      body{font-family:Georgia,serif;text-align:center;color:#4a0d29;padding:40px}
      h1{color:#9e1450;margin:0 0 6px} .gold{height:4px;width:120px;margin:12px auto 24px;background:#c9a227;border-radius:4px}
      .code{font-family:monospace;font-size:28px;letter-spacing:6px;font-weight:bold;margin-top:18px}
      svg{width:320px;height:320px;padding:16px;border:3px solid #c9a227;border-radius:16px}
    </style></head><body>
      <h1>Anointed Hands Café</h1><div class="gold"></div>
      <p>Scan to order treats &amp; drinks to your chair</p>${svg}
      <p>Or enter this code on our website:</p><div class="code">${code}</div>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className={`${panel} grid grid-cols-1 md:grid-cols-[auto,1fr] gap-8 items-center`}>
      <div className="mx-auto p-4 rounded-2xl bg-white ring-4 ring-gold-400">
        {code ? <QRCodeSVG id="salon-qr" value={orderUrl} size={220} fgColor="#4a0d29" level="M" /> : <div className="w-[220px] h-[220px]" />}
      </div>
      <div className="space-y-4">
        <h2 className="text-3xl text-gold-300">In-Salon Café Ordering</h2>
        <p className="text-blush-100">
          Café orders can only be placed by clients in the salon. Print this QR code and place it on tables and at the
          counter – scanning it unlocks ordering. Clients can also type the code.
        </p>
        <p>
          Current code: <span className="font-mono text-3xl font-bold tracking-[0.3em] text-gold-200">{code || "……"}</span>
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={printSign} disabled={!code} className="btn-gold disabled:opacity-50">
            Print QR Sign
          </button>
          <button
            onClick={regenerate}
            disabled={busy}
            className="px-5 py-2.5 rounded-full font-bold border border-gold-500/60 text-gold-200 hover:bg-white/10 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Change Code"}
          </button>
        </div>
        <p className="text-xs text-blush-200/70">
          Change the code if it's been shared outside the salon (e.g. someone posts a photo of the sign).
        </p>
      </div>
    </div>
  );
};
