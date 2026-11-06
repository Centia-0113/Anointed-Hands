import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GalleryItem } from "../types";
import { assetUrl, galleryApi } from "../services/api";
import { apiErrorMessage } from "../utils/format";

export const GalleryPage: React.FC = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    galleryApi
      .getAll()
      .then(setItems)
      .catch((e) => setError(apiErrorMessage(e, "Couldn't load the gallery.")))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const shown = filter === "All" ? items : items.filter((i) => i.category === filter);
  const open = openIndex != null ? shown[openIndex] : null;

  // Keyboard navigation for the lightbox
  useEffect(() => {
    if (openIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i == null ? i : (i + 1) % shown.length));
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i == null ? i : (i - 1 + shown.length) % shown.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, shown.length]);

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl text-center">Our Work</h1>
        <div className="gold-rule" />
        <p className="text-center text-blush-900/70 mb-10">
          A look at the hair, nails, brows and lashes our team creates every day
        </p>

        {categories.length > 2 && (
          <div className="flex gap-2 mb-10 justify-center flex-wrap">
            {categories.map((c) => (
              <button key={c} onClick={() => setFilter(c)} className={filter === c ? "chip-active" : "chip"}>
                {c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-center py-12 text-blush-900/60">Loading gallery…</p>
        ) : error ? (
          <p className="text-center py-12 text-red-700">{error}</p>
        ) : shown.length === 0 ? (
          <div className="card text-center py-14 max-w-xl mx-auto">
            <div className="text-5xl mb-3">📸</div>
            <p className="text-blush-900/70 mb-6">New photos of our work are coming soon.</p>
            <Link to="/booking" className="btn-primary">
              Book an Appointment
            </Link>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
            {shown.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setOpenIndex(i)}
                className="group relative mb-5 block w-full overflow-hidden rounded-2xl shadow-soft ring-1 ring-gold-200 break-inside-avoid text-left"
              >
                <img
                  src={assetUrl(item.imageUrl)}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-auto group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-blush-900/80 to-transparent text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-gold-300">{item.category}</p>
                  <p className="font-elegant text-xl font-bold">{item.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-blush-900/90 flex items-center justify-center p-4"
          onClick={() => setOpenIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
        >
          <button className="absolute top-4 right-5 text-4xl text-white" aria-label="Close">
            ×
          </button>
          {shown.length > 1 && (
            <>
              <button
                aria-label="Previous photo"
                className="absolute left-2 sm:left-6 text-5xl text-gold-300 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((openIndex! - 1 + shown.length) % shown.length);
                }}
              >
                ‹
              </button>
              <button
                aria-label="Next photo"
                className="absolute right-2 sm:right-6 text-5xl text-gold-300 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((openIndex! + 1) % shown.length);
                }}
              >
                ›
              </button>
            </>
          )}
          <figure className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={assetUrl(open.imageUrl)}
              alt={open.title}
              className="max-h-[80vh] w-auto mx-auto rounded-xl ring-2 ring-gold-400"
            />
            <figcaption className="text-center mt-3 text-white">
              <span className="text-gold-300 font-bold uppercase text-xs tracking-widest">{open.category}</span>
              <span className="block font-elegant text-2xl">{open.title}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
};
