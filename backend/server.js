import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server as IOServer } from "socket.io";
dotenv.config();

import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import { autoApproveSellerRequests } from "./systemWorker.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use("/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

app.get("/", (req, res) => res.send("✅ QQ Ecommerce API running"));

const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH"],
    credentials: true,
  },
});

// Socket.IO events
io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  // join room for order updates
  socket.on("joinOrder", ({ orderId }) => {
    if (!orderId) return;
    socket.join(orderId);
    console.log(`socket ${socket.id} joined order ${orderId}`);
  });

  // shipper emits location updates
  socket.on("shipper:location", async (payload) => {
    // payload: { orderId, shipperId, lat, lon, status }
    try {
      const { orderId, lat, lon, status, shipperId } = payload;
      // broadcast to room (users watching order)
      io.to(orderId).emit("order:location", {
        orderId,
        lat,
        lon,
        status,
        shipperId,
        ts: Date.now(),
      });

      // persist to Mongo: append to order.tracking
      import("./models/Order.js").then(({ default: Order }) => {
        Order.findByIdAndUpdate(orderId, {
          $push: { tracking: { lat, lon, status, ts: new Date() } },
          $set: { shipperId },
        }).catch((err) => console.error("persist tracking err", err));
      });
    } catch (err) {
      console.error("socket shipper:location error", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
  });
});

// connect DB then listen
const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    // system worker
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
