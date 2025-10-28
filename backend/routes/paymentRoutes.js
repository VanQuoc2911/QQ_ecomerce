import express from "express";
import {
  createMomoPayment,
  createVnPayUrl,
} from "../controllers/paymentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/momo/create", verifyToken, createMomoPayment);
router.post("/vnpay/create", verifyToken, createVnPayUrl);

export default router;
