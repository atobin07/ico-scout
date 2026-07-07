"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-lg border border-[#30363d] bg-[#161b22]">
        <div>
          <h1 className="text-lg font-semibold text-[#e6edf3]">PrimeLayer</h1>
          <p className="text-sm text-[#8b949e] mt-1">Contract Intel Dashboard</p>
        </div>

        {sent ? (
          <div className="space-y-2">
            <p className="text-sm text-[#3fb950]">Magic link sent.</p>
            <p className="text-sm text-[#8b949e]">
              Check <span className="text-[#e6edf3]">{email}</span> and click the link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-[#8b949e] uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded border border-[#30363d] bg-[#21262d] text-[#e6edf3] text-sm placeholder:text-[#484f58] focus:outline-none focus:border-[#4a90e2] transition-colors"
              />
            </div>

            {error && <p className="text-xs text-[#f85149]">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2 rounded bg-[#4a90e2] text-white text-sm font-medium hover:bg-[#3a80d2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
