import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import SellerRequest from "../models/SellerRequest.js";
import User from "../models/User.js";
dotenv.config();

const MONGO = process.env.MONGO_URI;

const run = async () => {
  try {
    await mongoose.connect(MONGO);
    console.log("Connected to DB for seeding");

    // clear minimal
    await User.deleteMany({});
    await SellerRequest.deleteMany({});
    await Product.deleteMany({});

    const hashed = await bcrypt.hash("123456", 10);

    // create admin as fixed account (but admin override also in .env)
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPass = process.env.ADMIN_PASSWORD || "admin123";
    const admin = await User.create({
      name: "Admin",
      email: adminEmail,
      password: await bcrypt.hash(adminPass, 10),
      role: "admin",
    });

    // create sample user
    const user = await User.create({
      name: "Khách hàng",
      email: "user@example.com",
      password: hashed,
      role: "user",
    });

    // create a sample seller (not approved)
    const sellerUser = await User.create({
      name: "Người bán A",
      email: "seller_pending@example.com",
      password: hashed,
      role: "user",
      sellerApproved: false,
    });

    // create a pending seller request for sellerUser
    await SellerRequest.create({
      userId: sellerUser._id,
      shopName: "Seller Shop A",
      logo: "https://via.placeholder.com/200x200?text=Shop+A",
      address: "Hà Nội",
      phone: "0123456789",
      businessLicenseUrl: "",
      description: "Shop test sample",
      status: "pending",
    });

    // create approved seller
    const sellerApproved = await User.create({
      name: "Seller B",
      email: "seller@example.com",
      password: hashed,
      role: "seller",
      sellerApproved: true,
      shop: {
        shopName: "Seller B Shop",
        logo: "https://via.placeholder.com/200",
        address: "HCM",
      },
    });

    // sample products from sellerApproved
    await Product.create({
      title: "Laptop X Pro",
      description: "i7, 16GB RAM",
      price: 19990000,
      stock: 15,
      images: ["https://via.placeholder.com/600x400?text=Laptop+X"],
      sellerId: sellerApproved._id,
      categories: ["Laptop"],
    });

    console.log("Seed finished");
    process.exit(0);
  } catch (err) {
    console.error("Seed error", err);
    process.exit(1);
  }
};

run();
