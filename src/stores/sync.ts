import { effect } from '@preact/signals';
import { currentUid, initAuthListener, userProfile } from './auth';
import { bindLibrarySync, lastRead } from './library';
import { bindProgressSync, readingGoal, recordReadAyahs } from './progress';
import { bindHifzSync } from './hifz';
import { bindKhatamanListSync } from './khataman';
import { bindNotificationsSync } from './notifications';
import { bindTasbihSync } from './tasbih';
import { reminderSettings } from './reminders';
import { onAyahAudioCompleted } from './audio-player';
import { initPwaListener } from './pwa';
import { initOfflineSync } from './offline';

let started = false;
let unsubKhataman: (() => void) | null = null;
let unsubNotifs: (() => void) | null = null;

export function bootstrapAppStores(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  initAuthListener();
  initPwaListener();

  // Register Service Worker quietly & start automatic full-app offline sync
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => initOfflineSync())
      .catch(() => {});
  } else {
    initOfflineSync();
  }

  // Record ayahs read when audio finishes an ayah
  onAyahAudioCompleted((ayah) => {
    recordReadAyahs([ayah.i]);
  });

  // Bind Firestore realtime sync whenever authenticated UID changes
  effect(() => {
    const uid = currentUid.value;
    bindLibrarySync(uid);
    bindProgressSync(uid);
    bindHifzSync(uid);
    bindTasbihSync(uid);

    unsubKhataman?.();
    unsubKhataman = bindKhatamanListSync(uid);

    unsubNotifs?.();
    unsubNotifs = bindNotificationsSync(uid);
  });

  // Apply profile synced fields (lastRead, readingGoal, reminder)
  effect(() => {
    const prof = userProfile.value;
    if (!prof) return;
    if (prof.lastRead) lastRead.value = prof.lastRead;
    if (prof.readingGoal !== undefined) readingGoal.value = prof.readingGoal;
    if (prof.reminder) reminderSettings.value = prof.reminder;
  });
}
