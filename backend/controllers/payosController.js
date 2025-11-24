import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import {
  buildPayOSRedirectUrls,
  ensurePayOSConfig,
  getPayOSClient,
} from "../utils/payosClient.js";
import { getIO } from "../utils/socket.js";

const PAYOS_SUCCESS_STATUSES = new Set(["PAID", "PROCESSING"]);
const PAYOS_PENDING_STATUSES = new Set(["PENDING", "UNDERPAID"]);
const PAYOS_FAILURE_STATUSES = new Set([
  "CANCELLED",
  "FAILED",
  "EXPIRED",
  "REJECTED",
]);
const PAYOS_RETRY_WINDOW_MS = 10 * 60 * 60 * 1000; // 10 hours
const PAYOS_MAX_RETRIES = Number(process.env.PAYOS_MAX_RETRIES || 3);

const schedulePaymentRetryWindow = (
  order,
  durationMs = PAYOS_RETRY_WINDOW_MS
) => {
  order.paymentExpired = false;
  order.paymentDeadline = new Date(Date.now() + durationMs);
  return order.paymentDeadline;
};

const clearPaymentDeadline = (order) => {
  order.paymentExpired = false;
  order.paymentDeadline = null;
};

const normalizeEpochSeconds = (value) => {
  if (!value) return null;
  if (typeof value === "number" && value > 1e12) {
    return new Date(value);
  }
  if (typeof value === "number") {
    return new Date(value * 1000);
  }
  return new Date(value);
};

const normalizeTransactions = (transactions = []) =>
  transactions.map((tx) => ({
    reference: tx.reference,
    amount: tx.amount,
    description: tx.description,
    transactionDateTime: tx.transactionDateTime,
    accountNumber: tx.accountNumber,
    counterAccountBankId: tx.counterAccountBankId,
    counterAccountBankName: tx.counterAccountBankName,
    counterAccountName: tx.counterAccountName,
    counterAccountNumber: tx.counterAccountNumber,
  }));

const updateOrderFromPayOSLink = (order, link, extras = {}) => {
  const previousStatus = order.payosPayment?.status;
  const existing =
    order.payosPayment && typeof order.payosPayment.toObject === "function"
      ? order.payosPayment.toObject()
      : order.payosPayment || {};

  const expiredAt =
    link.expiredAt !== undefined
      ? normalizeEpochSeconds(link.expiredAt)
      : existing.expiredAt;
  const cancelledAt =
    link.canceledAt || link.cancelledAt
      ? normalizeEpochSeconds(link.canceledAt || link.cancelledAt)
      : existing.cancelledAt;

  const paymentLinkId =
    link.paymentLinkId || link.id || existing.paymentLinkId || null;

  order.payosPayment = {
    ...existing,
    orderCode: link.orderCode ?? existing.orderCode,
    paymentLinkId,
    checkoutUrl: link.checkoutUrl ?? existing.checkoutUrl,
    qrCode: link.qrCode ?? existing.qrCode,
    status: link.status ?? existing.status ?? "PENDING",
    amount: link.amount ?? existing.amount ?? order.totalAmount,
    amountPaid: link.amountPaid ?? existing.amountPaid,
    amountRemaining: link.amountRemaining ?? existing.amountRemaining,
    expiredAt,
    cancelledAt,
    cancellationReason: link.cancellationReason ?? existing.cancellationReason,
    transactions: link.transactions
      ? normalizeTransactions(link.transactions)
      : existing.transactions || [],
    lastSyncedAt: new Date(),
    lastWebhookAt: extras.webhookData ? new Date() : existing.lastWebhookAt,
    lastNotificationStatus: existing.lastNotificationStatus,
    raw: link || existing.raw || {},
    webhookPayload: extras.webhookData || existing.webhookPayload || {},
  };

  if (typeof order.markModified === "function") {
    order.markModified("payosPayment");
  }

  const nextStatus = order.payosPayment.status;

  if (PAYOS_SUCCESS_STATUSES.has(nextStatus)) {
    clearPaymentDeadline(order);
    if (!["processing", "completed"].includes(order.status)) {
      order.status = "processing";
    }
  } else if (PAYOS_FAILURE_STATUSES.has(nextStatus)) {
    schedulePaymentRetryWindow(order);
    if (!["shipping", "completed"].includes(order.status)) {
      order.status = "pending";
    }
  } else if (PAYOS_PENDING_STATUSES.has(nextStatus)) {
    // keep countdown alive for pending links
    const deadlineMs = order.paymentDeadline
      ? new Date(order.paymentDeadline).getTime()
      : NaN;
    if (!deadlineMs || Number.isNaN(deadlineMs) || deadlineMs < Date.now()) {
      schedulePaymentRetryWindow(order);
    } else {
      order.paymentExpired = false;
    }
  }

  return { previousStatus, nextStatus };
};

