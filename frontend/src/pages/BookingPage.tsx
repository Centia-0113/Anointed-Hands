import React, { useState, useEffect } from "react";
import {
  Service,
  Stylist,
  CreateBookingRequest,
} from "../types";
import { servicesApi, stylistsApi, bookingsApi } from "../services/api";
import toast from "react-hot-toast";

export const BookingPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceId: "",
    stylistId: "",
    bookingDate: "",
    bookingTime: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.serviceId && formData.stylistId && formData.bookingDate) {
      fetchAvailableSlots();
    }
  }, [formData.serviceId, formData.stylistId, formData.bookingDate]);

  const fetchData = async () => {
    try {
      const [servicesData, stylistsData] = await Promise.all([
        servicesApi.getAll(),
        stylistsApi.getAll(),
      ]);
      setServices(servicesData);
      setStylists(stylistsData);
    } catch (error) {
      toast.error("Failed to load booking data");
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const slots = await bookingsApi.getAvailableSlots(
        parseInt(formData.stylistId),
        parseInt(formData.serviceId),
        formData.bookingDate
      );
      setAvailableSlots(slots.map((s) => new Date(s).toLocaleTimeString()));
    } catch (error) {
      toast.error("Failed to fetch available slots");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookingDateTime = `${formData.bookingDate}T${formData.bookingTime}`;

      const booking: CreateBookingRequest = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        serviceId: parseInt(formData.serviceId),
        stylistId: parseInt(formData.stylistId),
        bookingDateTime,
        notes: formData.notes,
      };

      const result = await bookingsApi.create(booking);
      setPaymentRef(result.paymentReference);
      setBookingConfirmed(true);
      toast.success("Booking created successfully!");
    } catch (error) {
      toast.error("Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  if (bookingConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-3xl font-bold mb-4 text-green-600">
              Booking Confirmed!
            </h1>
            <p className="text-gray-600 mb-6">
              Your booking has been created successfully.
            </p>
            <div className="bg-purple-50 p-6 rounded-lg mb-6">
              <p className="text-lg font-semibold mb-2">Payment Reference:</p>
              <p className="text-2xl font-bold text-purple-600">{paymentRef}</p>
              <p className="text-sm text-gray-600 mt-4">
                Please transfer the service amount via EFT using this reference number.
              </p>
            </div>
            <p className="text-gray-600 mb-6">
              You will receive an SMS and email confirmation shortly.
            </p>
            <div className="flex gap-4 justify-center">
              <a href="/services" className="btn-secondary">
                Continue Shopping
              </a>
              <a href="/" className="btn-primary">
                Return Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-center mb-12">Book an Appointment</h1>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Personal Info */}
          <div>
            <h2 className="text-xl font-bold mb-4">Your Information</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                required
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={formData.customerEmail}
                onChange={(e) =>
                  setFormData({ ...formData, customerEmail: e.target.value })
                }
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.customerPhone}
                onChange={(e) =>
                  setFormData({ ...formData, customerPhone: e.target.value })
                }
              />
            </div>
          </div>

          {/* Service Selection */}
          <div>
            <h2 className="text-xl font-bold mb-4">Select Service</h2>
            <select
              required
              value={formData.serviceId}
              onChange={(e) =>
                setFormData({ ...formData, serviceId: e.target.value })
              }
            >
              <option value="">Choose a service...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - ${service.price.toFixed(2)} ({service.durationMinutes} mins)
                </option>
              ))}
            </select>
          </div>

          {/* Stylist Selection */}
          <div>
            <h2 className="text-xl font-bold mb-4">Select Stylist</h2>
            <select
              required
              value={formData.stylistId}
              onChange={(e) =>
                setFormData({ ...formData, stylistId: e.target.value })
              }
            >
              <option value="">Choose a stylist...</option>
              {stylists.map((stylist) => (
                <option key={stylist.id} value={stylist.id}>
                  {stylist.name} - {stylist.specialization}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div>
            <h2 className="text-xl font-bold mb-4">Choose Date & Time</h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                required
                value={formData.bookingDate}
                onChange={(e) =>
                  setFormData({ ...formData, bookingDate: e.target.value })
                }
              />
              <select
                required
                value={formData.bookingTime}
                onChange={(e) =>
                  setFormData({ ...formData, bookingTime: e.target.value })
                }
              >
                <option value="">Select time...</option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h2 className="text-xl font-bold mb-4">Additional Notes</h2>
            <textarea
              placeholder="Any special requests or notes..."
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg py-3 disabled:opacity-50"
          >
            {loading ? "Creating Booking..." : "Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
};
