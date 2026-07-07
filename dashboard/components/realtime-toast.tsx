"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { type Opportunity } from "@/lib/types";

interface Toast {
  id: string;
  opportunity: Opportunity;
}

export function RealtimeToast({ hotThreshold = 70 }: { hotThreshold?: number }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("opportunities-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "opportunities" },
        (payload) => {
          const opp = payload.new as Opportunity;
          if ((opp.composite_score ?? 0) >= hotThreshold) {
            const toast: Toast = { id: opp.id, opportunity: opp };
            setToasts((prev) => [toast, ...prev].slice(0, 5));
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }, 8000);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hotThreshold]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-lg border border-[#3fb950]/30 bg-[#161b22] px-4 py-3 shadow-lg"
        >
          <span className="text-[#3fb950] mt-0.5">⚡</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#8b949e]">New hot opportunity</p>
            <Link
              href={`/opportunities/${toast.opportunity.id}`}
              className="text-sm text-[#e6edf3] hover:text-[#4a90e2] line-clamp-1 transition-colors"
            >
              {toast.opportunity.title ?? "Untitled"}
            </Link>
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-[#484f58] hover:text-[#8b949e] text-xs mt-0.5"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
