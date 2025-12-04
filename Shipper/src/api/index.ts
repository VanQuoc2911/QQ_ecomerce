import axios from 'axios';
import { BACKEND_URL } from '../config';
// Intentionally do not import navigation helpers here to avoid auto-navigation
// from a low-level API module. Screens should decide how to handle 403.

const DEFAULT_LOCAL = BACKEND_URL || 'http://10.0.2.2:4000';

export const api = axios.create({
  baseURL: DEFAULT_LOCAL + '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug: print resolved base URL in development to help diagnose network issues
// Use RN's `__DEV__` when available, otherwise check a minimal `process.env`.
const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'));
if (isDev) {
  try {
    console.log('[Shipper] API baseURL =', api.defaults.baseURL);
  } catch {}
}

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// Response interceptor: try to refresh token on 401 using stored refresh token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);
    // If server returns 403 (Access denied) — user may need to complete profile or request role.
    // Handle 403 here so client can redirect to Profile for remediation.
    try {
      if (error.response && error.response.status === 403) {
        // Do not auto-redirect from the central API layer. Let callers decide
        // how to handle access-denied (e.g., show a prompt to the user).
        return Promise.reject(error);
      }
    } catch {}
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // lazy require AsyncStorage to avoid bundling issues
      type AsyncStorageLike = {
        getItem(key: string): Promise<string | null>;
        setItem(key: string, value: string): Promise<void>;
        removeItem(key: string): Promise<void>;
      };
      let AsyncStorageLocal: AsyncStorageLike | null = null;
      try {
        AsyncStorageLocal = require('@react-native-async-storage/async-storage').default;
      } catch {
        AsyncStorageLocal = null;
      }

      if (AsyncStorageLocal) {
        try {
          const refresh = await AsyncStorageLocal.getItem('@shipper_refresh');
          console.log('[Shipper API] attempting refresh, haveRefresh=', Boolean(refresh));
          if (refresh) {
            // call refresh endpoint (auth is mounted under /api/auth as well)
            const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
            console.log('[Shipper API] POST', `${base}/auth/refresh`);
            const resp = await axios.post(`${base}/auth/refresh`, { refreshToken: refresh });
            const newToken = resp.data?.accessToken || resp.data?.token;
            console.log('[Shipper API] refresh response', resp.status, resp.data ? { ok: true } : null);
            if (newToken) {
              // persist and retry original request
              await AsyncStorageLocal.setItem('@shipper_token', newToken);
              setAuthToken(newToken);
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return api(originalRequest);
            }
          }
        } catch (e) {
          try { console.warn('[Shipper API] refresh failed', e); } catch {}
          // remove stored tokens so app can re-login
          try {
            await AsyncStorageLocal.removeItem('@shipper_token');
            await AsyncStorageLocal.removeItem('@shipper_refresh');
          } catch {}
        }
      }

      // (removed redundant 403 handling — handled above)
    }

    return Promise.reject(error);
  }
);

export default api;
