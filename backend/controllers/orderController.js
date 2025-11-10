import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import Cart from "../models/Cart.js";

/** ===================== CREATE ORDER ===================== */
/**
 * Tạo đơn hàng từ giỏ hàng hoặc trực tiếp
 * Nếu user checkout giỏ hàng có nhiều sản phẩm từ nhiều seller,
 * sẽ tạo 1 order riêng cho mỗi seller
 */
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, shopId, isBuyNow } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "No items provided" });

    const productIds = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const orderProducts = [];
    for (const it of items) {
      const p = products.find(x => x._id.toString() === it.productId);
      if (!p) return res.status(400).json({ message: `Product ${it.productId} not found` });
      if (p.stock < it.quantity) return res.status(400).json({ message: `Not enough stock for ${p.title}` });

      p.stock -= it.quantity;
      p.soldCount = (p.soldCount || 0) + it.quantity;
      await p.save();

      orderProducts.push({
        productId: p._id,
        title: p.title,
        quantity: it.quantity,
        price: p.price,
        sellerId: p.sellerId,
      });
    }

    const totalAmount = orderProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);

    const order = await Order.create({
      userId,
      sellerId: orderProducts[0].sellerId,
      shopId: shopId || null,
      products: orderProducts,
      totalAmount,
      status: "completed",
    });

    if (shopId) {
      const shop = await Shop.findById(shopId);
      if (shop) {
        shop.totalRevenue = (shop.totalRevenue || 0) + totalAmount;
        shop.totalOrders = (shop.totalOrders || 0) + 1;
        await shop.save();
      }
    }

    // Xóa sản phẩm đã checkout khỏi giỏ hàng
    if (!isBuyNow) {
      const cart = await Cart.findOne({ userId });
      if (cart) {
        cart.items = cart.items.filter(ci => !items.find(i => i.productId === ci.productId.toString()));
        await cart.save();
      }
    }

    res.status(201).json({ message: "Order created", order });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(500).json({ message: err.message || "Server error" });
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
