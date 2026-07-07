import { createClient } from "@/lib/supabase/server";
import { AnalyticsCharts } from "./analytics-charts";
import { type Source } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [weeklyRes, scoreDistRes, statusRes, sourcesRes] = await Promise.all([
    supabase.from("weekly_pipeline").select("*").order("week_start", { ascending: false }).limit(12),
    supabase
      .from("opportunities")
      .select("composite_score")
      .not("composite_score", "is", null),
    supabase
      .from("opportunities")
      .select("status"),
    supabase.from("sources").select("*"),
  ]);

  const weekly = weeklyRes.data ?? [];
  const scores = (scoreDistRes.data ?? []).map((r) => r.composite_score as number);
  const statusCounts = (statusRes.data ?? []).reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sources = (sourcesRes.data ?? []) as Source[];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#30363d]">
        <h1 className="text-base font-semibold text-[#e6edf3]">Analytics</h1>
        <p className="text-xs text-[#8b949e] mt-0.5">Pipeline health and volume trends</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <AnalyticsCharts
          weekly={weekly}
          scores={scores}
          statusCounts={statusCounts}
          sources={sources}
        />
      </div>
    </div>
  );
}
