import express from "express";
import {
  getProfile,
  login,
  register,
  requestSeller,
} from "../controllers/authController.js";
import {
  listSellerRequests,
  reviewSellerRequest,
} from "../controllers/sellerController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/profile", verifyToken, getProfile);

// user -> request seller
router.post("/request-seller", verifyToken, roleGuard(["user"]), requestSeller);

// admin view & review
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
