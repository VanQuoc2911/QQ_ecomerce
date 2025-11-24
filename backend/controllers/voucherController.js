import mongoose from "mongoose";
import Product from "../models/Product.js";
import Voucher from "../models/Voucher.js";

const toObjectId = (value) =>
  value && mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : null;

const sanitizeTargetFields = (payload = {}) => {
  const allowedTypes = ["all", "category", "product"];
  const targetType = allowedTypes.includes(payload.targetType)
    ? payload.targetType
    : "all";

  const targetCategories = Array.isArray(payload.targetCategories)
    ? payload.targetCategories
        .map((cat) => String(cat || "").trim())
        .filter(Boolean)
    : [];

  const targetProducts = Array.isArray(payload.targetProducts)
    ? payload.targetProducts
        .map((id) => toObjectId(id))
        .filter((id) => Boolean(id))
    : [];

  return { targetType, targetCategories, targetProducts };
};

const isVoucherActive = (voucher) => {
  if (!voucher.active) return false;
  if (voucher.expiresAt && voucher.expiresAt < new Date()) return false;
  if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit)
    return false;
  return true;
};

const computeDiscount = (eligibleTotal, voucher) => {
  if (eligibleTotal <= 0) return 0;
  let discount = 0;
  if (voucher.type === "amount") {
    discount = voucher.value;
  } else if (voucher.type === "percent") {
    discount = Math.round((eligibleTotal * voucher.value) / 100);
    if (voucher.maxDiscount && discount > voucher.maxDiscount) {
      discount = voucher.maxDiscount;
    }
  }
  if (discount > eligibleTotal) discount = eligibleTotal;
  return Math.max(discount, 0);
};

const matchesVoucherTargets = (voucher, context) => {
  const { categories = [], productId } = context;
  if (voucher.targetType === "category") {
    if (!categories.length) return false;
    return voucher.targetCategories.some((cat) =>
      categories.includes(String(cat))
    );
  }
  if (voucher.targetType === "product") {
    if (!productId) return false;
    return voucher.targetProducts.some(
      (id) => String(id) === String(productId)
    );
  }
  return true;
};

const matchesVoucherForProductMeta = (voucher, product) => {
  const categories = product.categories?.map((c) => String(c)) || [];
  return matchesVoucherTargets(voucher, {
    categories,
    productId: product.productId,
  });
};

// Create a voucher (admin)
export const createVoucher = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      maxDiscount,
      minOrderValue,
      userId,
      usageLimit,
      expiresAt,
      stackable,
      highlightText,
    } = req.body;
    if (!code || !type || typeof value !== "number") {
      return res.status(400).json({ message: "Missing voucher fields" });
    }

    const targetFields = sanitizeTargetFields(req.body);

    const doc = new Voucher({
      code: String(code).toUpperCase(),
      type,
      value,
      maxDiscount: maxDiscount || null,
      minOrderValue: minOrderValue || 0,
      userId: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
      sellerId: null,
      shopId: null,
      usageLimit: usageLimit || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      active: true,
      stackable: Boolean(stackable),
      highlightText: highlightText || "",
      ...targetFields,
    });

    await doc.save();
    return res.status(201).json({ voucher: doc });
  } catch (err) {
    console.error("createVoucher error:", err);
    return res.status(500).json({ message: "Failed to create voucher" });
  }
};

// Get vouchers for current user
export const getMyVouchers = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthenticated" });
    // vouchers assigned to this user OR global vouchers (userId null)
    const now = new Date();
    // exclude seller-scoped vouchers from personal list
    const vouchers = await Voucher.find({
      active: true,
      sellerId: null,
      $or: [{ userId: null }, { userId }],
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).lean();

    // If client provided a total, compute applicability and discount for each voucher
    const totalRaw = req.query?.total;
    const total = totalRaw !== undefined ? Number(totalRaw) : null;
    if (total !== null && !Number.isNaN(total)) {
      const annotated = vouchers.map((v) => {
        const result = { ...v };
        result.applicable = true;
        result.reason = null;
        try {
          if (!v.active) {
            result.applicable = false;
            result.reason = "Voucher không khả dụng";
            return result;
          }
          if (v.expiresAt && new Date(v.expiresAt) < new Date()) {
            result.applicable = false;
            result.reason = "Đã hết hạn";
            return result;
          }
          if (v.usageLimit && v.usedCount >= v.usageLimit) {
            result.applicable = false;
            result.reason = "Hết lượt sử dụng";
            return result;
          }
          if (v.userId && String(v.userId) !== String(userId)) {
            result.applicable = false;
            result.reason = "Không dành cho bạn";
            return result;
          }
          if (v.minOrderValue && total < v.minOrderValue) {
            result.applicable = false;
            result.reason = `Yêu cầu giá trị tối thiểu ${v.minOrderValue}`;
            return result;
          }

          let discount = 0;
          if (v.type === "amount") discount = v.value;
          else if (v.type === "percent") {
            discount = Math.round((total * v.value) / 100);
            if (v.maxDiscount && discount > v.maxDiscount)
              discount = v.maxDiscount;
          }
          if (discount > total) discount = total;
          result.discount = discount;
          result.applicable = discount > 0 || v.type === "amount";
        } catch (err) {
          result.applicable = false;
          result.reason = "Không thể kiểm tra voucher";
        }
        return result;
      });

      return res.json({ vouchers: annotated });
    }

    return res.json({ vouchers });
  } catch (err) {
    console.error("getMyVouchers error:", err);
    return res.status(500).json({ message: "Failed to fetch vouchers" });
  }
};

