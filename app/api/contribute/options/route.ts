import { NextResponse } from "next/server";
import { Database } from "@/lib/db";

export const runtime = "edge";

/**
 * The dropdown options for the contribute form.
 *
 * Every value the form offers comes from the catalogue itself, so a
 * contributor can only select a department, study year, semester or
 * exam year that already exists. The server validates against the same
 * lists, which is what stops invented rows appearing in the catalogue.
 *
 * Cached in Redis for 24 hours like the other filter data — the lists
 * change only when a new paper is published.
 */
export async function GET() {
    try {
        const [filterOptions, examYears, courseCodes] = await Promise.all([
            Database.getFilterOptions(),
            Database.getExamYears(),
            Database.getDistinctCourseCodes(),
        ]);

        return NextResponse.json(
            {
                departments: filterOptions.departments,
                years: filterOptions.years,
                semesters: filterOptions.semesters,
                examYears,
                courseCodes,
            },
            {
                headers: {
                    // The lists change rarely; let the edge cache them.
                    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
                },
            },
        );
    } catch (error) {
        console.error("Failed to fetch contribute options:", error);
        return NextResponse.json(
            { error: "Failed to load form options." },
            { status: 500 },
        );
    }
}
