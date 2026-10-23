import { Redis } from "@upstash/redis";
import type { PastPaper } from "./db";

// Lazily initialize Redis to avoid edge-runtime issues at import time
let _redis: Redis | null = null;
function getRedis(): Redis | null {
    if (_redis) return _redis;
    try {
        _redis = Redis.fromEnv();
        return _redis;
    } catch {
        return null;
    }
}

// v3: the papers table gained the `source` / `contributor_name` /
// `contributor_github` columns, and the semester vocabulary was
// normalised. Cached v2 rows lack those fields, so the key is bumped.
const PAPERS_KEY = "papers:all:v3";
const FILTERS_KEY = "papers:filter-options:v3";
const TTL = 86400; // 24 hours — papers don't change often, minimize DB hits

// --- Bandwidth shield (per-isolate papers memo) -------------------------
//
// The full papers list is the single biggest payload stored in Redis:
// every /api/papers request re-reads it as JSON (search keystrokes,
// filter toggles, retries, multiple tabs). Each of those reads transfers
// the whole dataset over the connection. Upstash bills bandwidth, so a
// burst of paper browsing used to devour the budget fast. Serving
// repeat reads from a short-lived in-isolate memo caps Redis reads at
// one per TTL per isolate — with a staleness window of only 2 minutes,
// far below the 24h Redis TTL that already applies.

let _papersMemo: { t: number; value: PastPaper[] } | null = null;
const PAPERS_MEMO_TTL_MS = 120_000;

/**
 * Safely retrieve all cached papers from Redis.
 * Returns null if cache miss, Redis unavailable, or data is malformed.
 * Never throws — always falls through to DB caller.
 */
export async function getCachedPapers(): Promise<PastPaper[] | null> {
    try {
        const memo = _papersMemo;
        if (memo && Date.now() - memo.t < PAPERS_MEMO_TTL_MS) {
            return memo.value;
        }
        const redis = getRedis();
        if (!redis) return null;
        const cached = await redis.get<PastPaper[]>(PAPERS_KEY);
        if (!cached) return null;
        if (!Array.isArray(cached)) return null;
        _papersMemo = { t: Date.now(), value: cached };
        return cached;
    } catch (error) {
        // Log in dev, silently fail in edge runtime
        if (process.env.NODE_ENV === "development") {
            console.warn("[cache] getCachedPapers failed:", error);
        }
        return null;
    }
}

/**
 * Cache all papers. Silently handles Redis failures so the API
 * still serves data from the database.
 */
export async function setCachedPapers(papers: PastPaper[]): Promise<void> {
    try {
        const redis = getRedis();
        if (!redis) return;
        await redis.set(PAPERS_KEY, papers, { ex: TTL });
        // A fresh write also arms the memo: next read is served locally.
        _papersMemo = { t: Date.now(), value: papers };
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[cache] setCachedPapers failed:", error);
        }
    }
}

/**
 * Drop the cached paper list so the next request rebuilds it.
 *
 * Called when a submission is approved: without this the newly
 * published paper would not appear for up to a day, because the papers
 * list is cached for 24 hours and the per-isolate memo holds it for
 * another 2 minutes.
 */
export async function invalidatePapersCache(): Promise<void> {
    _papersMemo = null;
    try {
        const redis = getRedis();
        if (!redis) return;
        await redis.del(PAPERS_KEY);
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[cache] invalidatePapersCache failed:", error);
        }
    }
}

export async function getCachedFilterOptions(): Promise<{
    years: string[];
    semesters: string[];
    departments: string[];
} | null> {
    try {
        const redis = getRedis();
        if (!redis) return null;
        const cached = await redis.get<{
            years: string[];
            semesters: string[];
            departments: string[];
        }>(FILTERS_KEY);
        if (!cached || !Array.isArray(cached.years)) return null;
        return cached;
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[cache] getCachedFilterOptions failed:", error);
        }
        return null;
    }
}

export async function setCachedFilterOptions(
    options: { years: string[]; semesters: string[]; departments: string[] },
): Promise<void> {
    try {
        const redis = getRedis();
        if (!redis) return;
        await redis.set(FILTERS_KEY, options, { ex: TTL });
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[cache] setCachedFilterOptions failed:", error);
        }
    }
}
