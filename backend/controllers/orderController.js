/** ===================== CANCEL ORDER (CUSTOMER) ===================== */
/**
 * Allow customer to cancel and reset order to 'pending' (chờ thanh toán lại)
 */
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    // Only allow cancel if not completed/shipping
    if (["completed", "shipping"].includes(order.status)) {
      return res
        .status(400)
        .json({ message: "Không thể huỷ đơn đã hoàn thành hoặc đang giao." });
    }
    // Reset trạng thái về chờ thanh toán
    order.status = "pending";
    order.paymentExpired = false;
    order.paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await order.save();
    res.json({
      message: "Đơn hàng đã chuyển về trạng thái chờ thanh toán lại.",
      order,
    });
  } catch (err) {
    console.error("cancelOrder error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import User from "../models/User.js";

const PAYOS_RETRY_WINDOW_MS = 10 * 60 * 60 * 1000; // 10 hours for PayOS deadline refresh

/** ===================== CREATE ORDER ===================== */
/**
 * Tạo đơn hàng từ giỏ hàng hoặc trực tiếp
 * Nếu user checkout giỏ hàng có nhiều sản phẩm từ nhiều seller,
 * sẽ tạo 1 order riêng cho mỗi seller
 */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, shopId, isBuyNow, shippingAddress } = req.body;
    const selectedPaymentMethod = req.body.paymentMethod || "banking";

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "No items provided" });

    // Validate shipping address
    if (
      !shippingAddress ||
      !shippingAddress.province ||
      !shippingAddress.district ||
      !shippingAddress.ward
    ) {
      return res.status(400).json({ message: "Invalid shipping address" });
    }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    // Group items by sellerId to create separate orders
    const ordersBySellerMap = new Map();

    for (const it of items) {
      const p = products.find((x) => x._id.toString() === it.productId);
      if (!p)
        return res
          .status(400)
          .json({ message: `Product ${it.productId} not found` });
      if (p.stock < it.quantity)
        return res
          .status(400)
          .json({ message: `Not enough stock for ${p.title}` });

      p.stock -= it.quantity;
      p.soldCount = (p.soldCount || 0) + it.quantity;
      await p.save();

      // If stock hit zero, notify the seller so they can restock
      try {
        if (p.stock <= 0) {
          const Notification = (await import("../models/Notification.js"))
            .default;
          const notif = new Notification({
            userId: p.sellerId,
            title: "Sản phẩm hết hàng",
            message: `${p.title} đã hết hàng. Vui lòng cập nhật tồn kho.`,
            type: "inventory",
            read: false,
            refId: p._id,
            url: `/products/${p._id}`,
          });
          await notif.save();

          try {
            const { getIO } = await import("../utils/socket.js");
            const io = getIO();
            if (io) {
              io.to(p.sellerId.toString()).emit("product:outOfStock", {
                productId: p._id,
                title: p.title,
                message: "Sản phẩm đã hết hàng",
              });
            }
          } catch (emitErr) {
            console.error(
              "createOrder: failed to emit outOfStock socket",
              emitErr
            );
          }
        }
      } catch (nErr) {
        console.error(
          "createOrder: failed to create out-of-stock notification",
          nErr
        );
      }

      const sellerId = p.sellerId;
      if (!ordersBySellerMap.has(sellerId)) {
        ordersBySellerMap.set(sellerId, []);
      }
      ordersBySellerMap.get(sellerId).push({
        productId: p._id,
        title: p.title,
        quantity: it.quantity,
        price: p.price,
        sellerId,
      });
    }

    // Create separate order for each seller
    const createdOrders = [];
    for (const [sellerId, sellerItems] of ordersBySellerMap.entries()) {
      const sellerTotal = sellerItems.reduce(
        (sum, p) => sum + p.price * p.quantity,
        0
      );

      const orderPayload = {
        userId,
        sellerId,
        shopId: shopId || null,
        products: sellerItems,
        totalAmount: sellerTotal,
        address: `${shippingAddress.detail}, ${shippingAddress.ward}, ${shippingAddress.district}, ${shippingAddress.province}`,
        shippingAddress: {
          name: shippingAddress.name,
          phone: shippingAddress.phone,
          province: shippingAddress.province,
          district: shippingAddress.district,
          ward: shippingAddress.ward,
          detail: shippingAddress.detail,
          // Prefer pinnedLocation coordinates when user explicitly pinned GPS
          lat:
            shippingAddress.pinnedLocation && shippingAddress.pinnedLocation.lat
              ? shippingAddress.pinnedLocation.lat
              : shippingAddress.lat,
          lng:
            shippingAddress.pinnedLocation && shippingAddress.pinnedLocation.lng
              ? shippingAddress.pinnedLocation.lng
              : shippingAddress.lng,
          type: shippingAddress.type,
        },
        shippingMethod: req.body.shippingMethod || "standard",
        shippingStatus: "unassigned",
        shippingTimeline: [],
        shippingMeta: req.body.shippingMeta || {},
        paymentMethod: selectedPaymentMethod,
        status: selectedPaymentMethod === "cod" ? "processing" : "pending",
      };

      if (selectedPaymentMethod === "cod") {
        orderPayload.paymentDeadline = null;
        orderPayload.paymentExpired = false;
      }

      const order = await Order.create(orderPayload);

      // For immediate seller notification: only notify when payment method is NOT banking/momo
      try {
        if (
          selectedPaymentMethod !== "banking" &&
          selectedPaymentMethod !== "momo"
        ) {
          const Notification = (await import("../models/Notification.js"))
            .default;
          const notif = new Notification({
            userId: sellerId,
            title: "Đơn hàng mới",
            message: `Bạn có đơn hàng mới (${order._id})`,
            type: "order",
            read: false,
            refId: order._id,
            url: `/Order/${order._id}`,
          });
          await notif.save();

          try {
            const { getIO } = await import("../utils/socket.js");
            const io = getIO();
            if (io) {
              io.to(sellerId.toString()).emit("order:created", {
                orderId: order._id,
                sellerId,
                message: "New order created",
                order,
              });
            }
          } catch (emitErr) {
            console.error("createOrder: failed to emit socket event", emitErr);
          }
        }
      } catch (nErr) {
        console.error("createOrder: failed to create notification", nErr);
      }

      createdOrders.push(order);

      // Update shop revenue and order count
      if (shopId) {
        const shop = await Shop.findById(shopId);
        if (shop) {
          shop.totalRevenue = (shop.totalRevenue || 0) + sellerTotal;
          shop.totalOrders = (shop.totalOrders || 0) + 1;
          await shop.save();
        }
      }
    }

    // Remove checked out items from cart
    if (!isBuyNow) {
      const cart = await Cart.findOne({ userId });
      if (cart) {
        cart.items = cart.items.filter(
          (ci) => !items.find((i) => i.productId === ci.productId.toString())
        );
        await cart.save();
      }
    }

    // Return the first order (for display on success page)
    // For multiple sellers, user can view all orders in order history
    const mainOrder = createdOrders[0];
    res.status(201).json({
      message: "Order created successfully",
      orderId: mainOrder._id,
      order: mainOrder,
      orderCount: createdOrders.length, // Inform user if multiple orders created
    });
    // Notify buyer about created order
    try {
      const Notification = (await import("../models/Notification.js")).default;
      const notif = new Notification({
        userId,
        title: "Đơn hàng của bạn đã được tạo",
        message: `Đơn hàng ${mainOrder._id} đã được tạo thành công.`,
        type: "order",
        read: false,
        refId: mainOrder._id,
        url: `/Order/${mainOrder._id}`,
      });
      await notif.save();

      try {
        const { getIO } = await import("../utils/socket.js");
        const io = getIO();
        if (io) io.to(userId.toString()).emit("notification:new", notif);
      } catch (emitErr) {
        console.warn(
          "Failed to emit order-created notification to buyer:",
          emitErr
        );
      }
    } catch (nErr) {
      console.warn("Failed to create order notification:", nErr);
    }
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

