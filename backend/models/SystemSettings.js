// models/SystemSetting.js
import mongoose from "mongoose";

const SmtpSchema = new mongoose.Schema({
  email: { type: String, default: "" },
  smtpServer: { type: String, default: "" },
  smtpPort: { type: Number, default: 587 },
});

const SystemSettingSchema = new mongoose.Schema({
  // separate toggles for products and seller requests
  autoApproveProducts: { type: Boolean, default: false },
  autoApproveSellers: { type: Boolean, default: false },
  smtp: { type: SmtpSchema, default: () => ({}) },
  serviceFeePercent: { type: Number, default: 0 },
  sellerServiceFeePercent: { type: Number, default: 0 },
});

const SystemSetting = mongoose.model("SystemSetting", SystemSettingSchema);
export default SystemSetting;
