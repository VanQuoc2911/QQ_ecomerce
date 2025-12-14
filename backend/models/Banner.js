import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  image: { type: String, required: true },
  link: { type: String, default: "" },
  type: { type: String, enum: ["hero", "slot", "side"], default: "hero" },
  kind: { type: String, enum: ["banner", "ad"], default: "banner" },
  position: { type: String, default: "top" },
  active: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Banner", bannerSchema);
