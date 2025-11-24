import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";

/** public: list products (only approved unless admin) */
export const listProducts = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;
    const q = req.query.q;
    const shopId = req.query.shopId;
    const province = req.query.province;
    const origin = req.query.origin;
    const category = req.query.category;
    const minRating = req.query.minRating ? Number(req.query.minRating) : null;
    const filter = {};

    const showAll = req.user?.role === "admin" && req.query.all === "true";
    if (!showAll) {
      filter.status = "approved";
      filter.stock = { $gt: 0 }; // Hide out-of-stock products from public
    }

    if (q) filter.title = new RegExp(q, "i");
    if (shopId) filter.shopId = shopId;
    if (origin) filter.origin = origin;
    if (category) filter.categories = category;
    if (minRating !== null) filter.rating = { $gte: minRating };

    // If filtering by province, find shops in that province first
    if (province) {
      const shopsInProvince = await Shop.find({ province });
      const shopIds = shopsInProvince.map((shop) => shop._id);
      filter.shopId = { $in: shopIds };
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate("shopId", "shopName logo address phone province lat lng")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    console.error("listProducts error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** public: get product by id with shop info */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate(
      "shopId",
      "shopName logo address province lat lng"
    );
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (
      product.status !== "approved" &&
      req.user?.role !== "admin" &&
      product.sellerId?.toString() !== req.user?.id
    ) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("getProductById error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** List pending products for admin */
export const listPendingProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: "pending" }).sort({
      createdAt: -1,
    });
    res.json(products); // trả mảng luôn
  } catch (err) {
    console.error("listPendingProducts error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** Review product (approve/reject) */
export const reviewProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reviewNote } = req.body;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.status = action === "approve" ? "approved" : "rejected";
    product.reviewNote = reviewNote || "";
    product.reviewedAt = new Date();
    product.reviewerId = req.user.id;

    await product.save();

    res.json({ message: "Product reviewed", product });
  } catch (err) {
    console.error("reviewProduct error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** list products by shop (public) */
export const listProductsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;
    const q = req.query.q;
    const filter = { shopId };

    const showAll = req.user?.role === "admin" && req.query.all === "true";
    if (!showAll) {
      filter.status = "approved";
      filter.stock = { $gt: 0 }; // Hide out-of-stock products from public
    }

    if (q) filter.title = new RegExp(q, "i");

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate("shopId", "shopName logo address phone province lat lng")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    console.error("listProductsByShop error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** admin or seller: get product sales stats */
export const getProductSales = async (req, res) => {
  try {
    const { productId } = req.params;
    const agg = await Order.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          "products.productId": new (require("mongoose").Types.ObjectId)(
            productId
          ),
        },
      },
      {
        $group: {
          _id: "$products.productId",
          totalUnits: { $sum: "$products.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$products.quantity", "$products.price"] },
          },
          orders: { $sum: 1 },
        },
      },
    ]);

    const stats = agg[0] || { totalUnits: 0, totalRevenue: 0, orders: 0 };
    res.json({ productId, stats });
  } catch (err) {
    console.error("getProductSales error", err);
    res.status(500).json({ message: "Server error" });
  }
};
