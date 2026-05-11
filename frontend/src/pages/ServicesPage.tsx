import React, { useState, useEffect } from "react";
import { Service } from "../types";
import { servicesApi } from "../services/api";

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await servicesApi.getAll();
      setServices(data);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", ...new Set(services.map((s) => s.category))];
  const filteredServices =
    filter === "All" ? services : services.filter((s) => s.category === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-center mb-2">Our Services</h1>
        <p className="text-center text-gray-600 mb-12">
          Discover our premium salon and spa services
        </p>

        {/* Category Filter */}
        <div className="flex gap-2 mb-12 justify-center flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-4 py-2 rounded-full font-semibold transition-all ${
                filter === category
                  ? "btn-primary"
                  : "btn-secondary"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading services...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <div key={service.id} className="card group">
                {service.imageUrl && (
                  <div className="mb-4 h-48 bg-gradient-to-br from-purple-200 to-orange-200 rounded-lg overflow-hidden">
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-purple-600">
                      ${service.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {service.durationMinutes} mins
                    </p>
                  </div>
                  <a
                    href="/booking"
                    className="btn-primary text-sm"
                  >
                    Book Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
