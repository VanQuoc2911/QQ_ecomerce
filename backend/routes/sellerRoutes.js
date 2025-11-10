import express from "express";
import { getProductById } from "../controllers/productController.js";
import {
  createProduct,
  deleteProduct,
  getMyProducts,
  getSellerOrders,
  getSellerStats,
  getShopInfo,
  updateProduct,
  updateShopInfo,
} from "../controllers/sellerController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";
import upload, { uploadToCloudinary } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/stats", verifyToken, roleGuard(["seller"]), getSellerStats);
router.get("/shop", verifyToken, roleGuard(["seller"]), getShopInfo);
router.put("/shop", verifyToken, roleGuard(["seller"]), updateShopInfo);
router.get("/orders", verifyToken, roleGuard(["seller"]), getSellerOrders);
router.get("/products", verifyToken, roleGuard(["seller"]), getMyProducts);
router.get("/products/:id", getProductById);
router.post(
  "/products",
  verifyToken,
  roleGuard(["seller"]),
  upload.array("images", 6),
  uploadToCloudinary,
  createProduct
);
router.put(
  "/products/:id",
  verifyToken,
  roleGuard(["seller"]),
  upload.array("images", 6),
  uploadToCloudinary,
  updateProduct
);
router.delete(
  "/products/:id",
  verifyToken,
  roleGuard(["seller"]),
  deleteProduct
);

export default router;
