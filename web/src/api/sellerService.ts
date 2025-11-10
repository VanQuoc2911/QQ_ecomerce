import api from "../api/axios";

export interface SellerStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
}

export interface ShopInfo {
  _id: string;          // shopId
  shopName: string;
  logo: string;
  address: string;
  phone: string;
  website?: string;
  description?: string;
}

export const sellerService = {
  async getStats(): Promise<SellerStats> {
    const { data } = await api.get("/api/seller/stats");
    return data;
  },

  async getShopInfo(): Promise<ShopInfo> {
    const { data } = await api.get("/api/seller/shop");
    return data;
  },

  async updateShopInfo(payload: Partial<ShopInfo>): Promise<ShopInfo> {
    const { data } = await api.put("/api/seller/shop", payload);
    return data;
  },

  async createProduct(formData: FormData) {
    const { data } = await api.post("/api/seller/products", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
