import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Service } from "../types";
import { servicesApi } from "../services/api";
import { apiErrorMessage, formatRand } from "../utils/format";

const categoryIcon: Record<string, string> = {
  Hair: "💇🏾‍♀️",
  Nails: "💅🏾",
  Facials: "🌸",
};

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    servicesApi
      .getAll()
      .then(setServices)
      .catch((e) => setError(apiErrorMessage(e, "Failed to load services.")))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["All", ...Array.from(new Set(services.map((s) => s.category)))];
  const filteredServices =
    filter === "All" ? services : services.filter((s) => s.category === filter);

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl text-center">Our Services</h1>
        <div className="gold-rule" />
        <p className="text-center text-blush-900/70 mb-10">
          Discover our premium salon and spa treatments
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
          <p className="text-center py-12 text-blush-900/60">Loading services…</p>
        ) : error ? (
          <p className="text-center py-12 text-red-700">{error}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <div key={service.id} className="card card-hover group flex flex-col">
                <div className="mb-5 h-44 rounded-xl overflow-hidden bg-gradient-to-br from-blush-100 via-blush-200 to-gold-100 flex items-center justify-center">
                  {service.imageUrl ? (
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <span className="text-6xl">{categoryIcon[service.category] ?? "✨"}</span>
                  )}
                </div>
                <span className="badge-info self-start mb-2">{service.category}</span>
                <h3 className="text-2xl mb-1">{service.name}</h3>
                <p className="text-blush-900/70 mb-5 flex-1">{service.description}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="price">{formatRand(service.price)}</p>
                    <p className="text-sm text-gold-700 font-bold">
                      {service.durationMinutes} mins
                    </p>
                  </div>
                  <Link
                    to={`/booking?service=${service.id}`}
                    className="btn-primary text-sm"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
