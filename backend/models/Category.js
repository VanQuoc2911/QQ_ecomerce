import mongoose from "mongoose";
const categorySchema = new mongoose.Schema(
  { id: Number, name: String, description: String },
  { timestamps: true }
);
export default mongoose.model("Category", categorySchema);
