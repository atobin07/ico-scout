import { createClient } from "@/lib/supabase/server";
import { ConfigForm } from "./config-form";
import { type ScoringConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scoring_config")
    .select("*")
    .eq("active", true)
    .single();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#30363d]">
        <h1 className="text-base font-semibold text-[#e6edf3]">Scoring Config</h1>
        <p className="text-xs text-[#8b949e] mt-0.5">ICP, capabilities, weights — changes take effect on next pipeline run</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {data ? (
          <ConfigForm config={data as ScoringConfig} />
        ) : (
          <p className="text-sm text-[#f85149]">No active config found. Run seed.sql in Supabase.</p>
        )}
      </div>
    </div>
  );
}
