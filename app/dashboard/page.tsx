import { StatBlock } from '@/components/ui';
import { PagePlaceholder } from '@/components/dashboard/PagePlaceholder';

/** Overview / live feed. Full build in Phase 5. */
export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Calls today" value="—" tone="signal" />
        <StatBlock label="Revenue recovered (mo)" value="—" tone="live" />
        <StatBlock label="Missed calls" value="—" tone="warn" />
        <StatBlock label="Avg answer time" value="—" unit="sec" />
      </div>
      <PagePlaceholder
        title="Overview"
        description="Live call feed, recent activity, and upcoming appointments."
        phase="Phase 5"
      />
    </div>
  );
}
