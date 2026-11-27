import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

function readPublicEnv(key: string): string {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return (metaEnv?.[key] ?? '').trim();
}

const firebaseConfig = {
  apiKey: readPublicEnv('PUBLIC_FIREBASE_API_KEY'),
  authDomain: readPublicEnv('PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: readPublicEnv('PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readPublicEnv('PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readPublicEnv('PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readPublicEnv('PUBLIC_FIREBASE_APP_ID'),
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured || typeof window === 'undefined') return null;
  if (!appInstance) {
    appInstance = getApps()[0] ?? initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!authInstance) {
    authInstance = getAuth(app);
    authInstance.useDeviceLanguage();
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!dbInstance) {
    try {
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      dbInstance = getFirestore(app);
    }
  }
  return dbInstance;
}

export function getGoogleProvider(): GoogleAuthProvider | null {
  if (!isFirebaseConfigured) return null;
  if (!googleProviderInstance) {
    googleProviderInstance = new GoogleAuthProvider();
  }
  return googleProviderInstance;
}
