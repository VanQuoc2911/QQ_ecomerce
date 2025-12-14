import api from "./axios";

// ✅ Kiểu dữ liệu sản phẩm trả về từ API
export interface ApiProduct {
  soldCount: number;
  _id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  views?: number;
  images: string[];
  videos?: string[];
  sellerId: string;
  shopId?: string | { _id: string; shopName: string; logo?: string; province?: string };
  categories: string[];
  origin?: string;
  rating?: number;
  reviewCount?: number;
  status: string;
  isListed?: boolean;
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
  // ✅ Lấy danh sách sản phẩm công khai (có thể truyền status, page, limit)
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    q?: string;
    shopId?: string;
    province?: string;
    origin?: string;
    category?: string;
    minRating?: number;
  }): Promise<ProductResponse> => {
    const { data } = await api.get("/api/products", { params });
    return data;
  },

  // ✅ Lấy chỉ sản phẩm của seller hiện tại (yêu cầu auth token)
  getMyProducts: async (): Promise<ApiProduct[]> => {
    const { data } = await api.get("/api/products/me/products");
    return data;
  },

  // ✅ Cập nhật sản phẩm
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
  // Record a product view (increments server-side counter)
  recordView: async (id: string): Promise<{ productId: string; views: number }> => {
    const { data } = await api.post(`/api/products/${id}/view`);
    return data;
  },
    // ✅ Xoá sản phẩm
  deleteProduct: async (id: string | number): Promise<{ message: string }> => {
    const { data } = await api.delete(`/api/products/${id}`);
    return data;
  },

    // ✅ Cập nhật trạng thái hiển thị (seller)
    updateListingStatus: async (id: string, isListed: boolean) => {
      const { data } = await api.patch(`/api/seller/products/${id}/listing`, { isListed });
      return data;
    },
};

