import { sql } from "@vercel/postgres";
import type { DaySnapshot } from "./presence";

// ============================================================
// lib/statsStore.ts — Permanent Postgres (Neon) mirror for stats
//
// Interface:
//   - mirrorDailySnapshots(snapshots) → freeze Redis day rows into
//     pstats_daily before their 90-day TTL erases them
//   - mirrorMeta(name, value)         → monotonic all-time counters
//   - getAllTimeStats()               → totals across ALL recorded days
//
// All merges are monotonic (GREATEST) and idempotent: re-snapshotting
// an in-progress day never loses ground, and a Postgres failure must
// never take the stats API down (callers treat it as best-effort).
// ============================================================

export interface AllTimeStats {
    /** First day recorded in the mirror (null = no history yet). */
    firstDay: string | null;
    /** Last day recorded in the mirror. */
    lastDay: string | null;
    views: number;
    uniques: number;
    opens: number;
    departments: { department: string; opens: number }[];
}

/** Persist day rows to Postgres (idempotent GREATEST merge). */
export async function mirrorDailySnapshots(
    snapshots: DaySnapshot[],
): Promise<void> {
    if (snapshots.length === 0) return;
    for (const s of snapshots) {
        const depts = s.departments ?? {};
        // Persist only non-zero entries so empty days don't write junk
        // keys that would pin zeros in later GREATEST merges.
        const deptJson = JSON.stringify(
            Object.fromEntries(Object.entries(depts).filter(([, v]) => v > 0)),
        );
        const deptTotal = Object.values(depts).reduce((a, b) => a + b, 0);
        await sql`
            INSERT INTO pstats_daily (day, views, uniques, peak, opens, departments)
            VALUES (${s.date}::date, ${s.views}, ${s.uniques}, ${s.peak}, ${Math.max(s.opens, deptTotal)}, ${deptJson}::jsonb)
            ON CONFLICT (day) DO UPDATE SET
                views = GREATEST(pstats_daily.views, EXCLUDED.views),
                uniques = GREATEST(pstats_daily.uniques, EXCLUDED.uniques),
                peak = GREATEST(pstats_daily.peak, EXCLUDED.peak),
                opens = GREATEST(pstats_daily.opens, EXCLUDED.opens),
                departments =
                    CASE
                        WHEN pstats_daily.departments = '{}'::jsonb
                        THEN EXCLUDED.departments
                        ELSE (
                            SELECT jsonb_object_agg(k, GREATEST(
                                COALESCE((pstats_daily.departments ->> k)::int, 0),
                                COALESCE((EXCLUDED.departments ->> k)::int, 0)
                            ))
                            FROM (
                                SELECT jsonb_object_keys(pstats_daily.departments) AS k
                                UNION
                                SELECT jsonb_object_keys(EXCLUDED.departments)
                            ) keys
                        )
                    END,
                updated_at = now()
        `;
    }
    await mirrorMeta("opens", Math.max(
        ...(snapshots.map((s) =>
            Math.max(
                s.opens,
                Object.values(s.departments ?? {}).reduce((a, b) => a + b, 0),
            ),
        )),
    ));
}

/**
 * Monotonic cumulative-counter mirror (all-time peaks, opens).
 * Only ever increases the stored value.
 */
export async function mirrorMeta(name: string, value: number): Promise<void> {
    await sql`
        INSERT INTO pstats_meta (name, value)
        VALUES (${name}, ${value})
        ON CONFLICT (name) DO UPDATE SET
            value = GREATEST(pstats_meta.value, EXCLUDED.value),
            updated_at = now()
    `;
}

/**
 * All-time totals across every day ever mirrored. Departments are
 * summed from the JSONB blobs (each day holds its own per-day counts).
 */
export async function getAllTimeStats(): Promise<AllTimeStats> {
    const rows = await sql<{
        first_day: string | null;
        last_day: string | null;
        views: string | number;
        uniques: string | number;
    }>`
        SELECT
            MIN(day)::text  AS first_day,
            MAX(day)::text  AS last_day,
            COALESCE(SUM(views),   0) AS views,
            COALESCE(SUM(uniques), 0) AS uniques
        FROM pstats_daily
    `;

    const opensRows = await sql<{ opens: string | number }>`
        SELECT COALESCE(SUM(opens), 0) AS opens FROM pstats_daily
    `;

    const deptRows = await sql<{ department: string; opens: string | number }>`
        SELECT d.key AS department, SUM(d.value::int) AS opens
        FROM pstats_daily t, LATERAL jsonb_each_text(t.departments) AS d(key, value)
        GROUP BY d.key
        ORDER BY opens DESC
    `;

    const r = rows.rows[0];
    const asNum = (v: string | number | undefined) =>
        Math.max(0, Math.floor(Number(v ?? 0)));

    return {
        firstDay: r?.first_day ?? null,
        lastDay: r?.last_day ?? null,
        views: asNum(r?.views),
        uniques: asNum(r?.uniques),
        opens: asNum(opensRows.rows[0]?.opens),
        departments: deptRows.rows.map((d) => ({
            department: d.department,
            opens: asNum(d.opens),
        })),
    };
}
