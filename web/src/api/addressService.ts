import api from "./axios";

type ReverseGeocodeComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

export type ReverseGeocodeResponse = {
  province: string;
  district: string;
  ward: string;
  detail: string;
  plusCode?: string;
  displayName?: string;
  raw?: {
    formatted_address?: string;
    address_components?: ReverseGeocodeComponent[];
  } | null;
};

export const addressService = {
  // ✅ Get all provinces
  getProvinces: async (): Promise<string[]> => {
    const { data } = await api.get("/api/address/provinces");
    return data;
  },

  // ✅ Get districts by province
  getDistricts: async (province: string): Promise<string[]> => {
    if (!province) return [];
    const { data } = await api.get(`/api/address/districts/${encodeURIComponent(province)}`);
    return data;
  },

  // ✅ Get wards by province and district
  getWards: async (province: string, district: string): Promise<string[]> => {
    if (!province || !district) return [];
    const { data } = await api.get(
      `/api/address/wards/${encodeURIComponent(province)}/${encodeURIComponent(district)}`
    );
    return data;
  },

  // Reverse geocode lat/lng to address components via backend proxy
  reverseGeocode: async (lat: number, lng: number): Promise<ReverseGeocodeResponse> => {
    const { data } = await api.get(`/api/address/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`);
    return data;
  },

  // Match geocoded location names to actual Vietnamese admin divisions
  matchLocation: async (geocodedProvince: string, geocodedDistrict: string, geocodedWard: string): Promise<{
    province: string;
    district: string;
    ward: string;
    confidence: number;
  }> => {
    const { data } = await api.post("/api/address/match-location", {
      province: geocodedProvince,
      district: geocodedDistrict,
      ward: geocodedWard,
    });
    return data;
  },
};

