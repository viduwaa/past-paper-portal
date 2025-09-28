export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { Database, WebsiteFeedback } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        console.log(
            "API called with DATABASE_URL:",
            process.env.DATABASE_URL ? "Present" : "Missing"
        );

        const { rating, browserId } = await request.json();
        console.log("Received data:", {
            rating,
            browserId: browserId ? "Present" : "Missing",
        });

        // Validate input
        if (!rating || !browserId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: "Rating must be between 1 and 5" },
                { status: 400 }
            );
        }

        // Test database connection
        try {
            await Database.testConnection();
            console.log("Database connection successful");
        } catch (dbError) {
            console.error("Database connection failed:", dbError);
            return NextResponse.json(
                {
                    error: "Database connection failed",
                    details:
                        dbError instanceof Error
                            ? dbError.message
                            : "Unknown database error",
                },
                { status: 500 }
            );
        }

        // Check if user rated recently (within last hour)
        const recentFeedback = await Database.findRecentFeedback(browserId);

        if (recentFeedback) {
            return NextResponse.json(
                {
                    error: "You can only rate once per hour. Please try again later.",
                },
                { status: 429 }
            );
        }

        // Create or update feedback (upsert)
        const feedback = await Database.upsertFeedback(
            parseInt(rating),
            browserId,
            request.headers.get("user-agent") || null
        );

        console.log("Feedback saved successfully:", feedback.id);
        return NextResponse.json({
            success: true,
            feedback: {
                id: feedback.id,
                rating: feedback.rating,
                timestamp: feedback.timestamp,
            },
        });
    } catch (error) {
        console.error("Website feedback submission error:", error);
        return NextResponse.json(
            {
                error: "Internal server error",
                details:
                    error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        console.log("GET request received");

        // Test database connection
        try {
            await Database.testConnection();
            console.log("Database connection successful for GET");
        } catch (dbError) {
            console.error("Database connection failed for GET:", dbError);
            return NextResponse.json(
                {
                    error: "Database connection failed",
                    details:
                        dbError instanceof Error
                            ? dbError.message
                            : "Unknown database error",
                },
                { status: 500 }
            );
        }

        const feedbacks = await Database.getAllFeedback();

        const totalReviews = feedbacks.length;
        const averageRating =
            totalReviews > 0
                ? feedbacks.reduce(
                      (sum: number, f: WebsiteFeedback) => sum + f.rating,
                      0
                  ) / totalReviews
                : 0;

        const ratingDistribution = [1, 2, 3, 4, 5].map((stars) => ({
            stars,
            count: feedbacks.filter((f: WebsiteFeedback) => f.rating === stars)
                .length,
        }));

        console.log("GET request successful, returning stats");
        return NextResponse.json({
            totalReviews,
            averageRating: Math.round(averageRating * 10) / 10,
            ratingDistribution,
        });
    } catch (error) {
        console.error("Website feedback fetch error:", error);
        return NextResponse.json(
            {
                error: "Internal server error",
                details:
                    error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
