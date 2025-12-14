import express from "express";
import {
  createBanner,
  deleteBanner,
  generateBanner,
  listBanners,
  updateBanner,
} from "../controllers/bannerController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// public listing (only active by default)
router.get("/", listBanners);

// admin management
router.post("/", verifyToken, roleGuard(["admin"]), createBanner);
router.post("/generate", verifyToken, roleGuard(["admin"]), generateBanner);
router.put("/:id", verifyToken, roleGuard(["admin"]), updateBanner);
router.delete("/:id", verifyToken, roleGuard(["admin"]), deleteBanner);

export default router;
