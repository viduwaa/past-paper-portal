import { Redis } from "@upstash/redis";

// ============================================================
// lib/presence.ts — Live usage statistics engine (Phase 1)
//
// Module interface (everything a caller must know):
//   - isBot(userAgent)                       → skip tracking for bots
//   - registerHeartbeat(browserId, userAgent)→ record an active session
//   - getLiveStats()                         → read live numbers (+ bumps peaks)
//   - HEARTBEAT_INTERVAL_MS, LIVE_STATS_TTL  → cadence + caching hints
//
// Everything else (hashing, key layout, day buckets, peak compare-and-set,
// pipelining, Redis client lifecycle) is implementation and may change
// without callers noticing. All Redis failures degrade silently — stats
// must never break the site. See STATS-PLAN.md for the architecture.
// ============================================================

export interface LiveStats {
    /** Active sessions seen in the presence window. */
    online: number;
    /** Highest concurrent usage recorded today (UTC day bucket). */
    peakToday: number;
    /** Highest concurrent usage ever recorded. */
    peakAllTime: number;
    /** Unique sessions that triggered a page view today. */
    viewsToday: number;
    /** Approximate distinct visitors today (HyperLogLog estimate). */
    uniquesToday: number;
}

/** Client heartbeat cadence. Must be < PRESENCE_WINDOW_MS. */
export const HEARTBEAT_INTERVAL_MS = 60_000;
/** Live badge poll cadence. */
export const LIVE_STATS_TTL = 30_000;

// --- Implementation ---------------------------------------------------

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

const PREFIX = "pstats";
/** A session is "online" until its last heartbeat is older than this. */
const PRESENCE_WINDOW_MS = 90_000;
/** Day-bucketed keys live for 90 days (Phase 2 history reads these). */
const DAY_TTL = 90 * 24 * 60 * 60;
/** Per-session view-debounce marker lives one day + buffer. */
const SESSION_DAY_TTL = 26 * 60 * 60;

/** Pepper so stored membership hashes can't be reversed to browser ids. */
const PEPPER = process.env.STATS_PEPPER ?? "fot-portal-pstats-v1";

/**
 * UTC day bucket, e.g. "20261010". UTC keeps server/client time zones
 * out of the equation; history charts treat days uniformly.
 */
