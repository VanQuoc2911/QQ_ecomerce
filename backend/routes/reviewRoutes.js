import express from "express";
import * as reviewController from "../controllers/reviewController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST - Create a review (requires auth)
router.post("/", verifyToken, reviewController.createReview);

// GET - Get reviews for a product (public)
router.get("/product/:productId", reviewController.getProductReviews);

// GET - Get reviews by user (public)
router.get("/user/:userId", reviewController.getUserReviews);

// PUT - Update a review (requires auth)
router.put("/:reviewId", verifyToken, reviewController.updateReview);

// DELETE - Delete a review (requires auth)
router.delete("/:reviewId", verifyToken, reviewController.deleteReview);

export default router;
