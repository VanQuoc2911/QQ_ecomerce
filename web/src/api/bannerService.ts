import api from "./axios";

export interface ApiBanner {
  _id: string;
  title?: string;
  image: string;
  link?: string;
  type?: string;
  kind?: string;
  position?: string;
  active?: boolean;
  priority?: number;
}

export type BannerGenerateOpts = { keywords?: string; audience?: string; style?: string; kind?: string };
export type BannerGenerateResponse = {
  bannerDraft?: Partial<ApiBanner> & { meta?: { imagePrompt?: string; raw?: string } };
  ai_raw?: string;
};

export const bannerService = {
  list: async (opts?: { kind?: string }): Promise<ApiBanner[]> => {
    const qs = opts && opts.kind ? `?kind=${encodeURIComponent(opts.kind)}` : "";
    const { data } = await api.get(`/api/banners${qs}`);
    return data;
  },
  // admin
  create: async (payload: Partial<ApiBanner>) => {
    const { data } = await api.post("/api/banners", payload);
    return data;
  },
  update: async (id: string, payload: Partial<ApiBanner>) => {
    const { data } = await api.put(`/api/banners/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/api/banners/${id}`);
    return data;
  },
  generate: async (opts: BannerGenerateOpts): Promise<BannerGenerateResponse> => {
    const { data } = await api.post(`/api/banners/generate`, opts);
    return data as BannerGenerateResponse;
  },
};
