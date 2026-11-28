import { computed, signal } from '@preact/signals';
import type { User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';
import { subscribeAuth } from '@/lib/firebase/auth';
import { listenUserDoc, upsertUserProfile } from '@/lib/firebase/firestore';

export interface UserProfileDoc {
  displayName?: string;
  email?: string;
  createdAt?: number;
  updatedAt?: number;
  lastRead?: {
    surahId: number;
    ayahNumber: number;
    globalAyahId: number;
    page: number;
    juz: number;
    updatedAt: number;
  };
  readingGoal?: {
    unit: 'ayah' | 'page' | 'juz';
    amount: number;
    targetDate?: string | null;
  } | null;
  reminder?: {
    enabled: boolean;
    time: string;
    days: number[];
    timezone: string;
    skipIfGoalMet: boolean;
    includeHifz: boolean;
  };
}

export const authUser = signal<User | null>(null);
export const authReady = signal<boolean>(!isFirebaseConfigured);
export const userProfile = signal<UserProfileDoc | null>(null);

export const isAuthenticated = computed(() => authUser.value !== null);
export const isVerified = computed(() => Boolean(authUser.value?.emailVerified));
export const currentUid = computed(() => authUser.value?.uid ?? null);
export const userInitials = computed(() => {
  const name = userProfile.value?.displayName || authUser.value?.displayName || authUser.value?.email || '';
  if (!name) return 'TQ';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
});

let initialized = false;
let unsubProfile: (() => void) | null = null;

export function initAuthListener(): void {
  if (typeof window === 'undefined') return;
  if (initialized) {
    // Keep signal synchronized if Firebase Auth already resolved currentUser
    const existing = getFirebaseAuth()?.currentUser ?? null;
    if (existing && authUser.value?.uid !== existing.uid) {
      authUser.value = existing;
      authReady.value = true;
    }
    return;
  }
  initialized = true;
  if (!isFirebaseConfigured) {
    authReady.value = true;
    return;
  }

  const current = getFirebaseAuth()?.currentUser ?? null;
  if (current) {
    authUser.value = current;
    authReady.value = true;
  }

  // Offline-first safety timeout: never leave auth gates stuck loading if Firebase SDK stalls offline
  const fallbackTimer = setTimeout(() => {
    if (!authReady.value) {
      authReady.value = true;
    }
  }, 2500);

  subscribeAuth((user) => {
    clearTimeout(fallbackTimer);
    authUser.value = user;
    authReady.value = true;
    unsubProfile?.();
    unsubProfile = null;

    if (user) {
      unsubProfile = listenUserDoc<UserProfileDoc>(user.uid, (docData) => {
        if (!docData) {
          const initial: UserProfileDoc = {
            displayName: user.displayName || user.email?.split('@')[0] || 'Pembaca',
            email: user.email || '',
            createdAt: Date.now(),
          };
          userProfile.value = initial;
          upsertUserProfile(user.uid, initial).catch(() => {});
        } else {
          userProfile.value = docData;
        }
      });
    } else {
      userProfile.value = null;
    }
  });
}

export { isFirebaseConfigured };
