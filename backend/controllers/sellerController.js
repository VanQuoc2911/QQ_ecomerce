import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import SellerRequest from "../models/SellerRequest.js";
import Shop from "../models/Shop.js";
import User from "../models/User.js";

/** ===================== Admin ===================== */

/** admin list seller requests */
export const listSellerRequests = async (req, res) => {
  try {
    const items = await SellerRequest.find().populate("userId", "name email");
    return res.json(items);
  } catch (err) {
    console.error("listSellerRequests error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** admin review request */
export const reviewSellerRequest = async (req, res) => {
  // If admin requests more info, send notification to user with link to info form
  if (action === "require_info") {
    const notif = new Notification({
      userId: reqDoc.userId,
      title: "Yêu cầu bổ sung thông tin",
      message:
        "Admin yêu cầu bạn bổ sung thêm thông tin cho yêu cầu đăng ký bán hàng.",
      type: "admin_request_info",
      read: false,
      refId: reqDoc._id,
      url: `/seller-info/${reqDoc._id}`,
    });
    await notif.save();
  }
  try {
    const { id } = req.params;
    const { action, reviewNote } = req.body; // 'approve'|'reject'
    const reqDoc = await SellerRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });

    reqDoc.status = action === "approve" ? "approved" : "rejected";
    reqDoc.reviewedAt = new Date();
    reqDoc.reviewerId = req.user.id;
    reqDoc.reviewNote = reviewNote || "";
    await reqDoc.save();

    if (action === "approve") {
      let existingShop = await Shop.findOne({
        ownerId: reqDoc.userId,
        shopName: reqDoc.shopName,
      });

      if (!existingShop) {
        const shop = await Shop.create({
          ownerId: reqDoc.userId,
          shopName: reqDoc.shopName,
          logo: reqDoc.logo,
          address: reqDoc.address || "",
          phone: reqDoc.phone || "",
          website: reqDoc.website || "",
          businessLicenseUrl: reqDoc.businessLicenseUrl || "",
          description: reqDoc.description || "",
          status: "active",
        });
        await User.findByIdAndUpdate(reqDoc.userId, {
          role: "seller",
          sellerApproved: true,
          $addToSet: { shopIds: shop._id },
          shop: { shopId: shop._id, shopName: shop.shopName, logo: shop.logo },
        });
      } else {
        await Shop.findByIdAndUpdate(existingShop._id, {
          shopName: reqDoc.shopName,
          logo: reqDoc.logo,
          address: reqDoc.address || "",
          phone: reqDoc.phone || "",
          website: reqDoc.website || "",
          businessLicenseUrl: reqDoc.businessLicenseUrl || "",
          description: reqDoc.description || "",
        });
        await User.findByIdAndUpdate(reqDoc.userId, {
          role: "seller",
          sellerApproved: true,
          $addToSet: { shopIds: existingShop._id },
          shop: {
            shopId: existingShop._id,
            shopName: existingShop.shopName,
            logo: existingShop.logo,
          },
        });
      }
    }

    return res.json({ message: "Reviewed", request: reqDoc });
  } catch (err) {
    console.error("reviewSellerRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** ===================== Seller ===================== */

/** seller: list own products */
export const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user.id });
    res.json(products);
  } catch (error) {
    console.error("getMyProducts error:", error);
    res.status(500).json({ message: "Lỗi khi lấy sản phẩm", error });
  }
};

