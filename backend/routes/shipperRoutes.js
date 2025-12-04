import express from "express";
import {
  addCheckpoint,
  claimOrder,
  getShipperOrderDetail,
  getShipperSummary,
  listAssignedOrders,
  listAvailableOrders,
  syncOfflineUpdates,
  updateShippingStatus,
} from "../controllers/shipperController.js";
import { roleGuard, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
const requireShipper = [verifyToken, roleGuard(["shipper"])].filter(Boolean);

router.get("/summary", ...requireShipper, getShipperSummary);
router.get("/orders", ...requireShipper, listAssignedOrders);
router.get("/orders/available", ...requireShipper, listAvailableOrders);
router.get("/orders/:orderId", ...requireShipper, getShipperOrderDetail);
router.post("/orders/:orderId/claim", ...requireShipper, claimOrder);
router.post("/orders/:orderId/status", ...requireShipper, updateShippingStatus);
router.post("/orders/:orderId/checkpoints", ...requireShipper, addCheckpoint);
router.post("/orders/sync", ...requireShipper, syncOfflineUpdates);

export default router;
