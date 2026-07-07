"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { format, parseISO } from "date-fns";
import { type Source } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

const CHART_COLORS = ["#4a90e2", "#3fb950", "#d29922", "#f85149", "#8b949e", "#a371f7"];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-3">
      <h3 className="text-xs uppercase tracking-wide text-[#8b949e]">{title}</h3>
      {children}
    </div>
  );
}

function scoreToLabel(score: number): string {
  const bucket = Math.floor(score / 10) * 10;
  return `${bucket}-${bucket + 9}`;
}

export function AnalyticsCharts({
  weekly,
  scores,
  statusCounts,
  sources,
}: {
  weekly: Record<string, unknown>[];
  scores: number[];
  statusCounts: Record<string, number>;
  sources: Source[];
}) {
  // Weekly volume
  const weeklyData = weekly.map((w) => ({
    week: (() => {
      try { return format(parseISO(w.week_start as string), "MMM d"); } catch { return w.week_start as string; }
    })(),
    count: w.opportunity_count as number,
    source: w.source as string,
  })).reverse();

  // Score distribution
  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 90; i += 10) buckets[`${i}-${i + 9}`] = 0;
  scores.forEach((s) => {
    const b = Math.min(Math.floor(s / 10) * 10, 90);
    const key = `${b}-${b + 9}`;
    buckets[key] = (buckets[key] ?? 0) + 1;
  });
  const distData = Object.entries(buckets).map(([range, count]) => ({ range, count }));

  // Status funnel
  const STATUS_ORDER = ["new", "reviewing", "pursuing", "submitted", "won", "lost"];
  const funnelData = STATUS_ORDER
    .filter((s) => statusCounts[s] > 0)
    .map((s, i) => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      value: statusCounts[s] ?? 0,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Weekly volume */}
      <Panel title="Weekly Volume by Source">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="week" tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, fontSize: 12 }}
              cursor={{ fill: "#21262d" }}
            />
            <Bar dataKey="count" fill="#4a90e2" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Score distribution */}
      <Panel title="Score Distribution">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={distData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="range" tick={{ fill: "#8b949e", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, fontSize: 12 }}
              cursor={{ fill: "#21262d" }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {distData.map((entry) => {
                const base = parseInt(entry.range.split("-")[0]);
                const color = base >= 85 ? "#3fb950" : base >= 70 ? "#4a90e2" : base >= 50 ? "#d29922" : "#8b949e";
                return <Cell key={entry.range} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Status funnel */}
      <Panel title="Status Funnel">
        {funnelData.length > 0 ? (
          <div className="space-y-1.5">
            {funnelData.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-20 text-xs text-[#8b949e]">{item.name}</span>
                <div className="flex-1 h-5 bg-[#21262d] rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${Math.max(5, (item.value / (funnelData[0]?.value ?? 1)) * 100)}%`,
                      background: item.fill,
                    }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-xs text-[#8b949e]">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#484f58]">No data yet.</p>
        )}
      </Panel>

      {/* Source health */}
      <Panel title="Source Health">
        <div className="space-y-2">
          {sources.length === 0 ? (
            <p className="text-xs text-[#484f58]">No sources configured.</p>
          ) : (
            sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.last_error ? "bg-[#f85149]" : s.last_fetched_at ? "bg-[#3fb950]" : "bg-[#8b949e]"}`} />
                  <span className="text-[#e6edf3]">{s.name}</span>
                </div>
                <div className="text-right text-[#8b949e]">
                  {s.last_fetched_at
                    ? formatDistanceToNow(new Date(s.last_fetched_at), { addSuffix: true })
                    : "Never"}
                  {s.last_error && (
                    <span className="ml-2 text-[#f85149]" title={s.last_error}>⚠</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
