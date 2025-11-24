import express from "express";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Get all notifications (own)
router.get("/", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort(
      { createdAt: -1 }
    );
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Create notification (admin only)
router.post("/", verifyToken, roleGuard(["admin"]), async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Mark as read
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Not found" });
    if (notification.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Access denied" });
    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Mark all notifications as read for current user
router.post("/mark-all-read", verifyToken, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, read: { $ne: true } },
      { $set: { read: true } }
    );
    res.json({ modifiedCount: result.modifiedCount || result.nModified || 0 });
  } catch (err) {
    console.error("mark-all-read error", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Delete notification
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Not found" });
    if (
      notification.userId.toString() !== req.user.id &&
      req.user.role !== "admin"
    )
      return res.status(403).json({ message: "Access denied" });
    await notification.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
