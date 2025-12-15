import type { ReportModalContext } from "../components/report/reportHelpers";

export const REPORT_MODAL_EVENT = "openReportModal" as const;

export const triggerReportModal = (payload?: Partial<ReportModalContext>) => {
  if (typeof window === "undefined") return;
  const event = new CustomEvent<Partial<ReportModalContext> | undefined>(REPORT_MODAL_EVENT, {
    detail: payload,
  });
  window.dispatchEvent(event);
};
