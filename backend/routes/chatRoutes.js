import express from "express";
import * as chatController from "../controllers/chatController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, chatController.createConversation);
router.get("/", verifyToken, chatController.getMyConversations);
router.get(
  "/:convId/messages",
  verifyToken,
  chatController.getConversationMessages
);
router.post("/messages", verifyToken, chatController.sendMessage);

export default router;
