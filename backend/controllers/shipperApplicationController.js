import mongoose from "mongoose";
import ShipperApplication from "../models/ShipperApplication.js";
import User from "../models/User.js";

const ensureEditable = (application) => {
  if (!application) return;
  if (["pending", "approved"].includes(application.status)) {
    throw new Error(
      "Hồ sơ đang chờ duyệt hoặc đã được phê duyệt, không thể chỉnh sửa"
    );
  }
};

const collectUpdates = (payload = {}) => {
  const allowedFields = [
    "personalInfo",
    "contactInfo",
    "vehicleInfo",
    "operationAreas",
    "documents",
    "training",
  ];
  return allowedFields.reduce((acc, field) => {
    if (payload[field] !== undefined) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});
};

export const getMyApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const application = await ShipperApplication.findOne({ userId }).lean();
    return res.json({ success: true, application });
  } catch (error) {
    console.error("getMyApplication error", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const upsertMyApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const application = await ShipperApplication.findOne({ userId });
    if (application) {
      ensureEditable(application);
    }

    const updates = collectUpdates(req.body);
    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Không có dữ liệu cần lưu" });
    }

    const nextStatus =
      application?.status === "rejected" ? "draft" : application?.status;

    const updated = await ShipperApplication.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...updates,
          status: nextStatus || "draft",
        },
        $setOnInsert: { userId },
        $push: {
          history: {
            action: "update",
            note: req.body.__note || "Cập nhật thông tin",
            actorId: userId,
          },
        },
      },
      { new: true, upsert: true }
    );

    return res.json({ success: true, application: updated });
  } catch (error) {
    console.error("upsertMyApplication error", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

const validateBeforeSubmit = (application) => {
  const missing = [];
  if (!application.personalInfo?.fullName) missing.push("Họ tên đầy đủ");
  if (!application.personalInfo?.dateOfBirth) missing.push("Ngày sinh");
  if (!application.contactInfo?.email) missing.push("Email");
  if (!application.contactInfo?.phone) missing.push("Số điện thoại");
  if (!application.contactInfo?.emailVerified) missing.push("Xác thực email");
  if (!application.contactInfo?.phoneVerified)
    missing.push("Xác thực số điện thoại");
  if (!application.vehicleInfo?.vehicleType) missing.push("Loại phương tiện");
  if (!application.vehicleInfo?.licensePlate) missing.push("Biển số xe");
  const docs = application.documents || {};
  [
    { key: "portraitUrl", label: "Ảnh chân dung" },
    { key: "nationalIdFrontUrl", label: "CCCD mặt trước" },
    { key: "nationalIdBackUrl", label: "CCCD mặt sau" },
    { key: "driverLicenseUrl", label: "Giấy phép lái xe" },
    { key: "vehicleRegistrationUrl", label: "Đăng ký xe" },
  ].forEach(({ key, label }) => {
    if (!docs[key]) missing.push(label);
  });
  if (!application.training?.completed) missing.push("Hoàn thành khoá đào tạo");
  if (!application.operationAreas?.length) missing.push("Khu vực hoạt động");
  return missing;
};

export const submitMyApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const application = await ShipperApplication.findOne({ userId });
    if (!application) {
      return res.status(404).json({ success: false, message: "Chưa có hồ sơ" });
    }
    ensureEditable(application);

    const missing = validateBeforeSubmit(application);
    if (missing.length) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin", missing });
    }

    application.status = "pending";
    application.submittedAt = new Date();
    application.history.push({
      action: "submit",
      note: "Nộp hồ sơ",
      actorId: userId,
    });
    await application.save();

    return res.json({ success: true, application });
  } catch (error) {
    console.error("submitMyApplication error", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export const listApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }
    const pageSize = Math.min(Number(limit) || 20, 100);
    const skip = (Number(page) - 1) * pageSize;

    const [items, total] = await Promise.all([
      ShipperApplication.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate("userId", "name email phone role shipperApproved"),
      ShipperApplication.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: Number(page),
        pageSize,
      },
    });
  } catch (error) {
    console.error("listApplications error", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getApplicationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const application = await ShipperApplication.findById(id).populate(
      "userId",
      "name email phone role shipperApproved"
    );
    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy hồ sơ" });
    }
    return res.json({ success: true, application });
  } catch (error) {
    console.error("getApplicationDetail error", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const reviewApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    if (!["approved", "rejected"].includes(decision)) {
      return res
        .status(400)
        .json({ success: false, message: "Quyết định không hợp lệ" });
    }

    const application = await ShipperApplication.findById(id);
    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy hồ sơ" });
    }

    application.status = decision;
    application.review = {
      reviewerId: req.user.id,
      note,
      decidedAt: new Date(),
    };
    application.history.push({
      action: decision,
      note: note || (decision === "approved" ? "Duyệt hồ sơ" : "Từ chối hồ sơ"),
      actorId: req.user.id,
    });

    await application.save();

    const user = await User.findById(application.userId);
    if (user) {
      if (decision === "approved") {
        user.role = "shipper";
        user.shipperApproved = true;
      }
      await user.save();
    }

    return res.json({ success: true, application });
  } catch (error) {
    console.error("reviewApplication error", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
