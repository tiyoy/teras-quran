import { signal } from '@preact/signals';
import { readStorage, removeStorage, writeStorage } from '@/lib/storage';
import { currentUid } from './auth';
import {
  listenUserSubCol,
  putUserSubDoc,
  removeUserSubDoc,
  upsertUserProfile,
} from '@/lib/firebase/firestore';
import { showToast } from './toast';

export interface LastReadEntry {
  surahId: number;
  ayahNumber: number;
  globalAyahId: number;
  page: number;
  juz: number;
  updatedAt: number;
}

export interface FavoriteAyah {
  ayaId: number;
  surahId: number;
  ayahNumber: number;
  createdAt: number;
}

export interface AyahNote {
  ayaId: number;
  surahId: number;
  ayahNumber: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface AyahCollection {
  id: string;
  name: string;
  ayahIds: number[];
  createdAt: number;
  updatedAt: number;
}

const KEYS = {
  lastRead: 'tq:guest:lastRead',
  favorites: 'tq:guest:favorites',
  savedSurahs: 'tq:guest:savedSurahs',
  notes: 'tq:guest:notes',
  collections: 'tq:guest:collections',
} as const;

export const lastRead = signal<LastReadEntry | null>(readStorage<LastReadEntry | null>(KEYS.lastRead, null));
export const favorites = signal<FavoriteAyah[]>(readStorage<FavoriteAyah[]>(KEYS.favorites, []));
export const savedSurahs = signal<number[]>(readStorage<number[]>(KEYS.savedSurahs, []));
export const notes = signal<AyahNote[]>(readStorage<AyahNote[]>(KEYS.notes, []));
export const collections = signal<AyahCollection[]>(readStorage<AyahCollection[]>(KEYS.collections, []));

let syncedUid: string | null = null;
let unsubs: Array<() => void> = [];

export function readLocalLibrarySnapshot() {
  return {
    lastRead: readStorage<LastReadEntry | null>(KEYS.lastRead, null),
    favorites: readStorage<FavoriteAyah[]>(KEYS.favorites, []),
    savedSurahs: readStorage<number[]>(KEYS.savedSurahs, []),
    notes: readStorage<AyahNote[]>(KEYS.notes, []),
    collections: readStorage<AyahCollection[]>(KEYS.collections, []),
  };
}

export function applySyncedLastRead(entry: LastReadEntry | null): void {
  lastRead.value = entry;
  writeStorage(KEYS.lastRead, entry);
}

export function applySyncedLibrary(data: {
  lastRead: LastReadEntry | null;
  favorites: FavoriteAyah[];
  savedSurahs: number[];
  notes: AyahNote[];
  collections: AyahCollection[];
}): void {
  lastRead.value = data.lastRead;
  favorites.value = data.favorites;
  savedSurahs.value = data.savedSurahs;
  notes.value = data.notes;
  collections.value = data.collections;
  writeStorage(KEYS.lastRead, data.lastRead);
  writeStorage(KEYS.favorites, data.favorites);
  writeStorage(KEYS.savedSurahs, data.savedSurahs);
  writeStorage(KEYS.notes, data.notes);
  writeStorage(KEYS.collections, data.collections);
}

export function clearLocalLibrary(): void {
  removeStorage(KEYS.lastRead);
  removeStorage(KEYS.favorites);
  removeStorage(KEYS.savedSurahs);
  removeStorage(KEYS.notes);
  removeStorage(KEYS.collections);
  lastRead.value = null;
  favorites.value = [];
  savedSurahs.value = [];
  notes.value = [];
  collections.value = [];
}

export function bindLibrarySync(uid: string | null): void {
  if (syncedUid === uid) return;
  unsubs.forEach((u) => u());
  unsubs = [];
  syncedUid = uid;

  if (!uid) {
    lastRead.value = readStorage<LastReadEntry | null>(KEYS.lastRead, null);
    favorites.value = readStorage<FavoriteAyah[]>(KEYS.favorites, []);
    savedSurahs.value = readStorage<number[]>(KEYS.savedSurahs, []);
    notes.value = readStorage<AyahNote[]>(KEYS.notes, []);
    collections.value = readStorage<AyahCollection[]>(KEYS.collections, []);
    return;
  }

  unsubs.push(
    listenUserSubCol<FavoriteAyah>(uid, 'favorites', (docs) => {
      const sorted = docs.sort((a, b) => b.createdAt - a.createdAt);
      favorites.value = sorted;
      writeStorage(KEYS.favorites, sorted);
    }),
    listenUserSubCol<{ surahId: number }>(uid, 'saved_surahs', (docs) => {
      const sorted = docs.map((d) => Number(d.surahId || d.id)).sort((a, b) => a - b);
      savedSurahs.value = sorted;
      writeStorage(KEYS.savedSurahs, sorted);
    }),
    listenUserSubCol<AyahNote>(uid, 'notes', (docs) => {
      const sorted = docs.sort((a, b) => b.updatedAt - a.updatedAt);
      notes.value = sorted;
      writeStorage(KEYS.notes, sorted);
    }),
    listenUserSubCol<Omit<AyahCollection, 'id'>>(uid, 'collections', (docs) => {
      const sorted = docs.sort((a, b) => b.updatedAt - a.updatedAt);
      collections.value = sorted;
      writeStorage(KEYS.collections, sorted);
    })
  );
}

export function setLastRead(entry: Omit<LastReadEntry, 'updatedAt'>): void {
  const full: LastReadEntry = { ...entry, updatedAt: Date.now() };
  lastRead.value = full;
  writeStorage(KEYS.lastRead, full);
  const uid = currentUid.value;
  if (uid) upsertUserProfile(uid, { lastRead: full }).catch(() => {});
  showToast('Ditandai sebagai bacaan terakhir.', { variant: 'success' });
}

export function isFavoriteAyah(globalAyahId: number): boolean {
  return favorites.value.some((f) => f.ayaId === globalAyahId);
}

export function toggleFavoriteAyah(ayaId: number, surahId: number, ayahNumber: number): void {
  const exists = isFavoriteAyah(ayaId);
  const uid = currentUid.value;
  if (exists) {
    favorites.value = favorites.value.filter((f) => f.ayaId !== ayaId);
    writeStorage(KEYS.favorites, favorites.value);
    if (uid) removeUserSubDoc(uid, 'favorites', String(ayaId)).catch(() => {});
    showToast('Dihapus dari favorit.');
  } else {
    const item: FavoriteAyah = { ayaId, surahId, ayahNumber, createdAt: Date.now() };
    favorites.value = [item, ...favorites.value];
    writeStorage(KEYS.favorites, favorites.value);
    if (uid) putUserSubDoc(uid, 'favorites', String(ayaId), item).catch(() => {});
    showToast('Ditambahkan ke favorit.', { variant: 'success' });
  }
}

export function isSurahSaved(surahId: number): boolean {
  return savedSurahs.value.includes(surahId);
}

export function toggleSavedSurah(surahId: number): void {
  const exists = isSurahSaved(surahId);
  const uid = currentUid.value;
  if (exists) {
    savedSurahs.value = savedSurahs.value.filter((s) => s !== surahId);
    writeStorage(KEYS.savedSurahs, savedSurahs.value);
    if (uid) removeUserSubDoc(uid, 'saved_surahs', String(surahId)).catch(() => {});
    showToast('Dihapus dari surah pilihan.');
  } else {
    savedSurahs.value = [...savedSurahs.value, surahId].sort((a, b) => a - b);
    writeStorage(KEYS.savedSurahs, savedSurahs.value);
    if (uid) putUserSubDoc(uid, 'saved_surahs', String(surahId), { surahId, createdAt: Date.now() }).catch(() => {});
    showToast('Ditambahkan ke surah pilihan.', { variant: 'success' });
  }
}

export function getNoteForAyah(ayaId: number): AyahNote | null {
  return notes.value.find((n) => n.ayaId === ayaId) ?? null;
}

export function saveAyahNote(ayaId: number, surahId: number, ayahNumber: number, rawText: string): void {
  const text = rawText.trim().slice(0, 2000);
  const uid = currentUid.value;
  if (!text) {
    deleteAyahNote(ayaId);
    return;
  }
  const existing = getNoteForAyah(ayaId);
  const now = Date.now();
  const note: AyahNote = {
    ayaId,
    surahId,
    ayahNumber,
    text,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  notes.value = [note, ...notes.value.filter((n) => n.ayaId !== ayaId)];
  writeStorage(KEYS.notes, notes.value);
  if (uid) putUserSubDoc(uid, 'notes', String(ayaId), note).catch(() => {});
  showToast('Catatan disimpan.', { variant: 'success' });
}

export function deleteAyahNote(ayaId: number): void {
  const uid = currentUid.value;
  notes.value = notes.value.filter((n) => n.ayaId !== ayaId);
  writeStorage(KEYS.notes, notes.value);
  if (uid) removeUserSubDoc(uid, 'notes', String(ayaId)).catch(() => {});
  showToast('Catatan dihapus.');
}

export function createCollection(rawName: string): AyahCollection | null {
  const name = rawName.trim().slice(0, 60);
  if (!name) return null;
  const now = Date.now();
  const col: AyahCollection = {
    id: `col_${now}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    ayahIds: [],
    createdAt: now,
    updatedAt: now,
  };
  collections.value = [col, ...collections.value];
  writeStorage(KEYS.collections, collections.value);
  const uid = currentUid.value;
  if (uid) putUserSubDoc(uid, 'collections', col.id, col).catch(() => {});
  showToast(`Koleksi "${name}" dibuat.`, { variant: 'success' });
  return col;
}

export function renameCollection(id: string, rawName: string): void {
  const name = rawName.trim().slice(0, 60);
  if (!name) return;
  const uid = currentUid.value;
  collections.value = collections.value.map((c) =>
    c.id === id ? { ...c, name, updatedAt: Date.now() } : c
  );
  writeStorage(KEYS.collections, collections.value);
  const updated = collections.value.find((c) => c.id === id);
  if (uid && updated) putUserSubDoc(uid, 'collections', id, updated).catch(() => {});
  showToast('Nama koleksi diubah.', { variant: 'success' });
}

export function deleteCollection(id: string): void {
  const uid = currentUid.value;
  collections.value = collections.value.filter((c) => c.id !== id);
  writeStorage(KEYS.collections, collections.value);
  if (uid) removeUserSubDoc(uid, 'collections', id).catch(() => {});
  showToast('Koleksi dihapus.');
}

export function toggleAyahInCollection(collectionId: string, ayaId: number): void {
  const target = collections.value.find((c) => c.id === collectionId);
  if (!target) return;
  const has = target.ayahIds.includes(ayaId);
  if (!has && target.ayahIds.length >= 200) {
    showToast(`Koleksi "${target.name}" sudah penuh (maks. 200 ayat).`, { variant: 'error' });
    return;
  }
  const nextIds = has ? target.ayahIds.filter((x) => x !== ayaId) : [...target.ayahIds, ayaId];
  const updated: AyahCollection = { ...target, ayahIds: nextIds, updatedAt: Date.now() };
  collections.value = collections.value.map((c) => (c.id === collectionId ? updated : c));
  writeStorage(KEYS.collections, collections.value);
  const uid = currentUid.value;
  if (uid) putUserSubDoc(uid, 'collections', collectionId, updated).catch(() => {});
  showToast(has ? `Dihapus dari "${target.name}".` : `Ditambahkan ke "${target.name}".`, {
    variant: has ? 'info' : 'success',
  });
}
