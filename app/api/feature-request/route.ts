import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "edge";

// Browser fingerprinting function (same as feedback)
function generateBrowserId(request: NextRequest): string {
    const userAgent = request.headers.get("user-agent") || "";
    const acceptLanguage = request.headers.get("accept-language") || "";
    const acceptEncoding = request.headers.get("accept-encoding") || "";

    const fingerprint = [userAgent, acceptLanguage, acceptEncoding].join("|");

    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

export async function POST(request: NextRequest) {
    try {
        const { request: featureRequest, browserId } = await request.json();

        if (!featureRequest || typeof featureRequest !== "string") {
            return NextResponse.json(
                { error: "Request text is required" },
                { status: 400 }
            );
        }

        if (featureRequest.length > 500) {
            return NextResponse.json(
                { error: "Request text is too long (max 500 characters)" },
                { status: 400 }
            );
        }

        const userAgent = request.headers.get("user-agent");
        const finalBrowserId = browserId || generateBrowserId(request);

        // Check for recent requests from the same browser (rate limiting)
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recent, error: recentError } = await getSupabase()
            .from("feature_requests")
            .select("id")
            .eq("browser_id", finalBrowserId)
            .gte("timestamp", since)
            .limit(1);
        if (recentError) throw recentError;

        if (recent && recent.length > 0) {
            return NextResponse.json(
                {
                    error: "Rate limit exceeded. Please wait before submitting another request.",
                },
                { status: 429 }
            );
        }

        // Insert the feature request
        const { error: insertError } = await getSupabase()
            .from("feature_requests")
            .insert({
                request_text: featureRequest,
                browser_id: finalBrowserId,
                user_agent: userAgent,
            });
        if (insertError) throw insertError;

        return NextResponse.json(
            { message: "Feature request submitted successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Feature request error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        // Get all feature requests (for admin purposes)
        const { data, error } = await getSupabase()
            .from("feature_requests")
            .select("id, request_text, browser_id, user_agent, timestamp")
            .order("timestamp", { ascending: false })
            .limit(100);
        if (error) throw error;

        const requests = (data as {
            id: number;
            request_text: string;
            browser_id: string;
            user_agent: string | null;
            timestamp: string;
        }[]).map((r) => ({
            id: r.id,
            requestText: r.request_text,
            browserId: r.browser_id,
            userAgent: r.user_agent,
            timestamp: r.timestamp,
        }));

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Get feature requests error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
