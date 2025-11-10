import mongoose from "mongoose";

const sellerRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  shopName: String,
  logo: String,
  address: String,
  phone: String,
  website: String,
  businessLicenseUrl: String,
  description: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reviewedAt: Date,
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewNote: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("SellerRequest", sellerRequestSchema);
