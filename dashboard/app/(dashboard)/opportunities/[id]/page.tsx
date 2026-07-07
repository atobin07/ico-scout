import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { type Opportunity } from "@/lib/types";
import { ScoreBadge } from "@/components/score-badge";
import { StatusDropdown } from "@/components/status-dropdown";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

export const dynamic = "force-dynamic";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-[11px] uppercase tracking-wide text-[#8b949e]">{label}</dt>
      <dd className="text-sm text-[#e6edf3]">{children}</dd>
    </div>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function formatValue(min: number | null, max: number | null): string {
  const v = max ?? min;
  if (!v) return "TBD";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: opp } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .single();

  if (!opp) notFound();

  const o = opp as Opportunity;

  // Similar opportunities
  const { data: similar } = await supabase
    .from("opportunities")
    .select("id, title, composite_score, agency_or_company")
    .neq("id", id)
    .or(`agency_or_company.eq.${o.agency_or_company ?? "null"}`)
    .order("composite_score", { ascending: false })
    .limit(5);

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link href="/opportunities" className="text-xs text-[#8b949e] hover:text-[#4a90e2] transition-colors">
            ← All Opportunities
          </Link>
          <h1 className="mt-2 text-base font-semibold text-[#e6edf3] leading-snug">
            {o.title ?? "Untitled"}
          </h1>
          <p className="text-sm text-[#8b949e] mt-0.5">{o.agency_or_company}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ScoreBadge score={o.composite_score} />
          <StatusDropdown opportunityId={o.id} currentStatus={o.status} />
          {o.url && (
            <a
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded border border-[#30363d] text-xs text-[#8b949e] hover:border-[#4a90e2] hover:text-[#4a90e2] transition-colors"
            >
              Source ↗
            </a>
          )}
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Composite", score: o.composite_score },
          { label: "Fit", score: o.fit_score },
          { label: "Urgency", score: o.urgency_score },
          { label: "Effort", score: o.effort_score },
        ].map(({ label, score }) => (
          <div key={label} className="rounded-lg border border-[#30363d] bg-[#161b22] p-3 text-center">
            <div className="text-[11px] uppercase tracking-wide text-[#8b949e] mb-1">{label}</div>
            <ScoreBadge score={score} />
          </div>
        ))}
      </div>

      {/* Fit rationale + red flags */}
      {o.fit_rationale && (
        <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-[#8b949e]">AI Assessment</h3>
          <p className="text-sm text-[#e6edf3]">{o.fit_rationale}</p>
          {o.red_flags && o.red_flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {o.red_flags.map((flag, i) => (
                <Badge key={i} variant="cold" className="text-[#f85149] ring-[#f85149]/20 bg-[#f85149]/10">
                  ⚠ {flag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fields grid */}
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-lg border border-[#30363d] bg-[#161b22] p-4 sm:grid-cols-3">
        <Field label="Source"><Badge variant="source">{o.source}</Badge></Field>
        <Field label="Contract Type">{o.contract_type ?? "—"}</Field>
        <Field label="Solicitation #">
          <span className="font-mono text-xs">{o.solicitation_number || "—"}</span>
        </Field>
        <Field label="Posted">{formatDate(o.posted_date)}</Field>
        <Field label="Deadline">
          <span className="font-mono text-sm">{formatDate(o.response_deadline)}</span>
        </Field>
        <Field label="Value">{formatValue(o.estimated_value_min, o.estimated_value_max)}</Field>
        <Field label="Set-Aside">{o.set_aside_type || "None"}</Field>
        <Field label="NAICS">{o.naics_codes?.join(", ") || "—"}</Field>
        <Field label="Categories">
          <div className="flex flex-wrap gap-1">
            {o.categories?.map((c) => <Badge key={c} variant="warm">{c.replace("_", " ")}</Badge>) ?? "—"}
          </div>
        </Field>
      </dl>

      {/* Description */}
      <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-2">
        <h3 className="text-xs uppercase tracking-wide text-[#8b949e]">Description</h3>
        <p className="text-sm text-[#e6edf3] whitespace-pre-wrap leading-relaxed">
          {o.description ?? "No description available."}
        </p>
      </div>

      {/* Notes */}
      <NotesSection opportunityId={o.id} initialNotes={o.notes} />

      {/* Raw JSON */}
      <details className="rounded-lg border border-[#30363d] bg-[#161b22]">
        <summary className="px-4 py-3 cursor-pointer text-xs uppercase tracking-wide text-[#8b949e] hover:text-[#e6edf3] transition-colors">
          Raw JSON
        </summary>
        <pre className="px-4 pb-4 text-[11px] font-mono text-[#8b949e] overflow-auto max-h-80">
          {JSON.stringify(o.raw_content, null, 2)}
        </pre>
      </details>

      {/* Similar */}
      {similar && similar.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-[#8b949e]">Similar Opportunities</h3>
          <div className="space-y-1">
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`/opportunities/${s.id}`}
                className="flex items-center justify-between rounded border border-[#30363d] bg-[#161b22] px-3 py-2 hover:border-[#4a90e2] transition-colors"
              >
                <div>
                  <p className="text-sm text-[#e6edf3] line-clamp-1">{s.title}</p>
                  <p className="text-xs text-[#8b949e]">{s.agency_or_company}</p>
                </div>
                <ScoreBadge score={s.composite_score} size="sm" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Client component for notes auto-save
import NotesSection from "./notes-section";
