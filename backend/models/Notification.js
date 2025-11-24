import mongoose from "mongoose";
const notificationSchema = new mongoose.Schema(
  {
    id: Number,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: String,
    message: String,
    url: String,
    refId: String,
    data: mongoose.Schema.Types.Mixed,
    type: String,
    read: Boolean,
    createdAt: Date,
  },
  { timestamps: true }
);
export default mongoose.model("Notification", notificationSchema);
