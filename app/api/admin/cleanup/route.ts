import { NextRequest, NextResponse } from "next/server";
import { secretsMatch } from "@/lib/admin-auth";
import { expireStaleSubmissions } from "@/lib/submissions";

export const runtime = "edge";

/**
 * Expire pending submissions older than the TTL.
 *
 * Called by the daily GitHub Actions workflow, not by a browser, so it
 * cannot present a Cloudflare Access session. It is protected by a
 * shared secret instead. The secret lives in a GitHub Actions secret
 * (CLEANUP_SECRET) and as a Pages environment variable
 * (CLEANUP_SECRET) — the same value in both places.
 */
export async function POST(request: NextRequest) {
    const provided =
        request.headers.get("x-cleanup-secret") ??
        request.nextUrl.searchParams.get("secret");

    const expected = process.env.CLEANUP_SECRET;

    if (!expected) {
        return NextResponse.json(
            { error: "Cleanup is not configured." },
            { status: 503 },
        );
    }

    if (!secretsMatch(provided, expected)) {
        return NextResponse.json(
            { error: "Not authorised." },
            { status: 401 },
        );
    }

    try {
        const { expired } = await expireStaleSubmissions();
        return NextResponse.json({ expired });
    } catch (error) {
        console.error("Cleanup failed:", error);
        return NextResponse.json(
            { error: "Cleanup failed." },
            { status: 500 },
        );
    }
}
