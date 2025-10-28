import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    shopName: String,
    logo: String,
    address: String,
    phone: String,
    website: String,
    businessLicenseUrl: String,
    description: String,
    rating: { type: Number, default: 0 },
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
  shop: { type: shopSchema, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
