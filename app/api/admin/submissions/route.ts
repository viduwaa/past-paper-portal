import { NextRequest, NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/admin-auth";
import { listSubmissions } from "@/lib/submissions";

export const runtime = "edge";

/**
 * The review queue. Protected by Cloudflare Access — see
 * lib/admin-auth.ts. The handler re-checks the Access headers rather
 * than trusting the edge configuration alone.
 */
export async function GET(request: NextRequest) {
    const identity = getAdminIdentity(request);
    if (!identity) {
        return NextResponse.json(
            { error: "Not authorised." },
            { status: 401 },
        );
    }

    try {
        const statusParam = request.nextUrl.searchParams.get("status");
        const status =
            statusParam === "approved" || statusParam === "rejected"
                ? statusParam
                : "pending";

        const submissions = await listSubmissions(status, 100);

        return NextResponse.json({ submissions });
    } catch (error) {
        console.error("Failed to list submissions:", error);
        return NextResponse.json(
            { error: "Failed to load the review queue." },
            { status: 500 },
        );
    }
}
