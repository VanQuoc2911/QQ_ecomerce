export interface Order {
  _id?: string;
  id: number;
  userId: number;
  total: number;
  status: string;
  date: string;

  tracking?: Tracking[];
  address?: string;

  shipperInfo?: ShipperInfo;
  shippingInfo?: ShippingInfo;
  billingInfo?: BillingInfo;
  customerInfo?: CustomerInfo;
  sellerInfo?: SellerInfo;
  items?: Item[];
  sellerId?: number;
  paymentInfo?: PaymentInfo;

  createdAt?: string;
  updatedAt?: string;
}

export interface Tracking {
  status: string;
  location: string;
  note: string;
  timestamp: string; // ✅ backend thường trả string ISO
  coordinates: { lat: number; lng: number };
}

export interface Item {
  productId: number;
  qty: number;
  price: number;
}

export interface PaymentInfo {
  method: string;
  status: string;
  transactionId: string;
  amount: number;
  currency: string;
  timestamp: string;
}

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

export interface BillingInfo {
  fullName: string;
  phone: string;
  address: string;
  ward: string;
  district: string;
  city: string;
}

export interface CustomerInfo {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  ward: string;
  district: string;
  city: string;
}

export interface SellerInfo {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  ward: string;
  district: string;
  city: string;
}

export interface OrderResponse {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
