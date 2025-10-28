// src/utils/cloudinary.ts
export interface CloudinaryUploadResult {
  asset_id: string;
  public_id: string;
  version: number;
  version_id: string;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  original_filename: string;
  api_key: string;
}

/**
 * Upload ảnh lên Cloudinary
 * @param file - File hình ảnh cần upload
 * @returns Promise<string> - URL ảnh sau khi upload thành công
 */
export const uploadImageToCloudinary = async (
  file: File
): Promise<string> => {
  if (!file) throw new Error("Không có file để upload!");

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary environment variables not set.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  // debug helper (uncomment if needed)
  // const text = await response.text(); console.log("cloudinary resp:", text);

  if (!response.ok) {
    throw new Error(`Upload thất bại: ${response.statusText}`);
  }

  const data: CloudinaryUploadResult = await response.json();
  return data.secure_url;
};