const generatePayosOrderCode = () =>
  Number(`${Date.now()}${Math.floor(Math.random() * 90 + 10)}`);

const getOrderAmount = (order) => {
  if (order.totalAmount && order.totalAmount > 0) {
    return Math.round(order.totalAmount);
  }
  const fallback = (order.products || []).reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  return Math.round(fallback);
};

const canReuseExistingLink = (order) => {
  if (!order.payosPayment?.status) return false;
  if (!PAYOS_PENDING_STATUSES.has(order.payosPayment.status)) return false;
  if (!order.payosPayment.expiredAt) return true;
  return order.payosPayment.expiredAt.getTime() > Date.now();
};

const buildPayosItems = (order) =>
  (order.products || []).map((item, idx) => ({
    name: item.title || `Sản phẩm ${idx + 1}`,
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
  }));

const buildBuyerAddress = (shippingAddress = {}) =>
  [
    shippingAddress.detail,
    shippingAddress.ward,
    shippingAddress.district,
    shippingAddress.province,
  ]
    .filter(Boolean)
    .join(", ");

const buildPayosDescription = (order) => {
  const orderIdSuffix = order?._id?.toString().slice(-6) || "XXXXXX";
  const raw = `Thanh toan DH ${orderIdSuffix}`;
  return raw.length > 25 ? raw.slice(0, 25) : raw;
};

const serializePayosLink = (order) => {
  const link = order.payosPayment;
  if (!link) return null;
  const retriesRemaining = Math.max(
    0,
    PAYOS_MAX_RETRIES - (order.payosRetryCount || 0)
  );
  return {
    checkoutUrl: link.checkoutUrl,
    qrCode: link.qrCode,
    orderCode: link.orderCode,
    paymentLinkId: link.paymentLinkId,
    status: link.status,
    amount: link.amount,
    expiredAt: link.expiredAt ? link.expiredAt.toISOString() : null,
    retriesRemaining,
  };
};

const sendPayosSuccessNotifications = async (order) => {
  try {
    const sellerNotification = new Notification({
      userId: order.sellerId,
      title: "Thanh toán PayOS thành công",
      message: `Đơn hàng ${order._id} đã được thanh toán qua PayOS.`,
      type: "payment",
      read: false,
      refId: order._id,
      url: `/Order/${order._id}`,
    });
    const buyerNotification = new Notification({
      userId: order.userId,
      title: "Thanh toán thành công",
      message: `Bạn đã thanh toán PayOS cho đơn ${order._id}. Seller sẽ xử lý trong giây lát.`,
      type: "payment",
      read: false,
      refId: order._id,
      url: `/Order/${order._id}`,
    });

    await sellerNotification.save();
    await buyerNotification.save();

    try {
      const io = getIO();
      if (io) {
        const payload = {
          orderId: order._id,
          status: "processing",
          message: "Thanh toán PayOS đã hoàn tất",
        };
        io.to(order.sellerId.toString()).emit(
          "order:paymentConfirmed",
          payload
        );
        io.to(order.userId.toString()).emit("order:paymentConfirmed", payload);
      }
    } catch (socketErr) {
      console.error("PayOS notification socket error:", socketErr);
    }
  } catch (notifErr) {
    console.error("PayOS notification error:", notifErr);
  }
};

