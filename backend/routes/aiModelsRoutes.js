import express from "express";
import * as aiModelsController from "../controllers/aiModelsController.js";

const router = express.Router();

// GET /api/ai-models/status - probe configured models
router.get("/status", aiModelsController.status);

// GET /api/ai-models/blacklist - view in-memory blacklist
router.get("/blacklist", aiModelsController.getBlacklist);

// POST /api/ai-models/blacklist/clear - clear in-memory blacklist
router.post("/blacklist/clear", aiModelsController.clearBlacklist);

export default router;
