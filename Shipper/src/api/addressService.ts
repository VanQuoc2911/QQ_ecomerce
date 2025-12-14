import axios from 'axios';
import { api } from './index';

type ReverseGeocodeResponse = {
  province?: string;
  district?: string;
  ward?: string;
  detail?: string;
  plusCode?: string;
  oldProvince?: string;
  oldDistrict?: string;
  raw?: unknown;
  source?: string;
};

type MatchLocationResponse = {
  province?: string;
  district?: string;
  ward?: string;
  confidence?: number;
};

const ensureStringArray = (payload: unknown): string[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => String(item)).filter(Boolean);
  }
  return [];
};

const handleAxiosError = (err: unknown): never => {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;
      const serverMsg = data && (data.message || data.error || JSON.stringify(data));
      try {
        (err as Error).message = `${status} ${serverMsg || (err as Error).message}`;
      } catch {}
      throw err;
    }
    if (err.request) {
      try {
        const base = (api && api.defaults && api.defaults.baseURL) ? String(api.defaults.baseURL) : '<unknown-baseURL>';
        const hints = [
          `No response from backend at ${base}.`,
          'Ensure the server is running and the device/emulator can reach this host.',
          'Android emulator typically needs 10.0.2.2; real devices need your machine local IP.',
        ].join(' ');
        (err as Error).message = `${hints} ${(err as Error).message || ''}`.trim();
      } catch {}
      throw err;
    }
  }
  throw new Error(err instanceof Error ? err.message : String(err || 'Unknown network error'));
};

export const getProvinces = async (): Promise<string[]> => {
  try {
    const { data } = await api.get('/address/provinces');
    return ensureStringArray(data);
  } catch (error) {
    handleAxiosError(error);
    throw error;
  }
};

export const getDistricts = async (province: string): Promise<string[]> => {
  if (!province) return [];
  try {
    const { data } = await api.get(`/address/districts/${encodeURIComponent(province)}`);
    return ensureStringArray(data);
  } catch (error) {
    handleAxiosError(error);
    throw error;
  }
};

export const getWards = async (province: string, district: string): Promise<string[]> => {
  if (!province || !district) return [];
  try {
    const { data } = await api.get(`/address/wards/${encodeURIComponent(province)}/${encodeURIComponent(district)}`);
    return ensureStringArray(data);
  } catch (error) {
    handleAxiosError(error);
    throw error;
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodeResponse> => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Invalid coordinates for reverse geocode');
  }
  try {
    const { data } = await api.get(`/address/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`);
    if (data && typeof data === 'object') {
      return data as ReverseGeocodeResponse;
    }
    return {};
  } catch (error) {
    handleAxiosError(error);
    throw error;
  }
};

export const matchLocation = async (
  province?: string,
  district?: string,
  ward?: string
): Promise<MatchLocationResponse> => {
  if (!province && !district && !ward) return {};
  try {
    const { data } = await api.post('/address/match-location', {
      province: province || '',
      district: district || '',
      ward: ward || '',
    });
    if (data && typeof data === 'object') {
      return data as MatchLocationResponse;
    }
    return {};
  } catch (error) {
    handleAxiosError(error);
    throw error;
  }
};

export default {
  getProvinces,
  getDistricts,
  getWards,
  reverseGeocode,
  matchLocation,
};
