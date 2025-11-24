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
  shipperApproved: { type: Boolean, default: false },
  // personal embedded shop summary (optional)
  shop: { type: shopSubSchema, default: null },
  // If seller can own multiple shops:
  shopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],
  // Saved addresses for shipping/delivery
  addresses: [
    {
      id: String,
      name: String, // recipient name
      phone: String,
      province: String,
      district: String,
      ward: String,
      detail: String, // specific address (street, house number)
      lat: Number,
      lng: Number,
      // pinned GPS coordinates saved separately when user "pins" the map
      pinnedLocation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        pinnedAt: { type: Date, default: null },
      },
      type: { type: String, enum: ["home", "office"], default: "home" },
      isDefault: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  // Bank account for seller payment
  bankAccount: {
    bankName: String, // VCB, TCB, etc.
    accountNumber: String,
    accountHolder: String,
    branch: String,
  },
  // Saved favorite products (wishlist)
  favorites: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
