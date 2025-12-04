import Report from "../models/Report.js";

const allowedStatus = ["open", "in_progress", "resolved"];
const allowedSeverity = ["low", "medium", "high", "critical"];
const allowedRoles = ["user", "seller", "shipper", "admin", "system"];

const buildFilters = (query = {}) => {
  const filters = {};
  if (query.role && query.role !== "all" && allowedRoles.includes(query.role)) {
    filters.reportedRole = query.role;
  }
  if (query.status && allowedStatus.includes(query.status)) {
    filters.status = query.status;
  }
  if (query.severity && allowedSeverity.includes(query.severity)) {
    filters.severity = query.severity;
  }
  if (query.search) {
    const term = query.search.trim();
    if (term) {
      filters.$or = [
        { title: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { createdByName: { $regex: term, $options: "i" } },
      ];
    }
  }
  if (query.category) {
    filters.category = query.category;
  }
  return filters;
};

export const createReport = async (req, res) => {
  try {
    const {
      title,
      description,
      severity = "medium",
      category = "general",
      metadata = {},
      relatedType = null,
      relatedId = null,
      reportedRole,
    } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "title and description required" });
    }

    const sourceRole = allowedRoles.includes(reportedRole)
      ? reportedRole
      : req.user?.role || "user";

    const report = await Report.create({
      title: title.trim(),
      description: description.trim(),
      severity: allowedSeverity.includes(severity) ? severity : "medium",
      category: category?.trim() || "general",
      metadata,
      relatedType: relatedType || null,
      relatedId: relatedId || null,
      reportedRole: sourceRole,
      createdBy: req.user?.id || null,
      createdByName: req.user?.name || null,
      createdByEmail: req.user?.email || null,
    });

    return res.status(201).json(report);
  } catch (err) {
    console.error("createReport error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const listReports = async (req, res) => {
  try {
    const filters = buildFilters(req.query);
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const reports = await Report.find(filters)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json(reports);
  } catch (err) {
    console.error("listReports error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "invalid status" });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = status;
    report.activity.push({
      status,
      note: note || "",
      actorId: req.user?.id || null,
      actorName: req.user?.name || "Admin",
      actorRole: req.user?.role || "admin",
    });
    await report.save();

    return res.json(report);
  } catch (err) {
    console.error("updateReportStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
