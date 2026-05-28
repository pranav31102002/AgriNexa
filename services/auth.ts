import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { firebasePaths } from '@/constants/firebase-paths';
import { auth, firebaseAppReady, setRealtime } from '@/services/firebase';

export function watchAuth(callback: (user: User | null) => void) {
  if (!auth || !firebaseAppReady) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function login(email: string, password: string) {
  if (!auth) throw new Error('Firebase Auth is not configured.');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signup(email: string, password: string) {
  if (!auth) throw new Error('Firebase Auth is not configured.');
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signupWithProfile(payload: {
  name: string;
  email: string;
  password: string;
  phone: string;
  farmName: string;
  location: string;
  farmArea: string;
  farmDistrict?: string;
  preferredLanguage: string;
  theme: string;
  role?: 'admin' | 'farmer' | 'viewer';
}) {
  if (!auth) throw new Error('Firebase Auth is not configured.');
  const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
  await updateProfile(cred.user, { displayName: payload.name });
  const saved = await setRealtime(`${firebasePaths.userProfiles}/${cred.user.uid}`, {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    farmName: payload.farmName,
    location: payload.location || payload.farmArea,
    farmArea: payload.farmArea,
    farmVillage: payload.farmArea,
    farmDistrict: payload.farmDistrict ?? '',
    preferredLanguage: payload.preferredLanguage,
    theme: payload.theme,
    role: payload.role ?? 'farmer',
    createdAt: Math.floor(Date.now() / 1000),
    lastLogin: Math.floor(Date.now() / 1000),
  });
  if (!saved) {
    throw new Error('Account created but profile save failed. Check Firebase Database rules for SmartKisanSathi/userProfiles/{uid}.');
  }
  return cred;
}

export async function sendResetPasswordLink(email: string) {
  if (!auth) throw new Error('Firebase Auth is not configured.');
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  if (!auth) return;
  const uid = auth.currentUser?.uid;
  if (uid) {
    await setRealtime(`${firebasePaths.userProfiles}/${uid}/sessionOnline`, false);
    await setRealtime(`${firebasePaths.userProfiles}/${uid}/sessionLastSeen`, Math.floor(Date.now() / 1000));
  }
  await signOut(auth);
}
