export const runtime = "edge";

import { NextResponse } from "next/server";
import { Database, PaperFilters } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";

export async function GET(request: Request) {
    // Determine user IP for rate limiting
    const ip =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
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
        // If Redis fails, log it but don't block the user (fail open)
        console.error("Rate limiting error:", error);
    }

    const { searchParams } = new URL(request.url);

    // Check if the request is for filter options
    if (searchParams.get("options") === "true") {
        const options = await Database.getFilterOptions();
        return NextResponse.json(options);
    }

    try {
        const filters: PaperFilters = {
            year: searchParams.get("year") || undefined,
            semester: searchParams.get("semester") || undefined,
            department: searchParams.get("department") || undefined,
            courseCode: searchParams.get("courseCode") || undefined,
            searchQuery: searchParams.get("searchQuery") || undefined,
        };

        const papers = await Database.getPapers(filters);

        return NextResponse.json(papers);
    } catch (error) {
        console.error("Papers API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch papers" },
            { status: 500 },
        );
    }
}
