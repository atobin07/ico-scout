"use client";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Zap, TrendingUp, Users, Target, CheckCircle, XCircle, Clock, Building2 } from "lucide-react";
import { useState } from "react";

const leads = [
  {
    company: "Vanta AI", contact: "Lisa Chen", title: "VP of Operations",
    score: 94, tier: "A", industry: "SaaS", employees: "200-500",
    signals: { fit: 96, intent: 91, engagement: 88, timing: 94, budget: 97 },
    tags: ["High Intent", "Budget Confirmed", "Decision Maker"],
    status: "Hot",
    source: "Organic",
  },
  {
    company: "Meridian Health", contact: "David Park", title: "CTO",
    score: 88, tier: "A", industry: "HealthTech", employees: "500-1000",
    signals: { fit: 90, intent: 84, engagement: 92, timing: 85, budget: 88 },
    tags: ["Executive Sponsor", "Active Trial"],
    status: "Hot",
    source: "Referral",
  },
  {
    company: "Arclight Media", contact: "Priya Santos", title: "Director of Marketing",
    score: 76, tier: "B", industry: "Media", employees: "50-200",
    signals: { fit: 78, intent: 72, engagement: 80, timing: 74, budget: 71 },
    tags: ["Content Engaged", "Returning Visitor"],
    status: "Warm",
    source: "Paid",
  },
  {
    company: "TerraScale", contact: "Marcus Wright", title: "Head of Finance",
    score: 71, tier: "B", industry: "Fintech", employees: "100-500",
    signals: { fit: 74, intent: 68, engagement: 65, timing: 77, budget: 80 },
    tags: ["Budget Owner", "Demo Requested"],
    status: "Warm",
    source: "Partner",
  },
  {
    company: "Bolt Commerce", contact: "Emma Liu", title: "Product Manager",
    score: 54, tier: "C", industry: "E-Commerce", employees: "10-50",
    signals: { fit: 60, intent: 45, engagement: 58, timing: 52, budget: 48 },
    tags: ["Newsletter Sub"],
    status: "Cold",
    source: "Organic",
  },
  {
    company: "GroveStack", contact: "Ryan Adams", title: "Founder",
    score: 48, tier: "C", industry: "SaaS", employees: "1-10",
    signals: { fit: 52, intent: 40, engagement: 55, timing: 44, budget: 35 },
    tags: ["Early Stage"],
    status: "Cold",
    source: "Paid",
  },
];

const volumeData = [
  { week: "W1", hot: 4, warm: 11, cold: 18 },
  { week: "W2", hot: 6, warm: 14, cold: 22 },
  { week: "W3", hot: 5, warm: 16, cold: 19 },
  { week: "W4", hot: 9, warm: 13, cold: 24 },
  { week: "W5", hot: 11, warm: 18, cold: 20 },
  { week: "W6", hot: 8, warm: 21, cold: 17 },
];

const scoreColors: Record<string, string> = {
  Hot: "#ef4444",
  Warm: "#f59e0b",
  Cold: "#6b7280",
};

const tierColors: Record<string, string> = {
  A: "#6366f1",
  B: "#10b981",
  C: "#6b7280",
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "#ef4444" : score >= 65 ? "#f59e0b" : "#6b7280";
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${score} 100`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
      <p className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function LeadScoringDashboard() {
  const [selected, setSelected] = useState(leads[0]);

  const radarData = [
    { axis: "Fit", value: selected.signals.fit },
    { axis: "Intent", value: selected.signals.intent },
    { axis: "Engagement", value: selected.signals.engagement },
    { axis: "Timing", value: selected.signals.timing },
    { axis: "Budget", value: selected.signals.budget },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} style={{ color: "#f59e0b" }} />
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>AI Lead Scoring</h1>
            </div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              6 leads scored · Model accuracy: 91.4% · Last enriched 4 min ago
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg text-xs font-medium text-white"
            style={{ background: "#f59e0b" }}>
            + Import Leads
          </button>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Hot Leads (A-tier)", value: "2", icon: Zap, color: "#ef4444" },
            { label: "Warm Leads (B-tier)", value: "2", icon: TrendingUp, color: "#f59e0b" },
            { label: "Avg Score", value: "71.8", icon: Target, color: "#6366f1" },
            { label: "Est. Pipeline Value", value: "$1.84M", icon: Users, color: "#10b981" },
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {/* Lead List */}
          <Card className="lg:col-span-2">
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>Ranked Leads</h2>
            <div className="space-y-2">
              {leads.map((lead) => (
                <button key={lead.company} onClick={() => setSelected(lead)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                  style={{
                    background: selected.company === lead.company ? "var(--accent-glow)" : "rgba(255,255,255,0.03)",
                    border: selected.company === lead.company ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--card-border)",
                  }}>
                  <ScoreBadge score={lead.score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>{lead.company}</span>
                      <span className="text-xs font-bold ml-2 px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: `${tierColors[lead.tier]}20`, color: tierColors[lead.tier] }}>
                        {lead.tier}
                      </span>
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: "var(--muted)" }}>{lead.contact} · {lead.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: `${scoreColors[lead.status]}20`, color: scoreColors[lead.status] }}>
                        {lead.status}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{lead.source}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Lead Detail */}
          <Card className="lg:col-span-3" glow={selected.tier === "A"}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={14} style={{ color: "var(--accent)" }} />
                  <h2 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{selected.company}</h2>
                  <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: `${tierColors[selected.tier]}20`, color: tierColors[selected.tier] }}>
                    Tier {selected.tier}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {selected.contact} · {selected.title} · {selected.industry} · {selected.employees} employees
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold" style={{
                  color: selected.score >= 85 ? "#ef4444" : selected.score >= 65 ? "#f59e0b" : "#6b7280"
                }}>{selected.score}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>AI Score</div>
              </div>
            </div>

            {/* Radar */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>Signal Breakdown</p>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--card-border)" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                    <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>Score Dimensions</p>
                {Object.entries(selected.signals).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--foreground)" }} className="capitalize">{key}</span>
                      <span style={{ color: val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : "#6b7280" }}>{val}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${val}%`,
                          background: val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : "#6b7280",
                        }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags + Actions */}
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--card-border)" }}>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selected.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                    style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <CheckCircle size={10} /> {t}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg text-xs font-medium text-white"
                  style={{ background: "var(--accent)" }}>
                  Route to Sales
                </button>
                <button className="flex-1 py-2 rounded-lg text-xs font-medium"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)", border: "1px solid var(--card-border)" }}>
                  Add to Sequence
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Lead Volume Chart */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Weekly Lead Volume by Tier</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Inbound lead flow over last 6 weeks</p>
            </div>
            <div className="flex gap-4 text-xs">
              {[["#ef4444", "Hot"], ["#f59e0b", "Warm"], ["#6b7280", "Cold"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                  <span style={{ color: "var(--muted)" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={volumeData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="week" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hot" name="Hot" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="warm" name="Warm" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cold" name="Cold" fill="#6b7280" fillOpacity={0.6} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

      </div>
    </div>
  );
}
