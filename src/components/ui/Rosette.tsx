interface RosetteProps {
  number: number | string;
  size?: 'sm' | 'md';
  active?: boolean;
}

export function Rosette({ number, size = 'md', active = false }: RosetteProps) {
  const dim = size === 'sm' ? 'size-8 text-xs' : 'size-10 text-xs';
  return (
    <span
      class={`relative inline-flex ${dim} shrink-0 items-center justify-center font-semibold tabular-nums ${
        active ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'
      }`}
    >
      <svg
        viewBox="0 0 40 40"
        class="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <rect
          x="7"
          y="7"
          width="26"
          height="26"
          rx="3"
          fill={active ? 'var(--accent)' : 'var(--secondary)'}
          stroke={active ? 'var(--primary)' : 'var(--border)'}
          stroke-width="1.4"
        />
        <rect
          x="7"
          y="7"
          width="26"
          height="26"
          rx="3"
          transform="rotate(45 20 20)"
          fill={active ? 'var(--accent)' : 'var(--secondary)'}
          stroke={active ? 'var(--primary)' : 'var(--border)'}
          stroke-width="1.4"
        />
      </svg>
      <span class="relative z-10 leading-none">{number}</span>
    </span>
  );
}
