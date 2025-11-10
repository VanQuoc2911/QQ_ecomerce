import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export const extractTokenFromHeader = (req) => {
  const auth = req.headers.authorization || "";
  const parts = auth.split(" ");
  return parts.length === 2 ? parts[1] : null;
};

// ✅ Middleware xác thực token
export const verifyToken = (req, res, next) => {
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
    req.user = {
      id: decoded.userId || decoded.id || decoded._id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    console.error("verifyToken error:", err);
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
