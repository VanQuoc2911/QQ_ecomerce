// systemWorker.js
import Product from "./models/Product.js";
import SellerRequest from "./models/SellerRequest.js";
import Shop from "./models/Shop.js";
import User from "./models/User.js";

// Nếu muốn gán reviewer hệ thống — helper to get or create a system user
const SYSTEM_ADMIN_EMAIL = process.env.SYSTEM_ADMIN_EMAIL || "system@local";

async function getSystemUserId() {
  try {
    const existing = await User.findOne({ role: "system" });
    if (existing) return existing._id;
    // create a system user
    const created = await User.create({
      name: "System",
      email: SYSTEM_ADMIN_EMAIL,
      password: Math.random().toString(36).slice(2),
      role: "system",
    });
    return created._id;
  } catch (err) {
    console.error("getSystemUserId error:", err);
    return null;
  }
}

/**
 * Auto approve pending products
 * @param {import("socket.io").Server} io
 */
export const autoApprovePendingProducts = async (io) => {
  try {
    // Read current system settings from DB
    const SystemSetting = (await import("./models/SystemSettings.js")).default;
    const settings = await SystemSetting.findOne();
    if (!settings || !settings.autoApproveProducts) return;

    const pendingProducts = await Product.find({ status: "pending" })
      .limit(10)
      .populate("sellerId", "name email");

    for (const product of pendingProducts) {
      product.status = "approved";
      product.reviewedAt = new Date();
      product.reviewNote = "Auto approved by system";
      // attach system user id as reviewer if available
      const sysId = await getSystemUserId();
      if (sysId) product.reviewerId = sysId;

      await product.save();

      // gửi notification qua socket.io tới seller
      if (product.sellerId?._id && io) {
        io.to(product.sellerId._id.toString()).emit("product:approved", {
          productId: product._id,
          title: product.title,
          message: "Your product has been auto approved!",
          ts: Date.now(),
        });
      }

      console.log(
        `[AutoApprove] Product approved: ${product.title} (${product._id}) for seller ${product.sellerId?.name}`
      );
    }
  } catch (err) {
    console.error("autoApprovePendingProducts error:", err);
  }
};

/**
 * Auto cancel orders with expired payment deadline
 * Chỉ áp dụng cho đơn đang "pending" (chờ thanh toán của khách)
 * Đơn đã ở trạng thái "payment_pending" sẽ chờ seller xử lý, không auto-cancel nữa
 */
export const autoCancelExpiredOrders = async (io) => {
  try {
    const Order = (await import("./models/Order.js")).default;
    const Product = (await import("./models/Product.js")).default;
    const Notification = (await import("./models/Notification.js")).default;

    // Find orders that are pending (waiting for customer payment) and deadline has passed
    const now = new Date();
    const expiredOrders = await Order.find({
      status: "pending",
      paymentDeadline: { $lt: now },
      paymentExpired: false,
      paymentMethod: { $in: ["banking", "momo"] }, // Only auto-cancel banking/momo payments
    }).limit(10);

    for (const order of expiredOrders) {
      try {
        // Restore product stock
        if (order.products && Array.isArray(order.products)) {
          for (const product of order.products) {
            await Product.findByIdAndUpdate(
              product.productId,
              {
                $inc: {
                  stock: product.quantity,
                  soldCount: -product.quantity,
                },
              },
              { new: true }
            );
          }
        }

        order.status = "cancelled";
        order.paymentExpired = true;
        await order.save();

        // Notify customer
        try {
          const notif = new Notification({
            userId: order.userId,
            title: "Đơn hàng đã hủy",
            message: `Đơn hàng ${order._id} đã bị hủy do quá hạn thanh toán (24h). Vui lòng đặt hàng lại nếu cần.`,
            type: "order",
            read: false,
          });
          await notif.save();
        } catch (nErr) {
          console.error(
            "Failed to create notification for cancelled order:",
            nErr
          );
        }

        // Emit socket event to user
        if (io && order.userId) {
          io.to(order.userId.toString()).emit("order:expired", {
            orderId: order._id,
            message: "Đơn hàng đã hủy do quá hạn thanh toán (24h)",
            status: order.status,
            paymentMethod: order.paymentMethod,
            ts: Date.now(),
          });
        }

        console.log(
          `[AutoCancel] Order cancelled: ${order._id} (exceeded 24h deadline for ${order.paymentMethod})`
        );
      } catch (orderErr) {
        console.error(`Failed to cancel order ${order._id}:`, orderErr);
      }
    }
  } catch (err) {
    console.error("autoCancelExpiredOrders error:", err);
  }
};

/**
 * Auto approve seller requests (DISABLED - Manual review required)
 * @param {import("socket.io").Server} io
 */
export const autoApproveSellerRequests = async (io) => {
  try {
    // DISABLED: Seller requests require manual admin approval
    console.log(
      "[AutoApprove] Seller requests manual review only - auto-approve disabled"
    );
    return;

    // Read settings from DB
    const SystemSetting = (await import("./models/SystemSettings.js")).default;
    const settings = await SystemSetting.findOne();
    if (!settings || !settings.autoApproveSellers) return;

    const pendingRequests = await SellerRequest.find({
      status: "pending",
    }).limit(10);

    for (const reqDoc of pendingRequests) {
      reqDoc.status = "approved";
      reqDoc.reviewedAt = new Date();
      const sysId2 = await getSystemUserId();
      if (sysId2) reqDoc.reviewerId = sysId2;
      reqDoc.reviewNote = "Auto approved by system";
      await reqDoc.save();

      // Tạo shop nếu chưa có
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

      // gửi notification qua socket.io tới user
      if (io) {
        io.to(reqDoc.userId.toString()).emit("sellerRequest:approved", {
          requestId: reqDoc._id,
          message: "Your seller request has been auto approved!",
          ts: Date.now(),
        });
      }

      console.log(`[AutoApprove] Seller request approved: ${reqDoc._id}`);
    }
  } catch (err) {
    console.error("autoApproveSellerRequests error:", err);
  }
};
