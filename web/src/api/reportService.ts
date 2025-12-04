import api from "./axios";

export type ReportRole = "user" | "seller" | "shipper" | "admin" | "system";
export type ReportSeverity = "low" | "medium" | "high" | "critical";
export type ReportStatus = "open" | "in_progress" | "resolved";

export interface ReportPayload {
  title: string;
  description: string;
  severity?: ReportSeverity;
  category?: string;
  metadata?: Record<string, unknown>;
  relatedType?: string | null;
  relatedId?: string | null;
  reportedRole?: ReportRole;
}

export interface ReportItem extends ReportPayload {
  _id: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  reportedRole: ReportRole;
  severity: ReportSeverity;
}

export interface ReportFilters {
  role?: ReportRole | "all";
  status?: ReportStatus | "all";
  severity?: ReportSeverity | "all";
  search?: string;
  limit?: number;
}

export const fetchReports = async (filters: ReportFilters = {}) => {
  const params: Record<string, unknown> = {};
  if (filters.role && filters.role !== "all") params.role = filters.role;
  if (filters.status && filters.status !== "all") params.status = filters.status;
  if (filters.severity && filters.severity !== "all") params.severity = filters.severity;
  if (filters.search) params.search = filters.search;
  if (filters.limit) params.limit = filters.limit;
  const { data } = await api.get<ReportItem[]>("/api/reports", { params });
  return data;
};

export const createReport = async (payload: ReportPayload) => {
  const { data } = await api.post<ReportItem>("/api/reports", payload);
  return data;
};

export const updateReportStatus = async (
  id: string,
  status: ReportStatus,
  note?: string
) => {
  const { data } = await api.patch<ReportItem>(`/api/reports/${id}/status`, {
    status,
    note,
  });
  return data;
};
