export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
    getHistory,
    getDeptInterest,
    getOpensTotal,
    getDaySnapshots,
    getLiveStats,
} from "@/lib/presence";
import {
    mirrorDailySnapshots,
    getAllTimeStats,
    mirrorMeta,
} from "@/lib/statsStore";
import { Database, WebsiteFeedback } from "@/lib/db";

/**
 * 30/90-day usage history + cumulative feedback summary for the public
 * /stats dashboard. History tolerates staleness, so this route is edge-
 * cached for 5 minutes (s.max-age with SWR) — unlike /api/stats/live
 * which must always be no-store. Falls back to private caching only
 * when the shared edge cache is bypassed (e.g. authenticated probes).
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const requested = Number(searchParams.get("days") ?? 30);
    const days = Number.isFinite(requested) ? Math.floor(requested) : 30;
    const safeDays = Math.min(Math.max(days, 7), 90);

    try {
        const [history, feedbacks, deptInterest, redisOpens, live, allTime, snapshots] =
            await Promise.all([
                getHistory(safeDays),
                Database.getAllFeedback(),
                getDeptInterest(),
                getOpensTotal(),
                getLiveStats(),
                getAllTimeStats().catch(() => null),
                // Always snapshot the FULL 90d retention window, not just
                // the requested range — otherwise a small ?days= request
                // would freeze only recent rows and allTime.firstDay would
                // drift depending on who called last.
                getDaySnapshots(90),
            ]);

        // Lazy snapshot (no cron on Cloudflare): freeze the Redis day
        // rows we just read into Neon, and bump monotonic meta counters.
        // Best-effort — a mirror failure degrades the dashboard's
        // all-time numbers but never breaks this response.
        try {
            await mirrorDailySnapshots(snapshots);
            await mirrorMeta("peak_alltime", live.peakAllTime);
            await mirrorMeta("opens_total", redisOpens);
        } catch (mirrorError) {
            console.error("Stats mirror error:", mirrorError);
        }

        // Redis owns the recent ≤90d window; Neon owns everything before
        // it (and is authoritative for all-time totals).
        const opensTotal = Math.max(redisOpens, allTime?.opens ?? 0);

        const totalReviews = feedbacks.length;
        const averageRating =
            totalReviews > 0
                ? feedbacks.reduce(
                      (sum: number, f: WebsiteFeedback) => sum + f.rating,
                      0,
                  ) / totalReviews
                : 0;

        const ratingDistribution = [1, 2, 3, 4, 5].map((stars) => ({
            stars,
            count: feedbacks.filter((f: WebsiteFeedback) => f.rating === stars)
                .length,
        }));

        return NextResponse.json(
            {
                rangeDays: safeDays,
                history,
                opensTotal,
                allTimePeak: live?.peakAllTime ?? 0,
                deptInterest,
                allTime,
                feedback: {
                    totalReviews,
                    averageRating: Math.round(averageRating * 10) / 10,
                    ratingDistribution,
                },
            },
            {
                headers: {
                    "Cache-Control":
                        "public, s-maxage=300, stale-while-revalidate=600",
                },
            },
        );
    } catch (error) {
        console.error("Stats history error:", error);
        return NextResponse.json(
            { error: "Failed to load stats history" },
            { status: 500 },
        );
    }
}
