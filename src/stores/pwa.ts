import { signal } from '@preact/signals';
import { showToast } from './toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;

export const canInstallPwa = signal<boolean>(false);
export const isStandalonePwa = signal<boolean>(false);
export const isIosSafari = signal<boolean>(false);

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua);
  return isIos && isSafari;
}

export function initPwaListener(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  isStandalonePwa.value = detectStandalone();
  isIosSafari.value = detectIosSafari();

  // Check if an early inline listener captured the event before hydration
  const early = (window as Window & { __tqInstallPrompt?: BeforeInstallPromptEvent }).__tqInstallPrompt;
  if (early) {
    deferredPrompt = early;
    canInstallPwa.value = !isStandalonePwa.value;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    canInstallPwa.value = !detectStandalone();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    canInstallPwa.value = false;
    isStandalonePwa.value = true;
    showToast("Teras Qur'an berhasil dipasang di perangkat ini.", { variant: 'success' });
  });
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      canInstallPwa.value = false;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
