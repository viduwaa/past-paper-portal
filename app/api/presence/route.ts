export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { ratelimit } from "@/lib/ratelimit";
import {
    registerHeartbeat,
    HEARTBEAT_INTERVAL_MS,
} from "@/lib/presence";

export async function POST(request: NextRequest) {
    const ip =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        "127.0.0.1";

    try {
        const { success } = await ratelimit.limit(ip);
        if (!success) {
            return NextResponse.json(
                { error: "Too many requests. Please wait a moment." },
                { status: 429 },
            );
        }
    } catch (error) {
        console.error("Rate limiting error:", error);
    }

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
    // style clients, minus body parsing.
    const userAgent = request.headers.get("user-agent");
    await registerHeartbeat("anon", userAgent);
    return new NextResponse(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
    });
}
