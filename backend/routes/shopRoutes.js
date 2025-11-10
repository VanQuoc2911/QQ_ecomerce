import express from "express";
import {
  getMyShopStats,
  getShopInfo,
  listProductsByShop,
  updateMyShop,
} from "../controllers/shopController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:id", getShopInfo);
router.get("/me/stats", verifyToken, roleGuard(["seller"]), getMyShopStats);
router.put("/me", verifyToken, roleGuard(["seller"]), updateMyShop);

// list products by shopId (public)
router.get("/:shopId/products", listProductsByShop);

export default router;
