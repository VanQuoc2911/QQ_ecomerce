import type { User, UserProfile, UserResponse } from "../types/User";
import { api } from "./axios";

// ✅ Thông báo khi profile được cập nhật
const notifyProfileUpdated = () => {
  window.dispatchEvent(new Event("profileUpdated"));
};

export const userService = {
  getUsers: async (params?: { page?: number; limit?: number; q?: string }): Promise<UserResponse> => {
    const response = await api.get("/api/users", { params });
    return response.data;
  },

  getUserById: async (id: string | number): Promise<User> => {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  },

  createUser: async (userData: Omit<User, "id" | "_id" | "createdAt" | "updatedAt">): Promise<User> => {
    const response = await api.post("/api/users", userData);
    return response.data;
  },

  updateUser: async (id: string | number, userData: Partial<User>): Promise<User> => {
    const response = await api.put(`/api/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string | number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  },
  // Lấy profile của user đang đăng nhập
  getProfile: async (): Promise<UserProfile> => {
    const res = await api.get("/auth/profile");
    return res.data;
  },

  // Cập nhật profile user (name, phone, address, avatar, shop info)
  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const res = await api.put("/auth/profile", data);
    notifyProfileUpdated();
    return res.data.user; // backend trả { message, user }
  },

  // Đổi mật khẩu
  changePassword: async (oldPassword: string, newPassword: string) => {
    const res = await api.put("/auth/profile/password", { oldPassword, newPassword });
    return res.data;
  },
  
  // Yêu cầu đăng ký seller
  requestSeller: async (payload: {
    shopName: string;
    logo: string;
    address?: string;
    phone?: string;
    website?: string;
    businessLicenseUrl?: string;
    description?: string;
  }) => {
    const res = await api.post("/auth/request-seller", payload);
    return res.data;
  },
  
};
