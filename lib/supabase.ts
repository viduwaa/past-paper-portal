// ============================================================
// lib/supabase.ts — Supabase (PostgREST) client
//
// The app runs on Cloudflare Pages via @cloudflare/next-on-pages,
// which requires every route to use the Edge runtime. TCP-based
// Postgres drivers (postgres.js, @vercel/postgres) import Node
// builtins (net/tls/crypto/stream) that Next.js cannot bundle
// for edge routes, so all database access goes over HTTP via
// PostgREST instead: @supabase/supabase-js is plain fetch.
//
// Env (server-side only, never NEXT_PUBLIC_):
//   SUPABASE_URL              e.g. http://161.118.196.197:8000
//   SUPABASE_SERVICE_ROLE_KEY service_role key — bypasses RLS.
//                             Treat it like a database password.
//
// POSTGRES_URL is still used, but only by the Node scripts
// under scripts/ (via the `postgres` devDependency).
// ============================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
    if (!client) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error(
                "Missing Supabase config: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
            );
        }
        client = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    return client;
}

/** Throw a query error so callers' existing try/catch keeps working. */
export function must<T>(
    result: { data: T | null; error: unknown },
): T {
    if (result.error) throw result.error;
    return result.data as T;
}
