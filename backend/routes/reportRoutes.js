import express from "express";
import {
  createReport,
  listReports,
  updateReportStatus,
} from "../controllers/reportController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createReport);
router.get("/", verifyToken, roleGuard(["admin"]), listReports);
router.patch(
  "/:id/status",
  verifyToken,
  roleGuard(["admin"]),
  updateReportStatus
);

export default router;
