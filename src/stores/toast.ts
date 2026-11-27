import { signal } from '@preact/signals';

export interface ToastItem {
  id: string;
  message: string;
  description?: string;
  variant: 'info' | 'success' | 'error';
  action?: { label: string; href?: string; onClick?: () => void };
}

export const toasts = signal<ToastItem[]>([]);

export function showToast(
  message: string,
  options: {
    description?: string;
    variant?: 'info' | 'success' | 'error';
    duration?: number;
    action?: { label: string; href?: string; onClick?: () => void };
  } = {}
): string {
  const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const item: ToastItem = {
    id,
    message,
    description: options.description,
    variant: options.variant ?? 'info',
    action: options.action,
  };
  toasts.value = [...toasts.value.slice(-3), item];
  const duration = options.duration ?? 3500;
  if (duration > 0 && Number.isFinite(duration)) {
    setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

export function dismissToast(id: string): void {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}
