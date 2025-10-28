import mongoose from "mongoose";

const sellerReqSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  shopName: { type: String, required: true },
  logo: String, // cloudinary url
  address: String,
  phone: String,
  website: String,
  businessLicenseUrl: String, // cloudinary url
  description: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin or system
  reviewNote: String,
});

export default mongoose.model("SellerRequest", sellerReqSchema);
