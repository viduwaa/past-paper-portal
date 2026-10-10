"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    Users,
    Eye,
    TrendingUp,
    Star,
    Info,
    CalendarDays,
    FolderOpen,
    FlaskConical,
    ExternalLink,
} from "lucide-react";
import type { LiveStats, HistorySummary } from "@/lib/presence";

interface HistoryPayload {
    rangeDays: number;
    history: HistorySummary;
    opensTotal: number;
    deptInterest: { department: string; opens: number }[];
    feedback: {
        totalReviews: number;
        averageRating: number;
        ratingDistribution: { stars: number; count: number }[];
    };
}

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

/**
 * Skeleton placeholder shown while stats fetch from Upstash/Postgres.
 * Pure CSS pulse (animate-pulse) — quiet by design, since the banner
 * "Updates every 30 seconds" happens in the background without these.
 */
function SkeletonBlock({ className }: { className: string }) {
    return (
        <div
            aria-hidden="true"
            className={`animate-pulse rounded-md bg-muted/80 ${className}`}
        />
    );
}

/* ------------------------------------------------------------------ */

function MetricCard({
    icon: Icon,
    label,
    value,
    sub,
    accent,
    index,
    loading = false,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number | string;
    sub: string;
    accent: string;
    index: number;
    loading?: boolean;
}) {
    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={index}
            className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
        >
            <div
                className={`absolute inset-x-0 top-0 h-[3px] ${accent}`}
                aria-hidden="true"
            />
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {label}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
            </div>
            {loading ? (
                <div className="mt-3 space-y-2">
                    <SkeletonBlock className="h-9 w-20" />
                    <SkeletonBlock className="h-3 w-32" />
                </div>
            ) : (
                <>
                    <div className="mt-3 text-4xl font-bold tabular-nums tracking-tight">
                        {typeof value === "number" ? value.toLocaleString() : value}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                </>
            )}
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/* Aggregation: daily rows → weekly or monthly buckets                 */

interface HistoryDayView {
    date: string;
    views: number;
    uniques: number;
    peak: number;
}

interface Bucket {
    label: string;
    views: number;
    uniques: number;
    startDate: string;
}

function aggregateDays(
    days: HistoryDayView[],
    mode: "daily" | "weekly" | "monthly",
): Bucket[] {
    if (mode !== "daily") {
        const buckets = new Map<string, Bucket>();
        for (const d of days) {
            const [y, m, dd] = d.date.split("-").map(Number);
            const date = new Date(Date.UTC(y, m - 1, dd));
            let key: string;
            let label: string;
            if (mode === "weekly") {
                // Week starting Monday
                const dayOfWeek = (date.getUTCDay() + 6) % 7;
                const start = new Date(date);
                start.setUTCDate(date.getUTCDate() - dayOfWeek);
                key = start.toISOString().slice(0, 10);
                label = `w/c ${key.slice(5)}/${key.slice(0, 4)}`;
            } else {
                key = d.date.slice(0, 7);
                label = date.toLocaleString("en", {
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                });
            }
            const b = buckets.get(key) ?? {
                label,
                views: 0,
                uniques: 0,
                startDate: d.date,
            };
            b.views += d.views;
            b.uniques += d.uniques;
            buckets.set(key, b);
        }
        return [...buckets.values()].sort((a, b) =>
            a.startDate.localeCompare(b.startDate),
        );
    }
    return days.map((d) => ({
        label: d.date.slice(5),
        views: d.views,
        uniques: d.uniques,
        startDate: d.date,
    }));
}

/* ------------------------------------------------------------------ */
/* Line chart — hand-rolled SVG, no chart library                      */

const W = 720;
const H = 260;
const PAD = { top: 20, right: 16, bottom: 34, left: 46 };

function LineChart({ data }: { data: Bucket[] }) {
    const [hover, setHover] = useState<number | null>(null);

    if (data.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No history recorded yet — check back after a few days of traffic.
            </div>
        );
    }

    const max = Math.max(1, ...data.flatMap((d) => [d.views, d.uniques]));
    const niceMax = max <= 5 ? 5 : Math.ceil(max / 5) * 5;

    const iw = W - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const x = (i: number) =>
        PAD.left + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
    const y = (v: number) => PAD.top + ih - (v / niceMax) * ih;

    const path = (series: (b: Bucket) => number) => {
        const pts = data.map((d, i) => [x(i), y(series(d))] as const);
        // Catmull-Rom-ish smoothing for a soft but honest curve
        let p = `M ${pts[0][0]},${pts[0][1]}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const [x0, y0] = pts[i];
            const [x1, y1] = pts[i + 1];
            const cx = (x0 + x1) / 2;
            p += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
        }
        return p;
    };

    const viewsPath = path((b) => b.views);
    const uniquesPath = path((b) => b.uniques);
    const areaPath = `${viewsPath} L ${x(data.length - 1)},${y(0)} L ${x(0)},${y(0)} Z`;

    const yTicks = [0, niceMax / 2, niceMax];
    const xTicks = data.map((_, i) => i).filter((i) => {
        const every = Math.max(1, Math.ceil(data.length / 8));
        return i % every === 0 || i === data.length - 1;
    });

    const hb = hover !== null ? data[hover] : null;

    return (
        <div className="relative rounded-lg border bg-muted/20 p-2">
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                role="img"
                aria-label="Usage trend line chart"
            >
                <defs>
                    <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.02" />
                    </linearGradient>
                </defs>

                {/* grid + y axis */}
                {yTicks.map((t) => (
                    <g key={t}>
                        <line
                            x1={PAD.left}
                            x2={W - PAD.right}
                            y1={y(t)}
                            y2={y(t)}
                            stroke="currentColor"
                            strokeOpacity="0.12"
                            strokeDasharray="3 4"
                        />
                        <text
                            x={PAD.left - 8}
                            y={y(t) + 4}
                            textAnchor="end"
                            className="fill-muted-foreground"
                            fontSize="11"
                        >
                            {t}
                        </text>
                    </g>
                ))}

                {/* x labels */}
                {xTicks.map((i) => (
                    <text
                        key={i}
                        x={x(i)}
                        y={H - 10}
                        textAnchor="middle"
                        className="fill-muted-foreground"
                        fontSize="11"
                    >
                        {data[i].label}
                    </text>
                ))}

                {/* area + lines */}
                <motion.path
                    d={areaPath}
                    fill="url(#viewsFill)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                />
                <motion.path
                    d={uniquesPath}
                    fill="none"
                    stroke="var(--chart-1)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.1, delay: 0.3, ease: "easeOut" }}
                />
                <motion.path
                    d={viewsPath}
                    fill="none"
                    stroke="var(--chart-2)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                />

                {/* point markers — a lone bucket would otherwise draw a
                    zero-length line and appear blank; dense series hide them */}
                {data.length <= 16 &&
                    data.map((d, i) => (
                        <motion.circle
                            key={`v-${i}`}
                            cx={x(i)}
                            cy={y(d.views)}
                            r={3.5}
                            fill="var(--chart-2)"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.9 + i * 0.05 }}
                        />
                    ))}

                {/* hover crosshair */}
                {hover !== null && (
                    <g>
                        <line
                            x1={x(hover)}
                            x2={x(hover)}
                            y1={PAD.top}
                            y2={y(0)}
                            stroke="currentColor"
                            strokeOpacity="0.25"
                        />
                        <circle cx={x(hover)} cy={y(data[hover].views)} r="4" fill="var(--chart-2)" />
                        <circle cx={x(hover)} cy={y(data[hover].uniques)} r="4" fill="var(--chart-1)" />
                    </g>
                )}

                {/* invisible hover zones */}
                {data.map((_, i) => (
                    <rect
                        key={i}
                        x={i === 0 ? PAD.left : (x(i - 1) + x(i)) / 2}
                        y={PAD.top}
                        width={
                            i === data.length - 1
                                ? W - PAD.right - (i === 0 ? PAD.left : (x(i - 1) + x(i)) / 2)
                                : (x(i + 1) + x(i)) / 2 - (i === 0 ? PAD.left : (x(i - 1) + x(i)) / 2)
                        }
                        height={ih}
                        fill="transparent"
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                    />
                ))}
            </svg>

            {/* tooltip */}
            {hb && (
                <div
                    className="pointer-events-none absolute top-4 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-md"
                    style={{
                        left: `${((hover !== null ? x(hover) : 0) / W) * 100}%`,
                        transform: "translateX(-50%)",
                    }}
                >
                    <div className="font-semibold">{hb.startDate}</div>
                    <div className="mt-1 flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-chart-2" />
                            {hb.views.toLocaleString()} views
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-chart-1" />
                            {hb.uniques.toLocaleString()} uniques
                        </span>
                    </div>
                </div>
            )}

            <div className="mt-1 flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <span className="h-[3px] w-5 rounded-full bg-chart-2" /> Views
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-[3px] w-5 rounded-full bg-chart-1" /> Uniques
                </span>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */

type AggMode = "daily" | "weekly" | "monthly";

/** Chart-shaped skeleton: grid + wavy line placeholder, pulsing. */
function ChartSkeleton() {
    return (
        <div
            aria-hidden="true"
            className="animate-pulse rounded-lg border bg-muted/20 p-4"
        >
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top} y2={PAD.top} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 4" className="text-muted-foreground" />
                <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + (H - PAD.top - PAD.bottom) / 2} y2={PAD.top + (H - PAD.top - PAD.bottom) / 2} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 4" className="text-muted-foreground" />
                <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 4" className="text-muted-foreground" />
                {/* gentle fake trend line */}
                <path
                    d={`M ${PAD.left},${H - PAD.bottom - 60} C 180,${H - PAD.bottom - 90} 240,${PAD.top + 50} 320,${PAD.top + 70} S 480,${H - PAD.bottom - 40} 560,${PAD.top + 90} S 660,${PAD.top + 60} ${W - PAD.right},${PAD.top + 110}`}
                    fill="none"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    className="text-chart-2/40"
                    stroke="currentColor"
                />
                <path
                    d={`M ${PAD.left},${H - PAD.bottom - 90} C 200,${H - PAD.bottom - 110} 280,${PAD.top + 80} 380,${PAD.top + 100} S 520,${H - PAD.bottom - 70} 620,${PAD.top + 120} S 680,${PAD.top + 90} ${W - PAD.right},${PAD.top + 140}`}
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="text-chart-1/30"
                    stroke="currentColor"
                />
            </svg>
            <div className="mt-2 flex justify-center gap-5">
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="h-3 w-16" />
            </div>
        </div>
    );
}

export default function StatsPage() {
    const [live, setLive] = useState<LiveStats | null>(null);
    const [history, setHistory] = useState<HistoryPayload | null>(null);
    const [agg, setAgg] = useState<AggMode>("weekly");
    const [loadFailed, setLoadFailed] = useState(false);
    // True only for the very first fetch; the 30s background refresh
    // stays silent — skeletons flashing every poll would be noise.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [liveRes, histRes] = await Promise.all([
                    fetch("/api/stats/live", { cache: "no-store" }),
                    fetch("/api/stats/history?days=90"),
                ]);
                if (!liveRes.ok || !histRes.ok) throw new Error("bad status");
                if (!cancelled) {
                    setLive(await liveRes.json());
                    setHistory(await histRes.json());
                    setLoadFailed(false);
                    setLoading(false);
                }
            } catch {
                if (!cancelled) setLoadFailed(true);
            }
        };

        load();
        const timer = setInterval(load, 30_000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    const dash = "—";
    const fb = history?.feedback;
    const buckets = useMemo(
        () => aggregateDays(history?.history.days ?? [], agg),
        [history, agg],
    );
    const totalOpens = history?.opensTotal ?? 0;
    const depts = history?.deptInterest ?? [];
    const maxDept = Math.max(1, ...depts.map((d) => d.opens));

    return (
        <div className="mx-auto max-w-4xl space-y-10 pb-16">
            {/* Under-development banner — repo issues link for feedback */}
            <div className="flex items-center justify-center">
                <a
                    href="https://github.com/viduwaa/past-paper-portal/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition-all hover:bg-amber-500/20 hover:shadow dark:border-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-400/15"
                >
                    <FlaskConical className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:rotate-12" />
                    <span>
                        Still under development — found an issue?{" "}
                        <span className="font-semibold underline underline-offset-2">
                            Report it here
                        </span>
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                </a>
            </div>

            {/* Header */}
            <motion.div
                className="text-center space-y-2"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Portal Usage — Live
                </h1>
                <p className="text-muted-foreground">
                    Real-time activity across the FOT Past Papers Portal.
                    Updates automatically every 30 seconds.
                </p>
            </motion.div>

            {loadFailed && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                    <Info className="h-4 w-4 shrink-0" />
                    Stats are temporarily unavailable — the rest of the site
                    is unaffected. Retrying automatically.
                </div>
            )}

            {/* Live metrics */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <MetricCard
                    index={0}
                    icon={Activity}
                    label="Online now"
                    accent="bg-emerald-500"
                    value={live?.online ?? dash}
                    sub="sessions active in the last 90s"
                    loading={loading}
                />
                <MetricCard
                    index={1}
                    icon={TrendingUp}
                    label="Peak today"
                    accent="bg-chart-2"
                    value={live?.peakToday ?? dash}
                    sub="highest concurrency recorded today"
                    loading={loading}
                />
                <MetricCard
                    index={2}
                    icon={Users}
                    label="Visitors today"
                    accent="bg-chart-4"
                    value={live?.uniquesToday ?? dash}
                    sub="distinct sessions that viewed pages"
                    loading={loading}
                />
                <MetricCard
                    index={3}
                    icon={Eye}
                    label="Views today"
                    accent="bg-chart-1"
                    value={live?.viewsToday ?? dash}
                    sub="page views counted today"
                    loading={loading}
                />
            </div>

            {/* All-time record strip */}
            <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                custom={4}
                className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-full border bg-card px-6 py-3 text-sm shadow-sm"
            >
                <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-chart-2" />
                    All-time peak:
                    <strong className="tabular-nums">
                        {loading ? <SkeletonBlock className="inline-block h-4 w-8 align-middle" /> : live ? live.peakAllTime.toLocaleString() : dash}
                    </strong>
                </span>
                <span className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-chart-4" />
                    Papers opened:
                    <strong className="tabular-nums">
                        {loading ? <SkeletonBlock className="inline-block h-4 w-8 align-middle" /> : history ? totalOpens.toLocaleString() : dash}
                    </strong>
                </span>
                <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-chart-1" />
                    90-day views:
                    <strong className="tabular-nums">
                        {loading ? <SkeletonBlock className="inline-block h-4 w-8 align-middle" /> : history ? history.history.totals.views.toLocaleString() : dash}
                    </strong>
                </span>
            </motion.div>

            {/* History line chart with aggregation toggle */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        Usage trend — last 90 days
                    </h2>
                    <div className="flex rounded-lg border bg-muted/30 p-0.5">
                        {(["daily", "weekly", "monthly"] as AggMode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setAgg(m)}
                                className={`relative rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                                    agg === m
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
                {loading ? (
                    <ChartSkeleton />
                ) : (
                    <LineChart data={buckets} />
                )}
            </section>

            {/* Department interest */}
            <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    Most-opened departments
                </h2>
                {loading ? (
                    <div className="space-y-3 rounded-lg border bg-card p-5 shadow-sm">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <SkeletonBlock className="h-4 w-12" />
                                <div className="flex-1">
                                    <SkeletonBlock className="h-2.5 w-full" />
                                </div>
                                <SkeletonBlock className="h-4 w-8" />
                            </div>
                        ))}
                    </div>
                ) : depts.length > 0 ? (
                    <div className="space-y-2.5 rounded-lg border bg-card p-5 shadow-sm">
                        {depts.slice(0, 6).map((d, i) => (
                            <div key={d.department} className="flex items-center gap-3 text-sm">
                                <span className="w-14 font-mono text-xs font-semibold text-muted-foreground">
                                    {d.department}
                                </span>
                                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(d.opens / maxDept) * 100}%` }}
                                        transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: "easeOut" }}
                                        className="h-full rounded-full bg-chart-2"
                                    />
                                </div>
                                <span className="w-10 text-right tabular-nums text-muted-foreground">
                                    {d.opens}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                        No paper opens recorded yet — open a paper to see it here.
                    </div>
                )}
            </section>

            {/* Feedback summary */}
            <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    Student feedback
                </h2>
                {loading ? (
                    <div className="grid gap-4 rounded-lg border bg-card p-5 shadow-sm sm:grid-cols-[auto_1fr] sm:items-center">
                        <div className="flex flex-col items-center gap-2 px-4">
                            <SkeletonBlock className="h-12 w-20" />
                            <SkeletonBlock className="h-4 w-24" />
                        </div>
                        <div className="space-y-2">
                            {[0, 1, 2, 3].map((i) => (
                                <SkeletonBlock key={i} className="h-2.5 w-full" />
                            ))}
                        </div>
                    </div>
                ) : fb && fb.totalReviews > 0 ? (
                    <div className="grid gap-4 rounded-lg border bg-card p-5 shadow-sm sm:grid-cols-[auto_1fr] sm:items-center">
                        <div className="flex flex-col items-center px-4">
                            <div className="text-5xl font-bold tabular-nums">
                                {fb.averageRating.toFixed(1)}
                            </div>
                            <div className="mt-1 flex">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        className={`h-4 w-4 ${
                                            s <= Math.round(fb.averageRating)
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-gray-300"
                                        }`}
                                    />
                                ))}
                            </div>
                            <span className="mt-1 text-xs text-muted-foreground">
                                {fb.totalReviews} reviews
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {fb.ratingDistribution.map((r) => {
                                const pct = fb.totalReviews
                                    ? (r.count / fb.totalReviews) * 100
                                    : 0;
                                return (
                                    <div
                                        key={r.stars}
                                        className="flex items-center gap-2 text-xs"
                                    >
                                        <span className="w-7 text-right text-muted-foreground">
                                            {r.stars}★
                                        </span>
                                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{
                                                    duration: 0.6,
                                                    delay: 0.5,
                                                    ease: "easeOut",
                                                }}
                                                className="h-full rounded-full bg-yellow-400"
                                            />
                                        </div>
                                        <span className="w-8 tabular-nums text-muted-foreground">
                                            {r.count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                        No feedback recorded yet.
                    </div>
                )}
            </section>
        </div>
    );
}
