import { AppLog } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { get, getDatabase, push, ref, set } from 'firebase/database';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import { enqueuePendingWrite, flushPendingWrites } from '@/services/offline-queue.service';

const firebaseConfig = {
  apiKey: 'AIzaSyBqo7rqZEAnQ1bQHrgIbLIL2d2pMtOUgA8',
  authDomain: 'agrinexa-1de8c.firebaseapp.com',
  databaseURL: 'https://agrinexa-1de8c-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'agrinexa-1de8c',
  storageBucket: 'agrinexa-1de8c.firebasestorage.app',
  messagingSenderId: '321746356270',
  appId: '1:321746356270:web:7e574ed0169ddb8fd777bf',
};

export const firebaseAppReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
export const realtimeReady = Boolean(firebaseConfig.databaseURL && firebaseAppReady);
export const storageReady = Boolean(firebaseConfig.storageBucket && firebaseAppReady);

const app = firebaseAppReady ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig)) : null;
const getReactNativePersistence = (FirebaseAuth as unknown as { getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown })
  .getReactNativePersistence;
export const auth = app
  ? (() => {
      try {
        if (typeof getReactNativePersistence === 'function') {
          return FirebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) as any });
        }
        return FirebaseAuth.getAuth(app);
      } catch {
        return FirebaseAuth.getAuth(app);
      }
    })()
  : null;
export const db = realtimeReady && app ? getDatabase(app) : null;
export const storage = storageReady && app ? getStorage(app) : null;

let authBootstrapDone = false;
async function ensureAuthReady() {
  if (!auth || authBootstrapDone) return;
  authBootstrapDone = true;
  if (!auth.currentUser) {
    try {
      await FirebaseAuth.signInAnonymously(auth);
    } catch {
      // Rules may allow public reads; continue without hard failure.
    }
  }
}

export async function getRealtimeOnce<T>(path: string): Promise<T | null> {
  if (!db) return null;
  await ensureAuthReady();
  const snapshot = await get(ref(db, path));
  return snapshot.exists() ? (snapshot.val() as T) : null;
}

export async function setRealtime(path: string, value: unknown): Promise<boolean> {
  if (!db) return false;
  await ensureAuthReady();
  try {
    await set(ref(db, path), value);
    void flushOfflineWrites();
    return true;
  } catch (error) {
    const msg = String(error ?? '');
    const isDenied = msg.includes('permission_denied') || msg.includes('PERMISSION_DENIED');
    if (isDenied) return false;
    await enqueuePendingWrite(path, value);
    return false;
  }
}

async function writeRealtimeRaw(path: string, value: unknown): Promise<boolean> {
  if (!db) return false;
  await ensureAuthReady();
  try {
    await set(ref(db, path), value);
    return true;
  } catch (error) {
    const msg = String(error ?? '');
    const isDenied = msg.includes('permission_denied') || msg.includes('PERMISSION_DENIED');
    if (isDenied) {
      // Drop denied queued writes to avoid infinite warning loops.
      return true;
    }
    return false;
  }
}

export async function flushOfflineWrites() {
  return flushPendingWrites(writeRealtimeRaw);
}

export async function addLog(log: Omit<AppLog, 'id'>): Promise<void> {
  if (!db) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const latestLog = {
    type: String(log.type ?? 'info').toUpperCase(),
    message: log.message,
    lang: (log.lang ?? 'en').toUpperCase(),
    timestamp,
  };
  await setRealtime('SmartKisanSathi/logs/latest', latestLog);
  const node = push(ref(db, 'SmartKisanSathi/logs/history'));
  try {
    await set(node, latestLog);
  } catch {
    // no-op when write rules block history writes
  }
}

export async function uploadImageAsync(uri: string): Promise<string> {
  if (!storage) return uri;
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileRef = storageRef(storage, `disease-scans/${Date.now()}.jpg`);
  await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(fileRef);
}
