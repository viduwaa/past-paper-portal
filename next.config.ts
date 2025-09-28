import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Enable experimental features for Cloudflare Pages
    experimental: {
        serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    },
};

export default nextConfig;
