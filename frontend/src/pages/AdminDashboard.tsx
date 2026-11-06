import React, { useState, useEffect, useCallback } from "react";
import { Booking, Order } from "../types";
import { bookingsApi, ordersApi } from "../services/api";
import toast from "react-hot-toast";
import { apiErrorMessage, formatRand } from "../utils/format";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { useAuth } from "../context/AuthContext";
import { AdminGallery, AdminReports, AdminReviews, AdminSalonQr } from "../components/AdminPanels";

type Tab = "bookings" | "orders" | "reports" | "reviews" | "gallery" | "cafe-qr";

const ORDER_STATUSES = ["Received", "Preparing", "Ready", "Completed", "Cancelled"];

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

const StatCard: React.FC<{ label: string; value: string | number; tone: "rose" | "gold" | "blush" | "plum" }> = ({
  label,
  value,
  tone,
}) => {
  const tones = {
    rose: "from-blush-500 to-blush-700 text-white",
    gold: "from-gold-300 to-gold-600 text-blush-900",
    blush: "from-blush-200 to-blush-300 text-blush-900",
    plum: "from-blush-800 to-blush-900 text-gold-200 ring-1 ring-gold-500/40",
  };
  return (
    <div className={`rounded-2xl p-6 bg-gradient-to-br shadow-soft ${tones[tone]}`}>
      <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-2">{label}</p>
      <p className="font-elegant text-4xl font-bold">{value}</p>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [openReports, setOpenReports] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      const [b, o] = await Promise.all([bookingsApi.getAll(), ordersApi.getAll()]);
      setBookings(b);
      setOrders(o);
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
    if (!window.confirm("Cancel this booking?")) return;
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

  const filteredBookings = bookings.filter((b) => matches(b.customerName, b.paymentReference));
  const filteredOrders = orders.filter((o) => matches(o.customerName, o.paymentReference, o.orderNumber));

  const unpaidBookings = bookings.filter((b) => !b.isPaid && b.status !== "Cancelled").length;
  const unpaidOrders = orders.filter((o) => !o.isPaid && o.status !== "Cancelled").length;
  const todaysRevenue =
    orders.filter((o) => o.isPaid && isToday(o.createdAt)).reduce((sum, o) => sum + o.totalAmount, 0) +
    bookings
      .filter((b) => b.isPaid && isToday(b.bookingDateTime))
      .reduce((sum, b) => sum + b.servicePrice, 0);

  const tabClass = (tab: Tab) =>
    activeTab === tab
      ? "px-5 py-2.5 rounded-full font-bold text-sm bg-gradient-to-r from-blush-500 to-blush-600 text-white"
      : "px-5 py-2.5 rounded-full font-bold text-sm bg-white/10 text-blush-100 hover:bg-white/20";
  const isTable = activeTab === "bookings" || activeTab === "orders";

  const th = "px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gold-300";
  const td = "px-5 py-3";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blush-900 to-[#2e0819] text-blush-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-5xl text-gold-300 mb-1">Admin Dashboard</h1>
            <p className="text-blush-200">Bookings, café orders and EFT payments at a glance.</p>
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="px-4 py-2 rounded-full text-sm font-bold border border-gold-500/60 text-gold-200 hover:bg-white/10"
          >
            {showSettings ? "Close settings" : "Account settings"}
          </button>
        </div>

        {showSettings && (
          <div className="mb-10 rounded-2xl p-6 bg-white/5 ring-1 ring-gold-500/30">
            <h2 className="text-2xl text-gold-300 mb-1">Change Password</h2>
            <p className="text-sm text-blush-200 mb-5">Signed in as {user?.email}</p>
            <ChangePasswordForm dark />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          <StatCard label="Unpaid Bookings" value={unpaidBookings} tone="rose" />
          <StatCard label="Unpaid Orders" value={unpaidOrders} tone="blush" />
          <StatCard label="Today's Revenue" value={formatRand(todaysRevenue)} tone="gold" />
          <StatCard label="Total Transactions" value={bookings.length + orders.length} tone="plum" />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setActiveTab("bookings")} className={tabClass("bookings")}>
            Bookings ({bookings.length})
          </button>
          <button onClick={() => setActiveTab("orders")} className={tabClass("orders")}>
            Orders ({orders.length})
          </button>
          <button onClick={() => setActiveTab("reports")} className={tabClass("reports")}>
            Concerns &amp; Lost Items{openReports ? ` (${openReports})` : ""}
          </button>
          <button onClick={() => setActiveTab("reviews")} className={tabClass("reviews")}>
            Reviews
          </button>
          <button onClick={() => setActiveTab("gallery")} className={tabClass("gallery")}>
            Gallery
          </button>
          <button onClick={() => setActiveTab("cafe-qr")} className={tabClass("cafe-qr")}>
            Café QR
          </button>
        </div>

        {/* Keep the reports panel mounted so the open-count badge stays current */}
        <div className={activeTab === "reports" ? "" : "hidden"}>
          <AdminReports onCountChange={setOpenReports} />
        </div>
        {activeTab === "reviews" && <AdminReviews />}
        {activeTab === "gallery" && <AdminGallery />}
        {activeTab === "cafe-qr" && <AdminSalonQr />}

        {isTable && (
        <>
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name, payment reference or order #…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="!bg-white/10 !text-white placeholder-blush-200/60 !border-blush-700 focus:!border-gold-400"
          />
        </div>

        <div className="rounded-2xl overflow-x-auto bg-white/5 ring-1 ring-gold-500/30">
          {activeTab === "bookings" ? (
            <table className="w-full min-w-[820px]">
              <thead className="bg-white/5">
                <tr>
                  <th className={th}>Customer</th>
                  <th className={th}>Service</th>
                  <th className={th}>Date / Time</th>
                  <th className={th}>Payment Ref</th>
                  <th className={th}>Status</th>
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
                      {b.status === "Cancelled" ? (
                        <span className="badge-cancelled">Cancelled</span>
                      ) : b.isPaid ? (
                        <span className="badge-paid">Paid</span>
                      ) : (
                        <span className="badge-pending">Pending</span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap space-x-2`}>
                      {!b.isPaid && b.status !== "Cancelled" && (
                        <button
                          onClick={() => handleMarkPaid(b.id, "booking", b.paymentReference)}
                          disabled={busyId === `booking-${b.id}`}
                          className="btn-gold text-xs px-3 py-1.5 disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      )}
                      {b.status !== "Cancelled" && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          disabled={busyId === `booking-${b.id}`}
                          className="text-xs font-bold text-blush-300 hover:text-white disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
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
        </>
        )}
      </div>
    </div>
  );
};
