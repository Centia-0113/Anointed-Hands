import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CafeItem } from "../types";
import { cafeItemsApi } from "../services/api";
import { apiErrorMessage } from "../utils/format";
import { Price } from "../components/Price";


export const categoryEmoji: Record<string, string> = {
  Cakes: "🍰",
  Muffins: "🧁",
  Donuts: "🍩",
  Refreshments: "🥤",
};

export const CafePage: React.FC = () => {
  const [items, setItems] = useState<CafeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    cafeItemsApi
      .getAll()
      .then(setItems)
      .catch((e) => setError(apiErrorMessage(e, "Failed to load the menu.")))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const filteredItems =
    filter === "All" ? items : items.filter((i) => i.category === filter);

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl text-center">Café Menu</h1>
        <div className="gold-rule" />
        <p className="text-center text-blush-900/70 mb-4">
          Enjoy delicious treats while you relax
        </p>
        <p className="mx-auto mb-10 max-w-xl text-center text-sm rounded-full px-5 py-2 bg-gold-50 border border-gold-200">
          📱 Ordering is available <strong>in the salon</strong> – scan the QR code on your table to order to your chair.
        </p>

        <div className="flex gap-2 mb-10 justify-center flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={filter === category ? "chip-active" : "chip"}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center py-12 text-blush-900/60">Loading menu items…</p>
        ) : error ? (
          <p className="text-center py-12 text-red-700">{error}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="card card-hover group flex flex-col">
                <div className="mb-5 h-40 rounded-xl overflow-hidden bg-gradient-to-br from-gold-100 via-blush-100 to-blush-200 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <span className="text-6xl">{categoryEmoji[item.category] ?? "☕"}</span>
                  )}
                </div>
                <h3 className="text-2xl mb-1">{item.name}</h3>
                <p className="text-blush-900/70 mb-5 flex-1">{item.description}</p>
                <div className="flex justify-between items-center">
                  <Price
                    price={item.price}
                    finalPrice={item.finalPrice}
                    discountPercent={item.discountPercent}
                    isDiscountActive={item.isDiscountActive}
                    discountEndsOn={item.discountEndsOn}
                  />
                  {item.isOutOfStock ? (
                    <span className="badge-cancelled">Out of Stock</span>
                  ) : (
                    <Link to="/order" className="btn-gold text-sm">
                      Order
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
