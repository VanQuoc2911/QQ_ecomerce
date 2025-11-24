import mongoose from "mongoose";
import Order from "../models/Order.js";
import { getIO } from "../utils/socket.js";

const SHIPPING_STATUS_LABELS = {
  unassigned: "Chờ phân công",
  assigned: "Đã phân công",
  pickup_pending: "Đến điểm lấy hàng",
  picked_up: "Đã lấy hàng",
  delivering: "Đang giao",
  delivered: "Đã giao thành công",
  failed: "Giao thất bại",
  returned: "Đã hoàn về",
  location: "Cập nhật vị trí",
  reassigned: "Cập nhật shipper",
};

const STATUS_TERMINALS = new Set(["delivered", "failed", "returned"]);

const STATUS_FLOW = {
  unassigned: ["assigned"],
  assigned: ["pickup_pending", "picked_up"],
  pickup_pending: ["picked_up"],
  picked_up: ["delivering"],
  delivering: ["delivered", "failed", "returned"],
  failed: ["pickup_pending"],
  returned: [],
  delivered: [],
};

const sanitizeLocation = (raw = {}) => {
  const lat = typeof raw.lat === "number" ? raw.lat : Number(raw.lat);
  const lng = typeof raw.lng === "number" ? raw.lng : Number(raw.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const accuracy =
    typeof raw.accuracy === "number" ? raw.accuracy : Number(raw.accuracy);
  return {
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
  };
};

const emitShippingEvent = (order, latestEvent) => {
  try {
    const io = getIO();
    if (!io) return;
    const payload = {
      orderId: order._id,
      shippingStatus: order.shippingStatus,
      timelineEvent: latestEvent,
    };
    if (order.userId)
      io.to(order.userId.toString()).emit("order:shipping", payload);
    if (order.sellerId)
      io.to(order.sellerId.toString()).emit("seller:shipping", payload);
    if (order.shipperId)
      io.to(order.shipperId.toString()).emit("shipper:shipping", payload);
  } catch (err) {
    console.warn("emitShippingEvent error", err);
  }
};

const appendTimeline = (order, event) => {
  order.shippingTimeline = Array.isArray(order.shippingTimeline)
    ? order.shippingTimeline
    : [];
  order.shippingTimeline.push(event);
  return event;
};

const ensureAssignedOrder = (order, shipperId) => {
  if (!order) return null;
  if (!order.shipperId)
    throw new Error("Order chưa được gán shipper. Vui lòng liên hệ điều phối.");
  if (order.shipperId.toString() !== shipperId.toString())
    throw new Error("Đơn hàng không thuộc quyền của bạn.");
  return order;
};

const applyStatusUpdate = async ({
  order,
  nextStatus,
  note,
  location,
  clientRequestId,
  occurredAt,
  offline,
}) => {
  if (!nextStatus) throw new Error("Thiếu trạng thái cần cập nhật");
  const current = order.shippingStatus || "unassigned";
  const allowed = STATUS_FLOW[current] || [];
  if (!allowed.includes(nextStatus) && current !== nextStatus) {
    throw new Error(`Không thể chuyển từ ${current} sang ${nextStatus}`);
  }

  const timestamp = occurredAt ? new Date(occurredAt) : new Date();
  const locationPayload = sanitizeLocation(location);
  const timelineEvent = appendTimeline(order, {
    code: nextStatus,
    label: SHIPPING_STATUS_LABELS[nextStatus] || nextStatus,
    note: note || "",
    at: timestamp,
    source: "shipper",
    clientRequestId: clientRequestId || null,
    offline: Boolean(offline),
    location: locationPayload || undefined,
  });

  if (locationPayload) {
    order.shippingLocation = {
      ...locationPayload,
      updatedAt: timestamp,
    };
    order.tracking = Array.isArray(order.tracking) ? order.tracking : [];
    order.tracking.push({
      lat: locationPayload.lat,
      lon: locationPayload.lng,
      status: nextStatus,
      ts: timestamp,
    });
  }

  order.shippingStatus = nextStatus;
  order.shippingUpdatedAt = timestamp;
  order.shippingSyncedAt = new Date();

  if (["picked_up", "delivering"].includes(nextStatus)) {
    order.status = "shipping";
  }
  if (nextStatus === "delivered") {
    order.status = "completed";
  }
  if (nextStatus === "failed") {
    order.status = "processing";
  }
  if (nextStatus === "returned") {
    order.status = "cancelled";
  }

  await order.save();
  emitShippingEvent(order, timelineEvent);
  return order;
};

const applyLocationCheckpoint = async ({
  order,
  location,
  note,
  clientRequestId,
  occurredAt,
  offline,
}) => {
  const locationPayload = sanitizeLocation(location);
  if (!locationPayload)
    throw new Error("Thiếu toạ độ hợp lệ để cập nhật vị trí");

  const timestamp = occurredAt ? new Date(occurredAt) : new Date();
  const timelineEvent = appendTimeline(order, {
    code: "location",
    label: SHIPPING_STATUS_LABELS.location,
    note: note || "",
    at: timestamp,
    source: "shipper",
    clientRequestId: clientRequestId || null,
    offline: Boolean(offline),
    location: locationPayload,
  });

  order.shippingLocation = {
    ...locationPayload,
    updatedAt: timestamp,
  };
  order.shippingUpdatedAt = timestamp;
  order.shippingSyncedAt = new Date();
  order.tracking = Array.isArray(order.tracking) ? order.tracking : [];
  order.tracking.push({
    lat: locationPayload.lat,
    lon: locationPayload.lng,
    status: "location",
    ts: timestamp,
  });
  await order.save();
  emitShippingEvent(order, timelineEvent);
  return order;
};

export const getShipperSummary = async (req, res) => {
  try {
    const shipperId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeCount, deliveredToday, failedToday, recentOrders] =
      await Promise.all([
        Order.countDocuments({
          shipperId,
          shippingStatus: { $nin: Array.from(STATUS_TERMINALS) },
        }),
        Order.countDocuments({
          shipperId,
          shippingStatus: "delivered",
          updatedAt: { $gte: today },
        }),
        Order.countDocuments({
          shipperId,
          shippingStatus: { $in: ["failed", "returned"] },
          updatedAt: { $gte: today },
        }),
        Order.find({ shipperId })
          .sort({ updatedAt: -1 })
          .limit(5)
          .select(
            "_id totalAmount shippingStatus shippingMethod shippingAddress updatedAt"
          )
          .lean(),
      ]);

    res.json({
      stats: {
        active: activeCount,
        deliveredToday,
        failedToday,
      },
      recent: recentOrders,
    });
  } catch (err) {
    console.error("getShipperSummary error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const listAssignedOrders = async (req, res) => {
  try {
    const shipperId = req.user.id;
    const { status = "active", limit = 20, cursor } = req.query;
    const parsedLimit = Math.min(Number(limit) || 20, 50);

    const query = { shipperId };
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        query.updatedAt = { $lt: cursorDate };
      }
    }

    if (status === "active") {
      query.shippingStatus = { $nin: Array.from(STATUS_TERMINALS) };
    } else if (status === "completed") {
      query.shippingStatus = "delivered";
    } else if (status === "failed") {
      query.shippingStatus = { $in: ["failed", "returned"] };
    } else if (status !== "all") {
      query.shippingStatus = status;
    }

    const orders = await Order.find(query)
      .sort({ updatedAt: -1 })
      .limit(parsedLimit)
      .select(
        "_id totalAmount shippingStatus shippingMethod shippingAddress shippingTimeline shippingLocation shippingFee shippingScope status createdAt updatedAt"
      )
      .lean();

    const nextCursor =
      orders.length === parsedLimit
        ? orders[orders.length - 1].updatedAt
        : null;

    res.json({ orders, nextCursor });
  } catch (err) {
    console.error("listAssignedOrders error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getShipperOrderDetail = async (req, res) => {
  try {
    const shipperId = req.user.id;
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findOne({ _id: orderId, shipperId })
      .populate("products.productId", "title price images")
      .populate("sellerId", "name phone")
      .populate("userId", "name phone");

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found hoặc chưa được phân công" });
    }

    res.json(order);
  } catch (err) {
    console.error("getShipperOrderDetail error", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateShippingStatus = async (req, res) => {
  try {
    const shipperId = req.user.id;
    const { orderId } = req.params;
    const { status, note, location, clientRequestId, occurredAt } = req.body;

    const order = await Order.findOne({ _id: orderId, shipperId });
    if (!order) {
      return res
        .status(404)
        .json({ message: "Order không tồn tại hoặc không thuộc bạn" });
    }

    ensureAssignedOrder(order, shipperId);
    await applyStatusUpdate({
      order,
      nextStatus: status,
      note,
      location,
      clientRequestId,
      occurredAt,
      offline: Boolean(req.body.offline),
    });

    res.json({ message: "Đã cập nhật trạng thái", order });
  } catch (err) {
    console.error("updateShippingStatus error", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

export const addCheckpoint = async (req, res) => {
  try {
    const shipperId = req.user.id;
    const { orderId } = req.params;
    const { location, note, clientRequestId, occurredAt } = req.body;

    const order = await Order.findOne({ _id: orderId, shipperId });
    if (!order) {
      return res
        .status(404)
        .json({ message: "Order không tồn tại hoặc không thuộc bạn" });
    }

    ensureAssignedOrder(order, shipperId);
    await applyLocationCheckpoint({
      order,
      location,
      note,
      clientRequestId,
      occurredAt,
      offline: Boolean(req.body.offline),
    });

    res.json({ message: "Đã ghi nhận vị trí", order });
  } catch (err) {
    console.error("addCheckpoint error", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

export const syncOfflineUpdates = async (req, res) => {
  try {
    const shipperId = req.user.id;
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "Thiếu dữ liệu cần đồng bộ" });
    }

    const results = [];
    for (const update of updates) {
      const { orderId, type } = update;
      try {
        const order = await Order.findOne({ _id: orderId, shipperId });
        if (!order) {
          throw new Error("Order không tồn tại hoặc không thuộc bạn");
        }
        ensureAssignedOrder(order, shipperId);
        if (type === "status") {
          await applyStatusUpdate({
            order,
            nextStatus: update.status,
            note: update.note,
            location: update.location,
            clientRequestId: update.clientRequestId,
            occurredAt: update.occurredAt,
            offline: true,
          });
        } else if (type === "checkpoint") {
          await applyLocationCheckpoint({
            order,
            location: update.location,
            note: update.note,
            clientRequestId: update.clientRequestId,
            occurredAt: update.occurredAt,
            offline: true,
          });
        } else {
          throw new Error("Loại cập nhật không hợp lệ");
        }
        results.push({
          id: update.clientRequestId || update.id,
          success: true,
        });
      } catch (err) {
        results.push({
          id: update.clientRequestId || update.id,
          success: false,
          message: err.message,
        });
      }
    }

    res.json({
      results,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
    });
  } catch (err) {
    console.error("syncOfflineUpdates error", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};
