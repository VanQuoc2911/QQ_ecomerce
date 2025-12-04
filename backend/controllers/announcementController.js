import Announcement from "../models/Announcement.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { io } from "../server.js";

const AUDIENCE_MAP = {
  all: {},
  users: { role: "user" },
  sellers: { role: "seller" },
  shippers: { role: "shipper" },
};

export const listAnnouncements = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("createdBy", "name email role")
      .lean();

    res.json(announcements);
  } catch (err) {
    console.error("listAnnouncements error", err);
    res.status(500).json({ message: "Failed to load announcements" });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, audience = "all" } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const normalizedAudience = audience in AUDIENCE_MAP ? audience : "all";
    const audienceFilter = AUDIENCE_MAP[normalizedAudience];

    const recipients = await User.find(audienceFilter).select("_id role");
    if (!recipients.length) {
      return res
        .status(400)
        .json({ message: "Không tìm thấy người nhận phù hợp" });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      audience: normalizedAudience,
      createdBy: req.user.id,
      metadata: { recipientCount: recipients.length },
    });

    const notificationsPayload = recipients.map((recipient) => ({
      userId: recipient._id,
      title: announcement.title,
      message: announcement.message,
      type: "announcement",
      data: {
        announcementId: announcement._id,
        audience: announcement.audience,
      },
      read: false,
    }));

    const notifications = await Notification.insertMany(notificationsPayload, {
      ordered: false,
    });

    if (io) {
      notifications.forEach((notif) => {
        io.to(notif.userId.toString()).emit("notification:new", notif);
      });
    }

    res.status(201).json({
      announcement,
      recipientCount: recipients.length,
    });
  } catch (err) {
    console.error("createAnnouncement error", err);
    res.status(500).json({ message: "Failed to broadcast announcement" });
  }
};
