import express from "express";
import {
  changePassword,
  deleteUser,
  getProfile,
  getUserById,
  listUsers,
  updateProfile,
  updateUser,
} from "../controllers/profileController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// --------- USER routes ---------
router.get("/", verifyToken, getProfile);
router.put("/", verifyToken, updateProfile);
router.put("/password", verifyToken, changePassword);

// --------- ADMIN routes ---------
router.get("/admin/users", verifyToken, roleGuard(["admin"]), listUsers);
router.get("/admin/users/:id", verifyToken, roleGuard(["admin"]), getUserById);
router.put("/admin/users/:id", verifyToken, roleGuard(["admin"]), updateUser);
router.delete(
  "/admin/users/:id",
  verifyToken,
  roleGuard(["admin"]),
  deleteUser
);

export default router;
