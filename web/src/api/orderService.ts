import api from "./axios";

export interface SellerOrder {
  _id: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export const orderService = {
  async getOrders(): Promise<SellerOrder[]> {
    const { data } = await api.get("/api/seller/orders");
    return data;
  },
};
