import { getSupabase } from "@/lib/supabase";
import type { DaySnapshot } from "./presence";

// ============================================================
// lib/statsStore.ts — Permanent Postgres (Supabase) mirror for stats
//
// Interface:
//   - mirrorDailySnapshots(snapshots) → freeze Redis day rows into
//     pstats_daily before their 90-day TTL erases them
//   - mirrorMeta(name, value)         → monotonic all-time counters
//   - getAllTimeStats()               → totals across ALL recorded days
//
// PostgREST has no GREATEST/jsonb merge, so the monotonic merge is
// done read-modify-write in JS. Snapshots are best-effort (callers
// swallow failures), and concurrent mirrors of the same day can at
// worst lose a merge — they can never go backwards, because every
// write is max(existing, incoming) and re-snapshotting an
// in-progress day never loses ground.
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

interface DailyRow {
    day: string;
    views: number;
    uniques: number;
    peak: number;
    opens: number;
    departments: Record<string, number>;
}

async function getDailyRow(day: string): Promise<DailyRow | null> {
    const { data, error } = await getSupabase()
        .from("pstats_daily")
        .select("day, views, uniques, peak, opens, departments")
        .eq("day", day)
        .maybeSingle();
    if (error) throw error;
    return data as DailyRow | null;
}

/** Persist day rows to Postgres (idempotent GREATEST merge). */
export async function mirrorDailySnapshots(
    snapshots: DaySnapshot[],
): Promise<void> {
    if (snapshots.length === 0) return;
    for (const s of snapshots) {
        const incoming: Record<string, number> = Object.fromEntries(
            Object.entries(s.departments ?? {}).filter(([, v]) => v > 0),
        );
        const deptTotal = Object.values(incoming).reduce((a, b) => a + b, 0);
        const existing = await getDailyRow(s.date);

        const mergedDepts: Record<string, number> = {
            ...(existing?.departments ?? {}),
        };
        for (const [k, v] of Object.entries(incoming)) {
            mergedDepts[k] = Math.max(mergedDepts[k] ?? 0, v);
        }

        const row = {
            day: s.date,
            views: Math.max(existing?.views ?? 0, s.views),
            uniques: Math.max(existing?.uniques ?? 0, s.uniques),
            peak: Math.max(existing?.peak ?? 0, s.peak),
            opens: Math.max(
                existing?.opens ?? 0,
                Math.max(s.opens, deptTotal),
            ),
            departments: mergedDepts,
            updated_at: new Date().toISOString(),
        };

        const { error } = await getSupabase()
            .from("pstats_daily")
            .upsert(row, { onConflict: "day" });
        if (error) throw error;
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
    const { data, error: readError } = await getSupabase()
        .from("pstats_meta")
        .select("value")
        .eq("name", name)
        .maybeSingle();
    if (readError) throw readError;
    const existing = (data as { value: number } | null)?.value ?? 0;

    const { error } = await getSupabase()
        .from("pstats_meta")
        .upsert(
            { name, value: Math.max(existing, value), updated_at: new Date().toISOString() },
            { onConflict: "name" },
        );
    if (error) throw error;
}

/**
 * All-time totals across every day ever mirrored. Departments are
 * summed from the JSONB blobs (each day holds its own per-day counts).
 * There is at most one row per day, so fetching them all is cheap.
 */
export async function getAllTimeStats(): Promise<AllTimeStats> {
    const { data, error } = await getSupabase()
        .from("pstats_daily")
        .select("day, views, uniques, opens, departments");
    if (error) throw error;

    const rows = (data ?? []) as DailyRow[];
    const asNum = (v: number | undefined) => Math.max(0, Math.floor(v ?? 0));

    const deptTotals = new Map<string, number>();
    for (const row of rows) {
        for (const [dept, count] of Object.entries(row.departments ?? {})) {
            deptTotals.set(dept, (deptTotals.get(dept) ?? 0) + asNum(count));
        }
    }

    return {
        firstDay: rows.length ? rows.map((r) => r.day).sort()[0] : null,
        lastDay: rows.length
            ? rows.map((r) => r.day).sort()[rows.length - 1]
            : null,
        views: rows.reduce((sum, r) => sum + asNum(r.views), 0),
        uniques: rows.reduce((sum, r) => sum + asNum(r.uniques), 0),
        opens: rows.reduce((sum, r) => sum + asNum(r.opens), 0),
        departments: Array.from(deptTotals.entries())
            .map(([department, opens]) => ({ department, opens }))
            .sort((a, b) => b.opens - a.opens),
    };
}
