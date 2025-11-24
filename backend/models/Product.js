import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  images: [String],
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  categories: [String],
  origin: { type: String, default: "Việt Nam" }, // Country of origin
  rating: { type: Number, default: 0, min: 0, max: 5 }, // Average rating 0-5
  reviewCount: { type: Number, default: 0 }, // Number of reviews
  variants: { type: Object, default: {} },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  videos: [String],
  soldCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Product", productSchema);
