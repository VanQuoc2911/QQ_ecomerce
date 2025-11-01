import express from "express";
import multer from "multer";
import {
  createProduct,
  getProductById,
  listProducts,
} from "../controllers/productController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const upload = multer({ dest: "/tmp/uploads" });
const router = express.Router();

router.get("/", listProducts);
router.post(
  "/",
  verifyToken,
  roleGuard(["seller", "admin"]),
  upload.array("images", 6),
  createProduct
);
router.get("/:id", getProductById);
export default router;
