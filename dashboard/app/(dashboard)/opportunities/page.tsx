import { createClient } from "@/lib/supabase/server";
import { OpportunityTable } from "@/components/opportunity-table";
import { OpportunityFilters } from "@/components/filters";
import { Suspense } from "react";
import { type Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

interface SearchParams {
  source?: string | string[];
  type?: string | string[];
  status?: string | string[];
  minScore?: string;
  q?: string;
  page?: string;
}

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const page = parseInt(params.page ?? "0", 10);
  const minScore = parseInt(params.minScore ?? "0", 10);
  const q = params.q ?? "";
  const sources = toArray(params.source);
  const types = toArray(params.type);
  const statuses = toArray(params.status);

  let query = supabase
    .from("opportunities")
    .select("*", { count: "exact" })
    .order("composite_score", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (minScore > 0) query = query.gte("composite_score", minScore);
  if (sources.length) query = query.in("source", sources);
  if (types.length) query = query.in("contract_type", types);
  if (statuses.length) query = query.in("status", statuses);
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, count, error } = await query;
  const opportunities = (data ?? []) as Opportunity[];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
        <div>
          <h1 className="text-base font-semibold text-[#e6edf3]">All Opportunities</h1>
          <p className="text-xs text-[#8b949e] mt-0.5">
            {count ?? 0} total · Page {page + 1} of {Math.max(totalPages, 1)}
          </p>
        </div>
      </div>

      <Suspense>
        <OpportunityFilters />
      </Suspense>

      {error && (
        <div className="px-6 py-2 text-xs text-[#f85149]">Error: {error.message}</div>
      )}

      <div className="flex-1 overflow-auto">
        <OpportunityTable data={opportunities} />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-[#30363d] text-xs text-[#8b949e]">
          {page > 0 && (
            <a href={`?page=${page - 1}`} className="px-2 py-1 rounded border border-[#30363d] hover:border-[#4a90e2] hover:text-[#4a90e2] transition-colors">
              ← Prev
            </a>
          )}
          <span className="font-mono">
            {page + 1} / {totalPages}
          </span>
          {page < totalPages - 1 && (
            <a href={`?page=${page + 1}`} className="px-2 py-1 rounded border border-[#30363d] hover:border-[#4a90e2] hover:text-[#4a90e2] transition-colors">
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
