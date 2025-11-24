import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";

/**
 * POST /api/reviews
 * Create a new review for a product
 */
export const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, orderId, rating, title, comment, images } = req.body;

    // Validate input
    if (!productId || !orderId || !rating) {
      return res.status(400).json({
        message: "Missing required fields: productId, orderId, rating",
      });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    // Verify user owns the order
    const order = await Order.findById(orderId);
    if (!order || order.userId.toString() !== userId) {
      return res.status(403).json({
        message: "Unauthorized: Order not found or doesn't belong to user",
      });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user already reviewed this product (from this order)
    const existingReview = await Review.findOne({ productId, userId, orderId });
    if (existingReview) {
      return res
        .status(409)
        .json({ message: "You already reviewed this product from this order" });
    }

    // Create review
    const review = await Review.create({
      productId,
      userId,
      orderId,
      rating,
      title: title || "",
      comment: comment || "",
      images: images || [],
    });

    // Update product rating stats
    await updateProductRating(productId);

    // Populate user info
    await review.populate("userId", "name avatar");

    res.status(201).json(review);
  } catch (err) {
    console.error("createReview error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/reviews/:productId
 * Get all reviews for a product
 */
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = "recent" } = req.query;

    const skip = (page - 1) * limit;
    let sortOption = { createdAt: -1 };

    if (sort === "helpful") {
      sortOption = { helpful: -1, createdAt: -1 };
    } else if (sort === "rating-high") {
      sortOption = { rating: -1, createdAt: -1 };
    } else if (sort === "rating-low") {
      sortOption = { rating: 1, createdAt: -1 };
    }

    const reviews = await Review.find({ productId, status: "approved" })
      .populate("userId", "name avatar")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments({
      productId,
      status: "approved",
    });

    res.json({
      reviews,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getProductReviews error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/reviews/user/:userId
 * Get all reviews by a user
 */
export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await Review.find({ userId, status: "approved" })
      .populate("productId", "title images")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error("getUserReviews error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * PUT /api/reviews/:reviewId
 * Update a review (only by the reviewer)
 */
export const updateReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check ownership
    if (review.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Cannot update other's reviews" });
    }

    // Update fields
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res
          .status(400)
          .json({ message: "Rating must be between 1 and 5" });
      }
      review.rating = rating;
    }
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;
    if (images !== undefined) review.images = images;

    review.updatedAt = new Date();
    await review.save();

    // Update product rating stats
    await updateProductRating(review.productId);

    await review.populate("userId", "name avatar");
    res.json(review);
  } catch (err) {
    console.error("updateReview error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * DELETE /api/reviews/:reviewId
 * Delete a review (only by the reviewer)
 */
export const deleteReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check ownership
    if (review.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Cannot delete other's reviews" });
    }

    const productId = review.productId;
    await Review.deleteOne({ _id: reviewId });

    // Update product rating stats
    await updateProductRating(productId);

    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    console.error("deleteReview error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Helper: Update product's rating and reviewCount
 */
async function updateProductRating(productId) {
  try {
    const reviews = await Review.find({ productId, status: "approved" });
    const reviewCount = reviews.length;
    const avgRating =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(avgRating * 10) / 10, // round to 1 decimal
      reviewCount,
    });
  } catch (err) {
    console.error("updateProductRating error:", err);
  }
}

/**
 * GET /api/seller/reviews
 * Seller: list reviews for their products
 */
export const getSellerReviews = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { productId, page = 1, limit = 10, status, hasReply } = req.query;

    const sellerProducts = await Product.find({ sellerId }).select(
      "_id title images"
    );
    if (!sellerProducts.length) {
      return res.json({
        reviews: [],
        total: 0,
        page: Number(page),
        limit: Number(limit),
        products: [],
      });
    }

    const allowedProductIds = sellerProducts.map((p) => p._id.toString());
    let targetProductIds = allowedProductIds;
    if (productId) {
      if (!allowedProductIds.includes(productId)) {
        return res
          .status(403)
          .json({
            message: "Bạn không có quyền xem đánh giá của sản phẩm này",
          });
      }
      targetProductIds = [productId];
    }

    const query = { productId: { $in: targetProductIds } };
    if (status) query.status = status;

    if (hasReply === "true") {
      query.sellerReply = { $exists: true, $ne: "" };
    } else if (hasReply === "false") {
      query.$or = [
        { sellerReply: { $exists: false } },
        { sellerReply: "" },
        { sellerReply: null },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const reviews = await Review.find(query)
      .populate("userId", "name avatar")
      .populate("productId", "title images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments(query);

    res.json({
      reviews,
      total,
      page: Number(page),
      limit: Number(limit),
      products: sellerProducts,
    });
  } catch (err) {
    console.error("getSellerReviews error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * POST /api/seller/reviews/:reviewId/reply
 * Seller: reply to a review
 */
export const replyToReview = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { reviewId } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res
        .status(400)
        .json({ message: "Nội dung phản hồi không được để trống" });
    }

    const review = await Review.findById(reviewId).populate(
      "productId",
      "sellerId title images"
    );
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    if (
      !review.productId ||
      review.productId.sellerId?.toString() !== sellerId
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không thể phản hồi đánh giá này" });
    }

    review.sellerReply = reply.trim();
    review.sellerReplyAt = new Date();
    await review.save();

    await review.populate("userId", "name avatar");

    res.json(review);
  } catch (err) {
    console.error("replyToReview error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
