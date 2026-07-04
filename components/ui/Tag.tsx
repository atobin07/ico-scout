import { cn } from '@/lib/utils';

/** Small square-ish label used for trade types, sources, etc. */
export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-border bg-navy-mid px-2 py-0.5',
        'font-mono text-[11px] uppercase tracking-wide text-ink-2',
        className,
      )}
    >
      {children}
    </span>
  );
}
