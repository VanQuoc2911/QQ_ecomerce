import type { Order, OrderResponse } from "../types/Order";
import { api } from "./axios";

export const orderService = {
  getOrders: async (params?: { page?: number; limit?: number; userId?: number }): Promise<OrderResponse> => {
    const response = await api.get("/api/orders", { params });
    return response.data;
  },

  getOrderById: async (id: string | number): Promise<Order> => {
    const response = await api.get(`/api/orders/${id}`);
    return response.data;
  },

  createOrder: async (orderData: { userId: number; total: number; status?: string; date?: string }): Promise<Order> => {
    const response = await api.post("/api/orders", orderData);
    return response.data;
  },

  updateOrder: async (id: string | number, orderData: Partial<Order>): Promise<Order> => {
    const response = await api.put(`/api/orders/${id}`, orderData);
    return response.data;
  },

  deleteOrder: async (id: string | number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/orders/${id}`);
    return response.data;
  },
};
