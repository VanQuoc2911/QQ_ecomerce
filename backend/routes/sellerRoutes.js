import express from "express";
import { getProductById } from "../controllers/productController.js";
import {
  getSellerReviews,
  replyToReview,
} from "../controllers/reviewController.js";
import {
  createProduct,
  deleteProduct,
  getMyProducts,
  getSellerOrders,
  getSellerStats,
  getShopInfo,
  updateProduct,
  updateProductListing,
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
router.get("/products/:id", verifyToken, roleGuard(["seller"]), getProductById);
router.post(
  "/products",
  verifyToken,
  roleGuard(["seller"]),
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "videos", maxCount: 4 },
  ]),
  uploadToCloudinary,
  createProduct
);
router.put(
  "/products/:id",
  verifyToken,
  roleGuard(["seller"]),
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "videos", maxCount: 4 },
  ]),
  uploadToCloudinary,
  updateProduct
);
router.patch(
  "/products/:id/listing",
  verifyToken,
  roleGuard(["seller"]),
  updateProductListing
);
router.delete(
  "/products/:id",
  verifyToken,
  roleGuard(["seller"]),
  deleteProduct
);

router.get("/reviews", verifyToken, roleGuard(["seller"]), getSellerReviews);

router.post(
  "/reviews/:reviewId/reply",
  verifyToken,
  roleGuard(["seller"]),
  replyToReview
);

export default router;
