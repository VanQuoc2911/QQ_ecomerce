import express from "express";
import checkoutController from "../controllers/checkoutController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/checkout
router.post("/", verifyToken, checkoutController);

export default router;
