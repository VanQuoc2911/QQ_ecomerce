// Shared types for Shipper app

export type ID = string;

export interface Address {
  name?: string;
  phone?: string;
  province?: string;
  district?: string;
  ward?: string;
  detail?: string;
  lat?: number;
  lng?: number;
}

export interface TimelineEvent {
  code: string;
  label?: string;
  note?: string;
  at?: string | Date;
  source?: string;
  clientRequestId?: string | null;
  offline?: boolean;
  location?: { lat: number; lng: number; accuracy?: number } | null;
}

export interface OrderProduct {
  productId?: ID;
  title?: string;
  quantity?: number;
  price?: number;
  sellerId?: ID;
}

export interface UserReference {
  _id?: ID;
  id?: ID;
  name?: string;
  phone?: string;
  email?: string;
}

export interface ShipperSnapshot {
  id?: ID;
  name?: string;
  phone?: string;
  vehicleType?: string;
  licensePlate?: string;
}

export interface Order {
  _id: ID;
  totalAmount?: number;
  shippingStatus?: string;
  shippingMethod?: string;
  shippingAddress?: Address;
  shippingTimeline?: TimelineEvent[];
  shippingLocation?: { lat?: number; lng?: number; accuracy?: number; updatedAt?: string };
  shippingFee?: number;
  serviceFee?: number;
  serviceFeePercent?: number;
  shippingScope?: string;
  shippingDistanceKm?: number | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  address?: string;
  fullName?: string;
  shipperId?: ID;
  shipperSnapshot?: ShipperSnapshot | null;
  products?: OrderProduct[];
  sellerId?: ID | UserReference;
  userId?: ID | UserReference;
  paymentMethod?: string;
  paymentInfo?: Record<string, unknown> | null;
  voucherCode?: string;
  voucherDiscount?: number;
  sellerBankAccount?: Record<string, unknown> | null;
  shippingTimelineNote?: string;
}

export interface ShippingEventPayload {
  orderId?: ID;
  shippingStatus?: string;
  timelineEvent?: TimelineEvent;
  shipperId?: ID | null;
  order?: Partial<Order> | null;
}

export interface OperationArea {
  province?: string;
  district?: string;
  ward?: string;
  description?: string;
}

export interface PersonalInfo {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface ContactInfo {
  fullName?: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  address?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  [key: string]: unknown;
}

export interface VehicleInfo {
  vehicleType?: string;
  licensePlate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licenseNumber?: string;
  brand?: string;
  color?: string;
  photos?: string[];
  [key: string]: unknown;
}

export interface DocumentBundle {
  portraitUrl?: string;
  nationalIdFrontUrl?: string;
  nationalIdBackUrl?: string;
  driverLicenseUrl?: string;
  vehicleRegistrationUrl?: string;
  [key: string]: string | undefined;
}

export interface TrainingInfo {
  completed?: boolean;
  courseId?: string;
}

export interface ReviewInfo {
  note?: string;
  reviewer?: string;
  status?: string;
}

export interface ShipperApplication {
  _id?: ID;
  personalInfo?: PersonalInfo;
  contactInfo?: ContactInfo;
  vehicleInfo?: VehicleInfo;
  operationAreas?: OperationArea[];
  documents?: DocumentBundle;
  training?: TrainingInfo;
  review?: ReviewInfo;
  reviewNote?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ShipperSummary {
  active?: number;
  deliveredToday?: number;
  totalIncome?: number;
  incomeToday?: number;
  [key: string]: unknown;
}

export type OfflineUpdate = {
  id?: string;
  type: 'status' | 'checkpoint';
  orderId: string;
  status?: string;
  note?: string;
  location?: { lat: number; lng: number; accuracy?: number };
  clientRequestId?: string;
  occurredAt?: string;
};

export type StatusPayload = {
  status: string;
  note?: string;
  location?: { lat: number; lng: number; accuracy?: number } | null;
  clientRequestId?: string;
  occurredAt?: string;
  offline?: boolean;
};

export type CheckpointPayload = {
  location: { lat: number; lng: number; accuracy?: number };
  note?: string;
  clientRequestId?: string;
  occurredAt?: string;
  offline?: boolean;
};
