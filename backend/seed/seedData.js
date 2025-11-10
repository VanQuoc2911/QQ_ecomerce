import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import SellerRequest from "../models/SellerRequest.js";
import Shop from "../models/Shop.js";
import User from "../models/User.js";

dotenv.config();
const MONGO = process.env.MONGO_URI;

const run = async () => {
  try {
    await mongoose.connect(MONGO);
    console.log("✅ Connected to DB for seeding...");

    // Xóa dữ liệu cũ
    await Promise.all([
      User.deleteMany({}),
      SellerRequest.deleteMany({}),
      Product.deleteMany({}),
      Shop.deleteMany({}),
    ]);

    const hashed = await bcrypt.hash("123456", 10);

    // Admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPass = process.env.ADMIN_PASSWORD || "admin123";
    const admin = await User.create({
      name: "Admin",
      email: adminEmail,
      password: await bcrypt.hash(adminPass, 10),
      role: "admin",
    });

    // User thường
    const user = await User.create({
      name: "Khách hàng",
      email: "user@example.com",
      password: hashed,
      role: "user",
    });

    // Seller đang chờ duyệt
    const sellerUser = await User.create({
      name: "Người bán A",
      email: "seller_pending@example.com",
      password: hashed,
      role: "user",
      sellerApproved: false,
    });

    await SellerRequest.create({
      userId: sellerUser._id,
      shopName: "TechZone Shop",
      logo: "https://images.unsplash.com/photo-1580910051073-dbb3f94d6b72",
      address: "Hà Nội",
      phone: "0123456789",
      businessLicenseUrl:
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7",
      description: "Shop chuyên các sản phẩm công nghệ mới nhất",
      status: "pending",
    });

    // Seller đã được duyệt
    const sellerApproved = await User.create({
      name: "Seller B",
      email: "seller@example.com",
      password: hashed,
      role: "seller",
      sellerApproved: true,
    });

    // Tạo Shop cho sellerApproved
    const shop = await Shop.create({
      ownerId: sellerApproved._id,
      shopName: "Seller B Shop",
      logo: "https://images.unsplash.com/photo-1503602642458-232111445657",
      address: "TP.HCM",
      phone: "0987654321",
      website: "https://sellerbshop.vn",
      description: "Shop chuyên đồ công nghệ chính hãng, giá tốt",
      rating: 4.9,
    });

    // Dữ liệu sản phẩm mẫu (ảnh Unsplash sống)
    const products = [
      {
        title: "Laptop X Pro",
        description: "Intel Core i7, 16GB RAM, SSD 512GB, màn 15.6 inch",
        price: 19990000,
        stock: 15,
        images: [
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
        ],
        categories: ["Laptop", "Công nghệ"],
      },
      {
        title: "MacBook Air M2 2023",
        description: "Chip Apple M2, RAM 8GB, SSD 256GB",
        price: 28990000,
        stock: 10,
        images: [
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
        ],
        categories: ["Laptop", "Apple"],
      },
      {
        title: "iPhone 15 Pro Max",
        description: "Chip A17 Pro, RAM 8GB, bộ nhớ 256GB",
        price: 33990000,
        stock: 20,
        images: [
          "https://images.unsplash.com/photo-1695048137742-ecb6b7e6e6b5",
        ],
        categories: ["Điện thoại", "Apple"],
      },
      {
        title: "Samsung Galaxy S24 Ultra",
        description: "Snapdragon 8 Gen 3, màn hình AMOLED 6.8 inch",
        price: 29990000,
        stock: 18,
        images: [
          "https://images.unsplash.com/photo-1615473865781-2f6d0dbf73d7",
        ],
        categories: ["Điện thoại", "Samsung"],
      },
      {
        title: "Tai nghe Bluetooth Sony WH-1000XM5",
        description: "Chống ồn chủ động, pin 30h, sạc nhanh",
        price: 8990000,
        stock: 25,
        images: [
          "https://images.unsplash.com/photo-1614680376408-81e91ffe3b71",
        ],
        categories: ["Phụ kiện", "Âm thanh"],
      },
      {
        title: "Đồng hồ thông minh Apple Watch Series 9",
        description: "Màn hình Retina, chống nước, pin 18h",
        price: 11990000,
        stock: 30,
        images: [
          "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7",
        ],
        categories: ["Đồng hồ", "Apple"],
      },
      {
        title: "Chuột Logitech MX Master 3S",
        description: "Chuột không dây cao cấp, cảm biến 8K DPI",
        price: 2490000,
        stock: 40,
        images: [
          "https://images.unsplash.com/photo-1585386959984-a41552231693",
        ],
        categories: ["Phụ kiện", "Thiết bị văn phòng"],
      },
      {
        title: "Bàn phím cơ Keychron K6",
        description: "Switch Gateron Red, hỗ trợ Bluetooth & USB-C",
        price: 2190000,
        stock: 35,
        images: [
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3",
        ],
        categories: ["Phụ kiện", "Bàn phím"],
      },
      {
        title: "Màn hình LG UltraWide 34 inch",
        description: "Độ phân giải 2K, tỉ lệ 21:9, tần số quét 75Hz",
        price: 9990000,
        stock: 12,
        images: [
          "https://images.unsplash.com/photo-1587202372775-98927d28c25c",
        ],
        categories: ["Màn hình", "Công nghệ"],
      },
      {
        title: "Loa Bluetooth JBL Flip 6",
        description: "Âm thanh sống động, chống nước IP67, pin 12h",
        price: 2990000,
        stock: 27,
        images: [
          "https://images.unsplash.com/photo-1583225272824-2af47e62db39",
        ],
        categories: ["Âm thanh", "Phụ kiện"],
      },
    ];

    // Gắn sellerId & shopId cho sản phẩm
    const productsWithSeller = products.map((p) => ({
      ...p,
      sellerId: sellerApproved._id,
      shopId: shop._id,
      status: "approved",
    }));

    await Product.insertMany(productsWithSeller);

    console.log("🌱 Seed finished successfully with Unsplash images!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
};

run();
