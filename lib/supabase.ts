/**
 * Supabase clients for CallCatch.
 *
 * - `createBrowserSupabase()` — client component / browser usage
 * - `createServerSupabase()`  — server components & route handlers (reads auth cookies)
 * - `createServiceSupabase()` — service-role client that BYPASSES RLS.
 *                                Server-only. Never import into client code.
 */
import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Browser client — safe to use in `'use client'` components. */
export function createBrowserSupabase(): SupabaseClient {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** Server client — resolves the session from request cookies. */
export function createServerSupabase(): SupabaseClient {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` called from a Server Component — safe to ignore when
          // middleware is responsible for refreshing sessions.
        }
      },
    },
  });
}

/**
 * Service-role client — full read/write, bypasses Row Level Security.
 * Use ONLY in trusted server code (webhooks, background jobs).
 */
export function createServiceSupabase(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
