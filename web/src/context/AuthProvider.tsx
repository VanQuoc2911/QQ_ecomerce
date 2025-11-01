import { type ReactNode, useEffect, useState } from "react";
import api from "../api/axios";
import type { Role, User } from "../types/User";
import { AuthContext } from "./AuthContext";

interface Props {
  children: ReactNode;
}

const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  // Login
  const login = async (email: string, password: string): Promise<User> => {
    if (email === adminEmail && password === adminPassword) {
      const adminUser: User = {
        id: 0,
        name: "Administrator",
        email: adminEmail,
        role: "admin",
        avatar: "https://ui-avatars.com/api/?name=Admin",
      };
      localStorage.setItem("accessToken", "admin-token");
      setUser(adminUser);
      return adminUser;
    }

    const res = await api.post("/auth/login", { email, password });
    const loggedUser: User = res.data.user;
    localStorage.setItem("accessToken", res.data.token);
    localStorage.setItem("refreshToken", res.data.refreshToken);
    setUser(loggedUser);
    return loggedUser;
  };

  // Register
  const register = async (
    email: string,
    password: string,
    name: string,
    role?: Role,
    avatar?: string
  ): Promise<User> => {
    const res = await api.post("/auth/register", { email, password, name, role, avatar });
    const newUser: User = res.data.user;
    localStorage.setItem("accessToken", res.data.token);
    localStorage.setItem("refreshToken", res.data.refreshToken);
    setUser(newUser);
    return newUser;
  };

    const logout = async (): Promise<void> => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
    };


  const refreshUser = async (): Promise<void> => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const res = await api.get("/auth/profile");
      setUser(res.data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: (user?.role as Role) ?? null,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
