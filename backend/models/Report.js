import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    actorRole: {
      type: String,
      enum: ["user", "seller", "shipper", "admin", "system"],
      default: "user",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    reportedRole: {
      type: String,
      enum: ["user", "seller", "shipper", "admin", "system"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
    category: {
      type: String,
      default: "general",
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    relatedType: { type: String, default: null },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: String,
    createdByEmail: String,
    activity: { type: [activitySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
