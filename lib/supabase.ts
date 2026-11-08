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
        const rawUrl = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!rawUrl || !key) {
            throw new Error(
                "Missing Supabase config: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
            );
        }
        // Tolerate common dashboard typos: a trailing slash or a pasted
        // "/rest/v1" suffix would otherwise make supabase-js request
        // ".../rest/v1/rest/v1/..." and PostgREST answers 404.
        const url = rawUrl.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
        client = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    return client;
}

/**
 * Serialise an unknown thrown value for an error message.
 *
 * PostgREST errors from supabase-js are plain objects
 * ({ message, code, details, hint, status }), NOT Error instances,
 * so `${error}` renders them as "[object Object]" and hides the
 * actual cause (401 bad key, 404 table/schema, ...). This always
 * produces a readable one-liner.
 */
export function describeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object") {
        const e = error as Record<string, unknown>;
        const parts = [
            typeof e.message === "string" ? e.message : undefined,
            typeof e.code === "string" || typeof e.code === "number"
                ? `code=${e.code}`
                : undefined,
            typeof e.status === "number" ? `status=${e.status}` : undefined,
            typeof e.details === "string" && e.details ? e.details : undefined,
            typeof e.hint === "string" && e.hint ? `hint: ${e.hint}` : undefined,
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(" ");
        try {
            const json = JSON.stringify(error);
            if (json && json !== "{}") return json;
        } catch {
            /* fall through */
        }
    }
    return String(error);
}

/** Throw a query error so callers' existing try/catch keeps working. */
export function must<T>(
    result: { data: T | null; error: unknown },
): T {
    if (result.error) throw result.error;
    return result.data as T;
}
