import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const { rating, browserId } = await request.json();

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

        // Check if user rated recently (within last hour)
        const recentFeedback = await prisma.websiteFeedback.findFirst({
            where: {
                browserId,
                timestamp: {
                    gte: new Date(Date.now() - 3600000), // Last hour
                },
            },
        });

        if (recentFeedback) {
            return NextResponse.json(
                {
                    error: "You can only rate once per hour. Please try again later.",
                },
                { status: 429 }
            );
        }

        // Create or update feedback (upsert)
        const feedback = await prisma.websiteFeedback.upsert({
            where: {
                browserId: browserId,
            },
            update: {
                rating: parseInt(rating),
                timestamp: new Date(),
                userAgent: request.headers.get("user-agent") || null,
            },
            create: {
                rating: parseInt(rating),
                browserId,
                userAgent: request.headers.get("user-agent") || null,
            },
        });

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
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const feedbacks = await prisma.websiteFeedback.findMany({
            select: {
                rating: true,
                timestamp: true,
            },
            orderBy: { timestamp: "desc" },
        });

        const totalReviews = feedbacks.length;
        const averageRating =
            totalReviews > 0
                ? feedbacks.reduce(
                      (sum: number, f: { rating: number }) => sum + f.rating,
                      0
                  ) / totalReviews
                : 0;

        const ratingDistribution = [1, 2, 3, 4, 5].map((stars) => ({
            stars,
            count: feedbacks.filter(
                (f: { rating: number }) => f.rating === stars
            ).length,
        }));

        return NextResponse.json({
            totalReviews,
            averageRating: Math.round(averageRating * 10) / 10,
            ratingDistribution,
        });
    } catch (error) {
        console.error("Website feedback fetch error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
