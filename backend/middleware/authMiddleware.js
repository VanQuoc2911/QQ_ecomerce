import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export const extractTokenFromHeader = (req) => {
  const auth = req.headers.authorization || "";
  const parts = auth.split(" ");
  return parts.length === 2 ? parts[1] : null;
};

// ✅ Middleware xác thực token
export const verifyToken = async (req, res, next) => {
  const token = extractTokenFromHeader(req) || req.cookies?.token;

  if (!token) return res.status(401).json({ message: "Token required" });

  // ✅ Bypass admin token
  if (token === "admin-token") {
    req.user = {
      id: "000000000000000000000000", // ObjectId giả hợp lệ
      email: "admin@example.com",
      role: "admin",
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    req.user = {
      id: userId,
      email: decoded.email,
      role: decoded.role,
    };

    try {
      const freshUser = await User.findById(userId)
        .select("role email name shipperApproved sellerApproved")
        .lean();
      if (freshUser) {
        req.user.role = freshUser.role;
        req.user.email = freshUser.email;
        req.user.name = freshUser.name;
        req.user.shipperApproved = freshUser.shipperApproved;
        req.user.sellerApproved = freshUser.sellerApproved;
      }
    } catch (userErr) {
      console.warn("verifyToken: failed to load user profile", userErr);
    }

    next();
  } catch (err) {
    console.error("verifyToken error:", err);
    // Handle expired token explicitly so client can react (e.g., prompt re-login / refresh)
    if (err && err.name === "TokenExpiredError") {
      const expiredAt = err.expiredAt || null;
      // Optionally set a header so clients can detect expiration quickly
      if (expiredAt)
        res.setHeader("X-Token-Expired-At", expiredAt.toISOString());
      return res.status(401).json({ message: "TokenExpired", expiredAt });
    }

    return res.status(401).json({ message: "Invalid token" });
  }
};

// ✅ Middleware kiểm tra quyền
export const roleGuard =
  (allowedRoles = []) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthenticated" });
    if (allowedRoles.length === 0 || allowedRoles.includes(req.user.role))
      return next();
    return res.status(403).json({ message: "Access denied" });
  };

// ✅ Check admin
export const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  next();
};
