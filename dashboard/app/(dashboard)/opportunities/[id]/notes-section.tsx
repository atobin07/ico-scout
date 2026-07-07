"use client";

import { useState, useRef } from "react";

export default function NotesSection({
  opportunityId,
  initialNotes,
}: {
  opportunityId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(value: string) {
    setSaving(true);
    try {
      await fetch(`/api/opportunities/${opportunityId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      setSaved(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-[#8b949e]">Notes</h3>
        {saving && <span className="text-[11px] text-[#8b949e]">Saving…</span>}
        {saved && !saving && <span className="text-[11px] text-[#3fb950]">Saved</span>}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={(e) => save(e.target.value)}
        rows={4}
        placeholder="Add notes…"
        className="w-full rounded border border-[#30363d] bg-[#21262d] px-3 py-2 text-sm text-[#e6edf3] placeholder:text-[#484f58] resize-none focus:outline-none focus:border-[#4a90e2] transition-colors"
      />
    </div>
  );
}
