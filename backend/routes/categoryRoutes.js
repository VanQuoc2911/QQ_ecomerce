import express from "express";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";
import Category from "../models/Category.js";

const router = express.Router();

// Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Create category (admin only)
router.post("/", verifyToken, roleGuard(["admin"]), async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Update category
router.patch("/:id", verifyToken, roleGuard(["admin"]), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    Object.assign(category, req.body);
    await category.save();
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Delete category
router.delete("/:id", verifyToken, roleGuard(["admin"]), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    await category.deleteOne();
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
