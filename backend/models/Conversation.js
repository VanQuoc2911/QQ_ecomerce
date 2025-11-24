import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const ConversationSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ],
  messages: [MessageSchema],
  lastMessage: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

ConversationSchema.index({ participants: 1 });

export default mongoose.model("Conversation", ConversationSchema);
