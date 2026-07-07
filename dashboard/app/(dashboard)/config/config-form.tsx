"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type ScoringConfig } from "@/lib/types";

export function ConfigForm({ config }: { config: ScoringConfig }) {
  const [form, setForm] = useState({
    icp: config.icp,
    capabilities: config.capabilities,
    case_studies: config.case_studies ?? "",
    avoid_list: config.avoid_list ?? "",
    fit_weight: config.fit_weight,
    urgency_weight: config.urgency_weight,
    effort_weight: config.effort_weight,
    competition_weight: config.competition_weight,
    hot_threshold: config.hot_threshold,
    min_days_deadline: config.min_days_deadline,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weightSum = +(form.fit_weight + form.urgency_weight + form.effort_weight + form.competition_weight).toFixed(3);
  const weightsValid = Math.abs(weightSum - 1.0) < 0.001;

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!weightsValid) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("scoring_config")
      .update(form)
      .eq("id", config.id);
    if (error) setError(error.message);
    else setSaved(true);
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      {/* ICP */}
      <Section title="Ideal Customer Profile">
        <Textarea
          label="ICP"
          value={form.icp}
          rows={5}
          onChange={(v) => update("icp", v)}
        />
        <Textarea
          label="Capabilities"
          value={form.capabilities}
          rows={5}
          onChange={(v) => update("capabilities", v)}
        />
        <Textarea
          label="Case Studies"
          value={form.case_studies}
          rows={4}
          onChange={(v) => update("case_studies", v)}
        />
        <Textarea
          label="Avoid List"
          value={form.avoid_list}
          rows={3}
          onChange={(v) => update("avoid_list", v)}
        />
      </Section>

      {/* Weights */}
      <Section title="Scoring Weights">
        <div className="grid grid-cols-4 gap-4">
          {(
            [
              { key: "fit_weight", label: "Fit" },
              { key: "urgency_weight", label: "Urgency" },
              { key: "effort_weight", label: "Effort" },
              { key: "competition_weight", label: "Competition" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-[#8b949e]">{label}</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={form[key]}
                onChange={(e) => update(key, parseFloat(e.target.value) || 0)}
                className="w-full rounded border border-[#30363d] bg-[#21262d] px-2 py-1.5 font-mono text-sm text-[#e6edf3] focus:outline-none focus:border-[#4a90e2]"
              />
            </div>
          ))}
        </div>
        <div className={`text-xs font-mono mt-1 ${weightsValid ? "text-[#3fb950]" : "text-[#f85149]"}`}>
          Sum: {weightSum.toFixed(3)} {weightsValid ? "✓" : "— must equal 1.000"}
        </div>
      </Section>

      {/* Thresholds */}
      <Section title="Thresholds">
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="Hot Threshold (composite score)"
            value={form.hot_threshold}
            onChange={(v) => update("hot_threshold", v)}
            min={0} max={100}
          />
          <NumberInput
            label="Min Days to Deadline"
            value={form.min_days_deadline}
            onChange={(v) => update("min_days_deadline", v)}
            min={0} max={365}
          />
        </div>
      </Section>

      {error && <p className="text-xs text-[#f85149]">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !weightsValid}
          className="px-4 py-2 rounded bg-[#4a90e2] text-white text-sm font-medium hover:bg-[#3a80d2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save Config"}
        </button>
        {saved && <span className="text-xs text-[#3fb950]">Saved ✓</span>}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-4">
      <h3 className="text-xs uppercase tracking-wide text-[#8b949e]">{title}</h3>
      {children}
    </div>
  );
}

function Textarea({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wide text-[#8b949e]">{label}</label>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-[#30363d] bg-[#21262d] px-3 py-2 text-sm text-[#e6edf3] resize-y focus:outline-none focus:border-[#4a90e2] transition-colors"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wide text-[#8b949e]">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full rounded border border-[#30363d] bg-[#21262d] px-2 py-1.5 font-mono text-sm text-[#e6edf3] focus:outline-none focus:border-[#4a90e2]"
      />
    </div>
  );
}
