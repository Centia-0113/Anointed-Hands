import React, { useState } from "react";

/** Read-only star display, e.g. ★★★★☆ */
export const Stars: React.FC<{ value: number; size?: string }> = ({ value, size = "text-lg" }) => (
  <span className={`${size} tracking-tight`} aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={i <= Math.round(value) ? "text-gold-500" : "text-blush-200"}>
        ★
      </span>
    ))}
  </span>
);

/** Clickable 1–5 star picker. */
export const StarPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            className={`text-4xl leading-none px-0.5 transition-transform hover:scale-110 ${
              i <= shown ? "text-gold-500" : "text-blush-200"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-sm font-bold text-blush-700">{labels[shown]}</span>
    </div>
  );
};
