import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Booking, RELEASED_STATUSES, StaffClient } from "../types";
import { bookingsApi, staffApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage, formatRand } from "../utils/format";
import { BookingStatusBadge } from "../components/BookingStatusBadge";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

type Tab = "schedule" | "clients" | "settings";

const dayKey = (iso: string) => new Date(iso).toDateString();
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
};

/** A stylist's own appointments and clients. */
export const StaffPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("schedule");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<StaffClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [search, setSearch] = useState("");
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, c] = await Promise.all([staffApi.getBookings(), staffApi.getClients()]);
      setBookings(b);
      setClients(c);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Couldn't load your schedule"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const setStatus = async (b: Booking, status: "Completed" | "No Show") => {
    if (status === "No Show" && !window.confirm(`Mark ${b.customerName} as a no-show?`)) return;
    setBusyId(b.id);
    try {
      await bookingsApi.updateStatus(b.id, status);
      toast.success(status === "Completed" ? "Marked as completed" : "Marked as no-show");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't update"));
    } finally {
      setBusyId(null);
    }
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const active = bookings.filter((b) => !RELEASED_STATUSES.includes(b.status));
  const todays = active.filter((b) => dayKey(b.bookingDateTime) === now.toDateString());
  const upcoming = active.filter((b) => new Date(b.bookingDateTime) >= startOfToday);
  const past = bookings
    .filter((b) => new Date(b.bookingDateTime) < startOfToday || RELEASED_STATUSES.includes(b.status))
    .sort((a, b) => b.bookingDateTime.localeCompare(a.bookingDateTime));
  const list = showPast ? past : upcoming;

  // Group the list by day
  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>();
    list.forEach((b) => {
      const k = dayKey(b.bookingDateTime);
      map.set(k, [...(map.get(k) ?? []), b]);
    });
    return Array.from(map.values());
  }, [list]);

  const filteredClients = clients.filter((c) => {
    const t = search.trim().toLowerCase();
    return !t || c.name.toLowerCase().includes(t) || c.email.toLowerCase().includes(t) || (c.phone ?? "").includes(t);
  });

  const tabClass = (t: Tab) => (tab === t ? "chip-active" : "chip");

  const renderBooking = (b: Booking) => {
    const started = new Date(b.bookingDateTime) <= now;
    const canMark = started && (b.status === "Confirmed" || b.status === "Awaiting Deposit");
    return (
      <div key={b.id} className="card !p-5 flex flex-col sm:flex-row gap-4">
        <div className="sm:w-24 shrink-0">
          <p className="font-elegant text-3xl font-bold text-blush-700 leading-none">{fmtTime(b.bookingDateTime)}</p>
          <p className="text-xs text-blush-900/60 mt-1">{b.durationMinutes} min</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-bold text-lg">{b.customerName}</p>
              <p className="text-sm text-blush-900/70">{b.serviceName}</p>
            </div>
            <BookingStatusBadge booking={b} />
          </div>
          <p className="text-sm mt-2 space-x-3">
            {b.customerPhone && (
              <a href={`tel:${b.customerPhone}`} className="font-bold text-blush-600 hover:underline">
                📞 {b.customerPhone}
              </a>
            )}
            <a href={`mailto:${b.customerEmail}`} className="text-blush-600 hover:underline">
              ✉️ {b.customerEmail}
            </a>
          </p>
          {b.notes && (
            <p className="mt-2 text-sm rounded-lg px-3 py-2 bg-gold-50 border border-gold-200">
              <strong>Client note:</strong> {b.notes}
            </p>
          )}
          <p className="text-xs text-blush-900/60 mt-2">
            {formatRand(b.servicePrice)} ·{" "}
            {b.isPaid ? "paid in full" : b.depositPaid ? `deposit paid, ${formatRand(b.balanceDue)} to collect` : "deposit not yet paid"}
          </p>
          {canMark && (
            <div className="flex gap-3 mt-3">
              <button onClick={() => setStatus(b, "Completed")} disabled={busyId === b.id} className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50">
                Mark Completed
              </button>
              <button onClick={() => setStatus(b, "No Show")} disabled={busyId === b.id} className="text-xs font-bold text-blush-600 hover:underline disabled:opacity-50">
                No-show
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="uppercase tracking-[0.3em] text-xs font-bold text-gold-600">Staff</p>
        <h1 className="text-5xl mb-1">Hello, {user?.name.split(" ")[0]}</h1>
        <p className="text-blush-900/70 mb-8">
          {todays.length === 0
            ? "No appointments today."
            : `You have ${todays.length} appointment${todays.length === 1 ? "" : "s"} today.`}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="card !p-4 text-center">
            <p className="font-elegant text-4xl font-bold text-blush-600">{todays.length}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-700">Today</p>
          </div>
          <div className="card !p-4 text-center">
            <p className="font-elegant text-4xl font-bold text-blush-600">{upcoming.length}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-700">Upcoming</p>
          </div>
          <div className="card !p-4 text-center">
            <p className="font-elegant text-4xl font-bold text-blush-600">{clients.length}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-700">Clients</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setTab("schedule")} className={tabClass("schedule")}>
            My Schedule
          </button>
          <button onClick={() => setTab("clients")} className={tabClass("clients")}>
            My Clients
          </button>
          <button onClick={() => setTab("settings")} className={tabClass("settings")}>
            Account Settings
          </button>
        </div>

        {tab === "settings" ? (
          <div className="card">
            <h2 className="text-2xl mb-4">Change Password</h2>
            <ChangePasswordForm />
          </div>
        ) : loading ? (
          <p className="text-center py-12 text-blush-900/60">Loading…</p>
        ) : tab === "schedule" ? (
          <div className="space-y-8">
            <div className="flex gap-2">
              <button onClick={() => setShowPast(false)} className={!showPast ? "chip-active" : "chip"}>
                Upcoming ({upcoming.length})
              </button>
              <button onClick={() => setShowPast(true)} className={showPast ? "chip-active" : "chip"}>
                Past &amp; cancelled ({past.length})
              </button>
            </div>
            {groups.length === 0 ? (
              <div className="card text-center py-12 text-blush-900/70">
                {showPast ? "No past appointments yet." : "No upcoming appointments."}
              </div>
            ) : (
              groups.map((g) => (
                <section key={dayKey(g[0].bookingDateTime)}>
                  <h2 className="text-2xl mb-3">{fmtDay(g[0].bookingDateTime)}</h2>
                  <div className="space-y-3">{g.map(renderBooking)}</div>
                </section>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <input placeholder="Search clients by name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {filteredClients.length === 0 ? (
              <div className="card text-center py-12 text-blush-900/70">No clients yet.</div>
            ) : (
              filteredClients.map((c) => {
                const open = openClient === c.email;
                return (
                  <div key={c.email} className="card !p-5">
                    <button className="w-full text-left" onClick={() => setOpenClient(open ? null : c.email)} aria-expanded={open}>
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <p className="font-bold text-lg">{c.name}</p>
                          <p className="text-sm text-blush-900/70">
                            {c.phone ? `${c.phone} · ` : ""}
                            {c.email}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          {c.nextAppointment ? (
                            <p className="font-bold text-blush-700">
                              Next: {new Date(c.nextAppointment).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                          ) : (
                            <p className="text-blush-900/60">No upcoming visit</p>
                          )}
                          <p className="text-blush-900/60">
                            {c.completedVisits} visit{c.completedVisits === 1 ? "" : "s"}
                            {c.lastVisit ? ` · last ${new Date(c.lastVisit).toLocaleDateString([], { dateStyle: "medium" })}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3 text-xs">
                        <span className="badge-info">{c.totalBookings} booking{c.totalBookings === 1 ? "" : "s"}</span>
                        <span className="badge-paid">{formatRand(c.totalSpent)} paid</span>
                        {c.noShows > 0 && <span className="badge-cancelled">{c.noShows} no-show{c.noShows === 1 ? "" : "s"}</span>}
                        <span className="ml-auto font-bold text-blush-600">{open ? "Hide history ▲" : "View history ▼"}</span>
                      </div>
                    </button>
                    {open && (
                      <ul className="mt-4 pt-4 border-t border-gold-100 space-y-3">
                        {c.bookings.map((b) => (
                          <li key={b.id} className="flex flex-wrap justify-between gap-2 text-sm">
                            <div>
                              <p className="font-bold">{b.serviceName}</p>
                              <p className="text-blush-900/60">
                                {new Date(b.bookingDateTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                              </p>
                              {b.notes && <p className="italic text-blush-900/70">“{b.notes}”</p>}
                            </div>
                            <div className="text-right">
                              <BookingStatusBadge booking={b} />
                              <p className="text-blush-900/60 mt-1">{formatRand(b.servicePrice)}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
