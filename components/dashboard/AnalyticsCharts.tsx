'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const tooltip = {
  contentStyle: {
    background: '#0C1525',
    border: '1px solid #243D58',
    borderRadius: 10,
    color: '#E8F0FF',
    fontSize: 12,
  },
  labelStyle: { color: '#7A9ABE' },
  cursor: { fill: 'rgba(27,84,232,0.08)' },
};

const axis = { stroke: '#3A5A7A', fontSize: 11, tickLine: false, axisLine: false };

export function RevenueBar({ data }: { data: { day: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#1A2D44" />
        <XAxis dataKey="day" {...axis} />
        <YAxis {...axis} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
        <Tooltip {...tooltip} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Recovered']} />
        <Bar dataKey="revenue" fill="#00D97E" radius={[4, 4, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CallsByHour({ data }: { data: { hour: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#1A2D44" />
        <XAxis dataKey="hour" {...axis} interval={1} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip {...tooltip} formatter={(v: number) => [v, 'Calls']} />
        <Bar dataKey="count" fill="#1B54E8" radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OutcomeDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip {...tooltip} formatter={(v: number, n: string) => [v, n]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="font-mono text-ink-1">
              {d.value}
              {total > 0 && <span className="ml-1 text-ink-3">{Math.round((d.value / total) * 100)}%</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
