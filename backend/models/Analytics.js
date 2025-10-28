import mongoose from "mongoose";
const analyticsSchema = new mongoose.Schema(
  { id: Number, date: String, revenue: Number, orders: Number, users: Number },
  { timestamps: true }
);
export default mongoose.model("Analytics", analyticsSchema);
