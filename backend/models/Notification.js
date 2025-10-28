import mongoose from "mongoose";
const notificationSchema = new mongoose.Schema(
  {
    id: Number,
    userId: Number,
    title: String,
    message: String,
    type: String,
    read: Boolean,
    createdAt: Date,
  },
  { timestamps: true }
);
export default mongoose.model("Notification", notificationSchema);
