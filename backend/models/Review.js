import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true, // ensure only purchased users can review
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    default: "",
  },
  comment: {
    type: String,
    default: "",
  },
  images: [String], // review images
  helpful: {
    type: Number,
    default: 0, // count of helpful votes
  },
  sellerReply: {
    type: String,
    default: "",
  },
  sellerReplyAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved", // auto-approve for now
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
ReviewSchema.index({ productId: 1, userId: 1, orderId: 1 }, { unique: true }); // one review per user per product
ReviewSchema.index({ productId: 1, status: 1 });
ReviewSchema.index({ createdAt: -1 });

export default mongoose.model("Review", ReviewSchema);
