export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { recordOpen } from "@/lib/presence";

/**
 * Fire-and-forget paper-open telemetry. Called by PaperTable when a
 * student clicks "View" on a paper. Bot-skipped, and always returns a
 * cheap 204 so it never blocks the paper itself.
 *
 * The daily-open counter is paused while STATS_ENABLED is false, in which
 * case this is a 204 no-op with no Redis call.
 */
export async function POST(request: NextRequest) {
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
