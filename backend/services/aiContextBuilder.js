import Analytics from "../models/Analytics.js";
import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Report from "../models/Report.js";
import SellerRequest from "../models/SellerRequest.js";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const formatCurrency = (value = 0) =>
  currencyFormatter.format(Math.max(0, Number(value) || 0));
const formatDateTime = (value) => {
  if (!value) return "--";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      hour12: false,
    });
  } catch {
    return String(value);
  }
};

const shortId = (id) => {
  if (!id) return "?";
  const text = String(id);
  return text.slice(-6).toUpperCase();
};

const buildSection = (title, rows = []) => ({
  title,
  items: rows.filter(Boolean).slice(0, 8),
});

const sectionsToText = (sections = [], role) => {
  if (!Array.isArray(sections) || sections.length === 0)
    return `Không tìm thấy dữ liệu cá nhân cho vai trò ${role}.`;
  return sections
    .filter(
      (section) => Array.isArray(section.items) && section.items.length > 0
    )
    .map((section) => {
      const lines = section.items.map((item) => `- ${item}`);
      return `${section.title}:
${lines.join("\n")}`;
    })
    .join("\n\n");
};

const buildUserSections = async (userId) => {
  if (!userId) return [];
  const [orders, notifications] = await Promise.all([
    Order.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id status totalAmount shippingStatus createdAt products.title")
      .lean(),
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("title type createdAt")
      .lean(),
  ]);

  const orderRows = (orders || []).map((order) => {
    const products = Array.isArray(order.products) ? order.products : [];
    const mainProduct = products[0]?.title || "Sản phẩm";
    const extraCount = Math.max(products.length - 1, 0);
    const productLabel =
      extraCount > 0
        ? `${mainProduct} (+${extraCount} sản phẩm khác)`
        : mainProduct;

    return `#${shortId(order._id)} • ${productLabel} • ${formatCurrency(
      order.totalAmount
    )} • ${order.status || "unknown"} / ship ${
      order.shippingStatus || "unassigned"
    } • ${formatDateTime(order.createdAt)}`;
  });

  const notificationRows = (notifications || []).map(
    (notif) =>
      `${notif.title || notif.type || "Thông báo"} • ${formatDateTime(
        notif.createdAt
      )}`
  );

  return [
    buildSection("Đơn hàng gần đây", orderRows),
    buildSection("Thông báo mới nhất", notificationRows),
  ];
};

const buildSellerSections = async (userId) => {
  if (!userId) return [];
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  const [
    pendingOrders,
    awaitingShipmentCount,
    processingCount,
    lowStockProducts,
    todaysOrders,
    monthlyOrders,
  ] = await Promise.all([
    Order.find({
      sellerId: userId,
      status: { $in: ["pending", "processing", "awaiting_shipment"] },
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("_id status totalAmount shippingStatus createdAt updatedAt")
      .lean(),
    Order.countDocuments({ sellerId: userId, status: "awaiting_shipment" }),
    Order.countDocuments({
      sellerId: userId,
      status: { $in: ["pending", "processing"] },
    }),
    Product.find({ sellerId: userId, stock: { $lte: 5 } })
      .sort({ stock: 1 })
      .limit(5)
      .select("title stock soldCount")
      .lean(),
    Order.find({
      sellerId: userId,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: "cancelled" },
    })
      .select("totalAmount status")
      .lean(),
    Order.find({
      sellerId: userId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $ne: "cancelled" },
    })
      .select("totalAmount status")
      .lean(),
  ]);

  const orderRows = (pendingOrders || []).map(
    (order) =>
      `#${shortId(order._id)} • ${order.status} • ship ${
        order.shippingStatus || "unassigned"
      } • ${formatCurrency(order.totalAmount)} • ${formatDateTime(
        order.updatedAt || order.createdAt
      )}`
  );

  const lowStockRows = (lowStockProducts || []).map(
    (product) =>
      `${product.title || "Sản phẩm"} • tồn ${product.stock ?? 0} • đã bán ${
        product.soldCount ?? 0
      }`
  );

  const summaryRow = `Đơn cần chuẩn bị: ${awaitingShipmentCount} | Đơn đang xử lý: ${processingCount}`;

  const completedToday = (todaysOrders || []).filter(
    (order) => order.status === "completed"
  ).length;
  const revenueToday = (todaysOrders || []).reduce(
    (sum, order) => sum + (Number(order.totalAmount) || 0),
    0
  );
  const pendingToday = Math.max(
    (todaysOrders || []).length - completedToday,
    0
  );
  const revenueRow = (todaysOrders || []).length
    ? `Doanh thu: ${formatCurrency(
        revenueToday
      )} • Đơn hoàn tất: ${completedToday} • Đơn chờ xử lý: ${pendingToday}`
    : "Chưa ghi nhận doanh thu trong ngày.";

  const completedMonth = (monthlyOrders || []).filter(
    (order) => order.status === "completed"
  ).length;
  const revenueMonth = (monthlyOrders || []).reduce(
    (sum, order) => sum + (Number(order.totalAmount) || 0),
    0
  );
  const monthlyRow = (monthlyOrders || []).length
    ? `Doanh thu: ${formatCurrency(
        revenueMonth
      )} • Đơn hoàn tất: ${completedMonth} • Tổng đơn tạo: ${
        (monthlyOrders || []).length
      }`
    : "Chưa ghi nhận doanh thu cho tháng này.";

  return [
    buildSection("Doanh thu hôm nay", [revenueRow]),
    buildSection("Doanh thu tháng này", [monthlyRow]),
    buildSection("Tổng quan xử lý đơn", [summaryRow]),
    buildSection("Đơn ưu tiên", orderRows),
    buildSection("Sản phẩm sắp hết hàng", lowStockRows),
  ];
};

