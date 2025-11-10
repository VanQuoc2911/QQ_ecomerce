// src/types/Order.ts

/** ======================== Item trong giỏ hàng / order ======================== */
export interface OrderItem {
  productId: {
    _id: string;
    title: string;
    price: number;
    images: string[];
  };
  quantity: number;
  price: number; // giá tại thời điểm mua
}

/** ======================== Dữ liệu gửi từ trang checkout lên API ======================== */
export interface CheckoutOrder {
  userId?: string; // optional nếu khách chưa đăng nhập
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentMethod: "card" | "cod" | "qr";
  items: OrderItem[];
  total: number;
}

/** ======================== Dữ liệu order trả về từ API ======================== */
export interface Order extends CheckoutOrder {
  _id: string;          // required
  status?: string;       // required
  createdAt: string;    // required
  updatedAt?: string;    // required
}

/** ======================== Response API list order ======================== */
export interface OrderResponse {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** ======================== Tracking đơn hàng ======================== */
export interface Tracking {
  status: string;
  location: string;
  note: string;
  timestamp: string; // ISO string
  coordinates: { lat: number; lng: number };
}

/** ======================== Thông tin thanh toán ======================== */
export interface PaymentInfo {
  method: string;
  status: string;
  transactionId: string;
  amount: number;
  currency: string;
  timestamp: string;
}

/** ======================== Thông tin vận chuyển ======================== */
export interface ShipperInfo {
  shipperId: number;
  shipperName: string;
  phone: string;
  assignedAt: string;
}

export interface ShippingInfo {
  fullName: string;
  phone: string;
  address: string;
  ward: string;
  district: string;
  city: string;
  note?: string;
}

/** ======================== Thông tin hóa đơn ======================== */
export interface BillingInfo {
  fullName: string;
  phone: string;
  address: string;
  ward: string;
  district: string;
  city: string;
}

/** ======================== Thông tin khách hàng ======================== */
export interface CustomerInfo {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  ward: string;
  district: string;
  city: string;
}

/** ======================== Thông tin người bán ======================== */
export interface SellerInfo {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  ward: string;
  district: string;
  city: string;
}
