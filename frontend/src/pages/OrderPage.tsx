import React, { useState, useEffect } from "react";
import { CafeItem, CreateOrderRequest } from "../types";
import { cafeItemsApi, ordersApi } from "../services/api";
import toast from "react-hot-toast";

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
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const data = await cafeItemsApi.getAll();
      setItems(data.filter((i) => !i.isOutOfStock));
    } catch (error) {
      toast.error("Failed to load café items");
    }
  };

  const addToCart = (item: CafeItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.cafeItemId === item.id);
      if (existing) {
        return prevCart.map((c) =>
          c.cafeItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prevCart,
        {
          cafeItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
    toast.success(`${item.name} added to order`);
  };

  const removeFromCart = (cafeItemId: number) => {
    setCart((prevCart) =>
      prevCart.filter((c) => c.cafeItemId !== cafeItemId)
    );
  };

  const updateQuantity = (cafeItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cafeItemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((c) =>
        c.cafeItemId === cafeItemId ? { ...c, quantity } : c
      )
    );
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
        customerName,
        items: cart.map((c) => ({
          cafeItemId: c.cafeItemId,
          quantity: c.quantity,
        })),
      };

      const result = await ordersApi.create(order);
      setPaymentRef(result.paymentReference);
      setOrderNumber(result.orderNumber);
      setOrderConfirmed(true);
      toast.success("Order created successfully!");
    } catch (error) {
      toast.error("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (orderConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-3xl font-bold mb-4 text-green-600">
              Order Confirmed!
            </h1>
            <div className="bg-amber-50 p-6 rounded-lg mb-6">
              <p className="text-lg font-semibold mb-2">Order Number:</p>
              <p className="text-2xl font-bold text-amber-600">{orderNumber}</p>
              <p className="text-lg font-semibold mt-4 mb-2">Payment Reference:</p>
              <p className="text-2xl font-bold text-amber-600">{paymentRef}</p>
              <p className="text-sm text-gray-600 mt-4">
                Please transfer R{totalAmount.toFixed(2)} via EFT using this reference number.
              </p>
            </div>
            <p className="text-gray-600 mb-6">
              Your order will be prepared once payment is received. Check your order status at the counter.
            </p>
            <a href="/order" className="btn-primary">
              Place Another Order
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-center mb-12">In-Salon Order</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Items */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              {items.map((item) => (
                <div key={item.id} className="card cursor-pointer hover:shadow-xl">
                  {item.imageUrl && (
                    <div className="mb-3 h-32 bg-gradient-to-br from-amber-200 to-orange-200 rounded-lg overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="font-bold mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-amber-600">
                      R{item.price.toFixed(2)}
                    </p>
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-amber-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-amber-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="card sticky top-4 space-y-4">
              <h2 className="text-xl font-bold">Your Order</h2>

              <input
                type="text"
                placeholder="Your name"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              {/* Cart Items */}
              <div className="space-y-3 border-t border-b py-4">
                {cart.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No items added</p>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.cafeItemId}
                      className="flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          R{item.price.toFixed(2)} x{" "}
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.cafeItemId,
                                parseInt(e.target.value)
                              )
                            }
                            className="w-12 border border-gray-300 rounded px-2 py-1"
                          />
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          R{(item.price * item.quantity).toFixed(2)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cafeItemId)}
                          className="text-red-600 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total */}
              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>Subtotal:</span>
                  <span>R{totalAmount.toFixed(2)}</span>
                </div>
                <div className="text-lg font-bold flex justify-between">
                  <span>Total:</span>
                  <span className="text-amber-600">R{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? "Processing..." : "Confirm Order"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
