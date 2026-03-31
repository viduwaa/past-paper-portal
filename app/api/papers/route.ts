export const runtime = "edge";

import { NextResponse } from "next/server";
import { Database, PaperFilters } from "@/lib/db";
export const runtime = "edge";
export async function GET(request: Request) {
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
