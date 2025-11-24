import { api } from "./axios";

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

export const paymentService = {
  createPayosLink: async (orderId: string): Promise<PayosLinkResponse> => {
    const { data } = await api.post<PayosLinkResponse>(
      "/api/payment/payos/create-link",
      { orderId }
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

