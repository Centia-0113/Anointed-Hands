import React, { useState, useEffect, useCallback } from "react";
import { Booking, Order } from "../types";
import { bookingsApi, ordersApi } from "../services/api";
import toast from "react-hot-toast";
import { apiErrorMessage, formatRand } from "../utils/format";
import { Link, useSearchParams } from "react-router-dom";
import { BookingStatusBadge } from "../components/BookingStatusBadge";
import { AdminPageHeader } from "../components/AdminLayout";
import { RELEASED_STATUSES, SupportReport } from "../types";
import { reportsApi } from "../services/api";

type View = "overview" | "bookings" | "orders";
type BookingFilter = "upcoming" | "deposit" | "refunds" | "past" | "all";

const ORDER_STATUSES = ["Received", "Preparing", "Ready", "Completed", "Cancelled"];

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

const StatCard: React.FC<{ label: string; value: string | number; tone: "rose" | "gold" | "blush" | "plum"; to?: string }> = ({
  label,
  value,
  tone,
  to,
}) => {
  const tones = {
    rose: "from-blush-500 to-blush-700 text-white",
    gold: "from-gold-300 to-gold-600 text-blush-900",
    blush: "from-blush-200 to-blush-300 text-blush-900",
    plum: "from-blush-800 to-blush-900 text-gold-200 ring-1 ring-gold-500/40",
  };
  const body = (
    <>
      <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-2">{label}</p>
      <p className="font-elegant text-4xl font-bold">{value}</p>
    </>
  );
  const cls = `block rounded-2xl p-6 bg-gradient-to-br shadow-soft ${tones[tone]}`;
  return to ? (
    <Link to={to} className={`${cls} hover:scale-[1.02] transition-transform`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
};

const fmtWhen = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

/** Day-to-day operations: overview, bookings and café orders (one component, three back-office pages). */
export const AdminOperations: React.FC<{ view: View }> = ({ view }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reports, setReports] = useState<SupportReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [params] = useSearchParams();
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>((params.get("filter") as BookingFilter) || "upcoming");
  useEffect(() => {
    const f = params.get("filter") as BookingFilter | null;
    if (f) setBookingFilter(f);
  }, [params]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [b, o, r] = await Promise.all([bookingsApi.getAll(), ordersApi.getAll(), reportsApi.getAll()]);
      setBookings(b);
      setOrders(o);
      setReports(r);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to load data"));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleMarkPaid = async (id: number, type: "booking" | "order", currentRef: string) => {
    const paymentRef = window.prompt("Confirm the payment reference from the bank statement:", currentRef);
    if (paymentRef === null) return;
    setBusyId(`${type}-${id}`);
    try {
      if (type === "booking") await bookingsApi.markPaid(id, paymentRef);
      else await ordersApi.markPaid(id, paymentRef);
      toast.success("Marked as paid");
      await fetchData();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to mark as paid"));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelBooking = async (id: number) => {
    const b = bookings.find((x) => x.id === id);
    const note = b && b.amountPaid > 0 ? ` The ${formatRand(b.amountPaid)} received will be marked as a refund due.` : "";
    if (!window.confirm(`Cancel this booking?${note}`)) return;
    setBusyId(`booking-${id}`);
    try {
      await bookingsApi.cancel(id);
      toast.success("Booking cancelled");
      await fetchData();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to cancel booking"));
    } finally {
      setBusyId(null);
    }
  };

  const bookingAction = async (id: number, action: () => Promise<void>, success: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(`booking-${id}`);
    try {
      await action();
      toast.success(success);
      await fetchData();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't update the booking"));
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await ordersApi.updateStatus(id, status);
      toast.success(`Order marked ${status}`);
      await fetchData();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to update status"));
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const matches = (name: string, ref: string, extra = "") =>
    !term ||
    name.toLowerCase().includes(term) ||
    ref.toLowerCase().includes(term) ||
    extra.toLowerCase().includes(term);

  const now = new Date();
  const byFilter = (b: Booking) => {
    switch (bookingFilter) {
      case "upcoming":
        return new Date(b.bookingDateTime) >= now && !RELEASED_STATUSES.includes(b.status);
      case "deposit":
        return b.status === "Awaiting Deposit";
      case "refunds":
        return b.refundStatus === "Refund Due";
      case "past":
        return new Date(b.bookingDateTime) < now || RELEASED_STATUSES.includes(b.status);
      default:
        return true;
    }
  };
  const filteredBookings = bookings
    .filter((b) => matches(b.customerName, b.paymentReference, `${b.customerEmail} ${b.stylistName} ${b.serviceName}`))
    .filter(byFilter)
    .sort((a, b) =>
      bookingFilter === "past" || bookingFilter === "all"
        ? b.bookingDateTime.localeCompare(a.bookingDateTime)
        : a.bookingDateTime.localeCompare(b.bookingDateTime)
    );
  const todaysAppointments = bookings
    .filter((b) => isToday(b.bookingDateTime) && !RELEASED_STATUSES.includes(b.status))
    .sort((a, b) => a.bookingDateTime.localeCompare(b.bookingDateTime));
  const openReports = reports.filter((r) => r.status !== "Resolved").length;
  const filteredOrders = orders.filter((o) => matches(o.customerName, o.paymentReference, o.orderNumber));

  const awaitingDeposits = bookings.filter((b) => b.status === "Awaiting Deposit").length;
  const refundsDue = bookings.filter((b) => b.refundStatus === "Refund Due").length;
  const unpaidOrders = orders.filter((o) => !o.isPaid && o.status !== "Cancelled").length;
  // Money received today: café orders, deposits and balances, less refunds paid out
  const todaysRevenue =
    orders.filter((o) => o.isPaid && isToday(o.createdAt)).reduce((sum, o) => sum + o.totalAmount, 0) +
    bookings.reduce((sum, b) => {
      let total = sum;
      if (b.depositPaidAt && isToday(b.depositPaidAt)) total += Math.min(b.depositAmount, b.servicePrice);
      if (b.fullyPaidAt && isToday(b.fullyPaidAt)) total += b.servicePrice - Math.min(b.depositAmount, b.servicePrice);
      if (b.refundedAt && isToday(b.refundedAt)) total -= b.amountPaid;
      return total;
    }, 0);

  const th = "px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gold-300";
  const td = "px-5 py-3";
  const chip = (f: BookingFilter, label: string, count?: number) => (
    <button onClick={() => setBookingFilter(f)} className={bookingFilter === f ? "chip-active" : "chip"}>
      {label}
      {count != null ? ` (${count})` : ""}
    </button>
  );

  if (view === "overview") {
    const depositsDue = bookings
      .filter((b) => b.status === "Awaiting Deposit")
      .sort((a, b) => a.depositDueAt.localeCompare(b.depositDueAt));
    const refunds = bookings.filter((b) => b.refundStatus === "Refund Due");
    const panel = "rounded-2xl p-6 bg-white/5 ring-1 ring-gold-500/30";
    return (
      <div>
        <AdminPageHeader title="Overview" subtitle="What needs your attention today." />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard label="Awaiting Deposit" value={awaitingDeposits} tone="rose" to="/admin/bookings?filter=deposit" />
          <StatCard label="Refunds Due" value={refundsDue} tone="plum" to="/admin/bookings?filter=refunds" />
          <StatCard label="Unpaid Café Orders" value={unpaidOrders} tone="blush" to="/admin/orders" />
          <StatCard label="Today's Takings" value={formatRand(todaysRevenue)} tone="gold" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className={panel}>
            <div className="flex justify-between items-baseline mb-4">
              <h2 className="text-2xl text-gold-300">Today's Appointments</h2>
              <Link to="/admin/bookings" className="text-sm font-bold text-gold-200 hover:underline">All bookings →</Link>
            </div>
            {todaysAppointments.length === 0 ? (
              <p className="text-blush-200/70">No appointments today.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {todaysAppointments.map((b) => (
                  <li key={b.id} className="py-3 flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-bold">
                        <span className="font-mono text-gold-200 mr-2">
                          {new Date(b.bookingDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {b.customerName}
                      </p>
                      <p className="text-xs text-blush-200/80">{b.serviceName} · {b.stylistName}</p>
                    </div>
                    <BookingStatusBadge booking={b} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={panel}>
            <h2 className="text-2xl text-gold-300 mb-4">Deposits to Check</h2>
            {depositsDue.length === 0 ? (
              <p className="text-blush-200/70">No deposits outstanding.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {depositsDue.slice(0, 6).map((b) => (
                  <li key={b.id} className="py-3 flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <p className="font-bold">{b.customerName} <span className="font-mono text-gold-200 text-xs ml-1">{b.paymentReference}</span></p>
                      <p className="text-xs text-blush-200/80">
                        {formatRand(b.depositAmount)} due {fmtWhen(b.depositDueAt)} · {b.serviceName}
                      </p>
                    </div>
                    <button
                      onClick={() => bookingAction(b.id, () => bookingsApi.markDepositPaid(b.id), "Deposit recorded – booking secured")}
                      disabled={busyId === `booking-${b.id}`}
                      className="btn-gold text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      Deposit Paid
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {depositsDue.length > 6 && (
              <Link to="/admin/bookings?filter=deposit" className="block mt-3 text-sm font-bold text-gold-200 hover:underline">
                See all {depositsDue.length} →
              </Link>
            )}
          </section>

          {refunds.length > 0 && (
            <section className={panel}>
              <h2 className="text-2xl text-gold-300 mb-4">Refunds to Pay</h2>
              <ul className="divide-y divide-white/10">
                {refunds.map((b) => (
                  <li key={b.id} className="py-3 flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <p className="font-bold">{b.customerName}</p>
                      <p className="text-xs text-blush-200/80">{formatRand(b.amountPaid)} · ref {b.paymentReference} · {b.customerEmail}</p>
                    </div>
                    <button
                      onClick={() =>
                        bookingAction(b.id, () => bookingsApi.markRefunded(b.id), "Refund recorded",
                          `Confirm you've refunded ${formatRand(b.amountPaid)} to ${b.customerName}?`)
                      }
                      disabled={busyId === `booking-${b.id}`}
                      className="btn-gold text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      Mark Refunded
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={panel}>
            <h2 className="text-2xl text-gold-300 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { to: "/admin/content", label: "Edit website text & details", icon: "📝" },
                { to: "/admin/services", label: "Change prices & discounts", icon: "🏷️" },
                { to: "/admin/hours", label: "Open a Sunday / change hours", icon: "🗓️" },
                { to: "/admin/staff", label: "Add an employee", icon: "👩🏾‍💼" },
                { to: "/admin/reports", label: `Concerns & lost items${openReports ? ` (${openReports} open)` : ""}`, icon: "💬" },
                { to: "/admin/gallery", label: "Upload gallery photos", icon: "📸" },
              ].map((a) => (
                <Link key={a.to} to={a.to} className="rounded-xl p-4 bg-white/5 hover:bg-white/10 ring-1 ring-gold-500/20 text-sm font-bold">
                  <span className="text-xl mr-2">{a.icon}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div>
      {view === "bookings" ? (
        <AdminPageHeader title="Bookings" subtitle="Record deposits and payments, refunds and cancellations." />
      ) : (
        <AdminPageHeader title="Café Orders" subtitle="Update order status and record payments." />
      )}

        {view === "bookings" && (
          <div className="flex flex-wrap gap-2 mb-4">
            {chip("upcoming", "Upcoming")}
            {chip("deposit", "Awaiting deposit", awaitingDeposits)}
            {chip("refunds", "Refunds due", refundsDue)}
            {chip("past", "Past & cancelled")}
            {chip("all", "All", bookings.length)}
          </div>
        )}
        <div className="mb-6">
          <input
            type="text"
            placeholder={view === "bookings" ? "Search by client, email, reference, stylist or service…" : "Search by name, payment reference or order #…"}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="!bg-white/10 !text-white placeholder-blush-200/60 !border-blush-700 focus:!border-gold-400"
          />
        </div>

        <div className="rounded-2xl overflow-x-auto bg-white/5 ring-1 ring-gold-500/30">
          {view === "bookings" ? (
            <table className="w-full min-w-[820px]">
              <thead className="bg-white/5">
                <tr>
                  <th className={th}>Customer</th>
                  <th className={th}>Service</th>
                  <th className={th}>Date / Time</th>
                  <th className={th}>Payment Ref</th>
                  <th className={th}>Status &amp; Deposit</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-blush-200/70">
                      No bookings found.
                    </td>
                  </tr>
                )}
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className={td}>
                      <p className="font-bold">{b.customerName}</p>
                      <p className="text-xs text-blush-200/70">{b.customerEmail}</p>
                    </td>
                    <td className={td}>
                      <p>{b.serviceName || `#${b.serviceId}`}</p>
                      <p className="text-xs text-blush-200/70">
                        {b.stylistName} · {formatRand(b.servicePrice)}
                      </p>
                    </td>
                    <td className={td}>
                      {new Date(b.bookingDateTime).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className={`${td} font-mono text-gold-200`}>{b.paymentReference}</td>
                    <td className={td}>
                      <BookingStatusBadge booking={b} />
                      <p className="text-xs text-blush-200/80 mt-1">
                        {b.depositPaid
                          ? `Deposit ${formatRand(b.depositAmount)} ✓ · paid ${formatRand(b.amountPaid)}`
                          : b.status === "Awaiting Deposit"
                          ? `Deposit ${formatRand(b.depositAmount)} due ${new Date(b.depositDueAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
                          : `Deposit ${formatRand(b.depositAmount)} not paid`}
                      </p>
                      {b.refundStatus !== "None" && (
                        <p className={`text-xs font-bold mt-0.5 ${b.refundStatus === "Refund Due" ? "text-gold-300" : "text-emerald-300"}`}>
                          {b.refundStatus} · {formatRand(b.amountPaid)}
                        </p>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="flex flex-wrap gap-2 items-center">
                        {!b.depositPaid && (b.status === "Awaiting Deposit" || b.status === "Expired") && (
                          <button
                            onClick={() => bookingAction(b.id, () => bookingsApi.markDepositPaid(b.id), "Deposit recorded – booking secured")}
                            disabled={busyId === `booking-${b.id}`}
                            className="btn-gold text-xs px-3 py-1.5 disabled:opacity-50"
                          >
                            Deposit Paid
                          </button>
                        )}
                        {!b.isPaid && !RELEASED_STATUSES.includes(b.status) && (
                          <button
                            onClick={() => handleMarkPaid(b.id, "booking", b.paymentReference)}
                            disabled={busyId === `booking-${b.id}`}
                            className="px-3 py-1.5 rounded-full text-xs font-bold border border-gold-400 text-gold-200 hover:bg-white/10 disabled:opacity-50"
                          >
                            Paid in Full
                          </button>
                        )}
                        {b.refundStatus === "Refund Due" && (
                          <button
                            onClick={() =>
                              bookingAction(b.id, () => bookingsApi.markRefunded(b.id), "Refund recorded",
                                `Confirm you've refunded ${formatRand(b.amountPaid)} to ${b.customerName}?`)
                            }
                            disabled={busyId === `booking-${b.id}`}
                            className="btn-gold text-xs px-3 py-1.5 disabled:opacity-50"
                          >
                            Mark Refunded
                          </button>
                        )}
                        {!RELEASED_STATUSES.includes(b.status) && b.status !== "Completed" && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={busyId === `booking-${b.id}`}
                            className="text-xs font-bold text-blush-300 hover:text-white disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[820px]">
              <thead className="bg-white/5">
                <tr>
                  <th className={th}>Order #</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Items</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Payment Ref</th>
                  <th className={th}>Status</th>
                  <th className={th}>Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-blush-200/70">
                      No orders found.
                    </td>
                  </tr>
                )}
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="border-t border-white/10 hover:bg-white/5 align-top">
                    <td className={`${td} font-mono text-gold-200`}>{o.orderNumber}</td>
                    <td className={`${td} font-bold`}>{o.customerName}</td>
                    <td className={`${td} text-sm`}>
                      {o.items.map((i) => (
                        <p key={i.id}>
                          {i.quantity}× {i.cafeItemName}
                        </p>
                      ))}
                      {o.notes && <p className="text-xs italic text-blush-200/70 mt-1">“{o.notes}”</p>}
                    </td>
                    <td className={`${td} font-bold`}>{formatRand(o.totalAmount)}</td>
                    <td className={`${td} font-mono text-gold-200`}>{o.paymentReference}</td>
                    <td className={td}>
                      <select
                        value={o.status}
                        onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                        className="!w-auto !py-1.5 !px-3 text-sm !bg-blush-800 !text-white !border-blush-600"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className={td}>
                      {o.isPaid ? (
                        <span className="badge-paid">Paid</span>
                      ) : (
                        <button
                          onClick={() => handleMarkPaid(o.id, "order", o.paymentReference)}
                          disabled={busyId === `order-${o.id}`}
                          className="btn-gold text-xs px-3 py-1.5 disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
    </div>
  );
};
