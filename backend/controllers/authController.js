import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import SellerRequest from "../models/SellerRequest.js";
import User from "../models/User.js";
import { getNextId } from "../utils/getNextId.js";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const ACCESS_EXPIRES = process.env.JWT_EXPIRES || "1d";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already used" });
    const hashed = await bcrypt.hash(password, 12);
    const id = await getNextId(User);
    const user = await User.create({ id, name, email, password: hashed });
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_EXPIRES }
    );
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("register error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // admin override
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (
      ADMIN_EMAIL &&
      ADMIN_PASSWORD &&
      email === ADMIN_EMAIL &&
      password === ADMIN_PASSWORD
    ) {
      const adminUser = {
        _id: "admin-default-id",
        name: "Admin",
        email: ADMIN_EMAIL,
        role: "admin",
        avatar: "",
      };
      const token = jwt.sign(
        { userId: adminUser._id, email: adminUser.email, role: "admin" },
        JWT_SECRET,
        { expiresIn: ACCESS_EXPIRES }
      );
      return res.json({ token, user: adminUser });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_EXPIRES }
    );
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sellerApproved: user.sellerApproved,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// user requests seller
export const requestSeller = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      shopName,
      logo,
      address,
      phone,
      website,
      businessLicenseUrl,
      description,
    } = req.body;
    if (!shopName || !logo)
      return res.status(400).json({ message: "shopName and logo required" });
    const existing = await SellerRequest.findOne({ userId, status: "pending" });
    if (existing)
      return res
        .status(400)
        .json({ message: "You already have a pending request" });
    const sr = await SellerRequest.create({
      userId,
      shopName,
      logo,
      address,
      phone,
      website,
      businessLicenseUrl,
      description,
    });
    return res.json({ message: "Seller request submitted", request: sr });
  } catch (err) {
    console.error("requestSeller error", err);
    return res.status(500).json({ message: "Server error" });
  }
};
export const getProfile = async (req, res) => {
  try {
    // Giả sử middleware verifyToken đã gắn thông tin user vào req.user
    res.status(200).json(req.user);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin người dùng" });
  }
};
