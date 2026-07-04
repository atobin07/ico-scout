import { cn } from '@/lib/utils';

type Tape = 'live' | 'signal' | 'warn' | 'danger' | 'idle' | 'none';

const tapeClass: Record<Tape, string> = {
  live: 'tape tape-live',
  signal: 'tape tape-signal',
  warn: 'tape tape-warn',
  danger: 'tape tape-danger',
  idle: 'tape tape-idle',
  none: '',
};

/** Base surface panel. Optional 3px left-rail status tape. */
export function Card({
  children,
  className,
  tape = 'none',
}: {
  children: React.ReactNode;
  className?: string;
  tape?: Tape;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-navy overflow-hidden',
        tapeClass[tape],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-border px-4 py-3',
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-ink-1">{title}</h3>
      {action}
    </div>
  );
}
