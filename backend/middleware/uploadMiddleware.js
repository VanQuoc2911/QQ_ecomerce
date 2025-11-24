// middleware/uploadMiddleware.js
import multer from "multer";
import { Readable } from "stream";
import cloudinary from "../utils/cloudinary.js"; // đường dẫn theo project của bạn

// multer memory storage để lấy buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// middleware wrapper: upload.array("images", max)
export const uploadArray = (fieldName = "images", maxCount = 6) =>
  upload.array(fieldName, maxCount);

// upload buffers -> cloudinary, gán req.body.images = [urls]
export const uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.files) return next();

    const filesByField = Array.isArray(req.files)
      ? [{ fieldName: "images", files: req.files }]
      : Object.entries(req.files).map(([fieldName, files]) => ({
          fieldName,
          files,
        }));

    const uploadedUrls = {};

    for (const { fieldName, files } of filesByField) {
      if (!files || !files.length) continue;
      uploadedUrls[fieldName] = uploadedUrls[fieldName] || [];

      for (const file of files) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: process.env.CLOUDINARY_FOLDER || "products",
              resource_type: fieldName === "videos" ? "video" : "image",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          Readable.from(file.buffer).pipe(stream);
        });
        uploadedUrls[fieldName].push(result.secure_url);
      }
    }

    const mergeField = (field) => {
      const urls = uploadedUrls[field];
      if (!urls || !urls.length) return;

      if (req.body[field]) {
        try {
          const parsed =
            typeof req.body[field] === "string"
              ? JSON.parse(req.body[field])
              : req.body[field];
          req.body[field] = Array.isArray(parsed) ? [...parsed, ...urls] : urls;
        } catch {
          req.body[field] = urls;
        }
      } else {
        req.body[field] = urls;
      }
    };

    mergeField("images");
    mergeField("videos");

    next();
  } catch (err) {
    console.error("uploadToCloudinary error:", err);
    return res
      .status(500)
      .json({ message: "Cloudinary upload failed", error: err.message });
  }
};

export default upload;
