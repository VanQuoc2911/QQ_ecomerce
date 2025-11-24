import express from "express";
import voucherCtrl from "../controllers/voucherController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/vouchers/my - get vouchers available to current user
router.get("/my", verifyToken, voucherCtrl.getMyVouchers);

// POST /api/vouchers/apply - apply voucher against a total
router.post("/apply", verifyToken, voucherCtrl.applyVoucher);

// Public: list active vouchers for a shop (for banner/claim UI)
router.get("/shop/:shopId", voucherCtrl.getShopVouchers);

// Auto-detect best voucher for current cart
router.post("/best", verifyToken, voucherCtrl.getBestVoucherSuggestion);

// Admin: create voucher
router.post("/", verifyToken, roleGuard(["admin"]), voucherCtrl.createVoucher);

// Seller: create voucher scoped to their shop
router.post(
  "/seller",
  verifyToken,
  roleGuard(["seller"]),
  voucherCtrl.createSellerVoucher
);

// Seller: list their vouchers
router.get(
  "/seller",
  verifyToken,
  roleGuard(["seller"]),
  voucherCtrl.getSellerVouchers
);

// Seller: update a voucher they own
router.put(
  "/seller/:id",
  verifyToken,
  roleGuard(["seller"]),
  voucherCtrl.updateSellerVoucher
);

// Seller: delete (soft) a voucher they own
router.delete(
  "/seller/:id",
  verifyToken,
  roleGuard(["seller"]),
  voucherCtrl.deleteSellerVoucher
);

export default router;
