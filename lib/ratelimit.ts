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

// Uploads — 5 per day per IP.
//
// A separate limiter with its own prefix so upload traffic cannot
// consume the browsing budget, and vice versa. The window is a day
// because the limit is a daily one.
//
// The sliding-window script makes four internal `redis.call`s, so each
// check costs five billed commands, not one. At five uploads per day
// per IP that is negligible, but see docs/adr/0004-upstash-bills-eval-internals.md.
//
// This limiter is a first line of defence, not the only one: the
// authoritative daily count lives in Postgres, so clearing the Redis
// keys does not lift the limit.
export const uploadRatelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "24 h"),
    analytics: false,
    prefix: "@upstash/ratelimit:upload",
});
