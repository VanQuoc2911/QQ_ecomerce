import AsyncStorage from '@react-native-async-storage/async-storage';
import * as shipperApi from '../api/shipper';

const KEY = '@shipper_offline_updates_v1';

export type OfflineUpdate = {
  id?: string;
  type: 'status' | 'checkpoint';
  orderId: string;
  status?: string;
  note?: string;
  location?: { lat: number; lng: number; accuracy?: number };
  clientRequestId?: string;
  occurredAt?: string;
};

export const enqueueUpdate = async (u: OfflineUpdate) => {
  const raw = await AsyncStorage.getItem(KEY);
  const arr: OfflineUpdate[] = raw ? JSON.parse(raw) : [];
  arr.push(u);
  await AsyncStorage.setItem(KEY, JSON.stringify(arr));
};

export const getQueue = async (): Promise<OfflineUpdate[]> => {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) as OfflineUpdate[] : [];
};

export const clearQueue = async () => {
  await AsyncStorage.removeItem(KEY);
};

export const flushQueue = async () => {
  const q = await getQueue();
  if (!q || q.length === 0) return { success: true, results: [] };
  try {
    const res = await shipperApi.syncOffline(q);
    if (res && typeof res.successCount === 'number' && res.successCount >= 0) {
      await clearQueue();
    }
    return res;
  } catch (e) {
    // don't clear queue on failure
    throw e;
  }
};
