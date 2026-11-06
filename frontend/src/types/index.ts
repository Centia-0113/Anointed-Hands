export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  finalPrice: number;
  discountPercent?: number | null;
  discountEndsOn?: string | null;
  isDiscountActive: boolean;
  depositAmount: number;
  durationMinutes: number;
  category: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface CafeItem {
  id: number;
  name: string;
  description: string;
  price: number;
  finalPrice: number;
  discountPercent?: number | null;
  discountEndsOn?: string | null;
  isDiscountActive: boolean;
  category: string;
  imageUrl?: string;
  isActive: boolean;
  isOutOfStock: boolean;
}

export interface Stylist {
  id: number;
  name: string;
  specialization: string;
  photoUrl?: string;
  isActive: boolean;
}

export interface Booking {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceId: number;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  stylistId: number;
  stylistName: string;
  bookingDateTime: string;
  status: string;
  paymentReference: string;
  isPaid: boolean;
  notes?: string;
  createdAt: string;
  depositAmount: number;
  depositDueAt: string;
  depositPaid: boolean;
  depositPaidAt?: string | null;
  fullyPaidAt?: string | null;
  amountPaid: number;
  balanceDue: number;
  refundStatus: "None" | "Refund Due" | "Refunded";
  refundedAt?: string | null;
  cancelledAt?: string | null;
}

export type BookingStatus = "Awaiting Deposit" | "Confirmed" | "Completed" | "No Show" | "Cancelled" | "Expired";
export const RELEASED_STATUSES = ["Cancelled", "Expired"];

export interface CreateBookingRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceId: number;
  stylistId: number;
  bookingDateTime: string;
  notes?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  status: string;
  paymentReference: string;
  isPaid: boolean;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  cafeItemId: number;
  cafeItemName: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  customerName: string;
  salonCode?: string;
  items: {
    cafeItemId: number;
    quantity: number;
  }[];
  notes?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: "Admin" | "Customer" | "Stylist";
  emailConfirmed: boolean;
  stylistId?: number | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface GalleryItem {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
  createdAt: string;
}

export interface Review {
  id: number;
  reviewerName: string;
  serviceId?: number | null;
  serviceName?: string | null;
  rating: number;
  comment: string;
  isVerifiedClient: boolean;
  isVisible: boolean;
  isMine: boolean;
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  reviews: Review[];
}

export type ReportType = "Concern" | "Lost Item" | "Other";
export type ReportStatus = "Open" | "In Progress" | "Resolved";

export interface SupportReport {
  id: number;
  referenceNumber: string;
  type: ReportType;
  name: string;
  email: string;
  phone?: string | null;
  visitDate?: string | null;
  itemDescription?: string | null;
  message: string;
  status: ReportStatus;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface PaymentInfo {
  businessName: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  scanToPayUrlTemplate?: string | null;
}

export interface StylistAdmin extends Stylist {
  email: string;
  phoneNumber?: string | null;
  loginEmail?: string | null;
}

export interface SaveService {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  category: string;
  discountPercent?: number | null;
  discountEndsOn?: string | null;
  isActive: boolean;
}

export interface SaveCafeItem {
  name: string;
  description?: string;
  price: number;
  category: string;
  discountPercent?: number | null;
  discountEndsOn?: string | null;
  isActive: boolean;
  isOutOfStock: boolean;
}

export interface DayHours {
  date: string;
  isOpen: boolean;
  opens?: string | null;
  closes?: string | null;
  isSpecial: boolean;
  note?: string | null;
}

export interface SpecialDay {
  id: number;
  date: string;
  isClosed: boolean;
  opens?: string | null;
  closes?: string | null;
  note?: string | null;
}

export interface StaffClient {
  name: string;
  email: string;
  phone?: string | null;
  totalBookings: number;
  completedVisits: number;
  noShows: number;
  lastVisit?: string | null;
  nextAppointment?: string | null;
  totalSpent: number;
  bookings: Booking[];
}
