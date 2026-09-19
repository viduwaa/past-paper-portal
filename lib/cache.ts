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

const PAPERS_KEY = "papers:all:v2";
const FILTERS_KEY = "papers:filter-options:v2";
const TTL = 86400; // 24 hours — papers don't change often, minimize DB hits

/**
 * Safely retrieve all cached papers from Redis.
 * Returns null if cache miss, Redis unavailable, or data is malformed.
 * Never throws — always falls through to DB caller.
 */
export async function getCachedPapers(): Promise<PastPaper[] | null> {
    try {
        const redis = getRedis();
        if (!redis) return null;
        const cached = await redis.get<PastPaper[]>(PAPERS_KEY);
        if (!cached) return null;
        // Ensure the cached value is a proper array of objects
        return Array.isArray(cached) ? (cached as PastPaper[]) : null;
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
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[cache] setCachedPapers failed:", error);
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
