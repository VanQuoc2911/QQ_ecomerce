  import axios, {
    AxiosError,
    type AxiosInstance,
    type AxiosRequestConfig,
    type InternalAxiosRequestConfig,
} from "axios";

  const API_BASE = import.meta.env.VITE_API_BASE;

  export const api: AxiosInstance = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
  });

  const getAccessToken = (): string | null => localStorage.getItem("accessToken");
  const getRefreshToken = (): string | null => localStorage.getItem("refreshToken");

  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // ===== Refresh Token Queue System =====
  let isRefreshing = false;
  let failedQueue: {
    resolve: (value?: unknown) => void;
    reject: (err?: unknown) => void;
    config: AxiosRequestConfig;
  }[] = [];

  const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
      if (error) prom.reject(error);
      else {
        prom.config.headers = prom.config.headers || {};
        if (token) prom.config.headers.Authorization = `Bearer ${token}`;
        prom.resolve();
      }
    });
    failedQueue = [];
  };

  api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && !originalRequest._retry) {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          localStorage.removeItem("accessToken");
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: originalRequest });
          }).then(() => api(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const resp = await axios.post(
            `${API_BASE}/auth/refresh`,
            { refreshToken },
            { headers: { "Content-Type": "application/json" } }
          );
          const newToken = resp.data?.token;
          if (newToken) {
            localStorage.setItem("accessToken", newToken);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);
            return api(originalRequest);
          }
          processQueue(new Error("Không có token mới"), null);
          return Promise.reject(error);
        } catch (refreshErr) {
          processQueue(refreshErr as Error, null);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  export default api;
