import api from "../api/axios";

export interface SellerStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  completedCount: number;
  pendingCount: number;
  cancelledCount: number;
  revenueLastMonth: number;
}

export interface BankAccount {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  branch?: string;
}

export interface ShopInfo {
  _id: string;          // shopId
  shopName: string;
  logo: string;
  address: string;
  phone: string;
  province?: string;
  lat?: number | null;
  lng?: number | null;
  website?: string;
  description?: string;
  bankAccount?: BankAccount;
  ownerId?: string;
}

export interface PublicShopResponse {
  shop: ShopInfo;
  products: unknown[];
  page?: number;
  limit?: number;
}

export interface Voucher {
  _id: string;
  code: string;
  type: 'amount' | 'percent';
  value: number;
  maxDiscount?: number | null;
  minOrderValue?: number | null;
  usageLimit?: number;
  usedCount?: number;
  expiresAt?: string | null;
  active?: boolean;
  stackable?: boolean;
  targetType?: 'all' | 'category' | 'product';
  targetCategories?: string[];
  targetProducts?: string[];
  highlightText?: string;
  sellerId?: string;
  shopId?: string;
}

export interface SellerReviewUser {
  _id: string;
  name: string;
  avatar?: string;
}

export interface SellerReviewProduct {
  _id: string;
  title: string;
  images?: string[];
}

export interface SellerReview {
  _id: string;
  productId: SellerReviewProduct;
  userId: SellerReviewUser;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  sellerReply?: string;
  sellerReplyAt?: string;
  status?: string;
}

export interface SellerReviewResponse {
  reviews: SellerReview[];
  total: number;
  page: number;
  limit: number;
  products: SellerReviewProduct[];
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
      headers: { "Content-Type": undefined },
    });
    return data;
  },
  async createVoucher(payload: {
    code: string;
    type: 'amount' | 'percent';
    value: number;
    maxDiscount?: number;
    minOrderValue?: number;
    usageLimit?: number;
    expiresAt?: string;
    shopId?: string;
    stackable?: boolean;
    targetType?: 'all' | 'category' | 'product';
    targetCategories?: string[];
    targetProducts?: string[];
    highlightText?: string;
  }) {
    const { data } = await api.post('/api/vouchers/seller', payload);
    return data;
  },
  async getMyVouchers(): Promise<Voucher[]> {
    const { data } = await api.get('/api/vouchers/seller');
    return (data.vouchers || []) as Voucher[];
  },
  async updateVoucher(
    id: string,
    payload: Partial<{
      code: string;
      type: 'amount' | 'percent';
      value: number;
      maxDiscount?: number;
      minOrderValue?: number;
      usageLimit?: number;
      expiresAt?: string;
      active?: boolean;
      stackable?: boolean;
      targetType?: 'all' | 'category' | 'product';
      targetCategories?: string[];
      targetProducts?: string[];
      highlightText?: string;
    }>
  ) {
    const { data } = await api.put(`/api/vouchers/seller/${id}`, payload);
    return data.voucher;
  },
  async deleteVoucher(id: string) {
    const { data } = await api.delete(`/api/vouchers/seller/${id}`);
    return data;
  },

  async getReviews(params?: { page?: number; limit?: number; productId?: string; hasReply?: "true" | "false"; status?: string }): Promise<SellerReviewResponse> {
    const { data } = await api.get("/api/seller/reviews", { params });
    return data;
  },

  async replyReview(reviewId: string, reply: string): Promise<SellerReview> {
    const { data } = await api.post(`/api/seller/reviews/${reviewId}/reply`, { reply });
    return data;
  },
  
  // Public: get shop info and its products by shop id
  async getPublicShop(shopId: string, params?: { page?: number; limit?: number }): Promise<PublicShopResponse> {
    // backend routes mount shopRoutes at /api/shops (plural)
    const { data } = await api.get(`/api/shops/${shopId}`, { params });
    return data as PublicShopResponse;
  },
};
