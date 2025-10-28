import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  qty: { type: Number, required: true },
  price: { type: Number, required: true },
});

const locSchema = new mongoose.Schema(
  {
    lat: Number,
    lon: Number,
    ts: { type: Date, default: Date.now },
    status: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema({
  orderCode: {
    type: String,
    unique: true,
    default: () => "OD" + Date.now().toString(36).toUpperCase().slice(-8),
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
  items: [itemSchema],
  total: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ["COD", "MOMO", "VNPAY"],
    default: "COD",
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid", "refunded"],
    default: "unpaid",
  },
  status: {
    type: String,
    enum: [
      "pending",
      "confirmed",
      "processing",
      "shipping",
      "delivered",
      "cancelled",
    ],
    default: "pending",
  },
  address: String,
  note: String,
  start: {
    // pickup point (shop) or origin
    address: String,
    lat: Number,
    lon: Number,
  },
  end: {
    // delivery point (customer)
    address: String,
    lat: Number,
    lon: Number,
  },
  route: { type: Object, default: null }, // GeoJSON route if computed
  tracking: [locSchema], // array of {lat,lon,ts,status}
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("Order", orderSchema);
