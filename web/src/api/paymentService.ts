import { api } from "./axios";
import type { OrderDetailResponse } from "./orderService";

export interface PayosLinkResponse {
  checkoutUrl: string;
  qrCode?: string;
  orderCode: number;
  paymentLinkId?: string;
  status: string;
  amount?: number;
  expiredAt?: string | null;
}

export interface BankingResultResponse {
  success: boolean;
  message?: string;
  countdownMs?: number;
  deadline?: string;
}

export interface PayosSyncResponse {
  message: string;
  order: OrderDetailResponse;
  payosStatus?: string | null;
  statusChanged?: boolean;
}

export const paymentService = {
  createPayosLink: async (orderId: string): Promise<PayosLinkResponse> => {
    const { data } = await api.post<PayosLinkResponse>(
      "/api/payment/payos/create-link",
      { orderId }
    );
    return data;
  },
  syncPayosStatus: async (
    orderId: string,
    options?: { orderCode?: number }
  ): Promise<PayosSyncResponse> => {
    const payload = {
      orderId,
      ...(options?.orderCode ? { orderCode: options.orderCode } : {}),
    };
    const { data } = await api.post<PayosSyncResponse>(
      "/api/payment/payos/sync-status",
      payload
    );
    return data;
  },
  submitBankingResult: async (
    orderId: string,
    payload: {
      status: "success" | "failed";
      transactionId?: string;
      amount?: number;
      note?: string;
    }
  ): Promise<BankingResultResponse> => {
    const { data } = await api.post<BankingResultResponse>(
      `/api/payment/qr/${orderId}/result`,
      payload
    );
    return data;
  },
};

