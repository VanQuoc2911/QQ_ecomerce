import Conversation from "../models/Conversation.js";

export const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { participantId } = req.body; // other user id
    if (!participantId)
      return res.status(400).json({ message: "participantId required" });

    // check if conversation exists (both participants)
    const participants = [userId, participantId];
    let conv = await Conversation.findOne({
      participants: { $all: participants, $size: 2 },
    });
    if (!conv) {
      conv = await Conversation.create({ participants });
    }
    res.status(201).json(conv);
  } catch (err) {
    console.error("createConversation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const convs = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate("participants", "name email shop shopId");
    res.json(convs);
  } catch (err) {
    console.error("getMyConversations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const { convId } = req.params;
    const conv = await Conversation.findById(convId).populate(
      "messages.senderId",
      "name"
    );
    if (!conv)
      return res.status(404).json({ message: "Conversation not found" });
    res.json(conv.messages);
  } catch (err) {
    console.error("getConversationMessages error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { convId, text } = req.body;
    if (!convId || !text)
      return res.status(400).json({ message: "convId and text required" });

    const conv = await Conversation.findById(convId);
    if (!conv)
      return res.status(404).json({ message: "Conversation not found" });

    const msg = { senderId: userId, text, createdAt: new Date(), read: false };
    conv.messages.push(msg);
    conv.lastMessage = text;
    conv.updatedAt = new Date();
    await conv.save();

    // populate the last message sender
    const populated = await Conversation.findById(convId).populate(
      "messages.senderId",
      "name"
    );
    const newMsg = populated.messages[populated.messages.length - 1];

    // emit socket event
    try {
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      if (io) {
        // notify all participants in the conversation room
        io.to(convId.toString()).emit("chat:message", {
          convId,
          message: newMsg,
        });
        // also notify each participant's personal room
        conv.participants.forEach((p) => {
          io.to(p.toString()).emit("chat:message:personal", {
            convId,
            message: newMsg,
          });
        });
      }
    } catch (emitErr) {
      console.error("sendMessage: socket emit failed", emitErr);
    }

    res.status(201).json(newMsg);
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
