"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    const sessionIdRef = useRef<string | null>(null);

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

    const hasData = typeof online === "number" && online > 0;
    const display = online === null ? "—" : String(online);

    return (
        <span
            className="relative inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-primary/[0.04] px-2.5 py-1 select-none sm:px-3"
            role="status"
            aria-live="polite"
            aria-label={
                hasData ? `${online} users online right now` : "Live usage unavailable"
            }
            title={
                hasData
                    ? `${online} people are using the portal right now`
                    : "Live usage loading…"
            }
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
        </span>
    );
}
