interface BrandLogoProps {
  href?: string;
  compact?: boolean;
  subtitle?: string;
}

export function BrandLogo({
  href = '/',
  compact = false,
  subtitle = "Teras Qur'an",
}: BrandLogoProps) {
  return (
    <a
      href={href}
      class="inline-flex items-center gap-2.5 text-left no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-lg"
    >
      <span class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary)]">
        <svg viewBox="0 0 100 100" class="size-9" aria-hidden="true">
          <rect width="100" height="100" rx="22" fill="var(--primary)" />
          <g transform="translate(50 50) scale(0.92) translate(-50 -56)">
            <path
              d="M18 39L50 61L82 39M50 61L31 83M50 61L69 83"
              fill="none"
              stroke="var(--primary-foreground)"
              stroke-width="6.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M47.5 50.5L22 33C22 28.5 24.5 25.5 28.5 26C36 27 42.5 30.5 47.5 35.5Z"
              fill="var(--primary-foreground)"
            />
            <path
              d="M52.5 50.5L78 33C78 28.5 75.5 25.5 71.5 26C64 27 57.5 30.5 52.5 35.5Z"
              fill="var(--primary-foreground)"
            />
            <path
              d="M50 53.5L52.2 55.7L55.3 55.7L55.3 58.8L57.5 61L55.3 63.2L55.3 66.3L52.2 66.3L50 68.5L47.8 66.3L44.7 66.3L44.7 63.2L42.5 61L44.7 58.8L44.7 55.7L47.8 55.7Z"
              fill="var(--gold)"
            />
          </g>
        </svg>
      </span>
      {!compact && (
        <span class="flex flex-col leading-tight">
          <span class="text-[15px] font-bold tracking-tight text-[var(--foreground)]">
            Al-Qur&apos;an Digital
          </span>
          <span class="text-xs font-medium text-[var(--muted-foreground)]">
            {subtitle}
          </span>
        </span>
      )}
    </a>
  );
}
