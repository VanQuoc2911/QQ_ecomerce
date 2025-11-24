import { api } from "./axios";

export interface NotificationItem {
  _id: string;
  title: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  url?: string;
  refId?: string; // optional reference id, e.g. order id
  data?: any;
}

export const notificationService = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await api.get("/api/notifications");
    return res.data;
  },
  markAsRead: async (id: string) => {
    const res = await api.patch(`/api/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await api.post(`/api/notifications/mark-all-read`);
    return res.data;
  },
  deleteNotification: async (id: string) => {
    const res = await api.delete(`/api/notifications/${id}`);
    return res.data;
  },
};

export default notificationService;