export const createPayosPaymentLink = async (req, res) => {
  try {
    ensurePayOSConfig();

    const { orderId } = req.body;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "orderId không hợp lệ" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const userId = req.user?.id ? String(req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    if (order.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Bạn không thể truy cập đơn hàng này" });
    }

    if (order.paymentMethod !== "payos") {
      return res.status(400).json({
        message:
          "Đơn hàng này không sử dụng PayOS. Vui lòng tạo đơn mới và chọn PayOS.",
      });
    }

    if (["processing", "completed"].includes(order.status)) {
      return res.status(409).json({
        message: "Đơn hàng đã được thanh toán trước đó.",
        status: order.status,
      });
    }
    // Nếu đơn đã bị huỷ hoặc hết hạn, reset trạng thái về pending và cho phép tạo lại link mới
    if (order.status === "cancelled" || order.paymentExpired) {
      order.status = "pending";
      schedulePaymentRetryWindow(order);
      order.payosPayment = undefined;
      if (typeof order.markModified === "function") {
        order.markModified("payosPayment");
      }
      await order.save();
    }

    const amount = getOrderAmount(order);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Số tiền đơn hàng không hợp lệ" });
    }

    const currentRetryCount = order.payosRetryCount || 0;
    const payos = getPayOSClient();

    if (order.payosPayment?.orderCode) {
      try {
        const link = await payos.paymentRequests.get(
          order.payosPayment.orderCode
        );
        updateOrderFromPayOSLink(order, link);
        await order.save();

        if (PAYOS_SUCCESS_STATUSES.has(order.payosPayment.status)) {
          return res.status(409).json({
            message: "Đơn hàng đã được thanh toán.",
            status: order.payosPayment.status,
          });
        }

        if (canReuseExistingLink(order)) {
          return res.json(serializePayosLink(order));
        }
      } catch (err) {
        console.warn("Không thể đồng bộ PayOS link hiện tại:", err.message);
      }
    }

    if (currentRetryCount >= PAYOS_MAX_RETRIES) {
      return res.status(429).json({
        message: `Bạn đã thử thanh toán PayOS quá ${PAYOS_MAX_RETRIES} lần. Vui lòng chọn phương thức khác hoặc liên hệ hỗ trợ.`,
        retriesRemaining: 0,
      });
    }

    const orderCode = generatePayosOrderCode();
    const { returnUrl, cancelUrl } = buildPayOSRedirectUrls(
      order._id.toString()
    );
    const description = buildPayosDescription(order);
    const payload = {
      orderCode,
      amount,
      description,
      cancelUrl,
      returnUrl,
      items: buildPayosItems(order),
      buyerName: order.shippingAddress?.name || order.fullName,
      buyerEmail: order.email,
      buyerPhone: order.shippingAddress?.phone,
      buyerAddress: buildBuyerAddress(order.shippingAddress),
    };

    const link = await payos.paymentRequests.create(payload);
    updateOrderFromPayOSLink(order, link);
    order.payosRetryCount = currentRetryCount + 1;
    await order.save();

    return res.json(serializePayosLink(order));
  } catch (err) {
    console.error("createPayosPaymentLink error:", err);
    return res.status(500).json({
      message:
        err?.message ||
        "Không tạo được liên kết thanh toán PayOS. Vui lòng thử lại.",
    });
  }
};

export const handlePayosWebhook = async (req, res) => {
  try {
    ensurePayOSConfig();
    const payos = getPayOSClient();
    const verifiedData = await payos.webhooks.verify(req.body);

    if (!verifiedData?.orderCode) {
      return res.status(400).json({ message: "Webhook thiếu orderCode" });
    }

    const order = await Order.findOne({
      "payosPayment.orderCode": verifiedData.orderCode,
    });

    if (!order) {
      console.warn(
        "PayOS webhook: không tìm thấy order",
        verifiedData.orderCode
      );
      return res.json({ message: "order not found, ignored" });
    }

    const link = await payos.paymentRequests.get(verifiedData.orderCode);
    const { previousStatus, nextStatus } = updateOrderFromPayOSLink(
      order,
      link,
      {
        webhookData: verifiedData,
      }
    );

    let shouldNotify = false;
    if (
      PAYOS_SUCCESS_STATUSES.has(nextStatus) &&
      !PAYOS_SUCCESS_STATUSES.has(previousStatus)
    ) {
      order.payosPayment.lastNotificationStatus = nextStatus;
      shouldNotify = true;
    }

    await order.save();

    if (shouldNotify) {
      await sendPayosSuccessNotifications(order);
    }

    return res.json({ message: "ok" });
  } catch (err) {
    console.error("handlePayosWebhook error:", err);
    return res.status(400).json({ message: err?.message || "Webhook invalid" });
  }
};

export const getOrderPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "orderId không hợp lệ" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const userId = req.user?.id ? String(req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    if (order.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Bạn không thể truy cập đơn hàng này" });
    }

    const paymentStatus = order.payosPayment?.status || "unknown";
    const canRetryPayment =
      PAYOS_FAILURE_STATUSES.has(paymentStatus) || order.paymentExpired;

    const availablePaymentMethods = [
      { method: "payos", label: "PayOS" },
      { method: "vnpay", label: "VNPay" },
      { method: "cod", label: "Thanh toán khi nhận hàng" },
    ];

    return res.json({
      orderId: order._id,
      status: order.status,
      paymentStatus,
      canRetryPayment,
      availablePaymentMethods,
    });
  } catch (err) {
    console.error("getOrderPaymentStatus error:", err);
    return res.status(500).json({
      message:
        err?.message ||
        "Không thể lấy trạng thái thanh toán. Vui lòng thử lại.",
    });
  }
};
