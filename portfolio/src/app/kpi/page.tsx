"use client";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, AlertTriangle } from "lucide-react";
import { useState } from "react";

const revenueData = [
  { month: "Jan", mrr: 182000, target: 175000 },
  { month: "Feb", mrr: 195000, target: 185000 },
  { month: "Mar", mrr: 211000, target: 200000 },
  { month: "Apr", mrr: 228000, target: 215000 },
  { month: "May", mrr: 244000, target: 230000 },
  { month: "Jun", mrr: 261000, target: 245000 },
  { month: "Jul", mrr: 278000, target: 260000 },
  { month: "Aug", mrr: 296000, target: 278000 },
  { month: "Sep", mrr: 312000, target: 295000 },
  { month: "Oct", mrr: 329000, target: 310000 },
  { month: "Nov", mrr: 347000, target: 325000 },
  { month: "Dec", mrr: 368000, target: 340000 },
];

const churnData = [
  { month: "Jan", rate: 3.2 },
  { month: "Feb", rate: 2.8 },
  { month: "Mar", rate: 3.1 },
  { month: "Apr", rate: 2.5 },
  { month: "May", rate: 2.2 },
  { month: "Jun", rate: 1.9 },
  { month: "Jul", rate: 2.1 },
  { month: "Aug", rate: 1.7 },
  { month: "Sep", rate: 1.5 },
  { month: "Oct", rate: 1.8 },
  { month: "Nov", rate: 1.4 },
  { month: "Dec", rate: 1.2 },
];

const acquisitionData = [
  { channel: "Organic", value: 38 },
  { channel: "Paid", value: 27 },
  { channel: "Referral", value: 21 },
  { channel: "Partner", value: 14 },
];

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899"];

const burnData = [
  { month: "Aug", burn: 142000, revenue: 296000 },
  { month: "Sep", burn: 138000, revenue: 312000 },
  { month: "Oct", burn: 145000, revenue: 329000 },
  { month: "Nov", burn: 141000, revenue: 347000 },
  { month: "Dec", burn: 137000, revenue: 368000 },
];

function StatCard({
  label, value, change, icon: Icon, color, sub,
}: {
  label: string; value: string; change: number; icon: React.ElementType; color: string; sub?: string;
}) {
  const up = change >= 0;
  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: up ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
            color: up ? "#10b981" : "#ef4444",
          }}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(change)}%
        </span>
      </div>
      <div className="text-2xl font-bold mb-0.5" style={{ color: "var(--foreground)" }}>{value}</div>
      <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{sub}</div>}
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
      <p className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000
            ? `$${(p.value / 1000).toFixed(0)}k` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function KPIDashboard() {
  const [period, setPeriod] = useState("YTD");
  const periods = ["MTD", "QTD", "YTD", "All Time"];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Executive Dashboard</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Acme Corp · Last updated 2 minutes ago</p>
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
            {periods.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: period === p ? "var(--accent)" : "transparent",
                  color: period === p ? "white" : "var(--muted)",
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Monthly Recurring Revenue" value="$368K" change={6.1} icon={DollarSign} color="#6366f1" sub="ARR: $4.41M" />
          <StatCard label="Churn Rate" value="1.2%" change={-14.3} icon={Activity} color="#10b981" sub="Target: <2%" />
          <StatCard label="Customer Acq. Cost" value="$312" change={-8.7} icon={Users} color="#f59e0b" sub="LTV: $4,680" />
          <StatCard label="Gross Margin" value="74.3%" change={2.1} icon={AlertTriangle} color="#ec4899" sub="Target: 72%" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>MRR vs Target</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Monthly recurring revenue tracking</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded"
                style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                +8.2% above target
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${v / 1000}k`} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="mrr" name="MRR" stroke="#6366f1" strokeWidth={2} fill="url(#mrrGrad)" />
                <Line type="monotone" dataKey="target" name="Target" stroke="#4b5563" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>Acquisition by Channel</h2>
            <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>New customer sources</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={acquisitionData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  dataKey="value" paddingAngle={3}>
                  {acquisitionData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--card-border)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-2">
              {acquisitionData.map((d, i) => (
                <div key={d.channel} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                    <span style={{ color: "var(--muted)" }}>{d.channel}</span>
                  </div>
                  <span className="font-medium" style={{ color: "var(--foreground)" }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Churn Rate Trend</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Monthly churn % over time</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded"
                style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                ↓ 62.5% YoY
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={churnData}>
                <defs>
                  <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="rate" name="Churn %" stroke="#10b981" strokeWidth={2} fill="url(#churnGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Revenue vs Burn</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Cash efficiency — last 5 months</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded"
                style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                2.7x efficiency
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={burnData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${v / 1000}k`} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="burn" name="Burn" fill="#ef4444" fillOpacity={0.6} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

      </div>
    </div>
  );
}
