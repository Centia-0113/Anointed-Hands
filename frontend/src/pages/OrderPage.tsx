import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CafeItem, CreateOrderRequest, Order } from "../types";
import { cafeItemsApi, ordersApi } from "../services/api";
import toast from "react-hot-toast";
import { apiErrorMessage, formatRand } from "../utils/format";
import { categoryEmoji } from "./CafePage";

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
      };
      const result = await ordersApi.create(order);
      setConfirmed(result);
      toast.success("Order placed!");
    } catch (error) {
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
              <p className="sm:col-span-2 text-sm text-blush-900/70">
                Please transfer <strong>{formatRand(confirmed.totalAmount)}</strong> via EFT
                using this reference number.
              </p>
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
