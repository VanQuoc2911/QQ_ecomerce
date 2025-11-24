import { api } from "./axios";

export const uploadService = {
  // Upload files (images, documents) to Cloudinary via backend
  uploadFiles: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const { data } = await api.post<{ images: string[] }>("/api/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.images || [];
  },
};
