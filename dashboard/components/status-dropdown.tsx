"use client";

import { useState } from "react";
import { type OpportunityStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: OpportunityStatus; label: string; color: string }[] = [
  { value: "new", label: "New", color: "#8b949e" },
  { value: "reviewing", label: "Reviewing", color: "#4a90e2" },
  { value: "pursuing", label: "Pursuing", color: "#3fb950" },
  { value: "submitted", label: "Submitted", color: "#d29922" },
  { value: "won", label: "Won", color: "#3fb950" },
  { value: "lost", label: "Lost", color: "#f85149" },
  { value: "skipped", label: "Skipped", color: "#484f58" },
];

export function StatusDropdown({
  opportunityId,
  currentStatus,
  onStatusChange,
}: {
  opportunityId: string;
  currentStatus: OpportunityStatus;
  onStatusChange?: (newStatus: OpportunityStatus) => void;
}) {
  const [status, setStatus] = useState<OpportunityStatus>(currentStatus);
  const [loading, setLoading] = useState(false);

  const current = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as OpportunityStatus;
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={loading}
      onClick={(e) => e.stopPropagation()}
      style={{ color: current.color }}
      className="bg-[#21262d] border border-[#30363d] rounded px-2 py-0.5 text-xs font-medium cursor-pointer hover:border-[#4a90e2] focus:outline-none focus:border-[#4a90e2] disabled:opacity-50 transition-colors"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ color: opt.color }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
