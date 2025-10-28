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
      // admin default
      const adminUser: User = {
        id: "admin-default-id",
        name: "Administrator",
        email: adminEmail,
        role: "admin",
        avatar: "https://ui-avatars.com/api/?name=Admin",
      };
      localStorage.setItem("token", "admin-token"); // mock token
      setUser(adminUser);
      return adminUser;
    }

    // User login from API
    const res = await api.post("/auth/login", { email, password });
    const loggedUser: User = res.data.user;
    localStorage.setItem("token", res.data.token);
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
    localStorage.setItem("token", res.data.token);
    setUser(newUser);
    return newUser;
  };

  // Logout
  const logout = async (): Promise<void> => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // Refresh user
  const refreshUser = async (): Promise<void> => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await api.get("/auth/profile"); // dùng /auth/profile
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
        role: user?.role || null,
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
