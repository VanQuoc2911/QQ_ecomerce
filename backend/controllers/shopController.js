import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";

// Simple in-memory cache for shop responses to reduce DB load on hot endpoints
// Key -> { data, expiresAt }
const shopCache = new Map();
const DEFAULT_CACHE_TTL_MS = 15 * 1000; // 15 seconds

function getCached(key) {
  const entry = shopCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    shopCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data, ttl = DEFAULT_CACHE_TTL_MS) {
  shopCache.set(key, { data, expiresAt: Date.now() + ttl });
}

/** public: get shop info + approved products */
export const getShopInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page || "1", 10) || 1;
    const limit = Math.min(parseInt(req.query.limit || "24", 10) || 24, 100);
    const cacheKey = `shop:${id}:p${page}:l${limit}`;

    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid shop id" });

    // fetch shop minimal fields quickly
    const shop = await Shop.findById(id)
      .select(
        "shopName logo address phone website description province ownerId"
      )
      .lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    // fetch products with projection and pagination; lean() for faster reads
    const products = await Product.find({ shopId: id, status: "approved" })
      .select("title price images slug _id shopId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const result = { shop, products, page, limit };
    setCached(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error("getShopInfo error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** seller: get own shop stats */
export const getMyShopStats = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const shop = await Shop.findOne({ ownerId });
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const agg = await Order.aggregate([
      { $match: { shopId: shop._id } },
      {
        $group: {
          _id: "$shopId",
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);
    const totalRevenue = agg[0]?.totalRevenue || 0;
    const totalOrders = agg[0]?.totalOrders || 0;

    shop.totalRevenue = totalRevenue;
    shop.totalOrders = totalOrders;
    await shop.save();

    return res.json({
      shop: {
        shopName: shop.shopName,
        logo: shop.logo,
        totalRevenue,
        totalOrders,
      },
    });
  } catch (err) {
    console.error("getMyShopStats error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** seller: update own shop */
export const updateMyShop = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const updates = req.body;
    const shop = await Shop.findOneAndUpdate({ ownerId }, updates, {
      new: true,
    });
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    res.json({ message: "Shop updated", shop });
  } catch (err) {
    console.error("updateMyShop error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** list products by shopId (public) - this endpoint used in routes */
export const listProductsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const page = parseInt(req.query.page || "1", 10) || 1;
    const limit = Math.min(parseInt(req.query.limit || "24", 10) || 24, 100);
    const cacheKey = `shopProducts:${shopId}:p${page}:l${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    // check shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    const products = await Product.find({ shopId, status: "approved" })
      .select("title price images slug _id shopId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const payload = {
      shop: {
        name: shop.shopName,
        logo: shop.logo,
        address: shop.address,
        phone: shop.phone,
      },
      products,
      page,
      limit,
    };
    setCached(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error("listProductsByShop error", err);
    res.status(500).json({ message: "Lỗi server khi lấy sản phẩm theo shop" });
  }
};
