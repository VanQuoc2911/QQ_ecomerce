import express from "express";
import User from "../models/User.js";
import { getNextId } from "../utils/getNextId.js";

const router = express.Router();

// GET list with paging & optional q (search name/email)
router.get("/", async (req, res) => {
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
      .sort({ id: 1 });
    res.json({ data: users, page, limit, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET by id (numeric id or _id)
router.get("/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const user = isNaN(param)
      ? await User.findById(param)
      : await User.findOne({ id: Number(param) });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.name)
      return res.status(400).json({ message: "name required" });
    // auto id
    payload.id = payload.id || (await getNextId(User));
    const created = await User.create(payload);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE by id (numeric or _id)
router.put("/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const filter = isNaN(param) ? { _id: param } : { id: Number(param) };
    const updated = await User.findOneAndUpdate(filter, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE
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