/** ===================== GET ORDER DETAIL ===================== */
export const getOrderDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findById(orderId)
      .populate("products.productId", "title price images")
      .populate("userId", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user is authorized to view this order
    // Allow: customer viewing their own order OR seller viewing their orders
    const isCustomer = order.userId._id.toString() === userId.toString();
    const isSeller = order.sellerId.toString() === userId.toString();

    if (!isCustomer && !isSeller) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Calculate remaining time for payment (only if status is "pending")
    let remainingTime = null;
    let isExpired = false;
    if (order.status === "pending" && order.paymentDeadline) {
      const now = new Date();
      const deadline = new Date(order.paymentDeadline);
      const diffMs = deadline - now;
      remainingTime = Math.max(0, diffMs);
      isExpired = diffMs <= 0;
      // Auto-mark as expired if deadline passed
      if (isExpired && !order.paymentExpired) {
        order.paymentExpired = true;
        await order.save();
      }
    }

    res.json({ ...order.toObject(), remainingTime, isExpired });
  } catch (err) {
    console.error("getOrderDetail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** ===================== SELLER ORDERS ===================== */
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const orders = await Order.find({ sellerId })
      .populate("products.productId", "title price images")
      .populate("userId", "name email");

    res.json(orders);
  } catch (err) {
    console.error("getSellerOrders error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** ===================== CUSTOMER/USER ORDERS ===================== */
/**
 * Get all orders for authenticated customer
 */
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ userId })
      .populate("products.productId", "title price images")
      .populate("sellerId", "name")
      .sort({ createdAt: -1 });

    // Calculate remaining time for each pending order
    const ordersWithTime = orders.map((order) => {
      let remainingTime = null;
      let isExpired = false;

      if (order.status === "pending" && order.paymentDeadline) {
        const now = new Date();
        const deadline = new Date(order.paymentDeadline);
        const diffMs = deadline - now;
        remainingTime = Math.max(0, diffMs);
        isExpired = diffMs <= 0;

        // Auto-mark as expired if deadline passed
        if (isExpired && !order.paymentExpired) {
          order.paymentExpired = true;
          order
            .save()
            .catch((err) =>
              console.error("Failed to save payment expiry:", err)
            );
        }
      }

      return {
        ...order.toObject(),
        remainingTime,
        isExpired,
      };
    });

    res.json(ordersWithTime);
  } catch (err) {
    console.error("getUserOrders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** ===================== UPDATE ORDER STATUS (SELLER) ===================== */
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const sellerId = req.user.id;

    // Allowable statuses and forward-only transitions
    const allowedStatuses = [
      "pending",
      "payment_pending",
      "processing",
      "shipping",
      "completed",
      "cancelled",
    ];
    const forwardMap = {
      pending: ["payment_pending", "cancelled"],
      payment_pending: ["processing", "cancelled"],
      processing: ["shipping", "completed", "cancelled"],
      shipping: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if seller is authorized to update this order
    if (order.sellerId.toString() !== sellerId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Prevent manual cancellation for banking/momo orders
    if (
      status === "cancelled" &&
      (order.paymentMethod === "banking" || order.paymentMethod === "momo")
    ) {
      return res.status(400).json({
        message:
          "Manual cancellation is not allowed for banking/MoMo orders. Only system auto-cancel is permitted.",
      });
    }

    // Enforce forward-only transition
    const current = order.status;
    const allowedNext = forwardMap[current] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        message: `Invalid transition from ${current} to ${status}. Allowed: ${
          allowedNext.join(", ") || "none"
        }`,
      });
    }

    // Apply status change
    order.status = status;
    await order.save();

    // Emit socket event to notify user of status change
    try {
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        io.to(order.userId.toString()).emit("order:statusUpdated", {
          orderId: order._id,
          status,
          message: `Order status updated to ${status}`,
        });
      }
    } catch (emitErr) {
      console.error("updateOrderStatus: failed to emit socket event", emitErr);
    }

    res.json({ message: "Order status updated", order });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** ===================== CONFIRM PAYMENT (SELLER) ===================== */
