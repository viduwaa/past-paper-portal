export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
    registerHeartbeat,
    HEARTBEAT_INTERVAL_MS,
    isBot,
} from "@/lib/presence";

/**
 * Presence heartbeat. While STATS_ENABLED is false (lib/flags.ts) the
 * heartbeat is a no-op that never touches Redis, but the endpoint still
 * answers 204 so existing clients keep their normal cadence.
 */
export async function POST(request: NextRequest) {
    try {
        const { browserId } = await request.json();
        if (!browserId || typeof browserId !== "string") {
            return NextResponse.json(
                { error: "Missing required field: browserId" },
                { status: 400 },
            );
        }

        const userAgent = request.headers.get("user-agent");
        // Bots and missing ids still get a 204 so clients never retry hard.
        const ok = await registerHeartbeat(browserId, userAgent);
        if (!ok) {
            return NextResponse.json(
                { error: "Presence temporarily unavailable" },
                { status: 503 },
            );
        }

        return new NextResponse(null, {
            status: 204,
            headers: {
                "Cache-Control": "no-store",
                "X-Heartbeat-Interval-Ms": String(HEARTBEAT_INTERVAL_MS),
            },
        });
    } catch (error) {
        console.error("Presence heartbeat error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    // A GET is treated the same as a heartbeat for simple <img>/sendBeacon
    // style clients, minus body parsing — but ONLY when the client can name
    // a real session. Anything else landing here (crawlers, uptime probes)
    // used to write a fake "anon" heartbeat to Redis on every hit, with no
    // rate limit at all. Those requests now get a free 204 and never touch
    // Redis or the rate limiter.
    const userAgent = request.headers.get("user-agent");
    const browserId = request.nextUrl.searchParams.get("browserId");
    if (!browserId || isBot(userAgent)) {
        return new NextResponse(null, {
            status: 204,
            headers: { "Cache-Control": "no-store" },
        });
    }

    await registerHeartbeat(browserId, userAgent);
    return new NextResponse(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
    });
}
