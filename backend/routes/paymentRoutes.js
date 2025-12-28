import express from "express";
import { createMomoPayment } from "../controllers/paymentController.js";
import {
  createPayosPaymentLink,
  handlePayosWebhook,
  syncPayosPaymentStatus,
} from "../controllers/payosController.js";
import {
  generateBankingQR,
  getQRPaymentInfo,
  handleBankingPaymentResult,
} from "../controllers/qrPaymentController.js";
import {
  createVnPayUrl,
  handleVnPayIPN,
  handleVnPayReturn,
  verifyVnPayPayment,
} from "../controllers/vnpayController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/momo/create", verifyToken, createMomoPayment);
router.post("/vnpay/create", verifyToken, createVnPayUrl);
// Frontend calls this to verify payment after VNPAY redirects
router.get("/vnpay/verify", verifyVnPayPayment);
// VNPay will redirect the user back to this URL (GET)
router.get("/vnpay/return", handleVnPayReturn);
// VNPay server-to-server notification (IPN)
router.post("/vnpay/ipn", handleVnPayIPN);
// Banking QR code routes
router.get("/qr/:orderId", getQRPaymentInfo);
router.get("/qr/:orderId/generate", generateBankingQR);
router.post("/qr/:orderId/result", verifyToken, handleBankingPaymentResult);
// PayOS routes
router.post("/payos/create-link", verifyToken, createPayosPaymentLink);
router.post("/payos/webhook", handlePayosWebhook);
router.post("/payos/sync-status", verifyToken, syncPayosPaymentStatus);

export default router;
