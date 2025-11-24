import api from "./axios";
import type { PaymentMethod } from "./cartService";

export interface SellerOrder {
  _id: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface OrderProduct {
  productId?: {
    _id?: string;
    title?: string;
    images?: string[];
    price?: number;
  };
  title?: string;
  images?: string[];
  quantity: number;
  price?: number;
  sellerId?: string;
}

export interface OrderDetailResponse {
  _id: string;
  customerName?: string;
  status?: string;
  createdAt?: string;
  userId?: { _id?: string; name?: string; email?: string } | string;
  totalAmount?: number;
  // backend may return different shapes; include both address+city and detailed fields
  shippingAddress?: {
    name?: string;
    phone?: string;
    // simple shape (used by some frontend code)
    address?: string;
    city?: string;
    // detailed shape (backend Order model)
    province?: string;
    district?: string;
    ward?: string;
    detail?: string;
    lat?: number | null;
    lng?: number | null;
    type?: string;
  };
  // Seller's bank account for payment
  sellerBankAccount?: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    branch?: string;
  };
  // some endpoints may return products instead of items
  products?: OrderProduct[];
  items?: OrderProduct[];
  // Payment deadline fields
  paymentDeadline?: string;
  paymentExpired?: boolean;
  remainingTime?: number; // milliseconds
  isExpired?: boolean;
  // Additional optional fields returned by some endpoints
  paymentMethod?: string;
  note?: string;
  customerNote?: string;
}

// API lấy chi tiết đơn hàng
export const orderService = {
  // Seller: list seller's orders
  async getOrders(): Promise<SellerOrder[]> {
    const { data } = await api.get("/api/seller/orders");
    return data;
  },
  // Seller: get order detail
  async getOrderDetail(orderId: string): Promise<OrderDetailResponse> {
    const { data } = await api.get(`/api/orders/${orderId}`);
    return data;
  },
  // Seller: update order status
  async updateOrderStatus(orderId: string, status: string): Promise<{ message: string; order: OrderDetailResponse }> {
    const { data } = await api.patch(`/api/orders/${orderId}/status`, { status });
    return data;
  },
  // User: list user's own orders (requires auth)
  async getUserOrders(): Promise<OrderDetailResponse[]> {
    const { data } = await api.get("/api/orders/user/my-orders");
    return data;
  },
  // User: create VNPay payment URL
  async createVnPayUrl(orderId: string, amount: number, orderInfo?: string): Promise<{ url: string }> {
    const { data } = await api.post("/api/payment/vnpay/create", {
      orderId,
      amount,
      orderInfo: orderInfo || `Thanh toán đơn hàng ${orderId}`,
      locale: "vn",
    });
    return data;
  },
  // Customer: mark order as paid (for banking/momo orders after completing transfer)
  async markAsPaid(orderId: string): Promise<{ message: string; order: OrderDetailResponse }> {
    const { data } = await api.post(`/api/orders/${orderId}/mark-paid`);
    return data;
  },
  // Customer: change payment method for pending order
  async changePaymentMethod(
    orderId: string,
    paymentMethod: PaymentMethod,
    options?: { decision?: "confirm" | "cancel" }
  ): Promise<{ message: string; order: OrderDetailResponse }> {
    const { data } = await api.post(`/api/orders/${orderId}/change-payment-method`, {
      paymentMethod,
      ...(options?.decision ? { decision: options.decision } : {}),
    });
    return data;
  },
  async cancelOrder(orderId: string): Promise<{ message: string; order: OrderDetailResponse }> {
    const { data } = await api.post(`/api/orders/${orderId}/cancel`);
    return data;
  },
};

