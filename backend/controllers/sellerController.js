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

    const product = await Product.create({
      title,
      description: description || "",
      price: numericPrice,
      stock: numericStock,
      images: images || [], // ✅ Lấy URL từ uploadToCloudinary
      categories: parsedCategories,
      variants: parsedVariants,
      sellerId,
      shopId: shop._id,
      status:
        process.env.AUTO_APPROVE_PRODUCTS === "true" ? "approved" : "pending",
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
    const { title, description, price, stock, categories, variants, images } =
      req.body;

    const product = await Product.findOne({ _id: id, sellerId });
    if (!product)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    // merge updates
    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (categories !== undefined)
      product.categories =
        typeof categories === "string" ? JSON.parse(categories) : categories;
    if (variants !== undefined)
      product.variants =
        typeof variants === "string" ? JSON.parse(variants) : variants;
    if (images !== undefined) product.images = images; // ✅ Lấy URL từ uploadToCloudinary

    if (process.env.AUTO_APPROVE_PRODUCTS !== "true") {
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

    const orders = await Order.find({ "items.sellerId": sellerId })
      .populate("items.productId", "title price images")
      .populate("userId", "name email");

    res.json(orders);
  } catch (err) {
    console.error("getSellerOrders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** seller stats */
export const getSellerStats = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const totalProducts = await Product.countDocuments({ sellerId });
    const totalSales = 20; // demo
    const totalRevenue = 5000000; // demo
    res.json({ totalProducts, totalSales, totalRevenue });
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
