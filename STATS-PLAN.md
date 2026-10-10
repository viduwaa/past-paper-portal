# STATS-PLAN.md — Live Usage Statistics Architecture

> Plan document for the "Live Stats" feature of the FOT Past Papers Portal.
> Written 2026-10-10 after a full architecture review of the codebase and
> Cloudflare/Upstash deployment constraints. Reference this file when
> implementing in future sessions — do not re-litigate decisions already
> marked ✅ below without a new discussion.

---

## 1. Decisions (locked)

| Question | Decision |
|---|---|
| Live-update mechanism | ✅ **Upstash Redis presence + client polling** (heartbeats 60s, badge poll 30s). NOT Durable Objects/WebSockets (Pages can't export DO classes — would require a companion Worker), NOT GA4 Realtime (3–5 min lag, service-account plumbing). |
| Public stats scope | ✅ **Full dashboard**: concurrent users, peaks (today + all-time), 30-day history, views/uniques, department interest, feedback rating summary. |
| Badge placement | ✅ **In the navbar** (`TopNavigation`), plus a `/stats` route linked from the **footer** (footer does not exist yet — must be built). |
| Privacy | ✅ Hash identity with pepper before any Redis write. No raw browserId, IP, or UA stored in Redis records for stats. |
| Failure behavior | ✅ All stats Redis calls degrade silently (badge shows "—", dashboard shows empty states). Site never breaks because of stats. |

## 2. Current-state ground truth (verified in codebase)

- Next.js 15 App Router + React 19, deployed to **Cloudflare Pages** via
  `next-on-pages` (`pnpm run pages:deploy`, wrangler v3). All API routes use
  `runtime = "edge"`.
- Data: PostgreSQL via `@vercel/postgres` (`lib/db.ts`) — tables
  `past_papers`, `website_feedback`.
- **Upstash Redis already in the stack**: rate limiting (`lib/ratelimit.ts`,
  30 req/min sliding window via `@upstash/ratelimit`) and papers caching
  (`lib/cache.ts`, lazy `Redis.fromEnv()` init, silent-fail try/catch style —
  copy this style for all new stats code).
- `browserId` concept already exists (`website_feedback.browser_id`) — reuse
  the same localStorage identity for visitor uniqueness.
- GA4 already installed (`G-0T13ZDQZC8`) in `app/layout.tsx` — use for
  cross-sanity checks only, never as the live backend.
- **No footer component exists**; `app/layout.tsx` has only `TopNavigation` +
  `<main>`. Footer must be created.
- Paper viewing links are opened from `app/_components/PaperTable.tsx` —
  that's the hook point for per-paper / per-department "opens" counters.

## 3. Redis schema (all keys prefixed `pstats:` to isolate from other uses)

| Key | Type | Purpose | TTL |
|---|---|---|---|
| `pstats:presence` | ZSET — member = sha256(browserId + pepper), score = last-seen epoch ms | Active sessions. Stale members pruned via `ZREMRANGEBYSCORE` on every write (heartbeat window ~90s). | auto-pruned by score |
| `pstats:peak:YYYYMMDD` | String, compare-and-set max via Lua (`INCRIF`-style) | Max concurrent seen that day | 90d |
| `pstats:peak:alltime` | String, same mechanism | All-time record | none |
| `pstats:views:YYYYMMDD` | String (INCR) | Page views per day | 90d |
| `pstats:uniques:YYYYMMDD` | HyperLogLog (`PFADD` hashed id, `PFCOUNT`) | Unique visitors per day | 90d |
| `pstats:opens` | String (INCR) | Paper open clicks | none |
| `pstats:dept:<CODE>` | String (INCR) | Interest breakdown per department | 90d |

### Key facts

- Heartbeat = one **pipelined** batch of ~3 Redis commands
  (`ZADD` + `ZREMRANGEBYSCORE` + `PFADD/INCR`).
- Badge poll = ~2 commands (`ZCARD` + peak compare-and-set).
- Free tier: 10K commands/day → supports ~500 visitors/day free; exam-season
  spikes cost pay-as-you-go pennies. If burn matters, throttle heartbeat to
  90s and badge poll to 60s.
- Peak concurrency is **sampled** at poll time (monotonic, never regresses) —
  an unobserved literal peak second may be off by a few; acceptable.
- 30–45s refresh granularity — "live enough", not instant. Sub-second would
  require the Durable Objects fork (= migrating off Pages).

## 4. Files

**Create:**
- `lib/presence.ts` — all Redis logic: `touchPresence`, `getActiveCount`,
  `recordPeak`, `bumpDailyUniques`, `recordView`, `getHistory(days)`.
  Never throws; silent-fail try/catch like `lib/cache.ts`. Include the
  pepper-hash helper (`sha256(browserId + STATS_PEPPER)`).
- `app/api/presence/route.ts` — POST heartbeat, edge runtime, rate-limited
  via existing `ratelimit`, hashes id, pipelined write, returns 204.
- `app/api/stats/live/route.ts` — GET, edge: `{ online, peakToday,
  peakAllTime, viewsToday }`; also bumps the peak record. No-store headers.
- `app/api/stats/history/route.ts` — GET, edge: last 30/90 days of views,
  uniques, peaks, avg concurrency + feedback aggregate (reuse
  `Database.getAllFeedback()` sums).
- `app/stats/page.tsx` — public dashboard: big live counter, peak records,
  30-day bar/sparkline (hand-rolled SVG, no chart lib), department interest
  bars, feedback rating summary. Framer Motion + Shadcn, matches site style.
- `app/_components/LiveBadge.tsx` — client component: register session on
  mount, heartbeat every 60s (**pause when `document.hidden`**, no bot UAs),
  poll `/api/stats/live` every 30s, renders "● N online" pill.
- `app/_components/Footer.tsx` — links: `/stats`, GitHub, feedback.

**Modify:**
- `app/layout.tsx` — mount `<Footer />` (nothing else touched).
- `app/_components/TopNavigation.tsx` — insert `<LiveBadge />`.
- `app/page.tsx` / `PaperTable` — one fire-and-forget view/open telemetry
  call on mount (skip for bots).
- `database-setup.sql` — documented optional SQL mirror if permanent history
  beyond Redis TTL is ever wanted.

## 5. Phased rollout (each phase independently deployable)

1. **Phase 1 — Live presence**: `lib/presence.ts`, presence POST route,
   stats/live GET route, LiveBadge in nav. Ship "N online".
2. **Phase 2 — History & peaks**: daily counters, HLL uniques, peak records
   via Lua compare-and-set.
3. **Phase 3 — `/stats` dashboard + Footer** mounted in layout.
4. **Phase 4 — Polish**: department breakdown from paper opens, sparkline,
   GA4 parity check.

## 6. Safeguards

- Rate limit all stats endpoints with the existing `ratelimit` instance.
- Skip heartbeats for known bot/preview user agents.
- Session identity is hashed; only per-session, not per-tab (tabs collapse).
- Badge and dashboard handle Redis outage gracefully ("—" / empty states).
- Record page views server-side at API level where possible, not only client.

## 7. Environment variables

No new required vars beyond what's already used (`UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`). Add one optional:

- `STATS_PEPPER` — random secret for the browserId hash. If unset, fall back
  to a fixed repo default (documented tradeoff: identity hashing then only
  obscures, doesn't cryptographically isolate — acceptable for this site).

## 8. Permanent storage — Neon mirror (post-plan addition, implemented)

Redis day buckets expire after 90 days. Everything older is frozen in the
Neon Postgres database (already the app's data store, `POSTGRES_URL`).

**Schema** (see `database-setup.sql` / `scripts/migrate-pstats-daily.mjs`):
- `pstats_daily (day PK, views, uniques, peak, opens, departments JSONB, updated_at)`
- `pstats_meta (name PK, value, updated_at)` — monotonic cumulative counters
  (`opens_total`, `peak_alltime`).

**Mechanism — lazy snapshotting, no cron** (Cloudflare Pages has no scheduled
workers): every `GET /api/stats/history` also
1. reads full day snapshots for the last 90 days via `getDaySnapshots(90)`
   (always 90, never the caller's `?days=`, so mirror coverage is stable),
2. upserts them into `pstats_daily` with **per-field GREATEST** merges and
   **per-department GREATEST** merges of the JSONB department counts
   (`lib/statsStore.ts`),
3. bumps `pstats_meta` monotonic counters.

So values are frozen in Postgres before the 90-day TTL erases them from
Redis, merges are idempotent and monotonic, and a Postgres failure only
degrades all-time numbers (call sites `.catch(() => null)`), never the
stats API itself.

**Key layout note:** opens are double-bucketed — lifetime keys
(`pstats:opens`, `pstats:dept:<CODE>`) and day keys
(`pstats:opens:<YYYYMMDD>`, `pstats:dept:<CODE>:<YYYYMMDD>`). Anything
reading dept lifetime totals must filter `KEYS pstats:dept:*` by segment
count (3) so day buckets don't leak into them; day-bucket discovery uses
the 4-segment pattern.

**Dashboard contract:** `/api/stats/history` returns `history` (Redis,
≤90d window), `allTime` (Postgres totals + per-dept), `allTimePeak`,
`opensTotal` (max of Redis/Postgres), plus the original `feedback` block
today's day-0 row folds in live stats so badge and dashboard agree.
