import { Redis } from "@upstash/redis";
import type { PastPaper } from "./db";

const redis = Redis.fromEnv();
const PAPERS_KEY = "papers:all";
const FILTERS_KEY = "papers:filter-options";
const TTL = 3600;

export async function getCachedPapers(): Promise<PastPaper[] | null> {
    try {
        const cached = await redis.get<PastPaper[] | string>(PAPERS_KEY);
        if (!cached) return null;
        if (typeof cached === "string") {
            return JSON.parse(cached) as PastPaper[];
        }
        return cached;
    } catch {
        return null;
    }
}

export async function setCachedPapers(papers: PastPaper[]): Promise<void> {
    await redis.set(PAPERS_KEY, papers, { ex: TTL });
}

export async function getCachedFilterOptions(): Promise<{
    years: string[];
    semesters: string[];
    departments: string[];
} | null> {
    try {
        const cached = await redis.get<
            | { years: string[]; semesters: string[]; departments: string[] }
            | string
        >(FILTERS_KEY);
        if (!cached) return null;
        if (typeof cached === "string") {
            return JSON.parse(cached) as {
                years: string[];
                semesters: string[];
                departments: string[];
            };
        }
        return cached as {
            years: string[];
            semesters: string[];
            departments: string[];
        };
    } catch {
        return null;
    }
}

export async function setCachedFilterOptions(
    options: { years: string[]; semesters: string[]; departments: string[] },
): Promise<void> {
    await redis.set(FILTERS_KEY, options, { ex: TTL });
}
