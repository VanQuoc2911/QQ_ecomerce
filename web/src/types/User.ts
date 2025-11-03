export type Role = "user" | "seller" | "admin" | "system";
interface User {
  _id?: string;
  id: number;
  name: string;
  displayName?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  password?: string;
  status?: string;
  phone?: string;
  address?: string;
  birthday?: string;
  gender?: string;
  avatar?: string;
  
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
  birthday?: string; // ISO or yyyy-mm-dd
  gender?: "Nam" | "Nữ" | "Khác" | "";
}
