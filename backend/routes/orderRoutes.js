import express from "express";
import {
  assignShipper,
  createOrder,
  getOrder,
  listOrders,
  updateStatus,
} from "../controllers/orderController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, roleGuard(["user"]), createOrder);
router.get("/", verifyToken, listOrders);
router.get("/my-orders", verifyToken, roleGuard(["user"]), listOrders);
router.get("/:id", verifyToken, getOrder);
router.put(
  "/:id/assign-shipper",
  verifyToken,
  roleGuard(["seller", "admin"]),
  assignShipper
);
router.put(
  "/:id/status",
  verifyToken,
  roleGuard(["shipper", "seller", "admin", "system", "user"]),
  updateStatus
);
// GET /api/orders/:id/tracking
router.get("/:id/tracking", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id).populate("shipperId", "name");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // permission: allow user/seller/admin/system/shipper accordingly...
    res.json({
      orderId: order._id,
      orderCode: order.orderCode,
      shipper: order.shipperId,
      start: order.start,
      end: order.end,
      route: order.route,
      tracking: order.tracking,
      status: order.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
