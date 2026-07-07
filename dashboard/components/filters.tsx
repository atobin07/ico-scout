"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { type OpportunityStatus } from "@/lib/types";

const SOURCES = ["sam_gov", "rss"];
const CONTRACT_TYPES = ["federal", "state", "local", "enterprise", "marketplace", "grant"];
const STATUSES: OpportunityStatus[] = ["new", "reviewing", "pursuing", "submitted", "won", "lost", "skipped"];

function MultiSelect({
  label,
  options,
  paramKey,
}: {
  label: string;
  options: string[];
  paramKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selected = searchParams.getAll(paramKey);

  function toggle(value: string) {
    const params = new URLSearchParams(searchParams);
    const current = params.getAll(paramKey);
    params.delete(paramKey);
    if (current.includes(value)) {
      current.filter((v) => v !== value).forEach((v) => params.append(paramKey, v));
    } else {
      [...current, value].forEach((v) => params.append(paramKey, v));
    }
    params.set("page", "0");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wide text-[#8b949e]">{label}</label>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                active
                  ? "border-[#4a90e2] bg-[#4a90e2]/10 text-[#4a90e2]"
                  : "border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
              }`}
            >
              {opt.replace("_", " ")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OpportunityFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const minScore = searchParams.get("minScore") ?? "0";
  const q = searchParams.get("q") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "0");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap gap-4 px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wide text-[#8b949e]">Search</label>
        <input
          type="search"
          defaultValue={q}
          placeholder="Title or description…"
          onChange={(e) => updateParam("q", e.target.value)}
          className="h-7 w-52 rounded border border-[#30363d] bg-[#21262d] px-2 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:border-[#4a90e2]"
        />
      </div>

      <MultiSelect label="Source" options={SOURCES} paramKey="source" />
      <MultiSelect label="Type" options={CONTRACT_TYPES} paramKey="type" />
      <MultiSelect label="Status" options={STATUSES} paramKey="status" />

      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wide text-[#8b949e]">
          Min score: <span className="text-[#4a90e2] font-mono">{minScore}</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          defaultValue={minScore}
          onChange={(e) => updateParam("minScore", e.target.value)}
          className="w-32 accent-[#4a90e2]"
        />
      </div>
    </div>
  );
}
