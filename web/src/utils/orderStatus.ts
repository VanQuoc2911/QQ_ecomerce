export const STATUS = {
  PAYMENT_PENDING: "payment_pending",
  PENDING: "pending",
  PROCESSING: "processing",
  AWAITING_SHIPMENT: "awaiting_shipment",
  SHIPPING: "shipping",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus = (typeof STATUS)[keyof typeof STATUS] | string;

export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; border?: string; background?: string }> = {
  // Customer-facing: pending (server) and payment_pending represent awaiting customer payment
  [STATUS.PAYMENT_PENDING]: { label: "⏳ Chờ thanh toán", color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.4)", background: "rgba(245, 158, 11, 0.15)" },
  [STATUS.PENDING]: { label: "⏳ Chờ thanh toán", color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.4)", background: "rgba(245, 158, 11, 0.15)" },

  // After payment, seller processing
  [STATUS.PROCESSING]: { label: "📦 Đang xử lý", color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.4)", background: "rgba(59, 130, 246, 0.15)" },

  [STATUS.AWAITING_SHIPMENT]: { label: "🚚 Chờ giao", color: "#ff9800", bgColor: "rgba(255, 152, 0, 0.08)", border: "rgba(255, 152, 0, 0.3)", background: "rgba(255, 152, 0, 0.08)" },
  [STATUS.SHIPPING]: { label: "🚚 Đang giao", color: "#fb923c", bgColor: "rgba(251, 146, 60, 0.08)", border: "rgba(251, 146, 60, 0.3)", background: "rgba(251, 146, 60, 0.08)" },
  [STATUS.COMPLETED]: { label: "✅ Hoàn thành", color: "#22c55e", bgColor: "rgba(34, 197, 94, 0.1)", border: "rgba(34, 197, 94, 0.4)", background: "rgba(34, 197, 94, 0.15)" },
  [STATUS.CANCELLED]: { label: "✗ Đã hủy", color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.15)" },
};

export function getStatusLabel(status?: OrderStatus) {
  if (!status) return "—";
  return STATUS_CONFIG[status]?.label || String(status);
}

export function getStatusColor(status?: OrderStatus) {
  if (!status) return "default";
  return STATUS_CONFIG[status]?.color || "default";
}

import type { ChipProps } from "@mui/material";

export function getStatusMuiColor(status?: OrderStatus): ChipProps["color"] {
  switch (status) {
    case STATUS.PENDING:
      return "warning";
    case STATUS.PAYMENT_PENDING:
      return "info";
    case STATUS.PROCESSING:
      return "info";
    case STATUS.AWAITING_SHIPMENT:
      return "warning";
    case STATUS.SHIPPING:
      return "warning";
    case STATUS.COMPLETED:
      return "success";
    case STATUS.CANCELLED:
      return "error";
    default:
      return "default";
  }
}

export function getStatusBg(status?: OrderStatus) {
  if (!status) return undefined;
  return STATUS_CONFIG[status]?.bgColor;
}

export function isAwaitingPayment(status?: OrderStatus) {
  return status === STATUS.PAYMENT_PENDING || status === STATUS.PENDING;
}

export function isPaymentActionAllowed(status?: OrderStatus) {
  // allow payment actions for both server 'pending' and explicit 'payment_pending'
  return isAwaitingPayment(status);
}

export default {
  STATUS,
  STATUS_CONFIG,
  getStatusLabel,
  getStatusColor,
  getStatusBg,
  isAwaitingPayment,
  isPaymentActionAllowed,
};
