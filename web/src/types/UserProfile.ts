// src/types/UserProfile.ts
export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  displayName?: string;
  avatar?: string;
  photoURL?: string;
  phone?: string;
  address?: string;
  birthday?: string; // ISO or yyyy-mm-dd
  gender?: "Nam" | "Nữ" | "Khác" | "";
}
