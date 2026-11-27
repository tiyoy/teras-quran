import { describe, it, expect } from 'vitest';
import { readStorage, writeStorage } from '@/lib/storage';
import { isFirebaseConfigured, getFirebaseAuth, getFirebaseDb } from '@/lib/firebase/client';

describe('storage & firebase graceful fallback', () => {
  it('returns fallback cleanly when storage is unavailable or contains invalid JSON', () => {
    const fakeStore = new Map<string, string>([['broken', '{invalid-json']]);
    const mockStorage = {
      getItem: (k: string) => fakeStore.get(k) ?? null,
      setItem: (k: string, v: string) => fakeStore.set(k, v),
      removeItem: (k: string) => fakeStore.delete(k),
    } as unknown as Storage;

    expect(readStorage('broken', { ok: true }, mockStorage)).toEqual({ ok: true });
    expect(writeStorage('good', { n: 42 }, mockStorage)).toBe(true);
    expect(readStorage('good', { n: 0 }, mockStorage)).toEqual({ n: 42 });
  });

  it('reports Firebase as unconfigured without env vars and never throws', () => {
    expect(isFirebaseConfigured).toBe(false);
    expect(getFirebaseAuth()).toBeNull();
    expect(getFirebaseDb()).toBeNull();
  });
});