/** seller: create product */
export const createProduct = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const {
      title,
      description,
      price,
      stock,
      categories,
      variants,
      shopId,
      images,
      videos,
    } = req.body;

    if (!title || !price || !shopId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0)
      return res.status(400).json({ message: "Invalid price" });

    const numericStock = Number(stock || 0);
    if (isNaN(numericStock) || numericStock < 0)
      return res.status(400).json({ message: "Invalid stock" });

    const shop = await Shop.findById(shopId);
    if (!shop || shop.ownerId.toString() !== sellerId)
      return res
        .status(400)
        .json({ message: "Shop not found or you don't own this shop" });

    // parse categories & variants
    let parsedCategories = [];
    let parsedVariants = {};
    let parsedVideos = [];
    try {
      parsedCategories =
        categories && typeof categories === "string"
          ? JSON.parse(categories)
          : categories || [];
    } catch {}
    try {
      parsedVariants =
        variants && typeof variants === "string"
          ? JSON.parse(variants)
          : variants || {};
    } catch {}
    try {
      parsedVideos =
        videos && typeof videos === "string"
          ? JSON.parse(videos)
          : videos || [];
    } catch {}

    // check system settings for auto-approve behavior
    const SystemSetting = (await import("../models/SystemSettings.js")).default;
    const settings = await SystemSetting.findOne();

    const product = await Product.create({
      title,
      description: description || "",
      price: numericPrice,
      stock: numericStock,
      images: images || [],
      videos: parsedVideos,
      categories: parsedCategories,
      variants: parsedVariants,
      sellerId,
      shopId: shop._id,
      status: settings && settings.autoApproveProducts ? "approved" : "pending",
    });

    return res.status(201).json({ message: "Product created", product });
  } catch (err) {
    console.error("createProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** seller update product */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user.id;
    const body = req.body ?? {};
    const {
      title,
      description,
      price,
      stock,
      categories,
      variants,
      images,
      origin,
    } = body;
    const videosPayload = body.videos;

    const product = await Product.findOne({ _id: id, sellerId });
    if (!product)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    // merge updates
    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (categories !== undefined) {
      try {
        product.categories =
          typeof categories === "string" ? JSON.parse(categories) : categories;
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Danh mục không hợp lệ", detail: err.message });
      }
    }
    if (variants !== undefined) {
      try {
        product.variants =
          typeof variants === "string" ? JSON.parse(variants) : variants;
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Biến thể không hợp lệ", detail: err.message });
      }
    }
    if (images !== undefined) {
      try {
        const parsedImages =
          typeof images === "string" && images.trim().startsWith("[")
            ? JSON.parse(images)
            : images;
        product.images = Array.isArray(parsedImages)
          ? parsedImages
          : parsedImages
          ? [parsedImages]
          : [];
      } catch {
        product.images = Array.isArray(images) ? images : [images];
      }
    } // ✅ Lấy URL từ uploadToCloudinary
    if (videosPayload !== undefined) {
      try {
        product.videos =
          typeof videosPayload === "string"
            ? JSON.parse(videosPayload)
            : videosPayload || [];
      } catch {
        product.videos = videosPayload || [];
      }
    }
    if (origin !== undefined) product.origin = origin;

    // Ensure we read system settings to decide auto-approve behavior
    try {
      const SystemSetting = (await import("../models/SystemSettings.js"))
        .default;
      const settings = await SystemSetting.findOne();
      if (!(settings && settings.autoApproveProducts)) {
        product.status = "pending";
      }
    } catch (e) {
      // If settings can't be loaded, default to keeping product as-is or set to pending
      console.warn(
        "updateProduct: failed to read system settings, defaulting to pending",
        e
      );
      product.status = "pending";
    }

    await product.save();
    res.json(product);
  } catch (error) {
    console.error("updateProduct error:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật sản phẩm", error });
  }
};

/** seller delete product */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user.id;
    const product = await Product.findOneAndDelete({ _id: id, sellerId });
    if (!product)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.json({ message: "Đã xoá sản phẩm" });
  } catch (error) {
    console.error("deleteProduct error:", error);
    res.status(500).json({ message: "Lỗi khi xoá sản phẩm", error });
  }
};

/** seller orders */
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Query params
    const { status, q } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);

    // Base filter: orders that belong to this seller
    const filter = { sellerId };

    if (status) filter.status = status;

    if (q && String(q).trim().length) {
      const qStr = String(q).trim();
      // search by order id or customer name/email/fullName
      filter.$or = [
        { _id: qStr },
        { fullName: { $regex: qStr, $options: "i" } },
        { email: { $regex: qStr, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("products.productId", "title price images")
        .populate("userId", "name email"),
      Order.countDocuments(filter),
    ]);

    // Map orders to include customerName field for frontend compatibility
    const mappedItems = items.map((order) => ({
      ...order.toObject(),
      customerName: order.fullName || order.userId?.name || "Khách hàng",
      total: order.totalAmount,
    }));

    return res.json({ items: mappedItems, total });
  } catch (err) {
    console.error("getSellerOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** seller stats */
export const getSellerStats = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Total products
    const totalProducts = await Product.countDocuments({ sellerId });

    // Get all orders from this seller
    const allOrders = await Order.find({ sellerId });

    // Get completed orders
    const completedOrders = await Order.find({
      sellerId,
      status: "completed",
    });

    // Get pending orders
    const pendingOrders = await Order.find({
      sellerId,
      status: "pending",
    });

    // Calculate stats
    const totalSales = allOrders.length;
    const totalRevenue = completedOrders.reduce((sum, order) => {
      return sum + (order.totalAmount || 0);
    }, 0);
    const completedCount = completedOrders.length;
    const pendingCount = pendingOrders.length;
    const cancelledCount = allOrders.filter(
      (o) => o.status === "cancelled"
    ).length;

    // Revenue for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const revenueLastMonth = completedOrders
      .filter((o) => new Date(o.createdAt) >= thirtyDaysAgo)
      .reduce((sum, order) => {
        return sum + (order.totalAmount || 0);
      }, 0);

    res.json({
      totalProducts,
      totalSales,
      totalRevenue,
      completedCount,
      pendingCount,
      cancelledCount,
      revenueLastMonth,
    });
  } catch (err) {
    console.error("getSellerStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** get shop info */
export const getShopInfo = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const shop = await Shop.findOne({ ownerId: sellerId });
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    res.json(shop);
  } catch (err) {
    console.error("getShopInfo error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** update shop info */
export const updateShopInfo = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const updatedShop = await Shop.findOneAndUpdate(
      { ownerId: sellerId },
      req.body,
      { new: true, upsert: true }
    );
    res.json(updatedShop);
  } catch (err) {
    console.error("updateShopInfo error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
