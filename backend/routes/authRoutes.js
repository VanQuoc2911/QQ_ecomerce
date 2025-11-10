import express from "express";
import {
  changePassword,
  getProfile,
  googleLogin,
  login,
  refreshToken,
  register,
  requestSeller,
  updateProfile,
} from "../controllers/authController.js";
import {
  listSellerRequests,
  reviewSellerRequest,
} from "../controllers/sellerController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();
router.post("/google-login", googleLogin);
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.get("/profile", verifyToken, getProfile);
router.post("/request-seller", verifyToken, roleGuard(["user"]), requestSeller);
router.put("/profile", verifyToken, updateProfile);
router.put("/profile/password", verifyToken, changePassword);
router.get(
  "/seller-requests",
  verifyToken,
  roleGuard(["admin"]),
  listSellerRequests
);

// admin endpoints (review seller requests)
router.get(
  "/seller-requests",
  verifyToken,
  roleGuard(["admin"]),
  listSellerRequests
);
router.post(
  "/seller-requests/:id/review",
  verifyToken,
  roleGuard(["admin"]),
  reviewSellerRequest
);

export default router;
