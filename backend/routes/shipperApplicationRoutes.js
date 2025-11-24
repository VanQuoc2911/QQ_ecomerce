import express from "express";
import {
  getApplicationDetail,
  getMyApplication,
  listApplications,
  reviewApplication,
  submitMyApplication,
  upsertMyApplication,
} from "../controllers/shipperApplicationController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.get(
  "/me",
  roleGuard(["user", "seller", "shipper", "admin"]),
  getMyApplication
);
router.post(
  "/me",
  roleGuard(["user", "seller", "shipper"]),
  upsertMyApplication
);
router.post(
  "/me/submit",
  roleGuard(["user", "seller", "shipper"]),
  submitMyApplication
);

router.get("/", roleGuard(["admin"]), listApplications);
router.get("/:id", roleGuard(["admin"]), getApplicationDetail);
router.post("/:id/review", roleGuard(["admin"]), reviewApplication);

export default router;