// Apply voucher: validate and compute discount given a total
export const applyVoucher = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { code, total } = req.body;
    if (!code)
      return res.status(400).json({ message: "Voucher code required" });
    const codeU = String(code).toUpperCase();

    const voucher = await Voucher.findOne({ code: codeU });
    if (!voucher)
      return res.status(404).json({ message: "Voucher không tồn tại" });
    if (!voucher.active)
      return res.status(400).json({ message: "Voucher không khả dụng" });
    if (voucher.expiresAt && voucher.expiresAt < new Date())
      return res.status(400).json({ message: "Voucher đã hết hạn" });
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit)
      return res.status(400).json({ message: "Voucher đã hết lượt sử dụng" });
    if (voucher.userId && String(voucher.userId) !== String(userId))
      return res.status(403).json({ message: "Voucher không dành cho bạn" });
    const orderTotal = typeof total === "number" ? total : Number(total || 0);
    if (voucher.minOrderValue && orderTotal < voucher.minOrderValue)
      return res.status(400).json({
        message: `Yêu cầu giá trị đơn tối thiểu ${voucher.minOrderValue}`,
      });

    let discount = 0;
    if (voucher.type === "amount") {
      discount = voucher.value;
    } else if (voucher.type === "percent") {
      discount = Math.round((orderTotal * voucher.value) / 100);
      if (voucher.maxDiscount && discount > voucher.maxDiscount)
        discount = voucher.maxDiscount;
    }

    if (discount > orderTotal) discount = orderTotal;

    // Note: Don't increment usedCount here — we only reserve usage on actual checkout success.

    return res.json({
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      discount,
      minOrderValue: voucher.minOrderValue || 0,
      sellerId: voucher.sellerId ? String(voucher.sellerId) : null,
      shopId: voucher.shopId ? String(voucher.shopId) : null,
    });
  } catch (err) {
    console.error("applyVoucher error:", err);
    return res.status(500).json({ message: "Không thể áp dụng voucher" });
  }
};

// Mark voucher as used (increment usedCount) after successful checkout
export const markVoucherUsed = async (code) => {
  try {
    const codeU = String(code).toUpperCase();
    await Voucher.findOneAndUpdate({ code: codeU }, { $inc: { usedCount: 1 } });
  } catch (err) {
    console.error("markVoucherUsed error:", err);
  }
};

// Create voucher as seller (scoped to seller/shop)
export const createSellerVoucher = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) return res.status(401).json({ message: "Unauthenticated" });

    const {
      code,
      type,
      value,
      maxDiscount,
      minOrderValue,
      usageLimit,
      expiresAt,
      shopId,
    } = req.body;
    if (!code || !type || typeof value !== "number")
      return res.status(400).json({ message: "Missing voucher fields" });

    const targetFields = sanitizeTargetFields(req.body);

    const doc = new Voucher({
      code: String(code).toUpperCase(),
      type,
      value,
      maxDiscount: maxDiscount || null,
      minOrderValue: minOrderValue || 0,
      userId: null,
      sellerId: mongoose.Types.ObjectId.isValid(sellerId) ? sellerId : null,
      shopId: shopId && mongoose.Types.ObjectId.isValid(shopId) ? shopId : null,
      usageLimit: usageLimit || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      active: true,
      stackable: Boolean(req.body.stackable),
      highlightText: req.body.highlightText || "",
      ...targetFields,
    });

    await doc.save();
    return res.status(201).json({ voucher: doc });
  } catch (err) {
    console.error("createSellerVoucher error:", err);
    return res.status(500).json({ message: "Failed to create seller voucher" });
  }
};

// Get vouchers for the current seller (their created vouchers)
export const getSellerVouchers = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) return res.status(401).json({ message: "Unauthenticated" });

    const vouchers = await Voucher.find({ sellerId }).lean();
    return res.json({ vouchers });
  } catch (err) {
    console.error("getSellerVouchers error:", err);
    return res.status(500).json({ message: "Failed to fetch seller vouchers" });
  }
};

// Update a seller voucher (only owner)
export const updateSellerVoucher = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const { id } = req.params;
    if (!sellerId) return res.status(401).json({ message: "Unauthenticated" });
    if (!id) return res.status(400).json({ message: "Voucher id required" });

    const existing = await Voucher.findById(id);
    if (!existing)
      return res.status(404).json({ message: "Voucher not found" });
    if (String(existing.sellerId) !== String(sellerId))
      return res.status(403).json({ message: "Not allowed" });

    const updates = { ...req.body };
    // Prevent changing sellerId/shopId ownership via update
    delete updates.sellerId;
    delete updates.shopId;

    if (
      updates.targetType ||
      updates.targetCategories ||
      updates.targetProducts
    ) {
      Object.assign(updates, sanitizeTargetFields(updates));
    }

    Object.assign(existing, updates);
    await existing.save();
    return res.json({ voucher: existing });
  } catch (err) {
    console.error("updateSellerVoucher error:", err);
    return res.status(500).json({ message: "Failed to update voucher" });
  }
};

