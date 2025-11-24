import mongoose from "mongoose";

const districtSchema = new mongoose.Schema({
  name: { type: String, required: true },
  oldName: { type: String, default: null }, // Name before 2024 merger
  province: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Province",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// ensure unique district per province
districtSchema.index({ province: 1, name: 1 }, { unique: true });

export default mongoose.model("District", districtSchema);
