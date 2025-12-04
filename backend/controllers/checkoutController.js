import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import SystemSetting from "../models/SystemSettings.js";
import User from "../models/User.js";
import Voucher from "../models/Voucher.js";
import {
  SHIPPING_METHODS as SUPPORTED_SHIPPING_METHODS,
  computeShippingForSeller,
  normalizeShippingAddress,
} from "../utils/shippingFee.js";
import { markVoucherUsed } from "./voucherController.js";

const PAYMENT_METHODS = new Set([
  "payos",
  "cod",
  "banking",
  "momo",
  "qr",
  "vnpay",
]);
const SHIPPING_METHOD_SET = new Set(SUPPORTED_SHIPPING_METHODS);

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

const normalizeProductId = (raw) => {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    return (
      raw._id ||
      raw.id ||
      raw.productId ||
      (typeof raw.toString === "function" ? raw.toString() : null)
    );
  }
  return null;
};

const matchesVoucherTargets = (voucher, product) => {
  if (!product) return false;
  if (
    voucher.sellerId &&
    String(voucher.sellerId) !== String(product.sellerId)
  ) {
    return false;
  }
  if (voucher.shopId && String(voucher.shopId) !== String(product.shopId)) {
    return false;
  }

  if (voucher.targetType === "category") {
    const categories = Array.isArray(product.categories)
      ? product.categories
      : [];
    const targetCategories = Array.isArray(voucher.targetCategories)
      ? voucher.targetCategories
      : [];
    if (!categories.length || !targetCategories.length) return false;
    return categories.some((cat) => targetCategories.includes(cat));
  }

  if (voucher.targetType === "product") {
    const targets = Array.isArray(voucher.targetProducts)
      ? voucher.targetProducts
      : [];
    return targets.some((pid) => String(pid) === String(product._id));
  }

  return true;
};

const computeVoucherDiscount = (voucher, eligibleTotal) => {
  if (!eligibleTotal || eligibleTotal <= 0) return 0;
  let discount = 0;
  if (voucher.type === "amount") {
    discount = voucher.value;
  } else if (voucher.type === "percent") {
    discount = Math.round((eligibleTotal * voucher.value) / 100);
    if (voucher.maxDiscount && discount > voucher.maxDiscount) {
      discount = voucher.maxDiscount;
    }
  }
  if (discount > eligibleTotal) {
    discount = eligibleTotal;
  }
  return Math.max(discount, 0);
};

const formatAddress = (address) =>
  [address.detail, address.ward, address.district, address.province]
    .filter((chunk) => chunk && chunk.trim().length > 0)
    .join(", ");

const buildShippingSummary = ({
  groups,
  method,
  destination,
  shopsById,
  shippingOption,
}) => {
  const normalizedMethod = SHIPPING_METHOD_SET.has(method)
    ? method
    : "standard";
  const destinationAddress = normalizeShippingAddress(destination || {});
  const sellerGroups = Array.isArray(groups)
    ? groups
    : groups && typeof groups.values === "function"
    ? Array.from(groups.values())
    : [];

  const breakdown = sellerGroups.map((group) => {
    const shopInfo = group.shopIdStr ? shopsById.get(group.shopIdStr) : null;
    const shippingComputation = computeShippingForSeller({
      sellerId: group.sellerId.toString(),
      shop: shopInfo,
      destination: destinationAddress,
      method: normalizedMethod,
      requestedRushDistanceKm: shippingOption?.rushDistanceKm,
    });

    return {
      sellerId: shippingComputation.sellerId,
      shopId: shippingComputation.shopId,
      fee: shippingComputation.fee,
      scope: shippingComputation.scope,
      distanceKm: shippingComputation.distanceKm,
      shopProvince: shippingComputation.shopProvince,
      destinationProvince: shippingComputation.destinationProvince,
      usedFallbackDistance:
        shippingComputation.meta?.usedFallbackDistance ?? false,
    };
  });

  const totalShippingFee = breakdown.reduce(
    (sum, entry) => sum + (entry.fee || 0),
    0
  );

  return {
    method: normalizedMethod,
    totalShippingFee,
    breakdown,
  };
};

