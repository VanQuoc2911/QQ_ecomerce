import express from "express";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateQuantity,
} from "../controllers/cartController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Tất cả API giỏ hàng yêu cầu user đăng nhập
router.use(verifyToken, roleGuard(["user", "seller", "admin"]));

router.get("/", getCart);
router.post("/", verifyToken, addToCart);
router.put("/", updateQuantity);
router.delete("/:productId", removeFromCart);
router.delete("/", clearCart);

export default router;
