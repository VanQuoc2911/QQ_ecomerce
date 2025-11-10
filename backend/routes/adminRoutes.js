import express from "express";
import {
  listPendingProducts,
  reviewProduct,
} from "../controllers/productController.js";
import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// list pending products
router.get("/products/pending", isAdmin, listPendingProducts);

// review a product (approve/reject)
router.post("/products/:id/review", isAdmin, reviewProduct);

export default router;
