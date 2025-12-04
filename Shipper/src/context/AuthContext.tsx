type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let AsyncStorage: AsyncStorageLike;
try {
  // Import AsyncStorage lazily and guard in case native module isn't linked.
  // Use require so we can catch errors during module evaluation instead
  // of letting them crash the entire module import.
  AsyncStorage = (require('@react-native-async-storage/async-storage').default) as AsyncStorageLike;
} catch {
  // Provide a safe typed no-op fallback for environments where native module
  // isn't available (e.g. web, tests, or un-linked native build).
  AsyncStorage = {
    getItem: async (_key: string) => null,
    setItem: async (_key: string, _value: string) => undefined,
    removeItem: async (_key: string) => undefined,
  };
}

import axios from 'axios';
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import api, { setAuthToken } from '../api/index';
import * as shipperApi from '../api/shipper';
import type { ShippingEventPayload } from '../types';
import { connectSocket, disconnectSocket, getSocket } from '../utils/socket';

type User = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  shippingEvent: ShippingEventPayload | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: false,
  shippingEvent: null,
  signIn: async (_email: string, _password: string) => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shippingEvent, setShippingEvent] = useState<ShippingEventPayload | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('@shipper_token');
        const u = await AsyncStorage.getItem('@shipper_user');
        if (t) {
          // try refreshing token on startup if a refresh token is available
          try {
            const refresh = await AsyncStorage.getItem('@shipper_refresh');
            if (refresh) {
              const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
              try {
                const resp = await axios.post(`${base}/auth/refresh`, { refreshToken: refresh });
                const newToken = resp.data?.accessToken || resp.data?.token;
                if (newToken) {
                  await AsyncStorage.setItem('@shipper_token', newToken);
                  setToken(newToken);
                  setAuthToken(newToken);
                } else {
                  // fall back to existing token
                  setToken(t);
                  setAuthToken(t);
                }
              } catch {
                // refresh failed, fall back to stored token (may be expired)
                setToken(t);
                setAuthToken(t);
              }
            } else {
              setToken(t);
              setAuthToken(t);
            }
          } catch {
            setToken(t);
            setAuthToken(t);
          }

          // connect socket if token exists (reconnect on app start)
          try {
            const backendBase = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
            const parsedUser = u ? JSON.parse(u) : null;
            connectSocket(backendBase || undefined, (await AsyncStorage.getItem('@shipper_token')) || undefined, parsedUser?._id || parsedUser?.id || undefined);
          } catch {
            // ignore socket connect errors
          }
        }
        if (u) setUser(JSON.parse(u));
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await shipperApi.login(email, password);
    if (res && res.token) {
      await AsyncStorage.setItem('@shipper_token', res.token);
      if (res.refreshToken) {
        await AsyncStorage.setItem('@shipper_refresh', res.refreshToken);
      }
      await AsyncStorage.setItem('@shipper_user', JSON.stringify(res.user || {}));
      setToken(res.token);
      setUser(res.user || null);
      setAuthToken(res.token);
      try {
        const backendBase = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
        connectSocket(backendBase || undefined, res.token, res.user?._id || res.user?.id);
      } catch {
        // ignore
      }
    } else {
      throw new Error(res.message || 'Login failed');
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('@shipper_token');
    await AsyncStorage.removeItem('@shipper_user');
    await AsyncStorage.removeItem('@shipper_refresh');
    setToken(null);
    setUser(null);
    setAuthToken(null);
    try {
      disconnectSocket();
    } catch {}
  };

  const refreshUser = async () => {
    try {
      const resp = await api.get('/auth/profile');
      const latestUser = resp.data?.user || resp.data || null;
      if (latestUser) {
        setUser(latestUser);
        try {
          await AsyncStorage.setItem('@shipper_user', JSON.stringify(latestUser));
        } catch {}
      }
    } catch {
      // ignore refresh errors
    }
  };

  // subscribe to socket events
  useEffect(() => {
    const sock = getSocket();
    if (!sock) return;
    // debug logging for socket state
    try {
      console.log('[Shipper] socket found, id=', (sock as Socket).id, 'connected=', (sock as Socket).connected);
    } catch {}
    const handler = (payload: ShippingEventPayload) => {
      try {
        console.log('[Shipper] received shipper:shipping', payload);
      } catch {}
      setShippingEvent(payload);
    };
    sock.on('shipper:shipping', handler);
    // listen for available orders announced by sellers
    const availableHandler = (payload: ShippingEventPayload) => {
      try {
        console.log('[Shipper] received order:awaiting_shipment', payload);
      } catch {}
      // convert to same shape so OrdersList can react
      const status = (payload as { status?: string })?.status ?? payload.shippingStatus ?? undefined;
      setShippingEvent({ orderId: payload.orderId, shippingStatus: status, order: payload.order ?? undefined });
    };

    // Wrap the handler to satisfy socket listener signature without using `any`.
    const availableWrapper = (p: unknown) => availableHandler(p as ShippingEventPayload);
    sock.on('order:awaiting_shipment', availableWrapper);
    return () => {
      try {
        sock.off('shipper:shipping', handler);
        sock.off('order:awaiting_shipment', availableWrapper);
      } catch {}
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut, shippingEvent, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
