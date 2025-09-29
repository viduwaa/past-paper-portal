import { NextResponse } from "next/server";

export async function GET() {
    const robotsTxt = `User-agent: *
Allow: /

# Block access to API routes
Disallow: /api/

# Block access to admin areas (if any)
Disallow: /admin/

# Sitemap
Sitemap: https://past-paper-portal.pages.dev/sitemap.xml`;

    return new NextResponse(robotsTxt, {
        headers: {
            "Content-Type": "text/plain",
        },
    });
}