const buildAdminSections = async () => {
  const [openReports, pendingSellerRequests, latestAnalytics] =
    await Promise.all([
      Report.find({ status: { $ne: "resolved" } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title severity status createdAt")
        .lean(),
      SellerRequest.countDocuments({ status: "pending" }),
      Analytics.findOne().sort({ date: -1 }).lean(),
    ]);

  const reportRows = (openReports || []).map(
    (report) =>
      `${report.title} • mức ${report.severity} • ${
        report.status
      } • ${formatDateTime(report.createdAt)}`
  );

  const analyticsRow = latestAnalytics
    ? `Ngày ${latestAnalytics.date}: doanh thu ${formatCurrency(
        latestAnalytics.revenue
      )} • ${latestAnalytics.orders} đơn • ${latestAnalytics.users} người dùng`
    : null;

  const sellerRequestRow = `Hồ sơ seller chờ duyệt: ${pendingSellerRequests}`;

  return [
    buildSection("Báo cáo chưa giải quyết", reportRows),
    buildSection("Hiệu suất gần nhất", analyticsRow ? [analyticsRow] : []),
    buildSection("Hồ sơ seller", [sellerRequestRow]),
  ];
};

const buildShipperSections = async (userId) => {
  if (!userId) return [];
  const [assignments, pickupCount] = await Promise.all([
    Order.find({ shipperId: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select(
        "_id status shippingStatus fullName shippingAddress createdAt updatedAt"
      )
      .lean(),
    Order.countDocuments({
      shipperId: userId,
      shippingStatus: { $in: ["assigned", "pickup_pending"] },
    }),
  ]);

  const assignmentRows = (assignments || []).map((order) => {
    const recipient = order.fullName || order.shippingAddress?.name || "Khách";
    return `#${shortId(order._id)} • ${recipient} • ${
      order.shippingStatus || order.status
    } • ${formatDateTime(order.updatedAt || order.createdAt)}`;
  });

  return [
    buildSection("Đơn được giao", assignmentRows),
    buildSection("Chờ lấy hàng", [`Đơn cần lấy: ${pickupCount}`]),
  ];
};

export const buildAIContext = async ({
  role = "user",
  userId = null,
  userName = null,
} = {}) => {
  let sections = [];
  try {
    switch (role) {
      case "seller":
        sections = await buildSellerSections(userId);
        break;
      case "admin":
        sections = await buildAdminSections();
        break;
      case "shipper":
        sections = await buildShipperSections(userId);
        break;
      case "user":
      default:
        sections = await buildUserSections(userId);
        break;
    }
  } catch (err) {
    console.error("buildAIContext: failed to gather data", err);
    sections = [];
  }

  const text = sectionsToText(sections, role);
  return {
    role,
    userName,
    text,
    sections,
    clientSummary: sections
      .filter(
        (section) => Array.isArray(section.items) && section.items.length > 0
      )
      .map((section) => ({
        title: section.title,
        items: section.items.slice(0, 5),
      })),
  };
};