// Delete a seller voucher (soft delete by setting active=false)
export const deleteSellerVoucher = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const { id } = req.params;
    if (!sellerId) return res.status(401).json({ message: "Unauthenticated" });
    if (!id) return res.status(400).json({ message: "Voucher id required" });

    const existing = await Voucher.findById(id);
    if (!existing)
      return res.status(404).json({ message: "Voucher not found" });
    if (String(existing.sellerId) !== String(sellerId))
      return res.status(403).json({ message: "Not allowed" });

    existing.active = false;
    await existing.save();
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteSellerVoucher error:", err);
    return res.status(500).json({ message: "Failed to delete voucher" });
  }
};

export const getShopVouchers = async (req, res) => {
  try {
    const { shopId } = req.params;
    if (!shopId || !mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ message: "shopId không hợp lệ" });
    }

    const now = new Date();
    const vouchers = await Voucher.find({
      shopId,
      active: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const categoriesParam = req.query.categories || req.query.category || "";
    const categories = String(categoriesParam)
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const productId = req.query.productId ? String(req.query.productId) : null;
    const total = req.query.total ? Number(req.query.total) : null;

    const filtered = vouchers.filter((voucher) =>
      matchesVoucherTargets(voucher, { categories, productId })
    );

    const enriched = filtered.map((voucher) => {
      let discount = undefined;
      if (total !== null && !Number.isNaN(total)) {
        if (!voucher.minOrderValue || total >= voucher.minOrderValue) {
          discount = computeDiscount(total, voucher);
        } else {
          discount = 0;
        }
      }
      return { ...voucher, discount };
    });

    return res.json({ vouchers: enriched });
  } catch (err) {
    console.error("getShopVouchers error:", err);
    return res.status(500).json({ message: "Không thể tải voucher của shop" });
  }
};

export const getBestVoucherSuggestion = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Thiếu danh sách sản phẩm" });
    }

    const itemProductIds = items
      .map((item) => item?.productId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!itemProductIds.length) {
      return res.status(400).json({ message: "productId không hợp lệ" });
    }

    const products = await Product.find({ _id: { $in: itemProductIds } })
      .select("_id categories sellerId shopId price")
      .lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const shopIds = Array.from(
      new Set(products.map((p) => p.shopId?.toString()).filter(Boolean))
    );

    const now = new Date();
    const vouchers = await Voucher.find({
      active: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      $or: [{ shopId: null }, { shopId: { $in: shopIds } }],
      $or: [{ userId: null }, { userId }],
    }).lean();

    let best = null;

    const cartItems = items.map((item) => {
      const product = productMap.get(String(item.productId));
      return {
        product,
        quantity: Number(item.quantity) || 1,
        price: Number(item.price ?? product?.price ?? 0),
      };
    });

    for (const voucher of vouchers) {
      if (!isVoucherActive(voucher)) continue;
      if (voucher.userId && String(voucher.userId) !== String(userId)) continue;

      let eligibleTotal = 0;
      for (const cartItem of cartItems) {
        if (!cartItem.product) continue;
        if (
          voucher.sellerId &&
          String(cartItem.product.sellerId) !== String(voucher.sellerId)
        ) {
          continue;
        }
        if (
          voucher.shopId &&
          String(cartItem.product.shopId) !== String(voucher.shopId)
        ) {
          continue;
        }
        const matches = matchesVoucherForProductMeta(voucher, {
          productId: cartItem.product._id.toString(),
          categories: cartItem.product.categories || [],
        });
        if (!matches) continue;
        eligibleTotal += cartItem.price * cartItem.quantity;
      }

      if (eligibleTotal <= 0) continue;
      if (voucher.minOrderValue && eligibleTotal < voucher.minOrderValue)
        continue;

      const discount = computeDiscount(eligibleTotal, voucher);
      if (!best || discount > best.discount) {
        best = {
          voucher,
          discount,
          eligibleTotal,
        };
      }
    }

    return res.json({
      bestVoucher: best
        ? {
            code: best.voucher.code,
            discount: best.discount,
            voucher: best.voucher,
          }
        : null,
    });
  } catch (err) {
    console.error("getBestVoucherSuggestion error:", err);
    return res.status(500).json({ message: "Không thể tính voucher tốt nhất" });
  }
};

export default {
  createVoucher,
  getMyVouchers,
  applyVoucher,
  markVoucherUsed,
  createSellerVoucher,
  getSellerVouchers,
  updateSellerVoucher,
  deleteSellerVoucher,
  getShopVouchers,
  getBestVoucherSuggestion,
};
