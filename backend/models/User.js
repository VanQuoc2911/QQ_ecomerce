import mongoose from "mongoose";

const shopSubSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
    shopName: String,
    logo: String,
    address: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["user", "seller", "shipper", "admin", "system"],
    default: "user",
  },
  phone: String,
  address: String,
  avatar: String,
  sellerApproved: { type: Boolean, default: false },
  // personal embedded shop summary (optional)
  shop: { type: shopSubSchema, default: null },
  // If seller can own multiple shops:
  shopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
