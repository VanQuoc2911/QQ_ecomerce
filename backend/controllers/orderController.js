import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const computeRoute = async (start, end) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;
    return data.routes[0]; // contains geometry, distance, duration
  } catch (err) {
    console.error("computeRoute error", err);
    return null;
  }
};

/** Create order */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      items,
      address,
      paymentMethod = "COD",
      note = "",
      start,
      end,
    } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "Items required" });

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length)
      return res.status(400).json({ message: "Some products not found" });

    const sellerId = products[0].sellerId;
    // check all from same seller
    for (const id of productIds) {
      if (
        products.find((p) => p._id.toString() === id).sellerId.toString() !==
        sellerId.toString()
      ) {
        return res
          .status(400)
          .json({ message: "Multi-seller order not supported yet" });
      }
    }

    let total = 0;
    const orderItems = [];
    for (const it of items) {
      const p = products.find((x) => x._id.toString() === it.productId);
      const qty = Number(it.qty) || 1;
      if (p.stock < qty)
        return res
          .status(400)
          .json({ message: `Insufficient stock: ${p.title}` });
      p.stock -= qty;
      await p.save();
      orderItems.push({ productId: p._id, qty, price: p.price });
      total += p.price * qty;
    }
    const routeInfo = start && end ? await computeRoute(start, end) : null;

    const order = await Order.create({
      userId,
      sellerId,
      items: orderItems,
      total,
      paymentMethod,
      address,
      note,
      start: start || null,
      end: end || null,
      route: routeInfo,
    });
    return res.status(201).json(order);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** List orders role-based */
export const listOrders = async (req, res) => {
  try {
    const actor = req.user;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;
    const filter = {};
    if (actor.role === "user") filter.userId = actor.id;
    else if (actor.role === "seller") filter.sellerId = actor.id;
    else if (actor.role === "shipper") filter.shipperId = actor.id;
    if (req.query.status) filter.status = req.query.status;
    const [items, total] = await Promise.all([
      Order.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("items.productId", "title price images")
        .populate("sellerId", "name")
        .populate("userId", "name"),
      Order.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/** Get order with permission */
export const getOrder = async (req, res) => {
  try {
    const actor = req.user;
    const id = req.params.id;
    let order;
    if (mongoose.Types.ObjectId.isValid(id)) order = await Order.findById(id);
    else order = await Order.findOne({ orderCode: id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (["admin", "system"].includes(actor.role)) return res.json(order);
    if (actor.role === "user" && order.userId.toString() !== actor.id)
      return res.status(403).json({ message: "Access denied" });
    if (actor.role === "seller" && order.sellerId.toString() !== actor.id)
      return res.status(403).json({ message: "Access denied" });
    if (
      actor.role === "shipper" &&
      (!order.shipperId || order.shipperId.toString() !== actor.id)
    )
      return res.status(403).json({ message: "Access denied" });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/** Assign shipper */
export const assignShipper = async (req, res) => {
  try {
    const actor = req.user;
    const id = req.params.id;
    const { shipperId } = req.body;
    let order = mongoose.Types.ObjectId.isValid(id)
      ? await Order.findById(id)
      : await Order.findOne({ orderCode: id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (
      !(
        actor.role === "admin" ||
        (actor.role === "seller" && order.sellerId.toString() === actor.id)
      )
    )
      return res.status(403).json({ message: "Access denied" });
    order.shipperId = shipperId;
    order.status = "confirmed";
    await order.save();
    // TODO: emit socket notify
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/** Update status */
export const updateStatus = async (req, res) => {
  try {
    const actor = req.user;
    const id = req.params.id;
    const { status } = req.body;
    let order = mongoose.Types.ObjectId.isValid(id)
      ? await Order.findById(id)
      : await Order.findOne({ orderCode: id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (actor.role === "shipper") {
      if (!order.shipperId || order.shipperId.toString() !== actor.id)
        return res.status(403).json({ message: "Not your order" });
      if (!["shipping", "delivered"].includes(status))
        return res.status(400).json({ message: "Invalid status for shipper" });
      order.status = status;
      if (status === "delivered") order.paymentStatus = "paid";
      await order.save();
      return res.json(order);
    }

    if (actor.role === "seller") {
      if (order.sellerId.toString() !== actor.id)
        return res.status(403).json({ message: "Access denied" });
      if (["processing", "cancelled"].includes(status)) {
        order.status = status;
        await order.save();
        return res.json(order);
      }
    }

    if (["admin", "system"].includes(actor.role)) {
      order.status = status;
      await order.save();
      return res.json(order);
    }

    if (actor.role === "user") {
      if (
        status === "cancelled" &&
        order.userId.toString() === actor.id &&
        order.status === "pending"
      ) {
        order.status = "cancelled";
        await order.save();
        return res.json(order);
      }
    }

    return res.status(403).json({ message: "Access denied" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
