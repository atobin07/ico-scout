import { Badge } from '@/components/ui';

/**
 * Consistent stub for dashboard routes still under construction.
 * `phase` is kept for internal tracking but never shown to users.
 */
export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
  /** Internal build-phase marker — not rendered. */
  phase?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 tracking-tight text-ink-1">{title}</h1>
          <p className="mt-1 text-sm text-ink-2">{description}</p>
        </div>
        <Badge tone="signal">Coming soon</Badge>
      </div>
      <div className="grid min-h-[320px] place-items-center rounded-xl border border-dashed border-border-2 bg-navy/50">
        <div className="text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-ink-3">
            Coming soon
          </div>
          <div className="mt-1 text-sm text-ink-2">This view is being built.</div>
        </div>
      </div>
    </div>
  );
}
