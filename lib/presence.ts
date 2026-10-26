import { Redis } from "@upstash/redis";
import { STATS_ENABLED } from "./flags";

// ============================================================
// lib/presence.ts — Live usage statistics engine (Phase 1)
//
// Module interface (everything a caller must know):
//   - isBot(userAgent)                       → skip tracking for bots
//   - registerHeartbeat(browserId, userAgent)→ record an active session
//   - getLiveStats()                         → read live numbers (+ bumps peaks)
//   - HEARTBEAT_INTERVAL_MS, LIVE_STATS_TTL  → cadence + caching hints
//
// Everything else (hashing, key layout, Lua scripts, the per-isolate
// live-stats memo, pipelining, Redis client lifecycle) is implementation
// and may change without callers noticing. All Redis failures degrade
// silently — stats must never break the site. See STATS-PLAN.md.
//
// Cost contract (free tier = 500K commands/month, 10 GB bandwidth/month):
// Upstash bills an EVAL as ONE command plus ONE for every internal
// `redis.call` the script makes, so the scripts below are written to
// minimise *internal* calls, not just round trips. A repeat heartbeat
// costs 5 internal calls (ZADD, ZREMRANGEBYSCORE, ZCARD, HSETNX, MGET);
// a first-touch-of-day heartbeat adds 5 more. getLiveStats costs 4.
// See docs/adr/0004-upstash-bills-eval-internals.md.
//
// Costs are further gated by STATS_ENABLED (lib/flags.ts). When it is
// false every exported function returns an empty result before touching
// Redis, so tracking costs zero commands. The Lua scripts below are kept
// intact so re-enabling is a flag flip, not a rewrite.
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
/** Per-isolate memo window for getLiveStats. */
const LIVE_MEMO_MS = 10_000;

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
 * registerHeartbeat, atomically, in one Redis command.
 *
 * KEYS: 1 presence ZSET, 2 uniques HLL, 3 mark HASH, 4 views counter,
 *       5 today peak, 6 all-time peak
 * ARGV: 1 now(ms), 2 session hash, 3 presence cutoff, 4 DAY_TTL, 5 SESSION_DAY_TTL
 *
 * Writes presence, prunes stale members, debounces the first-touch-of-day
 * view counter, and lifts both peaks.
 *
 * Billed-call budget (see docs/adr/0004-upstash-bills-eval-internals.md):
 * Upstash charges one command for the EVAL plus one for every internal
 * redis.call, so the script is written to minimise *internal* calls, not
 * just round trips. A repeat heartbeat — the common case, since the
 * client beats every 60s — costs 5 internal calls:
 *   ZADD, ZREMRANGEBYSCORE, ZCARD, HSETNX, MGET
 * A session's first touch of the day adds 5 more (expire, view counter,
 * unique HLL). The previous version made 9 internal calls on every
 * heartbeat and up to 14 on a first touch.
 */
const HEARTBEAT_LUA = `
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[3])
local online = redis.call('ZCARD', KEYS[1])

-- First touch of the day for this session. HSETNX returns 1 only when the
-- member is new, which is exactly the debounce signal the view counter
-- and the unique-visitor HLL need. Both are idempotent per session per
-- day, so skipping them on later heartbeats changes nothing.
local firstTouch = redis.call('HSETNX', KEYS[3], ARGV[2], 1)
if firstTouch == 1 then
    redis.call('EXPIRE', KEYS[3], ARGV[5])
    redis.call('INCR', KEYS[4])
    redis.call('EXPIRE', KEYS[4], ARGV[4])
    redis.call('PFADD', KEYS[2], ARGV[2])
    redis.call('EXPIRE', KEYS[2], ARGV[4])
end

-- Both peaks are string keys, so one MGET reads both instead of two
-- separate GETs.
local vals = redis.call('MGET', KEYS[5], KEYS[6])
local pt = tonumber(vals[1] or '-1')
local pa = tonumber(vals[2] or '-1')
if online > pt then
    redis.call('SET', KEYS[5], online, 'EX', ARGV[4])
end
if online > pa then
    redis.call('SET', KEYS[6], online)
end
return online
`;

/**
 * getLiveStats, atomically, in one Redis command. Prunes the presence
 * ZSET (free accuracy upgrade: the old read path never pruned), lifts
 * both peaks when `online` exceeds them, and returns every live number.
 *
 * KEYS: 1 presence ZSET, 2 uniques HLL, 3 views counter, 4 today peak,
 *       5 all-time peak
 * ARGV: 1 presence cutoff, 2 DAY_TTL
 * Returns: { online, peakToday, peakAllTime, viewsToday, uniquesToday }
 */
const LIVE_LUA = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
local online = redis.call('ZCARD', KEYS[1])
-- The two peaks and the view counter are all string keys, so one MGET
-- replaces four separate GETs. Billed-call budget: 1 MGET + 1 ZCARD +
-- 1 ZREMRANGEBYSCORE + 1 PFCOUNT, plus a SET only when a peak rises.
local vals = redis.call('MGET', KEYS[4], KEYS[5], KEYS[3])
local pt = tonumber(vals[1] or '0')
local pa = tonumber(vals[2] or '0')
local views = tonumber(vals[3] or '0')
if online > pt then
    pt = online
    redis.call('SET', KEYS[4], online, 'EX', ARGV[2])
end
if online > pa then
    pa = online
    redis.call('SET', KEYS[5], online)
