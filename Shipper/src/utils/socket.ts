import type { ManagerOptions, SocketOptions } from 'socket.io-client';
import { io, type Socket } from 'socket.io-client';

interface AuthPayload {
  token?: string | null;
}

type ExtraHeaders = Record<string, string>;

type IoOptions = Partial<ManagerOptions & SocketOptions> & {
  extraHeaders?: ExtraHeaders;
  auth?: AuthPayload;
};

let socket: Socket | null = null;
let reconnectAttempts = 0;

const backoffMs = (attempt: number) => Math.min(30000, 1000 * Math.pow(2, attempt));

export const connectSocket = (backendUrl?: string | null, token?: string | null, userId?: string | null): Socket | null => {
  if (socket && socket.connected) return socket;
  const defaultOrigin = (typeof globalThis !== 'undefined'
    ? (globalThis as unknown as { location?: { origin?: string } }).location?.origin
    : undefined) ?? 'http://localhost:4000';
  const url = backendUrl || defaultOrigin;
  const opts: IoOptions = {
    transports: ['websocket'],
    timeout: 20000,
    reconnection: false,
  };
  if (token) {
    opts.extraHeaders = { Authorization: `Bearer ${token}` };
    opts.auth = { token };
  }

  tryConnect(url, opts, userId);
  return socket;
};

const tryConnect = (url: string, opts: IoOptions, userId?: string | null): void => {
  try {
    socket = io(url, opts);
  } catch (e) {
    console.error('Socket connection error:', e);
    scheduleReconnect(url, opts, userId);
    return;
  }

  socket.on('connect', (): void => {
    reconnectAttempts = 0;
    try {
      // eslint-disable-next-line no-console
      console.log('[Shipper socket] connected', socket?.id);
    } catch {}
    if (userId) socket?.emit('joinUserRoom', { userId });
  });

  socket.on('connect_error', (): void => {
    scheduleReconnect(url, opts, userId);
  });

  socket.on('disconnect', (reason: string): void => {
    // schedule reconnect unless manual disconnect
    if (reason !== 'io client disconnect') {
      scheduleReconnect(url, opts, userId);
    }
  });
};

const scheduleReconnect = (url: string, opts: IoOptions, userId?: string | null): void => {
  reconnectAttempts += 1;
  const wait: number = backoffMs(reconnectAttempts);
  setTimeout(() => tryConnect(url, opts, userId), wait);
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (!socket) return;
  try {
    socket.disconnect();
  } catch {
    // ignore disconnect errors
  }
  socket = null;
  reconnectAttempts = 0;
};

export default { connectSocket, getSocket, disconnectSocket };
