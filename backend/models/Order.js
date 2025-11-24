import mongoose from "mongoose";

const orderProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  title: String,
  quantity: Number,
  price: Number,
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const trackingSchema = new mongoose.Schema({
  lat: Number,
  lon: Number,
  status: {
    type: String,
    enum: [
      "pending",
      "ready_for_pickup",
      "picked_up",
      "delivering",
      "delivered",
      "failed",
      "returned",
      "cancelled",
      "location",
    ],
    default: "pending",
  },
  ts: { type: Date, default: Date.now },
});

const shippingTimelineSchema = new mongoose.Schema(
  {
    code: String,
    label: String,
    note: String,
    at: { type: Date, default: Date.now },
    source: { type: String, default: "system" },
    clientRequestId: String,
    offline: { type: Boolean, default: false },
    location: {
      lat: Number,
      lng: Number,
      accuracy: Number,
    },
  },
  { _id: false }
);

const shipperSnapshotSchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    phone: String,
    vehicleType: String,
    licensePlate: String,
  },
  { _id: false }
);

// Explicit subdocument schema for shipping address to avoid accidental
// casting to primitive types. Use _id: false to avoid creating a nested _id.
const addressSchema = new mongoose.Schema(
  {
    name: String, // recipient name
    phone: String,
    province: String,
    district: String,
    ward: String,
    detail: String, // specific address
    lat: Number,
    lng: Number,
    type: String, // home or office
  },
  { _id: false }
);

// Bank account schema for seller payment
const bankAccountSchema = new mongoose.Schema(
  {
    bankName: String,
    accountNumber: String,
    accountHolder: String,
    branch: String,
  },
  { _id: false }
);

const payosTransactionSchema = new mongoose.Schema(
  {
    reference: String,
    amount: Number,
    description: String,
    transactionDateTime: String,
    accountNumber: String,
    counterAccountBankId: String,
    counterAccountBankName: String,
    counterAccountName: String,
    counterAccountNumber: String,
  },
  { _id: false }
);

const payosPaymentSchema = new mongoose.Schema(
  {
    orderCode: Number,
    paymentLinkId: String,
    checkoutUrl: String,
    qrCode: String,
    status: String,
    amount: Number,
    amountPaid: Number,
    amountRemaining: Number,
    expiredAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    transactions: [payosTransactionSchema],
    lastSyncedAt: Date,
    lastWebhookAt: Date,
    lastNotificationStatus: String,
    raw: { type: Object, default: {} },
    webhookPayload: { type: Object, default: {} },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shipperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    shipperSnapshot: { type: shipperSnapshotSchema, default: null },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
    products: [orderProductSchema],
    totalAmount: Number,
    status: {
      type: String,
      enum: [
        "pending",
        "payment_pending",
        "processing",
        "shipping",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
    tracking: [trackingSchema],
    fullName: String,
    email: String,
    address: String,
    // Detailed shipping address from address dropdown
    shippingAddress: addressSchema,
    shippingMethod: {
      type: String,
      enum: ["standard", "express", "rush"],
      default: "standard",
    },
    shippingStatus: {
      type: String,
      enum: [
        "unassigned",
        "assigned",
        "pickup_pending",
        "picked_up",
        "delivering",
        "delivered",
        "failed",
        "returned",
      ],
      default: "unassigned",
    },
    shippingTimeline: { type: [shippingTimelineSchema], default: [] },
    shippingLocation: {
      lat: Number,
      lng: Number,
      accuracy: Number,
      updatedAt: Date,
    },
    shippingFee: { type: Number, default: 0 },
    shippingScope: {
      type: String,
      enum: [
        "standard",
        "in_province",
        "out_of_province",
        "distance",
        "unknown",
      ],
      default: "standard",
    },
    shippingDistanceKm: { type: Number, default: null },
    shippingMeta: { type: Object, default: {} },
    shippingUpdatedAt: { type: Date, default: null },
    shippingSyncedAt: { type: Date, default: null },
    // Seller's bank account for payment reference
    sellerBankAccount: bankAccountSchema,
    paymentInfo: {
      transactionNo: String,
      responseCode: String,
      vnp_TxnRef: String,
      secureHash: String,
      raw: { type: Object, default: {} },
    },
    paymentMethod: {
      type: String,
      enum: ["banking", "momo", "cod", "qr", "payos", "vnpay"],
      default: "banking",
    },
    payosPayment: payosPaymentSchema,
    payosRetryCount: { type: Number, default: 0 },
    paymentDeadline: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    paymentExpired: { type: Boolean, default: false },
    // Voucher applied to this order (optional)
    voucherCode: String,
    voucherDiscount: { type: Number, default: 0 },
  },
  {
    timestamps: true, // Auto-add createdAt and updatedAt
  }
);

orderSchema.index({ shipperId: 1, shippingStatus: 1 });
orderSchema.index({ shipperId: 1, updatedAt: -1 });

export default mongoose.model("Order", orderSchema);
