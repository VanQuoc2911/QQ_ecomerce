import express from "express";
import * as aiChatController from "../controllers/aiChatController.js";

const router = express.Router();

// POST /api/ai-chat - Send message to AI and get response
// No auth required for general support
router.post("/", aiChatController.sendAIMessage);

export default router;
