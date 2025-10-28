export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  stock: number;

  sellerId: string | number;

  sku?: string;
  brand?: string;
  category?: string;
  specifications?: string;
  tags?: string[];

  image?: string;

  status: "pending" | "approved" | "rejected" | "draft";
  approvedAt?: string;
  rejectionReason?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface ProductResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  currentPage: number;
  totalPages: number;
}
