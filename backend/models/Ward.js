import mongoose from "mongoose";

const wardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "District",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// ensure unique ward per district
wardSchema.index({ district: 1, name: 1 }, { unique: true });

export default mongoose.model("Ward", wardSchema);
