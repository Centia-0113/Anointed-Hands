import axios, { AxiosInstance } from "axios";
import {
  Service,
  CafeItem,
  Stylist,
  Booking,
  Order,
  CreateBookingRequest,
  CreateOrderRequest,
} from "../types";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Services API
export const servicesApi = {
  getAll: async (): Promise<Service[]> => {
    const response = await api.get("/services");
    return response.data;
  },
  getById: async (id: number): Promise<Service> => {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },
};

// Cafe Items API
export const cafeItemsApi = {
  getAll: async (): Promise<CafeItem[]> => {
    const response = await api.get("/cafeitems");
    return response.data;
  },
  getById: async (id: number): Promise<CafeItem> => {
    const response = await api.get(`/cafeitems/${id}`);
    return response.data;
  },
};

// Stylists API
export const stylistsApi = {
  getAll: async (): Promise<Stylist[]> => {
    const response = await api.get("/stylists");
    return response.data;
  },
  getById: async (id: number): Promise<Stylist> => {
    const response = await api.get(`/stylists/${id}`);
    return response.data;
  },
};

// Bookings API
export const bookingsApi = {
  getAll: async (): Promise<Booking[]> => {
    const response = await api.get("/bookings");
    return response.data;
  },
  getById: async (id: number): Promise<Booking> => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },
  create: async (booking: CreateBookingRequest): Promise<Booking> => {
    const response = await api.post("/bookings", booking);
    return response.data;
  },
  search: async (customerName?: string, paymentReference?: string): Promise<Booking[]> => {
    const response = await api.get("/bookings/search", {
      params: { customerName, paymentReference },
    });
    return response.data;
  },
  getAvailableSlots: async (
    stylistId: number,
    serviceId: number,
    date: string
  ): Promise<string[]> => {
    const response = await api.get("/bookings/available-slots", {
      params: { stylistId, serviceId, date },
    });
    return response.data;
  },
  markPaid: async (id: number, paymentReference: string): Promise<void> => {
    await api.post(`/bookings/${id}/mark-paid`, { paymentReference });
  },
  cancel: async (id: number): Promise<void> => {
    await api.post(`/bookings/${id}/cancel`);
  },
};

// Orders API
export const ordersApi = {
  getAll: async (): Promise<Order[]> => {
    const response = await api.get("/orders");
    return response.data;
  },
  getById: async (id: number): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  create: async (order: CreateOrderRequest): Promise<Order> => {
    const response = await api.post("/orders", order);
    return response.data;
  },
  search: async (customerName?: string, paymentReference?: string): Promise<Order[]> => {
    const response = await api.get("/orders/search", {
      params: { customerName, paymentReference },
    });
    return response.data;
  },
  updateStatus: async (id: number, status: string): Promise<void> => {
    await api.put(`/orders/${id}/status`, { status });
  },
  markPaid: async (id: number, paymentReference: string): Promise<void> => {
    await api.post(`/orders/${id}/mark-paid`, { paymentReference });
  },
};

export default api;
