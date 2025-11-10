import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server as IOServer } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { autoApproveSellerRequests } from "./systemWorker.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(cookieParser());

/* ============================
✅ CORS CHUẨN CHO GOOGLE LOGIN
============================= */
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

/* ============================
✅ ROUTES
============================= */
app.use("/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/auth/profile", profileRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/seller-requests", sellerRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);

app.get("/", (req, res) => res.send("✅ QQ Ecommerce API running"));

/* ============================
✅ SOCKET IO
============================= */
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("joinOrder", ({ orderId }) => {
    if (!orderId) return;
    socket.join(orderId);
    console.log(`socket ${socket.id} joined order ${orderId}`);
  });

  socket.on(
    "shipper:location",
    async ({ orderId, lat, lon, status, shipperId }) => {
      try {
        io.to(orderId).emit("order:location", {
          orderId,
          lat,
          lon,
          status,
          shipperId,
          ts: Date.now(),
        });

        import("./models/Order.js").then(({ default: Order }) => {
          Order.findByIdAndUpdate(orderId, {
            $push: { tracking: { lat, lon, status, ts: new Date() } },
            $set: { shipperId },
          }).catch((err) => console.error("persist tracking err", err));
        });
      } catch (err) {
        console.error("socket shipper:location error", err);
      }
    }
  );

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
  });
});

/* ============================
✅ DB + Server Start
============================= */
const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const INTERVAL_MS = Number(process.env.SYSTEM_WORKER_INTERVAL_MS || 30000);
    setInterval(autoApproveSellerRequests, INTERVAL_MS);

    server.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("DB connect error", err);
    process.exit(1);
  }
};

start();

export { io };
