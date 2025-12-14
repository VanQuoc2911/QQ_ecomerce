import api from "./axios";

export interface Category {
  _id: string;
  id?: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryPayload {
  name: string;
  description?: string;
}

const baseUrl = "/api/admin/categories";

export const categoryService = {
  async list(): Promise<Category[]> {
    const { data } = await api.get<Category[]>(baseUrl);
    return data;
  },
  // Public listing for non-admin consumers (sellers, public pages)
  async listPublic(): Promise<Category[]> {
    const { data } = await api.get<Category[]>("/api/categories");
    return data;
  },
  async create(payload: CategoryPayload): Promise<Category> {
    const { data } = await api.post<Category>(baseUrl, payload);
    return data;
  },
  async update(id: string | number, payload: CategoryPayload): Promise<Category> {
    const { data } = await api.put<Category>(`${baseUrl}/${id}`, payload);
    return data;
  },
  async remove(id: string | number): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
};
