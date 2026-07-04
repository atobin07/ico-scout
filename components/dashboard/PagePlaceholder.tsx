import { Badge } from '@/components/ui';

/**
 * Consistent stub for dashboard routes that are scaffolded in Phase 1
 * and fully built in a later phase.
 */
export function PagePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 tracking-tight text-ink-1">{title}</h1>
          <p className="mt-1 text-sm text-ink-2">{description}</p>
        </div>
        <Badge tone="signal">{phase}</Badge>
      </div>
      <div className="grid min-h-[320px] place-items-center rounded-xl border border-dashed border-border-2 bg-navy/50">
        <div className="text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-ink-3">
            Scaffolded
          </div>
          <div className="mt-1 text-sm text-ink-2">
            This view is wired up in {phase}.
          </div>
        </div>
      </div>
    </div>
  );
}
