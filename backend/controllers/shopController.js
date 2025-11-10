import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";

/** public: get shop info + approved products */
export const getShopInfo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid shop id" });

    const shop = await Shop.findById(id).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const products = await Product.find({
      shopId: id,
      status: "approved",
    }).sort({ createdAt: -1 });
    return res.json({ shop, products });
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
    // check shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    const products = await Product.find({ shopId, status: "approved" });
    res.json({
      shop: { name: shop.shopName, logo: shop.logo, address: shop.address },
      products,
    });
  } catch (err) {
    console.error("listProductsByShop error", err);
    res.status(500).json({ message: "Lỗi server khi lấy sản phẩm theo shop" });
  }
};
