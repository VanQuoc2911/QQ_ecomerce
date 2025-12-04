import axios from 'axios';
import type { CheckpointPayload, OfflineUpdate, ShipperApplication, StatusPayload } from '../types';
import { api } from './index';

type ReactNativeFile = {
  uri: string;
  name: string;
  type: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  nationalId?: string;
  vehicleType?: string;
  licensePlate?: string;
  licenseNumber?: string;
};

export type UpdateProfilePayload = {
  name?: string;
  avatar?: string;
  phone?: string;
  address?: string;
  shop?: Record<string, unknown>;
  addresses?: Array<Record<string, unknown>>;
};

const handleAxiosError = (err: unknown): never => {
  // Use axios type guard to detect axios errors without `any`.
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;
      const serverMsg = data && (data.message || data.error || JSON.stringify(data));
      try {
        // Enhance message while keeping original error object available
        (err as Error).message = `${status} ${serverMsg || (err as Error).message}`;
      } catch {}
      throw err;
    }
    if (err.request) {
      try {
        // Provide extra diagnostic hints when request was sent but no response received
        const base = (api && api.defaults && api.defaults.baseURL) ? String(api.defaults.baseURL) : '<unknown-baseURL>';
        const hints = [
          `No response from server at ${base}.`,
          'Common causes: backend not running, wrong backend host/port, emulator/device network routing.',
          'If you run Android emulator use `10.0.2.2` for localhost; Genymotion -> `10.0.3.2`; on a real device use your machine IP (e.g. 192.168.x.x).',
          'You can also try `adb reverse tcp:4000 tcp:4000` (Android) or rebuilding the app after native changes.',
        ].join(' ');
        (err as Error).message = hints + ' ' + ((err as Error).message || '');
      } catch {}
      throw err;
    }
  }
  // Non-axios errors: normalize to Error
  throw new Error(err instanceof Error ? err.message : String(err || 'Unknown network error'));
};

export const login = async (email: string, password: string) => {
  try {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const register = async (payload: RegisterPayload) => {
  try {
    const res = await api.post('/auth/register', payload);
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const updateProfile = async (payload: UpdateProfilePayload) => {
  try {
    const res = await api.put('/auth/profile', payload);
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const forgotPassword = async (email: string) => {
  try {
    const res = await api.post('/auth/forgot', { email });
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const getSummary = async () => {
  try {
    const res = await api.get('/shipper/summary');
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const listOrders = async (params: { status?: string; limit?: number; cursor?: string } = {}) => {
  try {
    const res = await api.get('/shipper/orders', { params });
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const listAvailableOrders = async (params: { limit?: number; cursor?: string } = {}) => {
  try {
    const res = await api.get('/shipper/orders/available', { params });
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const claimOrder = async (orderId: string) => {
  try {
    const res = await api.post(`/shipper/orders/${orderId}/claim`);
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const getOrder = async (orderId: string) => {
  try {
    const res = await api.get(`/shipper/orders/${orderId}`);
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const updateStatus = async (orderId: string, payload: StatusPayload) => {
  try {
    const res = await api.post(`/shipper/orders/${orderId}/status`, payload);
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const addCheckpoint = async (orderId: string, payload: CheckpointPayload) => {
  try {
    const res = await api.post(`/shipper/orders/${orderId}/checkpoints`, payload);
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const syncOffline = async (updates: OfflineUpdate[]) => {
  try {
    const res = await api.post('/shipper/orders/sync', { updates });
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const getMyApplication = async () => {
  try {
    const res = await api.get('/shipper-applications/me');
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const upsertMyApplication = async (payload: ShipperApplication) => {
  try {
    const res = await api.post('/shipper-applications/me', payload);
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const submitMyApplication = async () => {
  try {
    const res = await api.post('/shipper-applications/me/submit');
    return res.data;
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export const uploadDocument = async (file: { uri: string; name?: string; type?: string }) => {
  try {
    const form = new FormData();
    // React Native FormData expects { uri, name, type }
    // Backend expects the field name `files` (multer configured with upload.array('files'))
    const payload: ReactNativeFile = {
      uri: file.uri,
      name: file.name || 'upload.jpg',
      type: file.type || 'image/jpeg',
    };
    form.append('files', payload as unknown as Blob);
    // NOTE: backend upload route is mounted at `/api/upload` (singular)
    const res = await api.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data; // expect { url: string } or similar
  } catch (err: unknown) {
    handleAxiosError(err);
  }
};

export default {
  login,
  register,
  updateProfile,
  forgotPassword,
  getSummary,
  listOrders,
  listAvailableOrders,
  claimOrder,
  getOrder,
  updateStatus,
  addCheckpoint,
  syncOffline,
  getMyApplication,
  upsertMyApplication,
  submitMyApplication,
};
