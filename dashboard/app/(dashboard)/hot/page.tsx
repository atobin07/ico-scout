import { createClient } from "@/lib/supabase/server";
import { OpportunityTable } from "@/components/opportunity-table";
import { RealtimeToast } from "@/components/realtime-toast";
import { type Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HotPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hot_opportunities")
    .select("*")
    .order("composite_score", { ascending: false })
    .limit(100);

  const opportunities = (data ?? []) as Opportunity[];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
        <div>
          <h1 className="text-base font-semibold text-[#e6edf3]">Hot List</h1>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Composite ≥ 70 · Active · Deadline &gt; 7 days
          </p>
        </div>
        <span className="font-mono text-xs text-[#8b949e]">
          {opportunities.length} opportunities
        </span>
      </div>

      {error && (
        <div className="px-6 py-3 text-xs text-[#f85149] bg-[#f85149]/5 border-b border-[#f85149]/20">
          Error loading opportunities: {error.message}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <OpportunityTable data={opportunities} />
      </div>

      <RealtimeToast hotThreshold={70} />
    </div>
  );
}
