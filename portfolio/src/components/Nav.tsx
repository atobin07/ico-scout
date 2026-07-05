"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, TrendingUp, Zap, Home } from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/kpi", label: "KPI Dashboard", icon: BarChart3 },
  { href: "/pipeline", label: "Sales Pipeline", icon: TrendingUp },
  { href: "/lead-scoring", label: "Lead Scoring", icon: Zap },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav style={{ background: "var(--card)", borderBottom: "1px solid var(--card-border)" }}
      className="sticky top-0 z-50 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}>
            <BarChart3 size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--foreground)" }}>
            BizOps Suite
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = path === href;
            return (
              <Link key={href} href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: active ? "var(--accent-glow)" : "transparent",
                  color: active ? "var(--accent)" : "var(--muted)",
                  border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                }}>
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
