import type { User, UserResponse } from "../types/User";
import { api } from "./axios";

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
};
