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
    console.log("✅ Connected to DB for seeding...");

    // clear old data
    await User.deleteMany({});
    await SellerRequest.deleteMany({});
    await Product.deleteMany({});

    const hashed = await bcrypt.hash("123456", 10);

    // admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPass = process.env.ADMIN_PASSWORD || "admin123";
    const admin = await User.create({
      name: "Admin",
      email: adminEmail,
      password: await bcrypt.hash(adminPass, 10),
      role: "admin",
    });

    // user
    const user = await User.create({
      name: "Khách hàng",
      email: "user@example.com",
      password: hashed,
      role: "user",
    });

    // pending seller
    const sellerUser = await User.create({
      name: "Người bán A",
      email: "seller_pending@example.com",
      password: hashed,
      role: "user",
      sellerApproved: false,
    });

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

    // approved seller
    const sellerApproved = await User.create({
      name: "Seller B",
      email: "seller@example.com",
      password: hashed,
      role: "seller",
      sellerApproved: true,
      shop: {
        shopName: "Seller B Shop",
        logo: "https://via.placeholder.com/200",
        address: "TP.HCM",
      },
    });

    // multiple sample products
    const products = [
      {
        title: "Laptop X Pro",
        description: "Intel Core i7, 16GB RAM, SSD 512GB, màn 15.6 inch",
        price: 19990000,
        stock: 15,
        images: ["https://via.placeholder.com/600x400?text=Laptop+X+Pro"],
        categories: ["Laptop", "Công nghệ"],
      },
      {
        title: "MacBook Air M2 2023",
        description: "Chip Apple M2, RAM 8GB, SSD 256GB",
        price: 28990000,
        stock: 10,
        images: ["https://via.placeholder.com/600x400?text=MacBook+Air+M2"],
        categories: ["Laptop", "Apple"],
      },
      {
        title: "iPhone 15 Pro Max",
        description: "Chip A17 Pro, RAM 8GB, bộ nhớ 256GB",
        price: 33990000,
        stock: 20,
        images: ["https://via.placeholder.com/600x400?text=iPhone+15+Pro+Max"],
        categories: ["Điện thoại", "Apple"],
      },
      {
        title: "Samsung Galaxy S24 Ultra",
        description: "Snapdragon 8 Gen 3, màn hình AMOLED 6.8 inch",
        price: 29990000,
        stock: 18,
        images: ["https://via.placeholder.com/600x400?text=Galaxy+S24+Ultra"],
        categories: ["Điện thoại", "Samsung"],
      },
      {
        title: "Tai nghe Bluetooth Sony WH-1000XM5",
        description: "Chống ồn chủ động, pin 30h, sạc nhanh",
        price: 8990000,
        stock: 25,
        images: ["https://via.placeholder.com/600x400?text=Sony+XM5"],
        categories: ["Phụ kiện", "Âm thanh"],
      },
      {
        title: "Đồng hồ thông minh Apple Watch Series 9",
        description: "Màn hình Retina, chống nước, pin 18h",
        price: 11990000,
        stock: 30,
        images: ["https://via.placeholder.com/600x400?text=Apple+Watch+9"],
        categories: ["Đồng hồ", "Apple"],
      },
      {
        title: "Chuột Logitech MX Master 3S",
        description: "Chuột không dây cao cấp, cảm biến 8K DPI",
        price: 2490000,
        stock: 40,
        images: [
          "https://via.placeholder.com/600x400?text=Logitech+MX+Master+3S",
        ],
        categories: ["Phụ kiện", "Thiết bị văn phòng"],
      },
      {
        title: "Bàn phím cơ Keychron K6",
        description: "Switch Gateron Red, hỗ trợ Bluetooth & USB-C",
        price: 2190000,
        stock: 35,
        images: ["https://via.placeholder.com/600x400?text=Keychron+K6"],
        categories: ["Phụ kiện", "Bàn phím"],
      },
      {
        title: "Màn hình LG UltraWide 34 inch",
        description: "Độ phân giải 2K, tỉ lệ 21:9, tần số quét 75Hz",
        price: 9990000,
        stock: 12,
        images: ["https://via.placeholder.com/600x400?text=LG+UltraWide+34"],
        categories: ["Màn hình", "Công nghệ"],
      },
      {
        title: "Ổ cứng SSD Samsung 980 Pro 1TB",
        description: "Chuẩn NVMe PCIe 4.0, tốc độ đọc 7000MB/s",
        price: 3790000,
        stock: 50,
        images: [
          "https://via.placeholder.com/600x400?text=Samsung+980+Pro+1TB",
        ],
        categories: ["Phụ kiện", "Lưu trữ"],
      },
      {
        title: "Máy in Canon LBP2900",
        description: "Máy in laser trắng đen, tốc độ 12 trang/phút",
        price: 3290000,
        stock: 8,
        images: ["https://via.placeholder.com/600x400?text=Canon+LBP2900"],
        categories: ["Thiết bị văn phòng", "Máy in"],
      },
      {
        title: "Loa Bluetooth JBL Flip 6",
        description: "Âm thanh sống động, chống nước IP67, pin 12h",
        price: 2990000,
        stock: 27,
        images: ["https://via.placeholder.com/600x400?text=JBL+Flip+6"],
        categories: ["Âm thanh", "Phụ kiện"],
      },
    ];

    // add sellerId for all products
    const productsWithSeller = products.map((p) => ({
      ...p,
      sellerId: sellerApproved._id,
    }));

    await Product.insertMany(productsWithSeller);

    console.log("🌱 Seed finished successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
};

run();
