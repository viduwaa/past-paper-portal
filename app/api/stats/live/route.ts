export const runtime = "edge";

import { NextResponse } from "next/server";
import { getLiveStats } from "@/lib/presence";

export async function GET() {
    const stats = await getLiveStats();
    return NextResponse.json(stats, {
        headers: {
            "Cache-Control": "no-store, max-age=0",
            "Access-Control-Allow-Origin": "*",
        },
    });
}
