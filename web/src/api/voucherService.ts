import api from "./axios";
import type { Voucher } from "./sellerService";

export interface UserVoucher extends Voucher {
  applicable?: boolean;
  discount?: number;
  reason?: string | null;
}

export interface ApplyVoucherPayload {
  code: string;
  total: number;
}

export interface AppliedVoucherResult {
  code: string;
  type: "amount" | "percent";
  value: number;
  discount: number;
  minOrderValue: number;
  sellerId: string | null;
  shopId: string | null;
}

export interface VoucherSuggestion {
  code: string;
  discount: number;
  voucher: Voucher;
}

export const voucherService = {
  async getMyVouchers(params?: { total?: number }): Promise<UserVoucher[]> {
    const { data } = await api.get("/api/vouchers/my", { params });
    return data.vouchers || [];
  },

  async applyVoucher(payload: ApplyVoucherPayload): Promise<AppliedVoucherResult> {
    const { data } = await api.post("/api/vouchers/apply", payload);
    return data;
  },

  async getBestVoucherSuggestion(items: Array<{ productId: string; quantity: number; price: number }>): Promise<VoucherSuggestion | null> {
    const { data } = await api.post("/api/vouchers/best", { items });
    return data.bestVoucher ?? null;
  },
};
