export interface ProductCard {
  id: string;
  name: string;
  slug?: string;
  price: number;
  oldPrice?: number;
  images: string[]; // ít nhất 1
  videos?: string[];
  category: string;
  description: string;
  rating?: number; // 0-5
  stock: number;
  features?: string[];
  // Shop / seller info (optional) — useful for listing and product cards
  shopId?: string;
  shopName?: string;
  shopLogo?: string;
  isFavorite?: boolean;
}
