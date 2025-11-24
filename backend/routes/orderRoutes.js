import express from "express";
import {
  assignShipper,
  cancelOrder,
  changePaymentMethod,
  confirmPayment,
  createOrder,
  getOrderDetail,
  getSellerOrders,
  getUserOrders,
  listOrders,
  markAsPaid,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:orderId/cancel", verifyToken, cancelOrder); // customer cancel order, chuyển về chờ thanh toán

router.post("/", verifyToken, createOrder); // any authenticated user can create
router.get("/seller", verifyToken, roleGuard(["seller"]), getSellerOrders); // MUST come before other routes
router.get("/user/my-orders", verifyToken, getUserOrders); // Customer: get own orders
router.post("/:orderId/mark-paid", verifyToken, markAsPaid); // customer marks they've completed transfer
router.post(
  "/:orderId/change-payment-method",
  verifyToken,
  changePaymentMethod
); // customer switches PayOS/COD when pending
router.patch(
  "/:orderId/status",
  verifyToken,
  roleGuard(["seller"]),
  updateOrderStatus
); // seller update order status
router.post(
  "/:orderId/confirm-payment",
  verifyToken,
  roleGuard(["seller"]),
  confirmPayment
); // seller confirm payment received
router.patch(
  "/:orderId/assign-shipper",
  verifyToken,
  roleGuard(["admin", "seller"]),
  assignShipper
); // admin/seller assign shipper
router.get("/:orderId", verifyToken, getOrderDetail); // get order detail (user can view their own orders)
router.get("/", verifyToken, roleGuard(["admin"]), listOrders); // admin list all orders

export default router;
