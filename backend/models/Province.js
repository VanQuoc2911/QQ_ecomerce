import mongoose from "mongoose";

const provinceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  oldName: { type: String, default: null }, // Name before 2024 merger
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Province", provinceSchema);
