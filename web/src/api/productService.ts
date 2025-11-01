import api from "./axios";

// ✅ Định nghĩa kiểu dữ liệu sản phẩm trả về từ API
export interface ApiProduct {
  _id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  sellerId: string;
  categories: string[];
  status: string;
  createdAt: string;
  Rating: number;
  __v: number;
}

// ✅ Định nghĩa kiểu dữ liệu response API
export interface ProductResponse {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
}

export const productService = {
  // ✅ Lấy danh sách sản phẩm
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ProductResponse> => {
    const { data } = await api.get("/api/products", { params });
    return data;
  },

  // ✅ Lấy chi tiết sản phẩm theo ID
  getProductById: async (id: string): Promise<ApiProduct> => {
    const { data } = await api.get(`/api/products/${id}`);
    return data;
  },
};