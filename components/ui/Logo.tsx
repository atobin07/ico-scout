import { cn } from '@/lib/utils';

/**
 * CallCatch "Hook B" mark — a phone-cord hook that doubles as a catch.
 * Signal-blue stroke on a navy tile.
 */
export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#0C1525" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="#1A2D44" />
      {/* Hook / catch curve */}
      <path
        d="M11 8.5v7.5a5 5 0 0 0 5 5h1.5a4 4 0 1 0 0-8"
        stroke="#1B54E8"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Signal dot */}
      <circle cx="11" cy="8.5" r="2.2" fill="#00D97E" />
    </svg>
  );
}

export function Logo({
  size = 28,
  className,
  showWordmark = true,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="text-lg font-800 tracking-tight text-ink-1">
          Call<span className="text-sky">Catch</span>
        </span>
      )}
    </div>
  );
}
