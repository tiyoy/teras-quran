import { signal } from '@preact/signals';
import { readStorage, removeStorage, writeStorage } from '@/lib/storage';
import { getFirebaseDb } from '@/lib/firebase/client';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
} from '@/lib/firebase/firestore';
import { authUser, currentUid, userProfile } from './auth';
import { showToast } from './toast';

export interface KhatamanSlot {
  uid: string | null;
  name: string | null;
  claimedAt: number;
  doneAt: number | null;
}

export interface KhatamanGroup {
  id: string;
  title: string;
  createdBy: string;
  createdAt: number;
  round: number;
  doneCount: number;
  slots: Record<string, KhatamanSlot>;
}

const LOCAL_KEY = 'tq:guest:khatamanGroups';
export const myKhatamanGroups = signal<KhatamanGroup[]>(
  readStorage<KhatamanGroup[]>(LOCAL_KEY, [])
);

function getActor(): { uid: string; name: string } {
  const uid = currentUid.value ?? 'local-user';
  const name =
    userProfile.value?.displayName || authUser.value?.displayName || 'Pembaca Lokal';
  return { uid, name };
}

function saveLocalGroups(groups: KhatamanGroup[]) {
  myKhatamanGroups.value = groups;
  writeStorage(LOCAL_KEY, groups);
}

