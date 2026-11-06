import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { CafeItem, CreateOrderRequest, Order } from "../types";
import { cafeItemsApi, ordersApi, settingsApi } from "../services/api";
import { ScanToPay } from "../components/ScanToPay";
import toast from "react-hot-toast";
import { apiErrorMessage, formatRand } from "../utils/format";
import { categoryEmoji } from "./CafePage";

// The in-salon code is kept for this browser tab only, for a few hours (i.e. while at the salon)
const SALON_CODE_KEY = "ah_salon_code";
const SALON_CODE_TTL_MS = 4 * 60 * 60 * 1000;

const readStoredCode = (): string | null => {
  try {
    const raw = sessionStorage.getItem(SALON_CODE_KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw) as { code: string; at: number };
    return Date.now() - at < SALON_CODE_TTL_MS ? code : null;
  } catch {
    return null;
  }
};
const storeCode = (code: string | null) => {
  try {
    if (code) sessionStorage.setItem(SALON_CODE_KEY, JSON.stringify({ code, at: Date.now() }));
    else sessionStorage.removeItem(SALON_CODE_KEY);
  } catch {
    /* storage unavailable */
  }
};

interface CartItem {
  cafeItemId: number;
  name: string;
  price: number;
  quantity: number;
}

export const OrderPage: React.FC = () => {
  const [items, setItems] = useState<CafeItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [salonCode, setSalonCode] = useState<string | null>(null);
  const [gate, setGate] = useState<"checking" | "open" | "locked">("checking");
  const [codeInput, setCodeInput] = useState("");
  const [checking, setChecking] = useState(false);

  // Unlock ordering with the code from the table QR (?code=...) or one saved earlier this visit
  useEffect(() => {
    const fromUrl = searchParams.get("code");
    const candidate = fromUrl || readStoredCode();
    if (fromUrl) {
      searchParams.delete("code");
      setSearchParams(searchParams, { replace: true });
    }
    if (!candidate) {
      setGate("locked");
      return;
    }
    settingsApi
      .checkSalonCode(candidate)
      .then((valid) => {
        if (valid) {
          storeCode(candidate);
          setSalonCode(candidate);
          setGate("open");
        } else {
          storeCode(null);
          setGate("locked");
          if (fromUrl) toast.error("That QR code has expired. Please scan the one on your table.");
        }
      })
      .catch(() => setGate("locked"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    try {
      const code = codeInput.trim().toUpperCase();
      if (await settingsApi.checkSalonCode(code)) {
        storeCode(code);
        setSalonCode(code);
        setGate("open");
        toast.success("Welcome! You can order now.");
      } else {
        toast.error("That code isn't right. Check the sign on your table or ask at the counter.");
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't check the code"));
    } finally {
      setChecking(false);
    }
  };
  const { user } = useAuth();

  useEffect(() => {
    if (user) setCustomerName((n) => n || user.name);
  }, [user]);

  useEffect(() => {
    cafeItemsApi
      .getAll()
      .then((data) => setItems(data.filter((i) => !i.isOutOfStock)))
      .catch((e) => toast.error(apiErrorMessage(e, "Failed to load café items")));
  }, []);

  const addToCart = (item: CafeItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.cafeItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.cafeItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { cafeItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
    toast.success(`${item.name} added`);
  };

  const updateQuantity = (cafeItemId: number, quantity: number) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((c) => c.cafeItemId !== cafeItemId)
        : prev.map((c) => (c.cafeItemId === cafeItemId ? { ...c, quantity } : c))
    );
  };

  const resetOrder = () => {
    setConfirmed(null);
    setCart([]);
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Please add items to your order");
      return;
    }
    setLoading(true);
    try {
      const order: CreateOrderRequest = {
        customerName: customerName.trim(),
        items: cart.map((c) => ({ cafeItemId: c.cafeItemId, quantity: c.quantity })),
        notes: notes.trim() || undefined,
        salonCode: salonCode ?? undefined,
      };
      const result = await ordersApi.create(order);
      setConfirmed(result);
      toast.success("Order placed!");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        storeCode(null);
        setSalonCode(null);
        setGate("locked");
      }
      toast.error(apiErrorMessage(error, "Failed to create order"));
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (confirmed) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center text-3xl text-white bg-gradient-to-br from-gold-300 to-gold-600">
              ✓
            </div>
            <h1 className="text-4xl mb-6">Order Confirmed!</h1>
            <div className="rounded-xl p-6 mb-6 bg-blush-50 border border-gold-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm uppercase tracking-widest font-bold text-gold-700 mb-1">
                  Order Number
                </p>
                <p className="font-elegant text-3xl font-bold text-blush-600">
                  {confirmed.orderNumber}
                </p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-widest font-bold text-gold-700 mb-1">
                  Payment Reference
                </p>
                <p className="font-elegant text-3xl font-bold text-blush-600">
                  {confirmed.paymentReference}
                </p>
              </div>
            </div>
            <div className="mb-6">
              <ScanToPay reference={confirmed.paymentReference} amount={confirmed.totalAmount} />
            </div>
            <p className="text-blush-900/70 mb-6">
              Your order will be prepared once payment is received. Check your order status at
              the counter.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user && (
                <Link to="/account" className="btn-secondary">
                  Track in My Account
                </Link>
              )}
              <button onClick={resetOrder} className="btn-primary">
                Place Another Order
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gate !== "open") {
    return (
      <div className="py-16 px-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-5xl text-center">In-Salon Café</h1>
          <div className="gold-rule mb-8" />
          <div className="card text-center space-y-5">
            {gate === "checking" ? (
              <p className="text-blush-900/60">Checking you're in the salon…</p>
            ) : (
              <>
                <div className="text-5xl">📱</div>
                <p>
                  Café orders are for clients <strong>in the salon</strong>. Scan the QR code on your table or at the
                  counter with your phone camera to start ordering.
                </p>
                <form onSubmit={unlock} className="space-y-3 text-left">
                  <label htmlFor="salon-code">Or enter the code shown on the sign</label>
                  <input
                    id="salon-code"
                    required
                    maxLength={12}
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder="e.g. P6AR3W"
                    className="font-mono tracking-[0.3em] uppercase text-center text-xl"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                  />
                  <button type="submit" disabled={checking} className="btn-primary w-full disabled:opacity-50">
                    {checking ? "Checking…" : "Start Ordering"}
                  </button>
                </form>
                <p className="text-sm text-blush-900/60">
                  Not at the salon yet?{" "}
                  <Link to="/cafe" className="font-bold text-blush-600 hover:underline">
                    Browse the menu
                  </Link>{" "}
                  or{" "}
                  <Link to="/booking" className="font-bold text-blush-600 hover:underline">
                    book an appointment
                  </Link>
                  .
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl text-center">In-Salon Order</h1>
        <div className="gold-rule mb-10" />

        {!user && (
          <p className="mb-6 rounded-xl px-4 py-3 bg-gold-50 border border-gold-200 text-sm text-center">
            <Link to="/login" state={{ from: "/order" }} className="font-bold text-blush-600 hover:underline">
              Sign in or create an account
            </Link>{" "}
            to keep track of your orders — or continue as a guest.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
            {items.map((item) => {
              const inCart = cart.find((c) => c.cafeItemId === item.id)?.quantity ?? 0;
              return (
                <div key={item.id} className="card card-hover p-5 flex gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-xl flex items-center justify-center text-3xl bg-gradient-to-br from-gold-100 to-blush-100">
                    {categoryEmoji[item.category] ?? "☕"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl mb-0.5">{item.name}</h3>
                    <p className="text-sm text-blush-900/70 mb-3">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <p className="font-elegant text-xl font-bold text-blush-600">
                        {formatRand(item.price)}
                      </p>
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="btn-gold text-sm px-4 py-1.5"
                      >
                        {inCart ? `Add · ${inCart}` : "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div>
            <form onSubmit={handleSubmit} className="card lg:sticky lg:top-28 space-y-4">
              <h2 className="text-2xl">
                Your Order{" "}
                {itemCount > 0 && <span className="badge-info align-middle">{itemCount}</span>}
              </h2>

              <input
                type="text"
                placeholder="Your name"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              <div className="space-y-3 border-y border-gold-100 py-4">
                {cart.length === 0 ? (
                  <p className="text-blush-900/60 text-center py-4">No items added yet</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.cafeItemId} className="flex justify-between items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{item.name}</p>
                        <p className="text-sm text-blush-900/60">{formatRand(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Remove one ${item.name}`}
                          onClick={() => updateQuantity(item.cafeItemId, item.quantity - 1)}
                          className="h-7 w-7 rounded-full border border-gold-300 text-blush-700 font-bold hover:bg-blush-50"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Add one ${item.name}`}
                          onClick={() => updateQuantity(item.cafeItemId, item.quantity + 1)}
                          className="h-7 w-7 rounded-full border border-gold-300 text-blush-700 font-bold hover:bg-blush-50"
                        >
                          +
                        </button>
                      </div>
                      <p className="w-20 text-right font-bold">
                        {formatRand(item.price * item.quantity)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <textarea
                placeholder="Notes (e.g. oat milk, no sugar)"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="rounded-xl p-4 bg-gold-50 border border-gold-200 flex justify-between items-center">
                <span className="font-bold">Total</span>
                <span className="price">{formatRand(totalAmount)}</span>
              </div>

              <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? "Processing…" : "Confirm Order"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
