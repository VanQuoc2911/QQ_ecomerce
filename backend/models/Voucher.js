import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ["amount", "percent"], required: true },
  value: { type: Number, required: true }, // amount in VND or percent value
  maxDiscount: { type: Number, default: null }, // optional cap for percent-based discounts
  minOrderValue: { type: Number, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null = usable by any user
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  }, // voucher created by a seller (applies to that seller's orders)
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null }, // optional shop scope
  targetType: {
    type: String,
    enum: ["all", "category", "product"],
    default: "all",
  },
  targetCategories: { type: [String], default: [] },
  targetProducts: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Product",
    default: [],
  },
  stackable: { type: Boolean, default: false },
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  highlightText: { type: String, default: "" },
  aiImageUrl: { type: String, default: "" },
  aiDescription: { type: String, default: "" },
  freeShipping: { type: Boolean, default: false },
});

export default mongoose.model("Voucher", voucherSchema);