const checkoutController = async (req, res) => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId || !mongoose.Types.ObjectId.isValid(authUserId)) {
      return res.status(401).json({ message: "Vui lòng đăng nhập lại." });
    }

    const {
      items = [],
      paymentMethod = "payos",
      shippingAddress: rawShippingAddress,
      shippingOption = {},
      mode = "cart",
      voucherCode,
      fullName: payloadFullName,
      email: payloadEmail,
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Không có sản phẩm để thanh toán" });
    }

    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return res
        .status(400)
        .json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    if (!rawShippingAddress) {
      return res
        .status(400)
        .json({ message: "Thiếu thông tin địa chỉ giao hàng" });
    }

    const user = await User.findById(authUserId).select("name email phone");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const parseMaybeNumber = (value) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      const parsed = typeof value === "string" ? Number(value) : NaN;
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const shippingAddress = normalizeShippingAddress({
      name: rawShippingAddress.name || user.name || "",
      phone: rawShippingAddress.phone || user.phone || "",
      province: (rawShippingAddress.province || "").trim(),
      district: (rawShippingAddress.district || "").trim(),
      ward: (rawShippingAddress.ward || "").trim(),
      detail: (rawShippingAddress.detail || "").trim(),
      lat: parseMaybeNumber(rawShippingAddress.lat),
      lng: parseMaybeNumber(rawShippingAddress.lng),
      type: rawShippingAddress.type || "home",
    });

    if (!shippingAddress.detail) {
      return res.status(400).json({ message: "Vui lòng nhập địa chỉ cụ thể" });
    }
    if (
      !shippingAddress.province ||
      !shippingAddress.district ||
      !shippingAddress.ward
    ) {
      return res.status(400).json({
        message: "Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã",
      });
    }

    let normalizedItems;
    try {
      normalizedItems = items.map((item, idx) => {
        const productId = normalizeProductId(item.productId);
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
          throw new Error(`Sản phẩm ở vị trí ${idx + 1} không hợp lệ`);
        }
        const quantity = Number(item.quantity) || 0;
        if (quantity <= 0) {
          throw new Error(`Số lượng sản phẩm ${idx + 1} không hợp lệ`);
        }
        return {
          productId: productId.toString(),
          quantity,
        };
      });
    } catch (validationErr) {
      return res.status(400).json({
        message:
          validationErr instanceof Error
            ? validationErr.message
            : "Danh sách sản phẩm không hợp lệ",
      });
    }

    const productIds = [
      ...new Set(normalizedItems.map((it) => it.productId)),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const products = await Product.find({ _id: { $in: productIds } })
      .select("title price stock sellerId shopId categories images")
      .lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    for (const normalized of normalizedItems) {
      const product = productMap.get(normalized.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Sản phẩm ${normalized.productId} không tồn tại` });
      }
      if (product.stock < normalized.quantity) {
        return res.status(400).json({
          message: `Sản phẩm "${product.title}" chỉ còn ${product.stock} sản phẩm`,
        });
      }
    }

    const groups = new Map();
    const shopIdSet = new Set();
    const quantityByProduct = new Map();

    normalizedItems.forEach((normalized) => {
      const product = productMap.get(normalized.productId);
      if (!product) return;
      const sellerIdStr = product.sellerId?.toString();
      if (!sellerIdStr) return;

      if (!groups.has(sellerIdStr)) {
        groups.set(sellerIdStr, {
          sellerId: product.sellerId,
          shopId: product.shopId || null,
          shopIdStr: product.shopId ? product.shopId.toString() : null,
          items: [],
          subtotal: 0,
        });
      }

      const entry = groups.get(sellerIdStr);
      entry.items.push({
        productId: product._id,
        title: product.title,
        quantity: normalized.quantity,
        price: product.price,
        sellerId: product.sellerId,
      });
      entry.subtotal += product.price * normalized.quantity;

      if (entry.shopIdStr) {
        shopIdSet.add(entry.shopIdStr);
      }

      const currentQty = quantityByProduct.get(product._id.toString()) || 0;
      quantityByProduct.set(
        product._id.toString(),
        currentQty + normalized.quantity
      );
    });

    if (!groups.size) {
      return res
        .status(400)
        .json({ message: "Không xác định được người bán cho sản phẩm" });
    }

    let voucherDoc = null;
    let voucherDiscount = 0;
    const voucherEligibleBySeller = new Map();

    if (voucherCode) {
      const codeUpper = String(voucherCode).trim().toUpperCase();
      const now = new Date();
      voucherDoc = await Voucher.findOne({ code: codeUpper });
      if (!voucherDoc) {
        return res.status(404).json({ message: "Voucher không tồn tại" });
      }
      if (!voucherDoc.active) {
        return res.status(400).json({ message: "Voucher không khả dụng" });
      }
      if (voucherDoc.expiresAt && voucherDoc.expiresAt < now) {
        return res.status(400).json({ message: "Voucher đã hết hạn" });
      }
      if (
        voucherDoc.usageLimit &&
        voucherDoc.usedCount >= voucherDoc.usageLimit
      ) {
        return res.status(400).json({ message: "Voucher đã hết lượt sử dụng" });
      }
      if (
        voucherDoc.userId &&
        String(voucherDoc.userId) !== String(authUserId)
      ) {
        return res.status(403).json({ message: "Voucher không dành cho bạn" });
      }

      let eligibleTotal = 0;
      for (const normalized of normalizedItems) {
        const product = productMap.get(normalized.productId);
        if (!product) continue;
        if (!matchesVoucherTargets(voucherDoc, product)) continue;
        const lineTotal = product.price * normalized.quantity;
        eligibleTotal += lineTotal;
        const sellerIdStr = product.sellerId?.toString();
        if (sellerIdStr) {
          const prev = voucherEligibleBySeller.get(sellerIdStr) || 0;
          voucherEligibleBySeller.set(sellerIdStr, prev + lineTotal);
        }
      }

      if (!eligibleTotal) {
        return res.status(400).json({
          message: "Voucher không áp dụng cho các sản phẩm trong đơn này",
        });
      }
      if (
        voucherDoc.minOrderValue &&
        eligibleTotal < voucherDoc.minOrderValue
      ) {
        return res.status(400).json({
          message: `Giá trị đơn tối thiểu để dùng voucher là ${voucherDoc.minOrderValue.toLocaleString(
            "vi-VN"
          )}₫`,
        });
      }

      voucherDiscount = computeVoucherDiscount(voucherDoc, eligibleTotal);
    }

    for (const [productId, qty] of quantityByProduct.entries()) {
      const updateResult = await Product.updateOne(
        { _id: productId, stock: { $gte: qty } },
        { $inc: { stock: -qty, soldCount: qty } }
      );
      if (!updateResult.modifiedCount) {
        const failed = productMap.get(productId);
        const title = failed?.title || "sản phẩm";
        return res.status(409).json({
          message: `Không thể cập nhật tồn kho cho ${title}. Vui lòng thử lại.`,
        });
      }
    }

    const shopIds = Array.from(shopIdSet).map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const shops = shopIds.length
      ? await Shop.find({ _id: { $in: shopIds } })
          .select("_id shopName province address lat lng")
          .lean()
      : [];
    const shopsById = new Map(shops.map((shop) => [shop._id.toString(), shop]));

    const shippingMethod = SHIPPING_METHOD_SET.has(shippingOption.method)
      ? shippingOption.method
      : "standard";
    const shippingSummary = buildShippingSummary({
      groups,
      method: shippingMethod,
      destination: shippingAddress,
      shopsById,
      shippingOption,
    });

    const systemSettings = await SystemSetting.findOne().lean();
    const shippingServiceFeePercentSetting = (() => {
      const raw = systemSettings?.serviceFeePercent;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        return Math.min(Math.max(raw, 0), 100);
      }
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) {
        return Math.min(Math.max(parsed, 0), 100);
      }
      return 0;
    })();

    const sellerServiceFeePercentSetting = (() => {
      const raw = systemSettings?.sellerServiceFeePercent;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        return Math.min(Math.max(raw, 0), 100);
      }
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) {
        return Math.min(Math.max(parsed, 0), 100);
      }
      return 0;
    })();

    const discountAllocation = new Map();
    if (voucherDiscount > 0 && voucherEligibleBySeller.size) {
      const allocations = Array.from(voucherEligibleBySeller.entries());
      const eligibleTotal = allocations.reduce(
        (sum, [, value]) => sum + value,
        0
      );
      let remaining = voucherDiscount;
      allocations.forEach(([sellerId, sellerAmount], idx) => {
        if (!eligibleTotal) {
          discountAllocation.set(sellerId, 0);
          return;
        }
        let share = Math.round(
          (sellerAmount / eligibleTotal) * voucherDiscount
        );
        if (idx === allocations.length - 1) {
          share = remaining;
        }
        share = Math.min(share, remaining);
        remaining -= share;
        discountAllocation.set(sellerId, share);
      });
    }

    const createdOrders = [];
    const userObjectId = new mongoose.Types.ObjectId(authUserId);
    const addressString = formatAddress(shippingAddress);

    for (const [sellerIdStr, group] of groups.entries()) {
      const sellerDiscount = discountAllocation.get(sellerIdStr) || 0;
      const subtotal = group.subtotal;
      const feeEntry = shippingSummary.breakdown.find(
        (entry) => entry.sellerId === sellerIdStr
      );
      const shippingFee = feeEntry?.fee || 0;
      const normalizedShippingFee = Math.max(shippingFee, 0);
      const computedShippingServiceFee = Math.round(
        (normalizedShippingFee * shippingServiceFeePercentSetting) / 100
      );
      const serviceFee = Math.min(
        Math.max(computedShippingServiceFee, 0),
        normalizedShippingFee
      );
      const orderTotal = Math.max(subtotal + shippingFee - sellerDiscount, 0);
      const sellerServiceFeeBase = Math.max(subtotal, 0);
      const computedSellerServiceFee = Math.round(
        (sellerServiceFeeBase * sellerServiceFeePercentSetting) / 100
      );
      const sellerServiceFee = Math.min(
        Math.max(computedSellerServiceFee, 0),
        Math.max(orderTotal, 0)
      );

      const order = await Order.create({
        userId: userObjectId,
        sellerId: toObjectId(sellerIdStr),
        shopId: group.shopId ? toObjectId(group.shopId) : null,
        products: group.items,
        totalAmount: orderTotal,
        fullName: payloadFullName || user.name || "",
        email: payloadEmail || user.email || "",
        address: addressString,
        shippingAddress,
        shippingMethod,
        shippingStatus: "unassigned",
        shippingFee,
        serviceFeePercent: shippingServiceFeePercentSetting,
        serviceFee,
        sellerServiceFeePercent: sellerServiceFeePercentSetting,
        sellerServiceFee,
        shippingScope: feeEntry?.scope || shippingMethod,
        shippingMeta: {
          option: shippingOption,
          summaryEntry: feeEntry,
        },
        paymentMethod,
        status: "pending",
        voucherCode: voucherDoc?.code || null,
        voucherDiscount: sellerDiscount,
      });

      createdOrders.push(order);
    }

    if (mode === "cart") {
      await Cart.findOneAndUpdate(
        { userId: userObjectId },
        { $pull: { items: { productId: { $in: productIds } } } }
      );
    }

    if (voucherDoc && voucherDiscount > 0) {
      await markVoucherUsed(voucherDoc.code).catch((err) =>
        console.error("markVoucherUsed error:", err)
      );
    }

    const mainOrder = createdOrders[0];
    const responsePayload = {
      orderId: mainOrder._id,
      message:
        createdOrders.length > 1
          ? `Đặt hàng thành công (${createdOrders.length} đơn)`
          : "Đặt hàng thành công",
      paymentMethod,
      status: mainOrder.status,
      createdAt: mainOrder.createdAt,
      updatedAt: mainOrder.updatedAt,
      orderCount: createdOrders.length,
      shippingSummary,
    };

    return res.status(201).json(responsePayload);
  } catch (err) {
    console.error("Checkout error:", err);
    const message = err?.message || "Thanh toán thất bại. Vui lòng thử lại";
    return res.status(500).json({ message });
  }
};

export default checkoutController;
