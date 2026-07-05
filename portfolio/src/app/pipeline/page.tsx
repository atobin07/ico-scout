"use client";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from "recharts";
import { TrendingUp, Clock, DollarSign, Target, User, ChevronRight } from "lucide-react";

const stages = [
  { name: "Prospecting", count: 124, value: 3720000, fill: "#6366f1" },
  { name: "Qualified", count: 87, value: 2610000, fill: "#818cf8" },
  { name: "Demo", count: 53, value: 1908000, fill: "#a5b4fc" },
  { name: "Proposal", count: 31, value: 1550000, fill: "#10b981" },
  { name: "Negotiation", count: 18, value: 1080000, fill: "#34d399" },
  { name: "Closed Won", count: 9, value: 630000, fill: "#6ee7b7" },
];

const reps = [
  { name: "Sarah Chen", deals: 24, value: 820000, won: 8, rate: 33 },
  { name: "Marcus Webb", deals: 19, value: 710000, won: 6, rate: 31 },
  { name: "Priya Patel", deals: 31, value: 940000, won: 11, rate: 35 },
  { name: "Jake Torres", deals: 16, value: 540000, won: 4, rate: 25 },
  { name: "Anika Moss", deals: 22, value: 780000, won: 9, rate: 41 },
];

const deals = [
  { company: "Nexus Analytics", stage: "Negotiation", value: 185000, rep: "Priya Patel", days: 14, prob: 82 },
  { company: "Vertex Systems", stage: "Proposal", value: 124000, rep: "Sarah Chen", days: 7, prob: 65 },
  { company: "Orbit Health", stage: "Demo", value: 210000, rep: "Anika Moss", days: 3, prob: 48 },
  { company: "Pulse Media", stage: "Negotiation", value: 98000, rep: "Marcus Webb", days: 21, prob: 74 },
  { company: "Synth Labs", stage: "Proposal", value: 156000, rep: "Priya Patel", days: 5, prob: 61 },
  { company: "Cedar Finance", stage: "Demo", value: 320000, rep: "Jake Torres", days: 1, prob: 42 },
];

const forecastData = [
  { month: "Oct", committed: 580000, upside: 340000, omitted: 120000 },
  { month: "Nov", committed: 620000, upside: 290000, omitted: 180000 },
  { month: "Dec", committed: 740000, upside: 410000, omitted: 95000 },
];

const stageColors: Record<string, string> = {
  "Prospecting": "#6366f1",
  "Qualified": "#818cf8",
  "Demo": "#a5b4fc",
  "Proposal": "#10b981",
  "Negotiation": "#f59e0b",
  "Closed Won": "#6ee7b7",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
      <p className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || p.fill }}>
          {p.name}: ${(p.value / 1000).toFixed(0)}k
        </p>
      ))}
    </div>
  );
};

export default function PipelineDashboard() {
  const totalPipeline = stages.reduce((s, d) => s + d.value, 0);
  const winRate = Math.round((stages[5].count / stages[0].count) * 100);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Sales Pipeline</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Q4 2025 · 5 reps · Updated live</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}>
              Export CSV
            </button>
            <button className="px-4 py-2 rounded-lg text-xs font-medium text-white"
              style={{ background: "var(--accent)" }}>
              + Add Deal
            </button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Pipeline", value: `$${(totalPipeline / 1000000).toFixed(1)}M`, icon: DollarSign, color: "#6366f1" },
            { label: "Win Rate", value: `${winRate}%`, icon: Target, color: "#10b981" },
            { label: "Avg Deal Size", value: "$87.4K", icon: TrendingUp, color: "#f59e0b" },
            { label: "Avg Days to Close", value: "38 days", icon: Clock, color: "#ec4899" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <div className="text-xl font-bold mb-0.5" style={{ color: "var(--foreground)" }}>{value}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
            </Card>
          ))}
        </div>

        {/* Funnel + Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {/* Pipeline Funnel */}
          <Card className="lg:col-span-2">
            <h2 className="text-sm font-semibold mb-5" style={{ color: "var(--foreground)" }}>Pipeline by Stage</h2>
            <div className="space-y-2">
              {stages.map((s, i) => {
                const pct = Math.round((s.count / stages[0].count) * 100);
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--muted)" }}>{s.name}</span>
                      <div className="flex gap-3">
                        <span style={{ color: "var(--foreground)" }}>{s.count} deals</span>
                        <span style={{ color: s.fill }}>${(s.value / 1000).toFixed(0)}k</span>
                      </div>
                    </div>
                    <div className="h-6 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded flex items-center pl-2 text-xs font-medium text-white transition-all"
                        style={{ width: `${pct}%`, background: s.fill, minWidth: "2rem" }}>
                        {pct}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Revenue Forecast */}
          <Card className="lg:col-span-3">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Revenue Forecast</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Committed + upside + pipeline</p>
              </div>
              <div className="flex gap-3 text-xs">
                {[["#6366f1", "Committed"], ["#10b981", "Upside"], ["#f59e0b", "Pipeline"]].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                    <span style={{ color: "var(--muted)" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={forecastData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${v / 1000}k`} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="committed" name="Committed" fill="#6366f1" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="upside" name="Upside" fill="#10b981" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="omitted" name="Pipeline" fill="#f59e0b" fillOpacity={0.7} radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Deals Table + Rep Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Hot Deals */}
          <Card className="lg:col-span-2">
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>Hot Deals — Top Opportunities</h2>
            <div className="space-y-2">
              {deals.map(d => (
                <div key={d.company} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(99,102,241,0.15)" }}>
                    <User size={13} style={{ color: "#6366f1" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>{d.company}</span>
                      <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: "var(--foreground)" }}>
                        ${(d.value / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: `${stageColors[d.stage]}20`, color: stageColors[d.stage] }}>
                        {d.stage}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{d.rep}</span>
                      <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>
                        {d.days}d · {d.prob}% close
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={13} style={{ color: "var(--muted)" }} />
                </div>
              ))}
            </div>
          </Card>

          {/* Rep Leaderboard */}
          <Card>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>Rep Leaderboard</h2>
            <div className="space-y-4">
              {[...reps].sort((a, b) => b.value - a.value).map((r, i) => (
                <div key={r.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold w-4" style={{ color: i === 0 ? "#f59e0b" : "var(--muted)" }}>#{i + 1}</span>
                      <span style={{ color: "var(--foreground)" }}>{r.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                      ${(r.value / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{
                        width: `${(r.value / 940000) * 100}%`,
                        background: i === 0 ? "#f59e0b" : "#6366f1",
                      }} />
                    </div>
                    <span className="text-xs w-12 text-right" style={{ color: "var(--muted)" }}>{r.rate}% WR</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
