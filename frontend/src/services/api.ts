import axios, { AxiosInstance } from "axios";
import {
  Service,
  CafeItem,
  Stylist,
  Booking,
  Order,
  CreateBookingRequest,
  CreateOrderRequest,
  AuthResponse,
  User,
  GalleryItem,
  Review,
  ReviewSummary,
  SupportReport,
  PaymentInfo,
} from "../types";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

/** Absolute URL for files served by the API (e.g. gallery photos at /uploads/...). */
export const assetUrl = (path: string): string =>
  /^https?:\/\//.test(path) ? path : API_URL.replace(/\/api\/?$/, "") + path;

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---- Auth token handling -------------------------------------------------
const TOKEN_KEY = "ah_token";

export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

/** Fired when the API rejects our token, so the app can sign the user out. */
export const AUTH_EXPIRED_EVENT = "ah:auth-expired";

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> =>
    (await api.post("/auth/login", { email, password })).data,
  register: async (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<AuthResponse> => (await api.post("/auth/register", data)).data,
  me: async (): Promise<User> => (await api.get("/auth/me")).data,
  changePassword: async (currentPassword: string, newPassword: string): Promise<AuthResponse> =>
    (await api.post("/auth/change-password", { currentPassword, newPassword })).data,
  resendVerification: async (): Promise<{ message: string }> =>
    (await api.post("/auth/resend-verification")).data,
  verifyEmail: async (token: string): Promise<User> =>
    (await api.post("/auth/verify-email", { token })).data,
  forgotPassword: async (email: string): Promise<{ message: string }> =>
    (await api.post("/auth/forgot-password", { email })).data,
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> =>
    (await api.post("/auth/reset-password", { token, newPassword })).data,
};

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
  getMine: async (): Promise<Booking[]> => (await api.get("/bookings/mine")).data,
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
  getMine: async (): Promise<Order[]> => (await api.get("/orders/mine")).data,
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

// Gallery API
export const galleryApi = {
  getAll: async (): Promise<GalleryItem[]> => (await api.get("/gallery")).data,
  getCategories: async (): Promise<string[]> => (await api.get("/gallery/categories")).data,
  upload: async (file: File, title: string, category: string): Promise<GalleryItem> => {
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("category", category);
    return (await api.post("/gallery", form, { headers: { "Content-Type": "multipart/form-data" } })).data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/gallery/${id}`);
  },
};

// Reviews API
export const reviewsApi = {
  getPublic: async (serviceId?: number): Promise<ReviewSummary> =>
    (await api.get("/reviews", { params: { serviceId } })).data,
  getMine: async (): Promise<Review[]> => (await api.get("/reviews/mine")).data,
  getAll: async (): Promise<Review[]> => (await api.get("/reviews/all")).data,
  save: async (data: { serviceId?: number | null; rating: number; comment: string }): Promise<Review> =>
    (await api.post("/reviews", data)).data,
  setVisibility: async (id: number, isVisible: boolean): Promise<void> => {
    await api.put(`/reviews/${id}/visibility`, { isVisible });
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/reviews/${id}`);
  },
};

// Concerns & lost-item reports API
export const reportsApi = {
  create: async (data: {
    type: string;
    name: string;
    email: string;
    phone?: string;
    visitDate?: string;
    itemDescription?: string;
    message: string;
  }): Promise<SupportReport> => (await api.post("/reports", data)).data,
  getMine: async (): Promise<SupportReport[]> => (await api.get("/reports/mine")).data,
  getAll: async (): Promise<SupportReport[]> => (await api.get("/reports")).data,
  update: async (id: number, status: string, adminNotes?: string): Promise<void> => {
    await api.put(`/reports/${id}`, { status, adminNotes });
  },
};

// Settings API (payment details, in-salon ordering code)
export const settingsApi = {
  getPayment: async (): Promise<PaymentInfo> => (await api.get("/settings/payment")).data,
  getSalonCode: async (): Promise<string> => (await api.get("/settings/salon-code")).data.code,
  regenerateSalonCode: async (): Promise<string> =>
    (await api.post("/settings/salon-code/regenerate")).data.code,
  checkSalonCode: async (code: string): Promise<boolean> =>
    (await api.post("/settings/salon-code/check", { code })).data.valid,
};

export default api;
