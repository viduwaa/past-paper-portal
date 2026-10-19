"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { HEARTBEAT_INTERVAL_MS, LIVE_STATS_TTL } from "@/lib/presence";

interface LiveStats {
    online: number;
    peakToday: number;
    peakAllTime: number;
    viewsToday: number;
    uniquesToday: number;
}

/**
 * Client session id: persists for the browser via localStorage, unique
 * enough for presence counting without any fingerprinting parameters.
 */
function getSessionId(): string | null {
    try {
        if (typeof window === "undefined" || !window.localStorage) return null;
        let id = localStorage.getItem("pstats-session");
        if (!id) {
            id =
                typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : `${Date.now().toString(36)}-${Math.random()
                          .toString(36)
                          .slice(2, 10)}`;
            localStorage.setItem("pstats-session", id);
        }
        return id;
    } catch {
        return null;
    }
}

export function LiveBadge() {
    const [online, setOnline] = useState<number | null>(null);
    const [direction, setDirection] = useState(1);
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const sessionIdRef = useRef<string | null>(null);
    const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reducedMotion = useReducedMotion();

    // Register this session once, then heartbeat + poll while visible.
    useEffect(() => {
        const sessionId = getSessionId();
        sessionIdRef.current = sessionId;
        let heartbeats = 0;
        let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

        const isBotUA =
            /bot|crawl|spider|preview|lighthouse|headless|monitor|uptime/i.test(
                navigator.userAgent,
            );
        if (isBotUA || !sessionId) return;

        const postHeartbeat = () => {
            // keepalive so the beacon survives page unload
            fetch("/api/presence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ browserId: sessionId }),
                keepalive: true,
            }).catch(() => {});
        };

        const pollLive = async () => {
            try {
                const res = await fetch("/api/stats/live", {
                    cache: "no-store",
                });
                if (!res.ok) return;
                const stats: LiveStats = await res.json();
                setOnline((prev) => {
                    if (typeof prev === "number" && stats.online > prev)
                        setDirection(-1); // new user rising in
                    return stats.online;
                });
            } catch {
                // backend hiccup: keep last value, retry on next tick
            }
        };

        const start = () => {
            postHeartbeat();
            heartbeats++;
            if (heartbeats === 1) {
                pollLive();
                heartbeatTimer = setInterval(postHeartbeat, HEARTBEAT_INTERVAL_MS);
            }
        };
        const stop = () => {
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
                heartbeatTimer = null;
                heartbeats = 0;
            }
        };

        const onVisibility = () =>
            document.hidden ? stop() : start();

        start();
        pollLive();
        const pollTimer = setInterval(pollLive, LIVE_STATS_TTL);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            stop();
            clearInterval(pollTimer);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    // Tooltip opens after a short dwell so a casually sweeping cursor
    // doesn't fire it; closes instantly so it never lags the pointer.
    const openTooltip = () => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
        tooltipTimer.current = setTimeout(() => setTooltipOpen(true), 350);
    };
    const closeTooltip = () => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
        tooltipTimer.current = null;
        setTooltipOpen(false);
    };
    useEffect(
        () => () => {
            if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
        },
        [],
    );

    const hasData = typeof online === "number" && online > 0;
    const display = online === null ? "—" : String(online);
    const tooltipText = hasData
        ? `${online} ${online === 1 ? "person is" : "people are"} using the portal right now.`
        : "Live usage is warming up…";

    return (
        <span className="relative inline-flex" role="status" aria-live="polite">
            <Link
                href="/stats"
                onMouseEnter={openTooltip}
                onMouseLeave={closeTooltip}
                onFocus={openTooltip}
                onBlur={closeTooltip}
                aria-label={
                    hasData
                        ? `${online} users online — open the live stats page`
                        : "Live usage — open the stats page"
                }
                className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border/70 bg-primary/[0.04] px-2.5 py-1 select-none outline-none transition-colors hover:border-primary/40 hover:bg-primary/[0.09] focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-3"
            >
                {/* Breathing presence dot — pure CSS, honors reduced motion */}
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                    <span className="pstats-dot-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>

                <span
                    className="relative text-xs font-bold tabular-nums tracking-tight text-foreground"
                    data-testid="live-badge-count"
                >
                    <AnimatePresence
                        initial={false}
                        mode="popLayout"
                        custom={direction}
                    >
                        <motion.span
                            key={display}
                            custom={direction}
                            variants={{
                                enter: (dir: number) => ({
                                    y: dir > 0 ? "60%" : "-60%",
                                    opacity: 0,
                                }),
                                center: { y: 0, opacity: 1 },
                                exit: (dir: number) => ({
                                    y: dir > 0 ? "-60%" : "60%",
                                    opacity: 0,
                                }),
                            }}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="inline-block"
                        >
                            {display}
                        </motion.span>
                    </AnimatePresence>
                </span>

                <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                    online
                </span>
            </Link>

            {/* Inviting hover tooltip — fades in after a short dwell,
                links the eye toward the /stats page, pointer-transparent
                so it can never trap the cursor. */}
            <AnimatePresence>
                {tooltipOpen && (
                    <motion.span
                        key="live-warning-tooltip"
                        initial={{ opacity: 0, y: reducedMotion ? 0 : 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{
                            opacity: 0,
                            y: reducedMotion ? 0 : 3,
                            transition: { duration: reducedMotion ? 0.1 : 0.14 },
                        }}
                        transition={{
                            duration: reducedMotion ? 0.1 : 0.22,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        aria-hidden="true"
                        className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-max max-w-[240px] rounded-xl border border-border/80 bg-popover/90 px-3 py-2 text-left shadow-lg shadow-black/5 backdrop-blur-md"
                    >
                        {/* Caret pointing at the badge */}
                        <span
                            aria-hidden="true"
                            className="absolute -top-1 right-5 h-2 w-2 rotate-45 rounded-[2px] border-l border-t border-border/80 bg-popover"
                        />
                        <span className="flex items-start gap-1.5 text-xs leading-relaxed text-popover-foreground">
                            <span
                                aria-hidden="true"
                                className="relative mt-1 flex h-1.5 w-1.5 shrink-0"
                            >
                                <span className="pstats-dot-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                            <span>
                                {tooltipText}{" "}
                                <span className="whitespace-nowrap font-semibold text-primary">
                                    Wanna see the stats?
                                </span>{" "}
                                <span className="font-medium text-muted-foreground">
                                    Click anywhere on the badge →
                                </span>
                            </span>
                        </span>
                    </motion.span>
                )}
            </AnimatePresence>
        </span>
    );
}
