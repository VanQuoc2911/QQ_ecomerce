/* eslint-disable react-hooks/exhaustive-deps */
 
import type { GoogleCredentialResponse } from "@react-oauth/google";
import { type ReactNode, useEffect, useState } from "react";
import api from "../api/axios";
import type { Role, User } from "../types/User";
import { AuthContext } from "./AuthContext";

interface Props {
  children: ReactNode;
}

export const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  const buildAdminUser = (): User => ({
    id: 0,
    name: "Admin",
    email: adminEmail,
    role: "admin",
    avatar: "https://ui-avatars.com/api/?name=Admin",
    favorites: [],
  });

  // ✅ Login email/password
  const login = async (email: string, password: string): Promise<User> => {
    // ✅ Admin đăng nhập
    if (email === adminEmail && password === adminPassword) {
      const adminUser = buildAdminUser();

      localStorage.setItem("accessToken", "admin-token");
      setUser(adminUser);
      return adminUser;
    }

    // ✅ User đăng nhập
    const res = await api.post("/auth/login", { email, password });

    const loggedUser: User = {
      ...res.data.user,
      favorites: res.data.user?.favorites ?? [],
    };

    localStorage.setItem("accessToken", res.data.token);
    localStorage.setItem("refreshToken", res.data.refreshToken);

    setUser(loggedUser);
    return loggedUser;
  };

  // ✅ Register
  const register = async (
    email: string,
    password: string,
    name: string,
    role?: Role,
    avatar?: string
  ): Promise<User> => {
    const res = await api.post("/auth/register", {
      email,
      password,
      name,
      role,
      avatar,
    });

    const newUser: User = {
      ...res.data.user,
      favorites: res.data.user?.favorites ?? [],
    };

    localStorage.setItem("accessToken", res.data.token);
    localStorage.setItem("refreshToken", res.data.refreshToken);

    setUser(newUser);
    return newUser;
  };

  // ✅ Logout
  const logout = (): void => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  // ✅ Refresh user (tự login lại với accessToken)
  const refreshUser = async (): Promise<void> => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setUser(null);
      return;
    }

    // ✅ Admin - auto-restore session when token matches admin token
    if (token === "admin-token") {
      setUser(buildAdminUser());
      return;
    }

    // ✅ User bình thường
    try {
      const res = await api.get("/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser({ ...res.data, favorites: res.data?.favorites ?? [] });
    } catch {
      setUser(null);
    }
  };

  // ✅ GOOGLE LOGIN — chuẩn chỉnh 100%
  const loginWithGoogle = async (
    credentialResponse: GoogleCredentialResponse
  ): Promise<User> => {
    if (!credentialResponse?.credential) {
      throw new Error("Google token missing");
    }

    const res = await api.post(
      "/auth/google-login",
      { tokenId: credentialResponse.credential },
      { withCredentials: true }
    );

    if (!res.data?.success) {
      throw new Error(res.data?.message || "Google login failed");
    }

    // ✅ Save token
    if (res.data.token) {
      localStorage.setItem("accessToken", res.data.token);
    }
    if (res.data.refreshToken) {
      localStorage.setItem("refreshToken", res.data.refreshToken);
    }

    // ✅ Save user
    const gUser: User = {
      ...res.data.user,
      favorites: res.data.user?.favorites ?? [],
    };
    setUser(gUser);

    return gUser;
  };

  // ✅ Tự đăng nhập khi reload page
  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  // ✅ Lắng nghe sự kiện profileUpdated và cập nhật user
  useEffect(() => {
    const handleProfileUpdated = async () => {
      await refreshUser();
    };
    window.addEventListener("profileUpdated", handleProfileUpdated);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdated);
  }, []);

  // ✅ Admin auto-logout mechanisms
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    // Admin inactivity timeout (30 minutes)
    const ADMIN_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Auto-logout after inactivity
        localStorage.removeItem("accessToken");
        setUser(null);
        console.log("Admin auto-logged out due to inactivity");
      }, ADMIN_TIMEOUT);
    };

    // Track user activity
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [user]);

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
        setUser,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
