import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Sliding window — 30 requests per minute per IP.
// `analytics: false`: Upstash analytics costs 2-3 extra Redis commands per
// limited request and is never read anywhere in this codebase. On the free
// tier (500K commands/month) that silent write path alone can burn 30K+
// commands/month. Flip it back on only if you build a dashboard over
// @upstash/ratelimit's analytics keys.
export const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, "60 s"),
    analytics: false,
    prefix: "@upstash/ratelimit",
});
