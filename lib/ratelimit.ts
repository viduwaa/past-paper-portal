import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Allow 50 requests per 1 minute using a sliding window
// Ensure you have UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment variables
export const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, "60 s"),
    analytics: true,
    // Optional prefix for the keys
    prefix: "@upstash/ratelimit",
});
