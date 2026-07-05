import Link from "next/link";
import Nav from "@/components/Nav";
import { BarChart3, TrendingUp, Zap, ArrowRight, CheckCircle } from "lucide-react";

const projects = [
  {
    href: "/kpi",
    icon: BarChart3,
    label: "Executive KPI Dashboard",
    desc: "Real-time visibility into revenue, churn, CAC, LTV, and burn rate — everything a CEO needs in one view.",
    tags: ["SaaS", "E-Commerce", "Agencies"],
    color: "#6366f1",
  },
  {
    href: "/pipeline",
    icon: TrendingUp,
    label: "Sales Pipeline Tracker",
    desc: "Visual deal funnel with stage velocity, rep performance, close probability, and revenue forecasting.",
    tags: ["Sales Teams", "B2B", "CRM"],
    color: "#10b981",
  },
  {
    href: "/lead-scoring",
    icon: Zap,
    label: "AI Lead Scoring",
    desc: "Rank inbound leads by conversion likelihood using firmographic signals and behavioral data.",
    tags: ["Lead Gen", "B2B", "Marketing Ops"],
    color: "#f59e0b",
  },
];

const benefits = [
  "Built with production-grade code — not templates",
  "Mobile-responsive & dark-mode native",
  "Real data integrations available (CRM, Stripe, HubSpot)",
  "Custom-branded for your business in days",
];

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
          style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.3)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          Live Portfolio — Click any project to explore
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-5" style={{ color: "var(--foreground)" }}>
          Business Intelligence<br />
          <span style={{ color: "var(--accent)" }}>Built to Close Deals</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: "var(--muted)" }}>
          Custom dashboards and operations tools that give your team the clarity to move faster and your leadership the confidence to make better decisions.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/kpi"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm text-white transition-all hover:opacity-90"
            style={{ background: "var(--accent)" }}>
            Explore Projects <ArrowRight size={15} />
          </Link>
          <a href="mailto:atobin07@proton.me"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all"
            style={{ color: "var(--foreground)", border: "1px solid var(--card-border)", background: "var(--card)" }}>
            Get in Touch
          </a>
        </div>
      </section>

      {/* Projects */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {projects.map(({ href, icon: Icon, label, desc, tags, color }) => (
            <Link key={href} href={href}
              className="group rounded-xl p-6 transition-all hover:-translate-y-1"
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--foreground)" }}>{label}</h3>
              <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--muted)" }}>{desc}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tags.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded text-xs"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs font-medium" style={{ color }}>
                View Live Demo <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why section */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--foreground)" }}>Why businesses choose custom over off-the-shelf</h2>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>Generic tools force your team to adapt. Custom tools adapt to your team.</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {benefits.map(b => (
            <li key={b} className="flex items-start gap-3 text-sm p-4 rounded-lg"
              style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <CheckCircle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--green)" }} />
              <span style={{ color: "var(--foreground)" }}>{b}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
