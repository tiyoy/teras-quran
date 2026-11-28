import { useEffect, useState } from 'preact/hooks';

interface UserAvatarProps {
  src: string | null;
  initials: string;
  alt: string;
  class?: string;
}

/**
 * Displays the authenticated user's profile photo (e.g. Google account avatar)
 * with `referrerPolicy="no-referrer"` to avoid Google CDN 403s, and falls back
 * gracefully to user initials when unavailable or offline.
 */
export function UserAvatar({ src, initials, alt, class: className = '' }: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!failedSrc) return;
    const retry = () => setFailedSrc(null);
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [failedSrc]);

  const showImage = Boolean(src && failedSrc !== src);

  return (
    <span
      class={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--secondary)] text-[var(--secondary-foreground)] ${className}`}
    >
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => setFailedSrc(src)}
          class="size-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}
