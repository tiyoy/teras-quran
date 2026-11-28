import { signal } from '@preact/signals';
import { readStorage, removeStorage, writeStorage } from '@/lib/storage';
import { currentUid } from './auth';
import { upsertUserProfile } from '@/lib/firebase/firestore';
import { formatDateKey } from '@/lib/quran/meta';
import { showToast } from './toast';
import { addLocalNotification } from './notifications';

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:mm
  days: number[]; // 0..6
  timezone: string;
  skipIfGoalMet: boolean;
  includeHifz: boolean;
}

const KEY = 'tq:reminder';
const SHOWN_KEY = 'tq:reminder:shown';

const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  time: '19:30',
  days: [0, 1, 2, 3, 4, 5, 6],
  timezone:
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
      : 'Asia/Jakarta',
  skipIfGoalMet: true,
  includeHifz: true,
};

export const reminderSettings = signal<ReminderSettings>({
  ...DEFAULT_REMINDER,
  ...readStorage<Partial<ReminderSettings>>(KEY, {}),
});

export function readLocalReminderSnapshot(): ReminderSettings {
  return {
    ...DEFAULT_REMINDER,
    ...readStorage<Partial<ReminderSettings>>(KEY, {}),
  };
}

export function applySyncedReminder(next: ReminderSettings): void {
  reminderSettings.value = next;
  writeStorage(KEY, next);
}

export function clearLocalReminder(): void {
  removeStorage(KEY);
  removeStorage(SHOWN_KEY);
  reminderSettings.value = { ...DEFAULT_REMINDER };
}

export function updateReminderSettings(patch: Partial<ReminderSettings>): void {
  const next: ReminderSettings = { ...reminderSettings.value, ...patch };
  if (!next.days.length) return;
  reminderSettings.value = next;
  writeStorage(KEY, next);
  const uid = currentUid.value;
  if (uid) upsertUserProfile(uid, { reminder: next }).catch(() => {});
}

export async function enableDailyReminder(): Promise<'granted' | 'in-app' | 'denied'> {
  let result: 'granted' | 'in-app' | 'denied' = 'in-app';
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm === 'denied') return 'denied';
      if (perm === 'granted') result = 'granted';
    } else if (Notification.permission === 'denied') {
      return 'denied';
    } else if (Notification.permission === 'granted') {
      result = 'granted';
    }
  }
  updateReminderSettings({ enabled: true });
  showToast('Pengingat harian aktif.', { variant: 'success' });
  return result;
}

export function disableDailyReminder(): void {
  updateReminderSettings({ enabled: false });
  showToast('Pengingat harian dimatikan.');
}

export async function sendTestReminder(): Promise<void> {
  const title = "Waktunya membaca Al-Qur'an";
  const body = "Luangkan waktu sejenak untuk membaca Al-Qur'an hari ini di Teras Qur'an.";
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/favicon.svg' });
    } catch {
      // fallback toast
    }
  }
  addLocalNotification({ title, body, type: 'reminder' });
  showToast(title, { description: body, variant: 'info', action: { label: 'Buka', href: '/app/bacaanku' } });
}

export function checkAndTriggerReminder(goalMet: boolean, hifzDueCount: number): void {
  const cfg = reminderSettings.value;
  if (!cfg.enabled) return;
  const now = new Date();
  const todayKey = formatDateKey(now);
  if (!cfg.days.includes(now.getDay())) return;
  if (readStorage<string>(SHOWN_KEY, '') === todayKey) return;

  const [hh, mm] = cfg.time.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < hh * 60 + mm) return;
  if (cfg.skipIfGoalMet && goalMet) return;

  writeStorage(SHOWN_KEY, todayKey);
  const parts: string[] = [
    goalMet
      ? 'Target hari ini sudah tercapai. Tambah bacaan jika sempat.'
      : "Luangkan waktu sejenak untuk membaca Al-Qur'an hari ini.",
  ];
  if (cfg.includeHifz && hifzDueCount > 0) {
    parts.push(`${hifzDueCount} hafalan jatuh tempo hari ini.`);
  }
  const title = "Waktunya membaca Al-Qur'an";
  const body = parts.join(' ');
  addLocalNotification({ title, body, type: 'reminder' });
  showToast(title, {
    description: body,
    duration: 8000,
    action: { label: 'Buka', href: hifzDueCount > 0 ? '/app/hafalan' : '/app/bacaanku' },
  });
}
