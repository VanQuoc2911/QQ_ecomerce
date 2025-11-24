export type Role = "user" | "seller" | "admin" | "system";
interface User {
  _id?: string;
  id: number;
  name: string;
  displayName?: string;
  email?: string;
  role?: string;
  sellerApproved?: boolean;
  createdAt?: string;
  updatedAt?: string;
  password?: string;
  status?: string;
  phone?: string;
  address?: string;
  birthday?: string;
  gender?: string;
  avatar?: string;
  addresses?: Address[]; // Saved addresses book
  favorites?: string[];
}

// Interface cho response từ API
interface UserResponse {
  data: User[];
  page: number;
  limit: number;
  total: number;
}

export type { User, UserResponse };
  
  
export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  displayName?: string;
  avatar?: string;
  phone?: string;
  address?: string;
  // Saved addresses book
  addresses?: Address[];
  birthday?: string; // ISO or yyyy-mm-dd
  gender?: "Nam" | "Nữ" | "Khác" | "";
  favorites?: string[];
}

export interface Address {
  id?: string;
  name: string; // recipient name
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string; // specific address (street, house number)
  lat?: number;
  lng?: number;
  type?: "home" | "office";
  isDefault?: boolean;
  isPinned?: boolean; // Ghim địa chỉ
}
