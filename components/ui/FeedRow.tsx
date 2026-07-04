import { cn } from '@/lib/utils';

type Tape = 'live' | 'signal' | 'warn' | 'danger' | 'idle';

const tapeClass: Record<Tape, string> = {
  live: 'tape tape-live',
  signal: 'tape tape-signal',
  warn: 'tape tape-warn',
  danger: 'tape tape-danger',
  idle: 'tape tape-idle',
};

/**
 * A single row in a live/activity feed. Left-rail tape signals status;
 * timestamp + value render in mono.
 */
export function FeedRow({
  tape = 'idle',
  primary,
  secondary,
  timestamp,
  value,
  className,
}: {
  tape?: Tape;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  timestamp?: string;
  value?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-border/60 py-2.5 pl-4 pr-3 last:border-0',
        tapeClass[tape],
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-ink-1">{primary}</div>
        {secondary && <div className="truncate text-xs text-ink-2">{secondary}</div>}
      </div>
      {value != null && (
        <div className="font-mono text-sm text-ink-1">{value}</div>
      )}
      {timestamp && (
        <div className="font-mono text-xs tabular-nums text-ink-3">{timestamp}</div>
      )}
    </div>
  );
}