export async function createKhatamanGroup(rawTitle: string): Promise<KhatamanGroup | null> {
  const title = rawTitle.replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!title) return null;
  const actor = getActor();
  const id = `kh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const group: KhatamanGroup = {
    id,
    title,
    createdBy: actor.uid,
    createdAt: Date.now(),
    round: 1,
    doneCount: 0,
    slots: {},
  };

  const db = getFirebaseDb();
  if (db && currentUid.value) {
    await setDoc(doc(db, 'khataman', id), group);
    await setDoc(doc(db, 'khataman', id, 'participants', actor.uid), {
      uid: actor.uid,
      name: actor.name,
      joinedAt: group.createdAt,
    });
    await setDoc(doc(db, 'users', actor.uid, 'khataman_groups', id), {
      title,
      joinedAt: group.createdAt,
    });
  }

  saveLocalGroups([group, ...myKhatamanGroups.value.filter((g) => g.id !== id)]);
  showToast('Grup khataman dibuat.', { variant: 'success' });
  return group;
}

export async function loadKhatamanGroup(groupId: string): Promise<KhatamanGroup | null> {
  const db = getFirebaseDb();
  if (db && currentUid.value) {
    const snap = await getDoc(doc(db, 'khataman', groupId));
    if (snap.exists()) {
      return { ...(snap.data() as Omit<KhatamanGroup, 'id'>), id: snap.id };
    }
  }
  return myKhatamanGroups.value.find((g) => g.id === groupId) ?? null;
}

export function subscribeKhatamanGroup(
  groupId: string,
  cb: (group: KhatamanGroup | null) => void
): () => void {
  const db = getFirebaseDb();
  if (db && currentUid.value) {
    return onSnapshot(
      doc(db, 'khataman', groupId),
      (snap) => {
        cb(snap.exists() ? { ...(snap.data() as Omit<KhatamanGroup, 'id'>), id: snap.id } : null);
      },
      () => cb(myKhatamanGroups.value.find((g) => g.id === groupId) ?? null)
    );
  }
  cb(myKhatamanGroups.value.find((g) => g.id === groupId) ?? null);
  return () => {};
}

async function mutateGroup(
  groupId: string,
  updater: (g: KhatamanGroup) => KhatamanGroup
): Promise<KhatamanGroup | null> {
  const db = getFirebaseDb();
  if (db && currentUid.value) {
    let result: KhatamanGroup | null = null;
    await runTransaction(db, async (tx) => {
      const ref = doc(db, 'khataman', groupId);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('not-found');
      const current = { ...(snap.data() as Omit<KhatamanGroup, 'id'>), id: snap.id };
      result = updater(current);
      tx.update(ref, {
        slots: result.slots,
        doneCount: result.doneCount,
        round: result.round,
      });
    });
    if (result) {
      saveLocalGroups(
        myKhatamanGroups.value.some((g) => g.id === groupId)
          ? myKhatamanGroups.value.map((g) => (g.id === groupId ? result! : g))
          : [result, ...myKhatamanGroups.value]
      );
    }
    return result;
  }

  const found = myKhatamanGroups.value.find((g) => g.id === groupId);
  if (!found) return null;
  const updated = updater(found);
  saveLocalGroups(myKhatamanGroups.value.map((g) => (g.id === groupId ? updated : g)));
  return updated;
}

export async function claimKhatamanJuz(groupId: string, juz: number, customName?: string): Promise<KhatamanGroup | null> {
  const actor = getActor();
  const displayName = (customName?.trim() || actor.name).slice(0, 60);
  return mutateGroup(groupId, (g) => {
    const key = String(juz);
    if (g.slots[key]) throw new Error('taken');
    return {
      ...g,
      slots: {
        ...g.slots,
        [key]: { uid: actor.uid, name: displayName, claimedAt: Date.now(), doneAt: null },
      },
    };
  });
}

export async function toggleKhatamanJuzDone(groupId: string, juz: number, done: boolean): Promise<KhatamanGroup | null> {
  const actor = getActor();
  return mutateGroup(groupId, (g) => {
    const key = String(juz);
    const slot = g.slots[key];
    if (!slot || slot.uid !== actor.uid) throw new Error('not-yours');
    const wasDone = slot.doneAt !== null;
    if (wasDone === done) return g;
    return {
      ...g,
      slots: { ...g.slots, [key]: { ...slot, doneAt: done ? Date.now() : null } },
      doneCount: Math.max(0, g.doneCount + (done ? 1 : -1)),
    };
  });
}

export async function releaseKhatamanJuz(groupId: string, juz: number): Promise<KhatamanGroup | null> {
  const actor = getActor();
  return mutateGroup(groupId, (g) => {
    const key = String(juz);
    const slot = g.slots[key];
    if (!slot || slot.uid !== actor.uid || slot.doneAt !== null) return g;
    const { [key]: _removed, ...rest } = g.slots;
    return { ...g, slots: rest };
  });
}

export async function startNextKhatamanRound(groupId: string): Promise<KhatamanGroup | null> {
  return mutateGroup(groupId, (g) => ({
    ...g,
    round: g.round + 1,
    slots: {},
    doneCount: 0,
  }));
}

export async function leaveKhatamanGroup(groupId: string): Promise<void> {
  const actor = getActor();
  await mutateGroup(groupId, (g) => {
    const nextSlots: Record<string, KhatamanSlot> = {};
    for (const [k, slot] of Object.entries(g.slots)) {
      if (slot.uid === actor.uid) {
        if (slot.doneAt !== null) {
          nextSlots[k] = { ...slot, uid: null, name: null };
        }
      } else {
        nextSlots[k] = slot;
      }
    }
    return { ...g, slots: nextSlots };
  }).catch(() => {});

  const db = getFirebaseDb();
  if (db && currentUid.value) {
    await deleteDoc(doc(db, 'khataman', groupId, 'participants', actor.uid)).catch(() => {});
    await deleteDoc(doc(db, 'users', actor.uid, 'khataman_groups', groupId)).catch(() => {});
  }
  saveLocalGroups(myKhatamanGroups.value.filter((g) => g.id !== groupId));
  showToast('Kamu sudah keluar dari khataman.');
}

export function clearLocalKhataman(): void {
  removeStorage(LOCAL_KEY);
  myKhatamanGroups.value = [];
}

export function bindKhatamanListSync(uid: string | null): () => void {
  const db = getFirebaseDb();
  if (!db || !uid) return () => {};
  return onSnapshot(
    collection(db, 'users', uid, 'khataman_groups'),
    async (snap) => {
      const loaded: KhatamanGroup[] = [];
      for (const d of snap.docs) {
        const g = await loadKhatamanGroup(d.id);
        if (g) loaded.push(g);
      }
      if (loaded.length) saveLocalGroups(loaded);
    },
    () => {}
  );
}
