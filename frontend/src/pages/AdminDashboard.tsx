import React, { useState, useEffect } from "react";
import { Booking, Order } from "../types";
import { bookingsApi, ordersApi } from "../services/api";
import toast from "react-hot-toast";

export const AdminDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"bookings" | "orders">("bookings");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsData, ordersData] = await Promise.all([
        bookingsApi.getAll(),
        ordersApi.getAll(),
      ]);
      setBookings(bookingsData);
      setOrders(ordersData);
    } catch (error) {
      toast.error("Failed to load data");
    }
  };

  const handleMarkPaid = async (id: number, type: "booking" | "order") => {
    setMarkingPaidId(id);
    try {
      const paymentRef = prompt("Enter payment reference:");
      if (!paymentRef) return;

      if (type === "booking") {
        await bookingsApi.markPaid(id, paymentRef);
      } else {
        await ordersApi.markPaid(id, paymentRef);
      }

      toast.success("Marked as paid successfully!");
      await fetchData();
    } catch (error) {
      toast.error("Failed to mark as paid");
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await ordersApi.updateStatus(id, status);
      toast.success("Status updated successfully!");
      await fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const filteredBookings = bookings.filter(
    (b) =>
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.paymentReference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(
    (o) =>
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.paymentReference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unpaidBookings = bookings.filter((b) => !b.isPaid).length;
  const unpaidOrders = orders.filter((o) => !o.isPaid).length;
  const totalRevenue = orders
    .filter((o) => o.isPaid)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-purple-600 p-6 rounded-lg">
            <p className="text-purple-200 mb-2">Pending Bookings</p>
            <p className="text-3xl font-bold">{unpaidBookings}</p>
          </div>
          <div className="bg-orange-600 p-6 rounded-lg">
            <p className="text-orange-200 mb-2">Pending Orders</p>
            <p className="text-3xl font-bold">{unpaidOrders}</p>
          </div>
          <div className="bg-green-600 p-6 rounded-lg">
            <p className="text-green-200 mb-2">Today's Revenue</p>
            <p className="text-3xl font-bold">R{totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-blue-600 p-6 rounded-lg">
            <p className="text-blue-200 mb-2">Total Transactions</p>
            <p className="text-3xl font-bold">{bookings.length + orders.length}</p>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="mb-8">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "bookings"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-200"
              }`}
            >
              Bookings ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "orders"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-700 text-gray-200"
              }`}
            >
              Orders ({orders.length})
            </button>
          </div>

          <input
            type="text"
            placeholder="Search by customer name or payment reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:border-purple-500"
          />
        </div>

        {/* Bookings Table */}
        {activeTab === "bookings" && (
          <div className="bg-gray-800 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">Customer</th>
                  <th className="px-6 py-3 text-left">Service</th>
                  <th className="px-6 py-3 text-left">Date/Time</th>
                  <th className="px-6 py-3 text-left">Payment Ref</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="px-6 py-3">{booking.customerName}</td>
                    <td className="px-6 py-3">{booking.serviceId}</td>
                    <td className="px-6 py-3">
                      {new Date(booking.bookingDateTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-mono">
                      {booking.paymentReference}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          booking.isPaid
                            ? "bg-green-900 text-green-200"
                            : "bg-yellow-900 text-yellow-200"
                        }`}
                      >
                        {booking.isPaid ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {!booking.isPaid && (
                        <button
                          onClick={() => handleMarkPaid(booking.id, "booking")}
                          disabled={markingPaidId === booking.id}
                          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-semibold disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Orders Table */}
        {activeTab === "orders" && (
          <div className="bg-gray-800 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">Order #</th>
                  <th className="px-6 py-3 text-left">Customer</th>
                  <th className="px-6 py-3 text-left">Amount</th>
                  <th className="px-6 py-3 text-left">Payment Ref</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="px-6 py-3 font-mono">{order.orderNumber}</td>
                    <td className="px-6 py-3">{order.customerName}</td>
                    <td className="px-6 py-3 font-bold">R{order.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-3 font-mono">{order.paymentReference}</td>
                    <td className="px-6 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className="bg-gray-700 px-2 py-1 rounded text-sm"
                      >
                        <option>Received</option>
                        <option>Preparing</option>
                        <option>Ready</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      {!order.isPaid && (
                        <button
                          onClick={() => handleMarkPaid(order.id, "order")}
                          disabled={markingPaidId === order.id}
                          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-semibold disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
