import express from "express";
import {
  getProductById,
  getProductSales,
  incrementProductView,
  listPendingProducts,
  listProducts,
  listProductsByShop,
  reviewProduct,
} from "../controllers/productController.js";
import {
  createProduct,
  deleteProduct,
  getMyProducts,
  updateProduct,
} from "../controllers/sellerController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";
import upload, { uploadToCloudinary } from "../middleware/uploadMiddleware.js";
const router = express.Router();
router.get("/pending", verifyToken, roleGuard(["admin"]), listPendingProducts);

router.get("/", listProducts);
router.get("/shop/:shopId", listProductsByShop);
router.get("/:id", getProductById);

// Public: record a product view (increments view counter)
router.post("/:id/view", incrementProductView);

// product creation - seller or admin
router.post(
  "/",
  verifyToken,
  roleGuard(["seller", "admin"]),
  upload.array("images", 6),
  uploadToCloudinary,
  createProduct
);
router.put(
  "/:id",
  verifyToken,
  roleGuard(["seller", "admin"]),
  upload.fields([
    { name: "images", maxCount: 8 },
    { name: "videos", maxCount: 4 },
  ]),
  uploadToCloudinary,
  updateProduct
);
router.delete(
  "/:id",
  verifyToken,
  roleGuard(["seller", "admin"]),
  deleteProduct
);

// admin review
router.post("/:id/review", verifyToken, roleGuard(["admin"]), reviewProduct);

// product sales stats
router.get(
  "/:productId/sales",
  verifyToken,
  roleGuard(["admin", "seller"]),
  getProductSales
);

// seller: get my products
router.get("/me/products", verifyToken, roleGuard(["seller"]), getMyProducts);

export default router;
