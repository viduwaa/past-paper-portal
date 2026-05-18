export const runtime = "edge";

import { NextResponse } from "next/server";
import { Database, PaperFilters } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getCachedPapers, setCachedPapers, getCachedFilterOptions, setCachedFilterOptions } from "@/lib/cache";

export async function GET(request: Request) {
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
        console.error("Rate limiting error:", error);
    }

    const { searchParams } = new URL(request.url);

    if (searchParams.get("options") === "true") {
        let options = await getCachedFilterOptions();
        if (!options) {
            options = await Database.getFilterOptions();
            await setCachedFilterOptions(options).catch(() => {});
        }
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

        let papers = await getCachedPapers();
        if (!papers) {
            papers = await Database.getAllPapers();
            await setCachedPapers(papers).catch(() => {});
        }

        const filtered = Database.filterPapers(papers, filters);

        return NextResponse.json(filtered);
    } catch (error) {
        console.error("Papers API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch papers" },
            { status: 500 },
        );
    }
}
