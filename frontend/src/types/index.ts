export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
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
  stylistId: number;
  bookingDateTime: string;
  status: string;
  paymentReference: string;
  isPaid: boolean;
  notes?: string;
}

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
  items: {
    cafeItemId: number;
    quantity: number;
  }[];
  notes?: string;
}
