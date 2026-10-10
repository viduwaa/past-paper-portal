export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { recordOpen } from "@/lib/presence";
import { ratelimit } from "@/lib/ratelimit";

/**
 * Fire-and-forget paper-open telemetry. Called by PaperTable when a
 * student clicks "View" on a paper. Rate-limited, bot-skipped, and
 * always returns a cheap 204 so it never blocks the paper itself.
 */
export async function POST(request: NextRequest) {
    const ip =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        "127.0.0.1";

    try {
        const { success } = await ratelimit.limit(ip);
        if (!success) return new NextResponse(null, { status: 429 });
    } catch (error) {
        console.error("Rate limiting error:", error);
    }

    try {
        const { department } = await request.json();
        if (department && typeof department === "string") {
            await recordOpen(department);
        }
        return new NextResponse(null, {
            status: 204,
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("Paper open telemetry error:", error);
        // Silently succeed — telemetry must never break the user flow.
        return new NextResponse(null, { status: 204 });
    }
}
