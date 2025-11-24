import mongoose from "mongoose";

const shopSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  shopName: { type: String, required: true },
  logo: { type: String, default: "" },
  address: { type: String, default: "" },
  province: { type: String, default: "" }, // Location/province for filtering
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  phone: { type: String, default: "" },
  website: { type: String, default: "" },
  businessLicenseUrl: { type: String, default: "" },
  description: { type: String, default: "" },
  totalRevenue: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  // Bank account for payment
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountHolder: String,
    branch: String,
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Shop", shopSchema);
