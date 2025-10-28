export interface ProductCard {
  id: string;
  name: string;
  slug?: string;
  price: number;
  oldPrice?: number;
  images: string[]; // ít nhất 1
  category: string;
  description: string;
  rating?: number; // 0-5
  stock: number;
  features?: string[];
}
