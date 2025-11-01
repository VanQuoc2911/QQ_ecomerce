// src/types/Product.ts
export interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  sellerId: string;
  categories: string[];
  status: string;
  createdAt: string;
  Rating: number;
  __v: number;
}

export interface ProductResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}
