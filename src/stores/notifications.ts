import { computed, signal } from '@preact/signals';
import { readStorage, writeStorage } from '@/lib/storage';
import { getFirebaseDb } from '@/lib/firebase/client';
import { collection, doc, onSnapshot, query, setDoc, where } from '@/lib/firebase/firestore';
import { currentUid } from './auth';

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  body: string;
  type: 'account' | 'reminder' | 'info';
  read: boolean;
  timestamp: number;
}

const KEY = 'tq:guest:notifications';

export const notifications = signal<AppNotification[]>(
  readStorage<AppNotification[]>(KEY, [
    {
      id: 'welcome-teras-quran',
      title: "Selamat datang di Teras Qur'an",
      body: "Baca Al-Qur'an 30 juz, lacak hafalan murajaah, jadwal sholat, kiblat, dan tasbih digital dalam satu tempat.",
      type: 'info',
      read: false,
      timestamp: Date.now(),
    },
  ])
);

export const unreadNotificationCount = computed(
  () => notifications.value.filter((n) => !n.read).length
);

export function addLocalNotification(
  input: Pick<AppNotification, 'title' | 'body' | 'type'>
): void {
  const item: AppNotification = {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    userId: currentUid.value ?? undefined,
    title: input.title,
    body: input.body,
    type: input.type,
    read: false,
    timestamp: Date.now(),
  };
  notifications.value = [item, ...notifications.value].slice(0, 50);
  writeStorage(KEY, notifications.value);
  const db = getFirebaseDb();
  if (db && currentUid.value) {
    setDoc(doc(db, 'notifications', item.id), item).catch(() => {});
  }
}

export function markNotificationRead(id: string): void {
  notifications.value = notifications.value.map((n) => (n.id === id ? { ...n, read: true } : n));
  writeStorage(KEY, notifications.value);
  const db = getFirebaseDb();
  if (db && currentUid.value) {
    setDoc(doc(db, 'notifications', id), { read: true }, { merge: true }).catch(() => {});
  }
}

export function markAllNotificationsRead(): void {
  notifications.value = notifications.value.map((n) => ({ ...n, read: true }));
  writeStorage(KEY, notifications.value);
  const db = getFirebaseDb();
  if (db && currentUid.value) {
    for (const n of notifications.value) {
      setDoc(doc(db, 'notifications', n.id), { read: true }, { merge: true }).catch(() => {});
    }
  }
}

export function bindNotificationsSync(uid: string | null): () => void {
  const db = getFirebaseDb();
  if (!db || !uid) return () => {};
  const q = query(collection(db, 'notifications'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      if (snap.docs.length) {
        notifications.value = snap.docs
          .map((d) => ({ ...(d.data() as AppNotification), id: d.id }))
          .sort((a, b) => b.timestamp - a.timestamp);
      }
    },
    () => {}
  );
}
