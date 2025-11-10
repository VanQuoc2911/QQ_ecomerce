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
  status: String,
  ts: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  products: [orderProductSchema],
  totalAmount: Number,
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  tracking: [trackingSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Order", orderSchema);
