import AsyncStorage from '@react-native-async-storage/async-storage';

export const cacheKeys = {
  dashboard: 'cache:dashboard:snapshot',
  profile: 'cache:profile:snapshot',
  disease: 'cache:disease:last-prediction',
  queue: 'cache:offline:pending-writes',
  lastSensorHistoryLog: 'cache:history:last-sensor-log-ts',
  alertDedup: 'cache:alerts:dedupe',
  esp32LastTimestamp: 'cache:esp32:last-image-timestamp',
  historyWriteBlocked: 'cache:history:writes-blocked',
  reports: 'cache:reports:last',
  weather: 'cache:weather:last',
} as const;

export async function setCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore cache failure on low-storage devices.
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function removeCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // no-op
  }
}
