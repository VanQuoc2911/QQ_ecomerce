import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  images: [String],
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  categories: [String],
  variants: { type: Object, default: {} },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Product", productSchema);
