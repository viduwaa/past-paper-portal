import { Redis } from "@upstash/redis";
import type { PastPaper } from "./db";

const redis = Redis.fromEnv();
const PAPERS_KEY = "papers:all";
const FILTERS_KEY = "papers:filter-options";
const TTL = 3600;

export async function getCachedPapers(): Promise<PastPaper[] | null> {
    try {
        return await redis.get<PastPaper[]>(PAPERS_KEY);
    } catch {
        return null;
    }
}

export async function setCachedPapers(papers: PastPaper[]): Promise<void> {
    await redis.set(PAPERS_KEY, JSON.stringify(papers), { ex: TTL });
}

export async function getCachedFilterOptions(): Promise<{
    years: string[];
    semesters: string[];
    departments: string[];
} | null> {
    try {
        return await redis.get(FILTERS_KEY);
    } catch {
        return null;
    }
}

export async function setCachedFilterOptions(
    options: { years: string[]; semesters: string[]; departments: string[] },
): Promise<void> {
    await redis.set(FILTERS_KEY, JSON.stringify(options), { ex: TTL });
}
