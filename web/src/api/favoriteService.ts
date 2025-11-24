import api from "./axios";
import type { ApiProduct } from "./productService";

interface FavoriteListResponse {
  items: ApiProduct[];
  total: number;
}

interface FavoriteMutationResponse {
  message: string;
  favorites: string[];
}

export const favoriteService = {
  getFavorites: async (): Promise<ApiProduct[]> => {
    const { data } = await api.get<FavoriteListResponse>("/api/favorites");
    return data.items ?? [];
  },

  addFavorite: async (productId: string): Promise<FavoriteMutationResponse> => {
    const { data } = await api.post<FavoriteMutationResponse>(
      `/api/favorites/${productId}`
    );
    return data;
  },

  removeFavorite: async (productId: string): Promise<FavoriteMutationResponse> => {
    const { data } = await api.delete<FavoriteMutationResponse>(
      `/api/favorites/${productId}`
    );
    return data;
  },
};
