import type { Product, ProductResponse } from "../types/Product";
import { api } from "./axios";

export const productService = {
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: "pending" | "approved" | "rejected" | "draft";
  }): Promise<ProductResponse> => {
    const response = await api.get<ProductResponse>("/api/products", { params });
    return response.data;
  },

  getProductById: async (id: string | number): Promise<Product> => {
    const response = await api.get<Product>(`/api/products/${id}`);
    return response.data;
  },

  createProduct: async (
    productData: Omit<Product, "id" | "createdAt" | "updatedAt">
  ): Promise<Product> => {
    const response = await api.post<Product>("/api/products", productData);
    return response.data;
  },

  updateProduct: async (
    id: string | number,
    productData: Partial<Product>
  ): Promise<Product> => {
    const response = await api.put<Product>(`/api/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id: string | number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/products/${id}`);
    return response.data;
  },
};
