import type { GoogleCredentialResponse } from "@react-oauth/google";
import { createContext, useContext } from "react";
import type { Role, User } from "../types/User";

export interface AuthContextType {
  user: User | null;
  role: Role | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    name: string,
    role?: Role,
    avatar?: string
  ) => Promise<User>;

  logout: () => void; // ✅ sửa lại

  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;

  loginWithGoogle: (
    credentialResponse: GoogleCredentialResponse
  ) => Promise<User>; // ✅ sửa lại
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
