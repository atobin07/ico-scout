import { cn } from '@/lib/utils';

type Tone = 'live' | 'signal' | 'sky' | 'warn' | 'danger' | 'neutral';

const tones: Record<Tone, string> = {
  live: 'bg-live/12 text-live border-live/30',
  signal: 'bg-signal/12 text-sky border-signal/30',
  sky: 'bg-sky/12 text-sky border-sky/30',
  warn: 'bg-warn/12 text-warn border-warn/30',
  danger: 'bg-danger/12 text-danger border-danger/30',
  neutral: 'bg-navy-mid text-ink-2 border-border',
};

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            tone === 'live' && 'bg-live animate-pulse-live',
            tone === 'signal' && 'bg-signal',
            tone === 'sky' && 'bg-sky',
            tone === 'warn' && 'bg-warn',
            tone === 'danger' && 'bg-danger',
            tone === 'neutral' && 'bg-ink-3',
          )}
        />
      )}
      {children}
    </span>
  );
}
