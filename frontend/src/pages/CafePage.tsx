import React, { useState, useEffect } from "react";
import { CafeItem } from "../types";
import { cafeItemsApi } from "../services/api";

export const CafePage: React.FC = () => {
  const [items, setItems] = useState<CafeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await cafeItemsApi.getAll();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch café items:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", ...new Set(items.map((i) => i.category))];
  const filteredItems =
    filter === "All" ? items : items.filter((i) => i.category === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-center mb-2">Café Menu</h1>
        <p className="text-center text-gray-600 mb-12">
          Enjoy delicious treats while you relax
        </p>

        {/* Category Filter */}
        <div className="flex gap-2 mb-12 justify-center flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-4 py-2 rounded-full font-semibold transition-all ${
                filter === category
                  ? "bg-amber-600 text-white"
                  : "bg-white text-amber-600 border-2 border-amber-600"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading menu items...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="card group">
                {item.imageUrl && (
                  <div className="mb-4 h-48 bg-gradient-to-br from-amber-200 to-orange-200 rounded-lg overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <div className="flex justify-between items-center">
                  <p className="text-2xl font-bold text-amber-600">
                    ${item.price.toFixed(2)}
                  </p>
                  {item.isOutOfStock ? (
                    <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-semibold">
                      Out of Stock
                    </span>
                  ) : (
                    <a
                      href="/order"
                      className="btn-primary text-sm"
                    >
                      Order
                    </a>
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
