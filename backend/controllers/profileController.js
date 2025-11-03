import bcrypt from "bcryptjs";
import User from "../models/User.js";
import cloudinary from "../utils/cloudinary.js";

// GET profile của user đang đăng nhập
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("getProfile error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE profile (name, phone, address, avatar)
export const updateProfile = async (req, res) => {
  try {
    const updates = {};
    const { name, phone, address } = req.body;

    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;

    // avatar có thể là base64 hoặc URL
    if (req.body.avatar) {
      const uploadRes = await cloudinary.uploader.upload(req.body.avatar, {
        folder: "avatars",
      });
      updates.avatar = uploadRes.secure_url;
    }

    const updated = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    }).select("-password");

    res.json({ message: "Profile updated", user: updated });
  } catch (err) {
    console.error("updateProfile error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CHANGE password
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "Missing password fields" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match)
      return res.status(400).json({ message: "Old password incorrect" });

    const hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- Admin only -------------------

// GET list users với paging & search
export const listUsers = async (req, res) => {
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
      .select("-password");
    res.json({ data: users, page, limit, total });
  } catch (err) {
    console.error("listUsers error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET user by id
export const getUserById = async (req, res) => {
  try {
    const param = req.params.id;
    const user = isNaN(param)
      ? await User.findById(param).select("-password")
      : await User.findOne({ id: Number(param) }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("getUserById error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE user (admin)
export const updateUser = async (req, res) => {
  try {
    const param = req.params.id;
    const filter = isNaN(param) ? { _id: param } : { id: Number(param) };
    const updates = req.body;

    // hash password nếu có
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 12);
    }

    const updated = await User.findOneAndUpdate(filter, updates, {
      new: true,
    }).select("-password");
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated", user: updated });
  } catch (err) {
    console.error("updateUser error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE user
export const deleteUser = async (req, res) => {
  try {
    const param = req.params.id;
    const filter = isNaN(param) ? { _id: param } : { id: Number(param) };
    const removed = await User.findOneAndDelete(filter);
    if (!removed) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error", err);
    res.status(500).json({ message: "Server error" });
  }
};
