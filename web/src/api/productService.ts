import api from "./axios";

// ✅ Kiểu dữ liệu sản phẩm trả về từ API
export interface ApiProduct {
  soldCount: number;
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

// ✅ Kiểu dữ liệu response API
export interface ProductResponse {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
}

export const productService = {
  // ✅ Lấy danh sách sản phẩm (có thể truyền status, page, limit)
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ProductResponse> => {
    const { data } = await api.get("/api/products", { params });
    return data;
  },

  // ✅ Cập nhật sản phẩm (dùng cho duyệt sản phẩm)
  updateProduct: async (
    id: string | number,
    productData: Partial<ApiProduct>
  ): Promise<ApiProduct> => {
    const { data } = await api.put(`/api/products/${id}`, productData);
    return data;
  },

  // ✅ Lấy chi tiết sản phẩm
  getProductById: async (id: string): Promise<ApiProduct> => {
    const { data } = await api.get(`/api/products/${id}`);
    return data;
  },
    // ✅ Xoá sản phẩm
  deleteProduct: async (id: string | number): Promise<{ message: string }> => {
    const { data } = await api.delete(`/api/products/${id}`);
    return data;
  },
};

