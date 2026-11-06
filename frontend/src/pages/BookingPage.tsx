import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Service, Stylist, CreateBookingRequest, Booking, DayHours, SpecialDay } from "../types";
import { servicesApi, stylistsApi, bookingsApi, scheduleApi } from "../services/api";
import toast from "react-hot-toast";
import { apiErrorMessage, formatRand } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import { ScanToPay } from "../components/ScanToPay";
import { Price } from "../components/Price";


const todayIso = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

const formatSlot = (slot: string) =>
  new Date(slot).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const BookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [dayHours, setDayHours] = useState<DayHours | null>(null);
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceId: searchParams.get("service") ?? "",
    stylistId: "",
    bookingDate: "",
    bookingTime: "",
    notes: "",
  });

  const update = (patch: Partial<typeof formData>) =>
    setFormData((f) => ({ ...f, ...patch }));

  // Pre-fill contact details for signed-in customers
  useEffect(() => {
    if (!user) return;
    setFormData((f) => ({
      ...f,
      customerName: f.customerName || user.name,
      customerEmail: f.customerEmail || user.email,
      customerPhone: f.customerPhone || user.phone || "",
    }));
  }, [user]);

  useEffect(() => {
    Promise.all([servicesApi.getAll(), stylistsApi.getAll()])
      .then(([s, st]) => {
        setServices(s);
        setStylists(st);
      })
      .catch((e) => toast.error(apiErrorMessage(e, "Failed to load booking data")));
    scheduleApi.getSpecialDays().then(setSpecialDays).catch(() => undefined);
  }, []);

  const { serviceId, stylistId, bookingDate } = formData;

  // Is the salon open on the chosen date? (handles special Sunday openings and closures)
  useEffect(() => {
    if (!bookingDate) {
      setDayHours(null);
      return;
    }
    let cancelled = false;
    scheduleApi
      .getDay(bookingDate)
      .then((d) => !cancelled && setDayHours(d))
      .catch(() => !cancelled && setDayHours(null));
    return () => {
      cancelled = true;
    };
  }, [bookingDate]);

  const closedOnDate = !!bookingDate && dayHours?.date === bookingDate && !dayHours.isOpen;

  useEffect(() => {
    if (!serviceId || !stylistId || !bookingDate) {
      setAvailableSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    bookingsApi
      .getAvailableSlots(parseInt(stylistId), parseInt(serviceId), bookingDate)
      .then((slots) => !cancelled && setAvailableSlots(slots))
      .catch((e) => toast.error(apiErrorMessage(e, "Failed to fetch available slots")))
      .finally(() => !cancelled && setSlotsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [serviceId, stylistId, bookingDate]);

  const selectedService = services.find((s) => s.id === parseInt(formData.serviceId));
  const selectedStylist = stylists.find((s) => s.id === parseInt(formData.stylistId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bookingTime) {
      toast.error("Please pick a time slot");
      return;
    }
    setLoading(true);
    try {
      const booking: CreateBookingRequest = {
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim(),
        customerPhone: formData.customerPhone.trim() || undefined,
        serviceId: parseInt(formData.serviceId),
        stylistId: parseInt(formData.stylistId),
        bookingDateTime: formData.bookingTime, // ISO slot from the API
        notes: formData.notes.trim() || undefined,
      };
      const result = await bookingsApi.create(booking);
      setConfirmed(result);
      toast.success("Booking created successfully!");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to create booking"));
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            {/* confirmation */}
            <div className="mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center text-3xl text-white bg-gradient-to-br from-gold-300 to-gold-600">
              ✓
            </div>
            <h1 className="text-4xl mb-2">Booking Received!</h1>
            <p className="text-blush-900/70 mb-6">
              {confirmed.serviceName} with {confirmed.stylistName} on{" "}
              {new Date(confirmed.bookingDateTime).toLocaleString([], {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
            <div className="rounded-xl p-6 mb-6 bg-blush-50 border border-gold-200">
              <p className="text-sm uppercase tracking-widest font-bold text-gold-700 mb-1">
                Payment Reference
              </p>
              <p className="font-elegant text-4xl font-bold text-blush-600">
                {confirmed.paymentReference}
              </p>
            </div>
            <div className="rounded-xl p-5 mb-4 bg-gold-50 border border-gold-300 text-left">
              <p className="font-bold text-blush-800 mb-1">
                Pay your {formatRand(confirmed.depositAmount)} deposit to secure this booking
              </p>
              <p className="text-sm text-blush-900/80">
                Due by{" "}
                <strong>
                  {new Date(confirmed.depositDueAt).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}
                </strong>
                . Unpaid bookings are released automatically. Your deposit is refundable if you cancel, and the balance
                of {formatRand(confirmed.servicePrice - confirmed.depositAmount)} is paid at your appointment.
              </p>
            </div>
            <div className="mb-6">
              <ScanToPay reference={confirmed.paymentReference} amount={confirmed.depositAmount} />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link to="/account" className="btn-secondary">
                  View My Bookings
                </Link>
              ) : (
                <Link to="/services" className="btn-secondary">
                  Browse Services
                </Link>
              )}
              <Link to="/" className="btn-primary">
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl text-center">Book an Appointment</h1>
        <div className="gold-rule mb-10" />

        {!user && (
          <p className="mb-6 rounded-xl px-4 py-3 bg-gold-50 border border-gold-200 text-sm text-center">
            <Link to="/login" state={{ from: "/booking" }} className="font-bold text-blush-600 hover:underline">
              Sign in or create an account
            </Link>{" "}
            to keep track of your appointments — or continue as a guest.
          </p>
        )}

        <form onSubmit={handleSubmit} className="card space-y-8">
          <section>
            <h2 className="text-2xl mb-4">Your Information</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                required
                value={formData.customerName}
                onChange={(e) => update({ customerName: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={formData.customerEmail}
                  onChange={(e) => update({ customerEmail: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={formData.customerPhone}
                  onChange={(e) => update({ customerPhone: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="service">Service</label>
              <select
                id="service"
                required
                value={formData.serviceId}
                onChange={(e) => update({ serviceId: e.target.value, bookingTime: "" })}
              >
                <option value="">Choose a service…</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} – {formatRand(service.finalPrice)}
                    {service.isDiscountActive ? ` (${service.discountPercent}% off)` : ""} · {service.durationMinutes} mins
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="stylist">Stylist</label>
              <select
                id="stylist"
                required
                value={formData.stylistId}
                onChange={(e) => update({ stylistId: e.target.value, bookingTime: "" })}
              >
                <option value="">Choose a stylist…</option>
                {stylists.map((stylist) => (
                  <option key={stylist.id} value={stylist.id}>
                    {stylist.name} – {stylist.specialization}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section>
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              required
              min={todayIso()}
              value={formData.bookingDate}
              onChange={(e) => update({ bookingDate: e.target.value, bookingTime: "" })}
            />
            <p className="text-xs text-blush-900/60 mt-1">
              {dayHours?.isOpen && dayHours.date === bookingDate
                ? `Open ${dayHours.opens} – ${dayHours.closes}${dayHours.note ? ` · ${dayHours.note}` : ""}`
                : "Mon – Fri 9AM – 6PM · Sat 10AM – 5PM · Sundays by special opening"}
            </p>
            {specialDays.some((d) => !d.isClosed) && (
              <p className="text-xs mt-1 font-bold text-gold-700">
                ✨ Special openings:{" "}
                {specialDays
                  .filter((d) => !d.isClosed)
                  .map((d) => `${formatDay(d.date)} ${d.opens}–${d.closes}`)
                  .join(" · ")}
              </p>
            )}

            <div className="mt-5">
              <label>Available times</label>
              {closedOnDate ? (
                <p className="text-sm font-bold text-blush-700">
                  {dayHours?.note
                    ? `We're closed on this day (${dayHours.note}) – please choose another day.`
                    : "We're closed on this day – please choose another day."}
                </p>
              ) : !serviceId || !stylistId || !bookingDate ? (
                <p className="text-sm text-blush-900/60">
                  Choose a service, stylist and date to see open times.
                </p>
              ) : slotsLoading ? (
                <p className="text-sm text-blush-900/60">Checking availability…</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-red-700">
                  No open slots on this day – please try another date or stylist.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => update({ bookingTime: slot })}
                      className={
                        formData.bookingTime === slot
                          ? "chip-active px-2"
                          : "chip px-2"
                      }
                    >
                      {formatSlot(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <label htmlFor="notes">Additional notes</label>
            <textarea
              id="notes"
              placeholder="Any special requests or notes…"
              rows={3}
              value={formData.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </section>

          {selectedService && (
            <div className="rounded-xl p-4 bg-gold-50 border border-gold-200 flex justify-between items-center">
              <div>
                <p className="font-bold">{selectedService.name}</p>
                <p className="text-sm text-blush-900/70">
                  {selectedStylist ? `with ${selectedStylist.name} · ` : ""}
                  {selectedService.durationMinutes} mins
                  {formData.bookingTime ? ` · ${formatSlot(formData.bookingTime)}` : ""}
                </p>
              </div>
              <div className="text-right">
                <Price
                  price={selectedService.price}
                  finalPrice={selectedService.finalPrice}
                  discountPercent={selectedService.discountPercent}
                  isDiscountActive={selectedService.isDiscountActive}
                  discountEndsOn={selectedService.discountEndsOn}
                />
              </div>
            </div>
          )}
          {selectedService && (
            <p className="text-sm text-center text-blush-900/70 -mt-4">
              A refundable <strong>10% deposit of {formatRand(selectedService.depositAmount)}</strong> is due within 24
              hours to secure your booking. The balance is paid at your appointment.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg py-3.5 disabled:opacity-50"
          >
            {loading ? "Creating Booking…" : "Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
};
