// controllers/authController.js
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import SellerRequest from "../models/SellerRequest.js";
import User from "../models/User.js";
import { getNextId } from "../utils/getNextId.js";

dotenv.config();

// JWT
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const ACCESS_EXPIRES = process.env.JWT_EXPIRES || "1d";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

/* ========================================================================
   REGISTER
======================================================================== */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });

    const existing = await User.findOne({ email });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Email already used" });

    const hashed = await bcrypt.hash(password, 12);
    const id = await getNextId(User);

    const user = await User.create({
      id,
      name,
      email,
      password: hashed,
    });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_EXPIRES }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shipperApproved: user.shipperApproved,
        favorites: user.favorites || [],
      },
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================================================================
   LOGIN
======================================================================== */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    // Admin login
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
        favorites: [],
      };

      const token = jwt.sign(
        { userId: adminUser._id, email: adminUser.email, role: "admin" },
        JWT_SECRET,
        { expiresIn: ACCESS_EXPIRES }
      );

      return res.status(200).json({
        success: true,
        message: "Đăng nhập admin thành công",
        token,
        user: adminUser,
      });
    }

    // Check email tồn tại
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({
        success: false,
        field: "email",
        message: "Email không tồn tại",
      });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, field: "password", message: "Sai mật khẩu" });

    // Token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_EXPIRES }
    );

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sellerApproved: user.sellerApproved,
        shipperApproved: user.shipperApproved,
        favorites: user.favorites || [],
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================================================================
   GOOGLE LOGIN
======================================================================== */
const googleLogin = async (req, res) => {
  try {
    const { tokenId } = req.body;
    if (!tokenId)
      return res
        .status(400)
        .json({ success: false, message: "TokenId missing" });

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload)
      return res
        .status(400)
        .json({ success: false, message: "Invalid Google token" });

    const { email, name, picture } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      const id = await getNextId(User);
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = await User.create({
        id,
        name,
        email,
        avatar: picture,
        password: randomPassword,
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_EXPIRES }
    );

    return res.status(200).json({
      success: true,
      message: "Login Google thành công",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        sellerApproved: user.sellerApproved,
        shipperApproved: user.shipperApproved,
        favorites: user.favorites || [],
      },
    });
  } catch (err) {
    console.error("googleLogin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================================================================
   REFRESH TOKEN
======================================================================== */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res
        .status(400)
        .json({ success: false, message: "Missing refresh token" });

    jwt.verify(refreshToken, JWT_SECRET, async (err, decoded) => {
      if (err)
        return res
          .status(403)
          .json({ success: false, message: "Invalid refresh token" });

      const user = await User.findById(decoded.userId);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      const newAccessToken = jwt.sign(
        { userId: user._id.toString(), email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.json({ success: true, accessToken: newAccessToken });
    });
  } catch (error) {
    console.error("refreshToken error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================================================================
   GET PROFILE
======================================================================== */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });

    const user = await User.findById(userId).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.status(200).json(user);
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================================================================
   UPDATE PROFILE
======================================================================== */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, avatar, phone, address, shop, addresses } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    // Handle addresses array
    if (addresses && Array.isArray(addresses)) {
      user.addresses = addresses.map((addr) => ({
        id: addr.id,
        name: addr.name,
        phone: addr.phone,
        province: addr.province,
        district: addr.district,
        ward: addr.ward,
        detail: addr.detail,
        lat: addr.lat,
        lng: addr.lng,
        pinnedLocation: addr.pinnedLocation
          ? {
              lat: addr.pinnedLocation.lat ?? null,
              lng: addr.pinnedLocation.lng ?? null,
              pinnedAt: addr.pinnedLocation.pinnedAt
                ? new Date(addr.pinnedLocation.pinnedAt)
                : new Date(),
            }
          : { lat: null, lng: null, pinnedAt: null },
        type: addr.type || "home",
        isDefault: addr.isDefault || false,
        createdAt: addr.createdAt || new Date(),
      }));
    }

    if (shop) {
      user.shop = {
        shopName: shop.shopName || user.shop?.shopName,
        logo: shop.logo || user.shop?.logo,
        address: shop.address || user.shop?.address,
        phone: shop.phone || user.shop?.phone,
        website: shop.website || user.shop?.website,
        description: shop.description || user.shop?.description,
      };
    }

    await user.save();
    // Notify user about profile/address update
    try {
      const Notification = (await import("../models/Notification.js")).default;
      const notif = new Notification({
        userId: user._id,
        title: "Cập nhật thông tin",
        message: "Thông tin cá nhân của bạn đã được cập nhật",
        type: "profile",
        read: false,
      });
      await notif.save();

      try {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();
        if (io) io.to(user._id.toString()).emit("notification:new", notif);
      } catch (emitErr) {
        console.warn("Failed to emit profile update notification:", emitErr);
      }
    } catch (nErr) {
      console.warn("Failed to create profile update notification:", nErr);
    }

    return res
      .status(200)
      .json({ success: true, message: "Cập nhật thành công", user });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================================================================
   CHANGE PASSWORD
======================================================================== */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu mật khẩu" });

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Mật khẩu cũ không đúng" });

    const hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================================================================
   REQUEST SELLER
======================================================================== */
const requestSeller = async (req, res) => {
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
      return res
        .status(400)
        .json({ success: false, message: "shopName và logo required" });

    const existing = await SellerRequest.findOne({ userId, status: "pending" });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Bạn đã có yêu cầu chờ duyệt" });

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

    return res.json({
      success: true,
      message: "Gửi yêu cầu thành công",
      request: sr,
    });
  } catch (err) {
    console.error("requestSeller error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ========================================================================
   EXPORT ALL
======================================================================== */
export {
  changePassword,
  getProfile,
  googleLogin,
  login,
  refreshToken,
  register,
  requestSeller,
  updateProfile,
};