end
local uniques = redis.call('PFCOUNT', KEYS[2])
return {online, pt, pa, views, uniques}
`;

/**
 * recordOpen, atomically, in one Redis command (was a 7-command pipeline).
 *
 * KEYS: 1 lifetime opens, 2 today opens, 3 lifetime dept, 4 today dept
 * ARGV: 1 DAY_TTL (also re-arms the lifetime dept key, as before)
 *
 * Billed-call budget: the day-scoped keys only need their TTL set when
 * they are created, and INCR returns the new value — so an INCR that
 * returns 1 means the key is brand new. The lifetime department key
 * keeps its re-arm because it spans days and must survive as long as
 * the department keeps being opened.
 */
const OPEN_LUA = `
redis.call('INCR', KEYS[1])
local today = redis.call('INCR', KEYS[2])
if today == 1 then
    redis.call('EXPIRE', KEYS[2], ARGV[1])
end
redis.call('INCR', KEYS[3])
redis.call('EXPIRE', KEYS[3], ARGV[1])
local deptToday = redis.call('INCR', KEYS[4])
if deptToday == 1 then
    redis.call('EXPIRE', KEYS[4], ARGV[1])
end
return 1
`;

/**
 * Record a paper open. Increments the global counter and the
 * department-level interest counter. Department counters use day
 * buckets so history can break down by period. Safe no-op on Redis failure.
 */
export async function recordOpen(
    departmentCode: string | null,
): Promise<boolean> {
    if (!STATS_ENABLED) return false;
    const redis = getRedis();
    if (!redis) return false;
    const dept = (departmentCode ?? "UNKNOWN")
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, "")
        .slice(0, 10);

    try {
        await redis.eval(
            OPEN_LUA,
            [
                `${PREFIX}:opens`,
                `${PREFIX}:opens:${dayKey()}`,
                `${PREFIX}:dept:${dept}`,
                `${PREFIX}:dept:${dept}:${dayKey()}`,
            ],
            [String(DAY_TTL)],
        );
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
    if (!STATS_ENABLED) return [];
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
    if (!STATS_ENABLED) return 0;
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
    if (!STATS_ENABLED) return [];
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
    if (!STATS_ENABLED) return true; // tracking paused: no Redis call

    const redis = getRedis();
    if (!redis) return false;

    try {
        const session = await hashSession(browserId);
        const now = Date.now();
        const day = dayKey();
        await redis.eval(
            HEARTBEAT_LUA,
            [
                `${PREFIX}:presence`,
                `${PREFIX}:uniques:${day}`,
                `${PREFIX}:mark:${day}`,
                `${PREFIX}:views:${day}`,
                `${PREFIX}:peak:${day}`,
                `${PREFIX}:peak:alltime`,
            ],
            [
                String(now),
                session,
                String(now - PRESENCE_WINDOW_MS),
                String(DAY_TTL),
                String(SESSION_DAY_TTL),
            ],
        );
        return true;
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[presence] registerHeartbeat failed:", error);
        }
        return false;
    }
}

// --- getLiveStats: one EVAL + a short per-isolate memo -------------------

const EMPTY_LIVE: LiveStats = {
    online: 0,
    peakToday: 0,
    peakAllTime: 0,
    viewsToday: 0,
    uniquesToday: 0,
};

let _liveMemo: { t: number; value: LiveStats } | null = null;

async function fetchLiveStats(redis: Redis): Promise<LiveStats> {
    const day = dayKey();
    const results = (await redis.eval(
        LIVE_LUA,
        [
            `${PREFIX}:presence`,
            `${PREFIX}:uniques:${day}`,
            `${PREFIX}:views:${day}`,
            `${PREFIX}:peak:${day}`,
            `${PREFIX}:peak:alltime`,
        ],
        [String(Date.now() - PRESENCE_WINDOW_MS), String(DAY_TTL)],
    )) as unknown[];

    const online = num(results?.[0]);
    return {
        online,
        peakToday: Math.max(online, num(results?.[1])),
        peakAllTime: Math.max(online, num(results?.[2])),
        viewsToday: num(results?.[3]),
        // uniques today includes whoever is online right now
        uniquesToday: Math.max(online, num(results?.[4])),
    };
}

/**
 * Live snapshot. Internally one Redis command, memoized per isolate for
 * LIVE_MEMO_MS — the badge polls every 30s per open tab and the history
 * dashboard fans getLiveStats out to three internal call sites, so the
 * memo (plus the single-command read) is what keeps the free tier alive.
 */
export async function getLiveStats(): Promise<LiveStats> {
    if (!STATS_ENABLED) return EMPTY_LIVE;

    const now = Date.now();
    if (_liveMemo && now - _liveMemo.t < LIVE_MEMO_MS) {
        return _liveMemo.value;
    }

    const redis = getRedis();
    if (!redis) return EMPTY_LIVE;

    try {
        const value = await fetchLiveStats(redis);
        _liveMemo = { t: Date.now(), value };
        return value;
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[presence] getLiveStats failed:", error);
        }
        return EMPTY_LIVE;
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
    if (!STATS_ENABLED) {
        return { days: [], totals: { views: 0, uniques: 0, bestPeak: 0 } };
    }

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

        return {
            days: dayRows,
            totals: {
                views: viewsTotal,
                uniques: uniquesTotal,
                bestPeak,
            },
        };
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[presence] getHistory failed:", error);
        }
        return { days: [], totals: { views: 0, uniques: 0, bestPeak: 0 } };
    }
}
