import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseDb } from './client';

export function userDocRef(uid: string) {
  const db = getFirebaseDb();
  return db ? doc(db, 'users', uid) : null;
}

export function userSubCol(uid: string, sub: string) {
  const db = getFirebaseDb();
  return db ? collection(db, 'users', uid, sub) : null;
}

export function userSubDoc(uid: string, sub: string, id: string) {
  const db = getFirebaseDb();
  return db ? doc(db, 'users', uid, sub, id) : null;
}

export async function upsertUserProfile(uid: string, patch: DocumentData): Promise<void> {
  const ref = userDocRef(uid);
  if (!ref) return;
  await setDoc(ref, { ...patch, updatedAt: Date.now() }, { merge: true });
}

export async function putUserSubDoc(
  uid: string,
  sub: string,
  id: string,
  data: DocumentData
): Promise<void> {
  const ref = userSubDoc(uid, sub, id);
  if (!ref) return;
  await setDoc(ref, data, { merge: true });
}

export async function removeUserSubDoc(uid: string, sub: string, id: string): Promise<void> {
  const ref = userSubDoc(uid, sub, id);
  if (!ref) return;
  await deleteDoc(ref);
}

export function listenUserSubCol<T>(
  uid: string,
  sub: string,
  cb: (items: Array<T & { id: string }>) => void
): () => void {
  const col = userSubCol(uid, sub);
  if (!col) return () => {};
  return onSnapshot(
    col,
    (snap) => {
      cb(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })));
    },
    () => {}
  );
}

export function listenUserDoc<T>(uid: string, cb: (data: T | null) => void): () => void {
  const ref = userDocRef(uid);
  if (!ref) return () => {};
  return onSnapshot(
    ref,
    (snap) => cb(snap.exists() ? (snap.data() as T) : null),
    () => {}
  );
}

export async function exportFirestoreUserData(uid: string): Promise<Record<string, unknown>> {
  const db = getFirebaseDb();
  if (!db) return {};
  const profileSnap = await getDoc(doc(db, 'users', uid));
  const subs = [
    'favorites',
    'saved_surahs',
    'notes',
    'collections',
    'reading_days',
    'khatam',
    'hafalan',
    'khataman_groups',
    'tasbih_presets',
    'tasbih_logs',
  ];
  const out: Record<string, unknown> = {
    profile: profileSnap.exists() ? profileSnap.data() : null,
  };
  for (const sub of subs) {
    const snap = await getDocs(collection(db, 'users', uid, sub));
    out[sub] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const notifSnap = await getDocs(
    query(collection(db, 'notifications'), where('userId', '==', uid))
  );
  out.notifications = notifSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return out;
}

export async function deleteAllFirestoreUserData(uid: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const subs = [
    'favorites',
    'saved_surahs',
    'notes',
    'collections',
    'reading_days',
    'khatam',
    'hafalan',
    'khataman_groups',
    'tasbih_presets',
    'tasbih_logs',
  ];
  for (const sub of subs) {
    const snap = await getDocs(collection(db, 'users', uid, sub));
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  const notifSnap = await getDocs(
    query(collection(db, 'notifications'), where('userId', '==', uid))
  );
  for (let i = 0; i < notifSnap.docs.length; i += 400) {
    const batch = writeBatch(db);
    notifSnap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'users', uid));
}

export { collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, setDoc, where, writeBatch, deleteDoc };
