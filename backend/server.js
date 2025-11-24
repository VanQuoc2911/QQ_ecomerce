import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server as IOServer } from "socket.io";
import { init as initAiModels } from "./utils/aiModelManager.js";
import { initSocket } from "./utils/socket.js";

import addressRoutes from "./routes/addressRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import aiChatRoutes from "./routes/aiChatRoutes.js";
import aiModelsRoutes from "./routes/aiModelsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import shipperApplicationRoutes from "./routes/shipperApplicationRoutes.js";
import shipperRoutes from "./routes/shipperRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import voucherRoutes from "./routes/voucherRoutes.js";
import {
  autoApprovePendingProducts,
  autoCancelExpiredOrders,
} from "./systemWorker.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

/* ROUTES */
app.use("/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/auth/profile", profileRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/seller-requests", sellerRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai-chat", aiChatRoutes);
app.use("/api/ai-models", aiModelsRoutes);
app.use("/api/auth", authRoutes);
app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  })
);
app.use("/api", userRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/shipper", shipperRoutes);
app.use("/api/shipper-applications", shipperApplicationRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/upload", (await import("./routes/uploadRoutes.js")).default);
app.get("/", (req, res) => res.send("✅ QQ Ecommerce API running"));

/* SOCKET.IO */
const server = http.createServer(app);
export const io = new IOServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  // Seller join room để nhận thông báo auto approve
  socket.on("joinSellerRoom", ({ userId }) => {
    if (!userId) return;
    socket.join(userId);
    console.log(`Socket ${socket.id} joined seller room ${userId}`);
  });

  socket.on("joinOrder", ({ orderId }) => {
    if (!orderId) return;
    socket.join(orderId);
    console.log(`socket ${socket.id} joined order ${orderId}`);
  });

  // join chat conversation room
  socket.on("joinChat", ({ convId }) => {
    if (!convId) return;
    socket.join(convId);
    console.log(`socket ${socket.id} joined chat room ${convId}`);
  });

  // join personal room (user id) — already used for notifications
  socket.on("joinUserRoom", ({ userId }) => {
    if (!userId) return;
    socket.join(userId);
    console.log(`socket ${socket.id} joined personal room ${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
  });
});

// make io available to controllers via utils/socket.js to avoid circular imports
initSocket(io);

/* DB + Server start */
const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // Initialize AI model manager (auto-detect supported models if env not set)
    try {
      const models = await initAiModels();
      console.log("AI model manager initialized. available models:", models);
    } catch (e) {
      console.warn(
        "AI model manager init failed:",
        e && e.message ? e.message : e
      );
    }

    const INTERVAL_MS = Number(process.env.SYSTEM_WORKER_INTERVAL_MS || 30000);

    // Chạy worker định kỳ
    // DISABLED: Auto-approve for seller requests (manual review only)
    // setInterval(() => autoApproveSellerRequests(io), INTERVAL_MS);
    setInterval(() => autoApprovePendingProducts(io), INTERVAL_MS);
    setInterval(() => autoCancelExpiredOrders(io), INTERVAL_MS);

    server.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("DB connect error", err);
    process.exit(1);
  }
};

start();
