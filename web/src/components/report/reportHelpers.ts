import type { ReportRole, ReportSeverity } from "../../api/reportService";

export interface ReportModalContext {
  role: ReportRole;
  severity: ReportSeverity;
  category: string;
  title: string;
  description: string;
  relatedType: string | null;
  relatedId: string | null;
  metadata?: Record<string, unknown> | null;
  attachments?: string[];
}

export const DEFAULT_REPORT_CONTEXT: ReportModalContext = {
  role: "seller",
  severity: "medium",
  category: "general",
  title: "",
  description: "",
  relatedType: null,
  relatedId: null,
  metadata: null,
  attachments: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const inferRole = (ctx?: Partial<ReportModalContext>): ReportRole => {
  if (ctx?.role) return ctx.role;
  const relatedType = ctx?.relatedType?.toLowerCase();
  if (relatedType === "shop" || relatedType === "seller") return "seller";
  if (relatedType === "shipper") return "shipper";
  if (relatedType === "user" || relatedType === "buyer") return "user";

  if (relatedType === "order") {
    const metadata = isRecord(ctx?.metadata) ? ctx?.metadata : undefined;
    const shipperId = metadata?.shipperId;
    const buyerId = metadata?.buyerId;
    const sellerId = metadata?.sellerId;
    if (typeof shipperId === "string" && shipperId.trim()) return "shipper";
    if (typeof buyerId === "string" && buyerId.trim()) return "user";
    if (typeof sellerId === "string" && sellerId.trim()) return "seller";
  }

  return DEFAULT_REPORT_CONTEXT.role;
};

export const normalizeReportContext = (ctx?: Partial<ReportModalContext>): ReportModalContext => ({
  role: inferRole(ctx),
  severity: ctx?.severity ?? DEFAULT_REPORT_CONTEXT.severity,
  category: ctx?.category?.trim() ? ctx.category.trim() : DEFAULT_REPORT_CONTEXT.category,
  title: ctx?.title ?? DEFAULT_REPORT_CONTEXT.title,
  description: ctx?.description ?? DEFAULT_REPORT_CONTEXT.description,
  relatedType: ctx?.relatedType ?? DEFAULT_REPORT_CONTEXT.relatedType,
  relatedId: ctx?.relatedId ?? DEFAULT_REPORT_CONTEXT.relatedId,
  metadata: ctx?.metadata ?? DEFAULT_REPORT_CONTEXT.metadata,
  attachments: Array.isArray(ctx?.attachments) ? [...(ctx?.attachments ?? [])] : [...(DEFAULT_REPORT_CONTEXT.attachments ?? [])],
});

export const extractReportErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error) {
    if ("response" in error && typeof (error as { response?: unknown }).response === "object" && (error as { response?: unknown }).response) {
      const response = (error as { response: { data?: unknown } }).response;
      if (response && "data" in response && typeof response.data === "object" && response.data) {
        const data = response.data as { message?: unknown };
        if (typeof data.message === "string") return data.message;
      }
    }
  }
  return "Gửi khiếu nại thất bại";
};