/**
 * Seller confirms payment received for banking/momo orders
 * Changes status from "payment_pending" to "processing"
 */
export const confirmPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.user.id;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization: only seller can confirm
    if (order.sellerId.toString() !== sellerId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Only allow confirming if order is in payment_pending status
    if (order.status !== "payment_pending") {
      return res.status(400).json({
        message: `Cannot confirm payment for order with status: ${order.status}. Order must be in "payment_pending" status.`,
      });
    }

    // Update order status to processing
    order.status = "processing";
    await order.save();

    // Notify customer
    try {
      const Notification = (await import("../models/Notification.js")).default;
      const notif = new Notification({
        userId: order.userId,
        title: "Thanh toán được xác nhận",
        message: `Seller đã xác nhận nhận được thanh toán. Đơn hàng đang được xử lý. Bạn có thể xem chi tiết đơn hàng tại đây.`,
        type: "payment",
        read: false,
        refId: order._id,
        url: `/Order/${order._id}`,
      });
      await notif.save();
    } catch (nErr) {
      console.error("confirmPayment: failed to create notification", nErr);
    }

    // Emit socket to customer
    try {
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        io.to(order.userId.toString()).emit("order:paymentConfirmed", {
          orderId: order._id,
          status: "processing",
          message: "Seller đã xác nhận nhận được thanh toán",
        });
      }
    } catch (emitErr) {
      console.error("confirmPayment: failed to emit socket event", emitErr);
    }

    res.json({
      message: "Payment confirmed. Order status changed to processing.",
      order,
    });
  } catch (err) {
    console.error("confirmPayment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** ===================== MARK AS PAID (CUSTOMER) ===================== */
/**
 * Customer marks order as paid after completing bank/MoMo transfer
 * Changes status from "pending" to "payment_pending" (waiting for seller confirmation)
 */
export const markAsPaid = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only order owner can mark
    if (order.userId.toString() !== userId.toString())
      return res.status(403).json({ message: "Unauthorized" });

    // Only banking/momo orders allowed here
    if (
      !(order.paymentMethod === "banking" || order.paymentMethod === "momo")
    ) {
      return res.status(400).json({
        message: "Only banking/MoMo orders can be marked as paid here.",
      });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message: `Order must be in 'pending' to mark as paid. Current: ${order.status}`,
      });
    }

    order.status = "processing";
    order.paymentDeadline = null;
    order.paymentExpired = false;
    await order.save();

    // Notify seller
    try {
      const Notification = (await import("../models/Notification.js")).default;
      const notif = new Notification({
        userId: order.sellerId,
        title: "Khách đã thanh toán",
        message: `Khách hàng đã xác nhận thanh toán cho đơn ${order._id}. Vui lòng chuẩn bị giao hàng.`,
        type: "payment",
        read: false,
        refId: order._id,
        url: `/Order/${order._id}`,
      });
      await notif.save();
    } catch (nErr) {
      console.error("markAsPaid: failed to create notification", nErr);
    }

    // Emit socket to seller
    try {
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        io.to(order.sellerId.toString()).emit("order:paymentConfirmed", {
          orderId: order._id,
          status: "processing",
          message: "Khách đã xác nhận thanh toán",
        });
      }
    } catch (emitErr) {
      console.error("markAsPaid: failed to emit socket", emitErr);
    }

    res.json({
      message: "Đã xác nhận thanh toán, đơn hàng sẽ được xử lý ngay.",
      order,
    });
  } catch (err) {
    console.error("markAsPaid error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** ===================== CHANGE PAYMENT METHOD (CUSTOMER) ===================== */
/**
 * Allow customer to switch between PayOS and COD when order is still unpaid
 */
export const changePaymentMethod = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod, decision = "confirm" } = req.body;
    const userId = req.user.id;

    if (!["payos", "cod"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method. Only COD hoặc PayOS được hỗ trợ.",
      });
    }

    const normalizedDecision = String(decision || "confirm").toLowerCase();
    if (
      paymentMethod === "cod" &&
      !["confirm", "cancel"].includes(normalizedDecision)
    ) {
      return res.status(400).json({
        message: "Decision không hợp lệ. Vui lòng chọn confirm hoặc cancel.",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (
      order.paymentExpired ||
      !["pending", "payment_pending"].includes(order.status)
    ) {
      return res.status(400).json({
        message: "Chỉ có thể đổi phương thức khi đơn hàng đang chờ thanh toán.",
      });
    }

    if (order.paymentMethod === paymentMethod) {
      return res.json({
        message: "Phương thức thanh toán đã được sử dụng.",
        order,
      });
    }

    order.paymentMethod = paymentMethod;

    if (paymentMethod === "payos") {
      order.status = "pending";
      order.paymentExpired = false;
      order.paymentDeadline = new Date(Date.now() + PAYOS_RETRY_WINDOW_MS);
      order.payosPayment = undefined;
      if (typeof order.markModified === "function") {
        order.markModified("payosPayment");
      }
    } else {
      // COD flow
      order.payosPayment = undefined;
      if (typeof order.markModified === "function") {
        order.markModified("payosPayment");
      }
      order.paymentDeadline = null;
      order.paymentExpired = normalizedDecision === "cancel";
      order.payosRetryCount = 0;

      if (normalizedDecision === "cancel") {
        order.status = "cancelled";
      } else {
        order.status = "processing";
      }
    }

    await order.save();

    res.json({
      message: "Đã cập nhật phương thức thanh toán.",
      order,
    });
  } catch (err) {
    console.error("changePaymentMethod error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** ===================== ADMIN ORDER LIST ===================== */
export const listOrders = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Order.find({}).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments({}),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    console.error("listOrders error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** ===================== ASSIGN SHIPPER (ADMIN/SELLER) ===================== */
export const assignShipper = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { shipperId } = req.body;

    if (!shipperId) {
      return res.status(400).json({ message: "shipperId is required" });
    }

    const [order, shipper] = await Promise.all([
      Order.findById(orderId),
      User.findById(shipperId),
    ]);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!shipper || shipper.role !== "shipper") {
      return res
        .status(400)
        .json({ message: "Invalid shipper. User must have role shipper." });
    }

    const now = new Date();
    const previousShipperId = order.shipperId?.toString() || null;

    order.shipperId = shipper._id;
    order.shipperSnapshot = {
      id: shipper._id,
      name: shipper.name,
      phone: shipper.phone || "",
    };
    order.shippingStatus = "assigned";
    order.shippingUpdatedAt = now;
    order.shippingTimeline = order.shippingTimeline || [];
    order.shippingTimeline.push({
      code: previousShipperId ? "reassigned" : "assigned",
      label: previousShipperId
        ? "Cập nhật người giao hàng"
        : "Đã phân công shipper",
      note: `Giao cho ${shipper.name}`,
      at: now,
      source: req.user?.role || "system",
    });

    await order.save();

    try {
      const Notification = (await import("../models/Notification.js")).default;
      const notif = new Notification({
        userId: shipper._id,
        title: "Đơn hàng mới được phân công",
        message: `Bạn được giao đơn ${order._id}.`,
        type: "shipping",
        read: false,
        refId: order._id,
        url: `/shipper/orders/${order._id}`,
      });
      await notif.save();
    } catch (notifyErr) {
      console.warn("assignShipper notification failed", notifyErr);
    }

    try {
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        io.to(shipper._id.toString()).emit("shipper:orderAssigned", {
          orderId: order._id,
          shippingStatus: order.shippingStatus,
        });
        io.to(order.userId.toString()).emit("order:shippingAssigned", {
          orderId: order._id,
          shippingStatus: order.shippingStatus,
        });
      }
    } catch (socketErr) {
      console.warn("assignShipper socket emit failed", socketErr);
    }

    res.json({ message: "Đã phân công shipper", order });
  } catch (err) {
    console.error("assignShipper error", err);
    res.status(500).json({ message: "Server error" });
  }
};
