import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Booking, Order } from "../types";
import { authApi, bookingsApi, ordersApi } from "../services/api";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { ScanToPayToggle } from "../components/ScanToPay";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage, formatRand } from "../utils/format";

const ORDER_STEPS = ["Received", "Preparing", "Ready", "Completed"];

const PaymentBadge: React.FC<{ isPaid: boolean; cancelled?: boolean }> = ({ isPaid, cancelled }) =>
  cancelled ? (
    <span className="badge-cancelled">Cancelled</span>
  ) : isPaid ? (
    <span className="badge-paid">Paid</span>
  ) : (
    <span className="badge-pending">Awaiting payment</span>
  );

/** Received → Preparing → Ready → Completed progress bar for café orders. */
const OrderProgress: React.FC<{ status: string }> = ({ status }) => {
  if (status === "Cancelled") return null;
  const current = ORDER_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1 mt-4">
      {ORDER_STEPS.map((step, i) => (
        <div key={step} className="flex-1">
          <div className={`h-1.5 rounded-full ${i <= current ? "bg-gradient-to-r from-blush-500 to-gold-500" : "bg-blush-100"}`} />
          <p className={`text-[11px] mt-1 font-bold ${i <= current ? "text-blush-700" : "text-blush-900/40"}`}>
            {step}
          </p>
        </div>
      ))}
    </div>
  );
};

export const AccountPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"bookings" | "orders" | "settings">("bookings");
  const [resending, setResending] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, o] = await Promise.all([bookingsApi.getMine(), ordersApi.getMine()]);
      setBookings(b);
      setOrders(o);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't load your history"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Keep café order status fresh while the page is open
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const cancelBooking = async (id: number) => {
    if (!window.confirm("Cancel this appointment?")) return;
    setCancellingId(id);
    try {
      await bookingsApi.cancel(id);
      toast.success("Appointment cancelled");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't cancel this booking"));
    } finally {
      setCancellingId(null);
    }
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      const res = await authApi.resendVerification();
      toast.success(res.message);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't send the email"));
    } finally {
      setResending(false);
    }
  };

  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.bookingDateTime) >= now && b.status !== "Cancelled");
  const past = bookings.filter((b) => !upcoming.includes(b));

  const tabClass = (t: typeof tab) => (tab === t ? "chip-active" : "chip");

  const renderBooking = (b: Booking, canCancel: boolean) => (
    <div key={b.id} className="card">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="text-2xl mb-0.5">{b.serviceName}</h3>
          <p className="text-blush-900/70">
            with {b.stylistName} ·{" "}
            {new Date(b.bookingDateTime).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}
          </p>
        </div>
        <div className="text-right">
          <p className="price">{formatRand(b.servicePrice)}</p>
          <PaymentBadge isPaid={b.isPaid} cancelled={b.status === "Cancelled"} />
        </div>
      </div>
      <div className="flex flex-wrap justify-between items-center gap-3 mt-4 pt-4 border-t border-gold-100">
        <p className="text-sm">
          Payment ref: <span className="font-mono font-bold text-blush-700">{b.paymentReference}</span>
        </p>
        {!b.isPaid && b.status !== "Cancelled" && (
          <ScanToPayToggle reference={b.paymentReference} amount={b.servicePrice} />
        )}
        {canCancel && !b.isPaid && (
          <button
            onClick={() => cancelBooking(b.id)}
            disabled={cancellingId === b.id}
            className="text-sm font-bold text-blush-600 hover:underline disabled:opacity-50"
          >
            Cancel appointment
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
          <div>
            <p className="uppercase tracking-[0.3em] text-xs font-bold text-gold-600">My Account</p>
            <h1 className="text-5xl">Hello, {user?.name.split(" ")[0]}</h1>
          </div>
          <button onClick={logout} className="btn-secondary text-sm">
            Sign out
          </button>
        </div>
        <p className="text-blush-900/70 mb-6">
          {user?.email} ·{" "}
          <Link to="/help" className="font-bold text-blush-600 hover:underline">
            Report a concern or lost item
          </Link>{" "}
          ·{" "}
          <Link to="/reviews" className="font-bold text-blush-600 hover:underline">
            Write a review
          </Link>
        </p>

        {user && !user.emailConfirmed && (
          <div className="mb-8 rounded-xl px-5 py-4 bg-gold-50 border border-gold-300 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <strong>Please verify your email.</strong> Once verified, bookings you made as a guest with{" "}
              {user.email} will appear here too.
            </p>
            <button
              onClick={resendVerification}
              disabled={resending}
              className="btn-gold text-sm px-4 py-1.5 disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend email"}
            </button>
          </div>
        )}

        <div className="flex gap-2 mb-8">
          <button onClick={() => setTab("bookings")} className={tabClass("bookings")}>
            Bookings ({bookings.length})
          </button>
          <button onClick={() => setTab("orders")} className={tabClass("orders")}>
            Café Orders ({orders.length})
          </button>
          <button onClick={() => setTab("settings")} className={tabClass("settings")}>
            Settings
          </button>
        </div>

        {tab === "settings" ? (
          <div className="card">
            <h2 className="text-2xl mb-4">Change Password</h2>
            <ChangePasswordForm />
          </div>
        ) : loading ? (
          <p className="text-center py-12 text-blush-900/60">Loading your history…</p>
        ) : tab === "bookings" ? (
          bookings.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-blush-900/70 mb-5">You haven't made any bookings yet.</p>
              <Link to="/booking" className="btn-primary">
                Book an Appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {upcoming.length > 0 && (
                <section>
                  <h2 className="text-2xl mb-3">Upcoming</h2>
                  <div className="space-y-4">{upcoming.map((b) => renderBooking(b, true))}</div>
                </section>
              )}
              {past.length > 0 && (
                <section>
                  <h2 className="text-2xl mb-3">Past &amp; cancelled</h2>
                  <div className="space-y-4 opacity-90">{past.map((b) => renderBooking(b, false))}</div>
                </section>
              )}
            </div>
          )
        ) : orders.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-blush-900/70 mb-5">You haven't placed any café orders yet.</p>
            <Link to="/order" className="btn-gold">
              Order from the Café
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="card">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="text-2xl mb-0.5 font-mono">{o.orderNumber}</h3>
                    <p className="text-sm text-blush-900/70">
                      {new Date(o.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="price">{formatRand(o.totalAmount)}</p>
                    <PaymentBadge isPaid={o.isPaid} cancelled={o.status === "Cancelled"} />
                  </div>
                </div>
                <ul className="mt-3 text-sm space-y-0.5">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex justify-between">
                      <span>
                        {i.quantity}× {i.cafeItemName}
                      </span>
                      <span className="text-blush-900/70">{formatRand(i.price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <OrderProgress status={o.status} />
                <div className="flex flex-wrap justify-between items-start gap-3 mt-4 pt-4 border-t border-gold-100">
                  <p className="text-sm">
                    Payment ref: <span className="font-mono font-bold text-blush-700">{o.paymentReference}</span>
                  </p>
                  {!o.isPaid && o.status !== "Cancelled" && (
                    <ScanToPayToggle reference={o.paymentReference} amount={o.totalAmount} />
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