function dayKey(now = new Date()): string {
    return now.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Salted, truncated hash — the only session identifier ever stored. */
async function hashSession(browserId: string): Promise<string> {
    const data = new TextEncoder().encode(`${browserId}|${PEPPER}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest).slice(0, 8))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Monotonic max via compare-and-set Lua: writes newValue only when it
 * exceeds the stored value. Peaks can never regress.
 */
const PEAK_LUA = `
local cur = tonumber(redis.call('GET', KEYS[1]) or '-1')
if tonumber(ARGV[1]) > cur then
    redis.call('SET', KEYS[1], ARGV[1])
end
return redis.call('GET', KEYS[1]) or '0'
`;

/**
 * Record a paper open. Increments the global counter and the
 * department-level interest counter. Department counters use day
 * buckets so history can break down by period. Safe no-op on Redis failure.
 */
export async function recordOpen(
    departmentCode: string | null,
): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;
    const dept = (departmentCode ?? "UNKNOWN")
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, "")
        .slice(0, 10);

    try {
        const opensKey = `${PREFIX}:opens`;
        const deptKey = `${PREFIX}:dept:${dept}`;
        const openDayKey = `${PREFIX}:opens:${dayKey()}`;
        const deptDayKey = `${PREFIX}:dept:${dept}:${dayKey()}`;
        await redis
            .pipeline()
            .incr(opensKey)
            .incr(openDayKey)
            .expire(openDayKey, DAY_TTL)
            .incr(deptKey)
            .incr(deptDayKey)
            .expire(deptKey, DAY_TTL)
            .expire(deptDayKey, DAY_TTL)
            .exec();
        return true;
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[presence] recordOpen failed:", error);
        }
        return false;
    }
}

/** One department-interest row for the /stats dashboard. */
export interface DeptInterest {
    department: string;
    opens: number;
}

/**
 * Total paper opens per department (all records, 90-day retention on
 * the backing keys). Sorted most-opened first. Empty array on failure.
 */
export async function getDeptInterest(): Promise<DeptInterest[]> {
    const redis = getRedis();
    if (!redis) return [];
    try {
        // pstats:dept:<CODE> — lifetime totals only. Day buckets
        // (pstats:dept:<CODE>:<YYYYMMDD>, 8-digit suffix) are excluded;
        // strict segment count keeps that guarantee shape-safe.
        const keys = (await redis.keys(`${PREFIX}:dept:*`)).filter(
            (k) => k.split(":").length === 3,
        );
        if (keys.length === 0) return [];
        const values = await redis.mget<unknown[]>(...keys);
        return keys
            .map((k, i) => ({
                department: k.replace(`${PREFIX}:dept:`, ""),
                opens: num(values?.[i]),
            }))
            .filter((r) => r.opens > 0)
            .sort((a, b) => b.opens - a.opens);
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[presence] getDeptInterest failed:", error);
        }
        return [];
    }
}

/** Total paper opens ever (since 90-day retention window). */
export async function getOpensTotal(): Promise<number> {
    const redis = getRedis();
    if (!redis) return 0;
    try {
        return num(await redis.get(`${PREFIX}:opens`));
    } catch {
        return 0;
    }
}

/** Immutable, per-day snapshot row handed to the Postgres mirror. */
export interface DaySnapshot {
    date: string; // YYYY-MM-DD
    views: number;
    uniques: number;
    peak: number;
    opens: number;
    departments: Record<string, number>;
}

/**
 * Full per-day snapshots for the last `days` days (capped at 90):
 * everything a given day bucketed in Redis knows. Used to write the
 * permanent Postgres mirror before Redis days age out. Prefers the
 * aggregate helpers so day-0 matches the live badge.
 */
export async function getDaySnapshots(
    days: number,
): Promise<DaySnapshot[]> {
    const redis = getRedis();
    const range = Math.min(Math.max(Math.floor(days), 0), 90);
    if (!redis || range === 0) return [];

    try {
        // Discover all per-department day buckets up front so a single
        // pipeline serves every read. Result order is tracked explicitly
        // per day (no positional cursor arithmetic), which is what makes
        // the day-0/live merge and dept counts stay aligned.
        const deptKeys = await redis.keys(`${PREFIX}:dept:*:*`);
        const deptsByStamp = new Map<string, string[]>();
        for (const dk of deptKeys) {
            const stamp = dk.split(":").at(-1);
            if (!stamp) continue;
            (deptsByStamp.get(stamp) ?? deptsByStamp.set(stamp, []).get(stamp)!).push(dk);
        }

        const pipeline = redis.pipeline();
        const stamps: string[] = [];
        const deptDayKeys: string[][] = [];

        for (let i = 0; i < range; i++) {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() - i);
            const stamp = d.toISOString().slice(0, 10).replace(/-/g, "");
            stamps.push(stamp);
            pipeline.get(`${PREFIX}:views:${stamp}`);
            pipeline.pfcount(`${PREFIX}:uniques:${stamp}`);
            pipeline.get(`${PREFIX}:peak:${stamp}`);
            pipeline.get(`${PREFIX}:opens:${stamp}`);
            const dayDepts = deptsByStamp.get(stamp) ?? [];
            deptDayKeys.push(dayDepts);
            for (const dk of dayDepts) pipeline.get(dk);
        }

        const live = await getLiveStats();
        const results = await pipeline.exec();

        let cursor = 0;
        const snap: DaySnapshot[] = [];
        for (let i = 0; i < range; i++) {
            const views = num(results?.[cursor++]);
            const uniques = num(results?.[cursor++]);
            const peak = num(results?.[cursor++]);
            const opens = num(results?.[cursor++]);
            const departments: Record<string, number> = {};
            for (const dk of deptDayKeys[i]) {
                const dept = dk.split(":")[2] ?? "UNKNOWN";
                departments[dept] = num(results?.[cursor++]);
            }

            const isToday = i === 0;
            snap.push({
                date: `${stamps[i].slice(0, 4)}-${stamps[i].slice(4, 6)}-${stamps[i].slice(6, 8)}`,
                views: isToday ? Math.max(views, live.viewsToday) : views,
                uniques: isToday ? Math.max(uniques, live.uniquesToday) : uniques,
                peak: isToday ? Math.max(peak, live.peakToday) : peak,
                opens,
                departments,
            });
        }
        return snap;
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[presence] getDaySnapshots failed:", error);
        }
        return [];
    }
}

const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

const BOT_UA =
    /bot|crawl|spider|preview|lighthouse|headless|monitor|uptime/i;

export function isBot(userAgent: string | null): boolean {
    if (!userAgent) return false;
    return BOT_UA.test(userAgent);
}

/**
 * Record one live session touch. Counts a view + unique only the first
 * time a session touches on a given day (per-session, not per-tab).
 * Resolves false on Redis failure — callers must not crash on it.
 */
export async function registerHeartbeat(
    browserId: string,
    userAgent: string | null,
): Promise<boolean> {
    if (isBot(userAgent) || !browserId) return true; // honest no-op

    const redis = getRedis();
    if (!redis) return false;

    try {
        const session = await hashSession(browserId);
        const now = Date.now();
        const presenceKey = `${PREFIX}:presence`;
        const uniquesKey = `${PREFIX}:uniques:${dayKey()}`;
        const visitsKey = `${PREFIX}:mark:${dayKey()}`;

        const pipeline = redis.pipeline();
        pipeline.zadd(presenceKey, { score: now, member: session });
        pipeline.zremrangebyscore(presenceKey, "-inf", now - PRESENCE_WINDOW_MS);
        pipeline.pfadd(uniquesKey, session);
        pipeline.hsetnx(visitsKey, session, 1);
        pipeline.expire(uniquesKey, DAY_TTL);
        pipeline.expire(visitsKey, SESSION_DAY_TTL);
        const results = await pipeline.exec();

        // First touch today (HSETNX returns 1 only when the field was
        // newly created) → count a single page view for this session.
        if (num(results?.[3]) === 1) {
            const viewsKey = `${PREFIX}:views:${dayKey()}`;
            await redis.pipeline().incr(viewsKey).expire(viewsKey, DAY_TTL).exec();
        }

        await bumpPeaks(redis);
        return true;
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[presence] registerHeartbeat failed:", error);
        }
        return false;
    }
}

/**
 * Live snapshot. Also runs the peak compare-and-set, so any reader that
 * observes a higher-than-recorded concurrency silently updates records.
 * Resolves the safe zero-state on Redis failure.
 */
export async function getLiveStats(): Promise<LiveStats> {
    const redis = getRedis();
    if (!redis) {
        return { online: 0, peakToday: 0, peakAllTime: 0, viewsToday: 0, uniquesToday: 0 };
    }

    try {
        const day = dayKey();
        const results = await redis
            .pipeline()
            .zcard(`${PREFIX}:presence`)
            .get(`${PREFIX}:peak:${day}`)
            .get(`${PREFIX}:peak:alltime`)
            .get(`${PREFIX}:views:${day}`)
            .pfcount(`${PREFIX}:uniques:${day}`)
            .exec();

        const online = num(results?.[0]);
        await bumpPeaks(redis, online);

        const peakToday = Math.max(online, num(results?.[1]));
        const peakAllTime = Math.max(peakToday, num(results?.[2]));
        return {
            online,
            peakToday,
            peakAllTime,
            viewsToday: num(results?.[3]),
            uniquesToday: Math.max(online, num(results?.[4])),
        };
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[presence] getLiveStats failed:", error);
        }
        return { online: 0, peakToday: 0, peakAllTime: 0, viewsToday: 0, uniquesToday: 0 };
    }
}

export interface HistoryDay {
    /** UTC date, YYYY-MM-DD. */
    date: string;
    /** Page views recorded that day. */
    views: number;
    /** Approximate distinct visitors that day (HyperLogLog estimate). */
    uniques: number;
    /** Highest concurrency recorded that day. */
    peak: number;
}

export interface HistorySummary {
    days: HistoryDay[];
    totals: {
        views: number;
        uniques: number;
        /** Best single-day peak in the range. */
        bestPeak: number;
    };
}

/**
 * Day-by-day usage history for the last `days` days (older of the
 * requested range vs. the 90-day retention). Empty rows mean the day
 * had no traffic — not an error. Resolves a safe empty summary on
 * Redis failure, same contract as getLiveStats.
 */
export async function getHistory(days: number): Promise<HistorySummary> {
    const redis = getRedis();
    if (!redis || days <= 0) {
        return { days: [], totals: { views: 0, uniques: 0, bestPeak: 0 } };
    }

    const range = Math.min(Math.floor(days), 90);
    try {
        // Build the UTC day keys for the range and issue one pipelined
        // multi-get of all three series per day (views, uniques, peak).
        const pipeline = redis.pipeline();
        const dateStamps: string[] = [];
        for (let i = 0; i < range; i++) {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() - i);
            const stamp = d.toISOString().slice(0, 10).replace(/-/g, "");
            dateStamps.push(stamp);
            pipeline.get(`${PREFIX}:views:${stamp}`);
            pipeline.pfcount(`${PREFIX}:uniques:${stamp}`);
            pipeline.get(`${PREFIX}:peak:${stamp}`);
        }
        // Today's live values make day-0 rows consistent with the badge.
        const live = await getLiveStats();

        const results = await pipeline.exec();
        const dayRows: HistoryDay[] = [];

        let viewsTotal = 0;
        let uniquesTotal = 0;
        let bestPeak = 0;

        for (let i = 0; i < range; i++) {
            const v = num(results?.[i * 3]);
            const u = num(results?.[i * 3 + 1]);
            const p = num(results?.[i * 3 + 2]);
            const date = `${dateStamps[i].slice(0, 4)}-${dateStamps[i].slice(4, 6)}-${dateStamps[i].slice(6, 8)}`;

            // Today (index 0) folds in the live snapshot so the "/stats"
            // dashboard and the navbar badge can never disagree.
            const day = {
                date,
                views: i === 0 ? Math.max(v, live.viewsToday) : v,
                uniques: i === 0 ? Math.max(u, live.uniquesToday) : u,
                peak: i === 0 ? Math.max(p, live.peakToday) : p,
            };

            viewsTotal += day.views;
            uniquesTotal += day.uniques;
            if (day.peak > bestPeak) bestPeak = day.peak;

            // Only days with any signal are worth charting; keep the
            // shape stable but drop all-zero trailing days.
            if (day.views > 0 || day.uniques > 0 || day.peak > 0) {
                dayRows.push(day);
            }
        }

        return { days: dayRows, totals: { views: viewsTotal, uniques: uniquesTotal, bestPeak } };
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[presence] getHistory failed:", error);
        }
        return { days: [], totals: { views: 0, uniques: 0, bestPeak: 0 } };
    }
}

async function bumpPeaks(redis: Redis, knownOnline?: number): Promise<void> {
    let online = knownOnline;
    if (online === undefined) {
        try {
            online = num(await redis.zcard(`${PREFIX}:presence`));
        } catch {
            return;
        }
    }
    if (online <= 0) return;

    const key = `${PREFIX}:peak:${dayKey()}`;
    try {
        await Promise.all([
            redis.eval(PEAK_LUA, [key], [online]),
            redis.eval(PEAK_LUA, [`${PREFIX}:peak:alltime`], [online]),
        ]);
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[presence] bumpPeaks failed:", error);
        }
    }
}
