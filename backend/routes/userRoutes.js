import express from "express";
import User from "../models/User.js";
import { getNextId } from "../utils/getNextId.js";

import {
  addFavoriteProduct,
  changePassword,
  getFavoriteProducts,
  getProfile,
  removeFavoriteProduct,
  updateProfile,
} from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();

// ✅ Lấy thông tin user
router.get("/profile", verifyToken, getProfile);

// ✅ Cập nhật thông tin cá nhân
router.put("/profile", verifyToken, updateProfile);

// ✅ Đổi mật khẩu
router.put("/profile/password", verifyToken, changePassword);

// ✅ Wishlist / favorites
router.get("/favorites", verifyToken, getFavoriteProducts);
router.post("/favorites/:productId", verifyToken, addFavoriteProduct);
router.delete("/favorites/:productId", verifyToken, removeFavoriteProduct);
// list users (admin could guard later)
const listUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 20);
    const q = req.query.q;
    const filter = q
      ? { $or: [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }] }
      : {};

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ id: 1 })
      .select("-password")
      .lean();

    res.json({ data: users, page, limit, total });
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ message: err.message });
  }
};

router.get("/", listUsers);
router.get("/users", listUsers);

const getUserById = async (req, res) => {
  try {
    const param = req.params.id;
    const user = isNaN(param)
      ? await User.findById(param).select("-password")
      : await User.findOne({ id: Number(param) }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.get("/users/:id", getUserById);
router.get("/:id", getUserById);

router.post("/", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.name)
      return res.status(400).json({ message: "name required" });
    payload.id = payload.id || (await getNextId(User));
    const created = await User.create(payload);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const filter = isNaN(param) ? { _id: param } : { id: Number(param) };
    const updated = await User.findOneAndUpdate(filter, req.body, {
      new: true,
    }).select("-password");
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const filter = isNaN(param) ? { _id: param } : { id: Number(param) };
    const removed = await User.findOneAndDelete(filter);
    if (!removed) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
