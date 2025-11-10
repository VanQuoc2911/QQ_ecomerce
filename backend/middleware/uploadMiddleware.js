import multer from "multer";
import { Readable } from "stream";
import cloudinary from "../utils/cloudinary.js"; // nhớ .js nếu dùng ESM

const storage = multer.memoryStorage();
const upload = multer({ storage });

export const uploadToCloudinary = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();
  try {
    const uploadedFiles = [];
    for (const file of req.files) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "images" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        Readable.from(file.buffer).pipe(stream);
      });
      uploadedFiles.push(result.secure_url);
    }
    req.body.images = uploadedFiles;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cloudinary upload failed" });
  }
};

export default upload;
