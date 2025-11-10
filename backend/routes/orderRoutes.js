import express from "express";
import {
  createOrder,
  getSellerOrders,
  listOrders,
} from "../controllers/orderController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createOrder); // any authenticated user can create
router.get("/seller", verifyToken, roleGuard(["seller"]), getSellerOrders);
router.get("/", verifyToken, roleGuard(["admin"]), listOrders);

export default router;
