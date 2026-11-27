import type { ComponentChildren, JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { X } from 'lucide-preact';
import { dismissToast, toasts } from '@/stores/toast';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] border border-transparent',
  secondary:
    'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)] border border-transparent',
  outline:
    'bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] border border-[var(--border)]',
  ghost:
    'bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)] border border-transparent',
  destructive:
    'bg-[var(--destructive-surface)] text-[var(--destructive)] hover:opacity-90 border border-[var(--destructive)]/25',
};

const BTN_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
  icon: 'size-9 rounded-lg justify-center p-0',
};

export interface ButtonProps extends Omit<JSX.IntrinsicElements['button'], 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  href?: string;
  children?: ComponentChildren;
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  class: className = '',
  href,
  children,
  ...rest
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`;
  if (href) {
    return (
      <a href={href} class={`${classes} no-underline`}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} class={classes} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  children,
  class: className = '',
}: {
  children: ComponentChildren;
  class?: string;
}) {
  return (
    <div
      class={`rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] ${className}`}
    >
      {children}
    </div>
  );
}

export type BadgeVariant = 'default' | 'primary' | 'gold' | 'success' | 'destructive';

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]',
  primary: 'bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--primary)]/20',
  gold: 'bg-[var(--gold-surface)] text-[var(--gold-ink)] border-[var(--gold)]/25',
  success: 'bg-[var(--success-surface)] text-[var(--success)] border-[var(--success)]/25',
  destructive:
    'bg-[var(--destructive-surface)] text-[var(--destructive)] border-[var(--destructive)]/25',
};

export function Badge({
  children,
  variant = 'default',
  class: className = '',
}: {
  children: ComponentChildren;
  variant?: BadgeVariant;
  class?: string;
}) {
  return (
    <span
      class={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-tight ${BADGE_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Switch({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  label?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
        checked
          ? 'border-[var(--primary)] bg-[var(--primary)]'
          : 'border-[var(--border)] bg-[var(--muted)]'
      }`}
    >
      <span
        class={`inline-block size-4 rounded-full bg-[var(--card)] transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ComponentChildren;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        class={`w-full ${maxWidth} max-h-[88dvh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--popover)] p-5 text-[var(--popover-foreground)]`}
      >
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold tracking-tight">{title}</h2>
            {description && (
              <p class="mt-0.5 text-sm text-[var(--muted-foreground)]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            class="inline-flex size-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
          >
            <X class="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ComponentChildren;
}) {
  return (
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
        {description && (
          <p class="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
        )}
      </div>
      {actions && <div class="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ComponentChildren;
  title: string;
  description: string;
  action?: ComponentChildren;
}) {
  return (
    <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center">
      <div class="mb-3 flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
        {icon}
      </div>
      <h3 class="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <p class="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">{description}</p>
      {action && <div class="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ToastContainer() {
  const list = toasts.value;
  if (!list.length) return null;

  return (
    <div
      class="pointer-events-none fixed right-4 bottom-20 z-50 flex w-full max-w-sm flex-col gap-2 lg:bottom-6"
      aria-live="polite"
    >
      {list.map((item) => (
        <div
          key={item.id}
          class={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border p-3.5 text-sm ${
            item.variant === 'error'
              ? 'border-[var(--destructive)]/40 bg-[var(--destructive-surface)] text-[var(--destructive)]'
              : item.variant === 'success'
                ? 'border-[var(--primary)]/35 bg-[var(--card)] text-[var(--foreground)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]'
          }`}
        >
          <div class="min-w-0 flex-1">
            <p class="font-medium leading-snug">{item.message}</p>
            {item.description && (
              <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">{item.description}</p>
            )}
            {item.action && (
              <div class="mt-2">
                {item.action.href ? (
                  <a
                    href={item.action.href}
                    class="text-xs font-semibold text-[var(--primary)] hover:underline"
                  >
                    {item.action.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      item.action?.onClick?.();
                      dismissToast(item.id);
                    }}
                    class="text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                  >
                    {item.action.label}
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(item.id)}
            aria-label="Tutup pemberitahuan"
            class="shrink-0 rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] cursor-pointer"
          >
            <X class="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
