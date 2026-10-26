/**
 * Build-time feature flags.
 *
 * Next.js inlines every `NEXT_PUBLIC_*` value into the client bundle at
 * build time, so flipping one of these requires a redeploy — a dashboard
 * change alone is not enough. They are read on the server too, which
 * keeps both sides of a flag from ever disagreeing.
 */

/**
 * Master switch for usage tracking: presence heartbeats, the live badge,
 * the view/open counters and the /stats dashboard.
 *
 * When false, `lib/presence.ts` returns empty results without ever
 * constructing a Redis client, so usage tracking costs zero Upstash
 * commands. See docs/adr/0004-upstash-bills-eval-internals.md for why the
 * free tier cannot afford it.
 */
export const STATS_ENABLED = process.env.NEXT_PUBLIC_STATS_ENABLED === "true";
