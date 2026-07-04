import { cn } from '@/lib/utils';

/**
 * Dispatch-console KPI block. Value is rendered in IBM Plex Mono
 * with tabular figures — every number in CallCatch is monospace.
 */
export function StatBlock({
  label,
  value,
  unit,
  delta,
  tone = 'default',
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: string; positive?: boolean };
  tone?: 'default' | 'live' | 'signal' | 'warn';
  className?: string;
}) {
  const valueColor = {
    default: 'text-ink-1',
    live: 'text-live',
    signal: 'text-sky',
    warn: 'text-warn',
  }[tone];

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-navy px-4 py-4',
        className,
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-ink-2">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={cn('font-mono text-3xl font-600 leading-none', valueColor)}>
          {value}
        </span>
        {unit && <span className="font-mono text-sm text-ink-3">{unit}</span>}
      </div>
      {delta && (
        <div
          className={cn(
            'mt-2 font-mono text-xs',
            delta.positive ? 'text-live' : 'text-danger',
          )}
        >
          {delta.positive ? '▲' : '▼'} {delta.value}
        </div>
      )}
    </div>
  );
}
