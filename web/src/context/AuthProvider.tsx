/* eslint-disable react-hooks/exhaustive-deps */
 
import type { GoogleCredentialResponse } from "@react-oauth/google";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
  const isSellerOnly = import.meta.env.VITE_SELLER_ONLY === "true";
  const isAdminOnly = import.meta.env.VITE_ADMIN_ONLY === "true";

  const buildAdminUser = (): User => ({
    id: 0,
    name: "Admin",
    email: adminEmail,
    role: "admin",
    avatar: "https://ui-avatars.com/api/?name=Admin",
    favorites: [],
  });

  // ✅ Login email/password
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    // ✅ Admin đăng nhập (chỉ khi đang ở chế độ admin-only)
    if (email === adminEmail && password === adminPassword) {
      if (!isAdminOnly) {
        throw new Error("Admin login is disabled in this mode");
      }
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

    // If running seller-only, only allow login for approved sellers
    if (isSellerOnly) {
      if (loggedUser.role !== "seller" || !loggedUser.sellerApproved) {
        throw new Error("Only approved seller accounts can login in seller-only mode");
      }
    }

    localStorage.setItem("accessToken", res.data.token);
    localStorage.setItem("refreshToken", res.data.refreshToken);

    setUser(loggedUser);
    return loggedUser;
  }, [adminEmail, adminPassword, isAdminOnly, isSellerOnly]);

  // ✅ Register
  const register = useCallback(async (
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
  }, []);

  // ✅ Logout
  const logout = useCallback((): void => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  // ✅ Refresh user (tự login lại với accessToken)
  const refreshUser = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem("accessToken");

    // dev debug
    console.log("[DEV] refreshUser() token=", token, "isAdminOnly=", isAdminOnly);

    if (!token) {
      setUser(null);
      return;
    }

    // ✅ Admin - auto-restore session when token matches admin token
    if (token === "admin-token") {
      // only honor admin-token when in admin-only mode
      if (isAdminOnly) {
        // dev debug
        console.log("[DEV] admin-token detected and isAdminOnly=true → restoring Admin user");
        setUser(buildAdminUser());
        return;
      }
      // otherwise clear token and bail
      localStorage.removeItem("accessToken");
      setUser(null);
      return;
    }

    // ✅ User bình thường
    try {
      const res = await api.get("/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profileUser = { ...res.data, favorites: res.data?.favorites ?? [] } as User;

      // Enforce seller-only mode: only allow approved sellers
      if (isSellerOnly) {
        if (profileUser.role !== "seller" || !profileUser.sellerApproved) {
          // clean tokens and do not set user
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          setUser(null);
          return;
        }
      }

      setUser(profileUser);
    } catch {
      setUser(null);
    }
  }, [isAdminOnly, isSellerOnly]);

  // ✅ GOOGLE LOGIN — chuẩn chỉnh 100%
  const loginWithGoogle = useCallback(async (
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
  }, []);

  // ✅ Tự đăng nhập khi reload page
  useEffect(() => {
    // call once on mount
    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  // ✅ Lắng nghe sự kiện profileUpdated và cập nhật user
  useEffect(() => {
    const handleProfileUpdated = async () => {
      await refreshUser();
    };
    window.addEventListener("profileUpdated", handleProfileUpdated);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdated);
  }, [refreshUser]);

  // ✅ Sync user role to localStorage so non-React modules can check permissions
  useEffect(() => {
    try {
      if (user && user.role) {
        localStorage.setItem("userRole", user.role);
      } else {
        localStorage.removeItem("userRole");
      }
    } catch {
      // ignore storage errors
    }
  }, [user]);

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

  const contextValue = useMemo(
    () => ({
      user,
      role: (user?.role as Role) ?? null,
      loading,
      login,
      register,
      logout,
      refreshUser,
      setUser,
      loginWithGoogle,
    }),
    [user, loading, login, register, logout, refreshUser, setUser, loginWithGoogle]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
