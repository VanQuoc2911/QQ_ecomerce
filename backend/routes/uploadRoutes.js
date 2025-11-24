import express from "express";
import upload, { uploadToCloudinary } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// POST /api/upload - accepts files under field 'files' and returns uploaded URLs
router.post("/", upload.array("files", 6), uploadToCloudinary, (req, res) => {
  try {
    // uploadToCloudinary will set req.body.images to uploaded URLs
    const images = req.body.images || [];
    res.json({ success: true, images });
  } catch (err) {
    console.error("upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

export default router;
