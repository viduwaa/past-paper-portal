# Reduce Upstash billed calls in the presence engine

Status: completed

## What

Rewrite the Redis Lua scripts in `lib/presence.ts` to minimise *billed*
commands rather than round trips.

## Why

Upstash charges an EVAL as one command **plus one for every internal
`redis.call`**. A script that runs a `GET` and a `SET` costs three
commands, not one. The free tier allows 500,000 commands per month and
the presence engine is the heaviest consumer — the heartbeat runs every
60 seconds for every visible tab.

The existing code comment claimed the heartbeat was "ONE Redis command
(a single EVAL)". That was true of the request and false of the bill: the
script made nine internal calls on every heartbeat and up to fourteen on
a session's first touch of the day, costing ten to fifteen billed
commands per tab per minute. The rate limiter's sliding-window script
makes four internal calls, so it costs five per request.

**The quota is currently exhausted.** Every Redis command on the
account fails with `ERR max requests limit exceeded`, including `PING`.
The site survives because every Redis path degrades to the database, but
the live badge, the presence tracking and the rate limiter are all
silently inert. The quota resets monthly, so this recurs.

Every extra visitor multiplies this. Fixing it is what keeps the
remaining free-tier budget available for the features being added.

## How

**Heartbeat** — 9 internal calls → 5 on a repeat heartbeat, 10 on a
first touch:

- The day-scoped work (mark expiry, view counter, unique HLL) runs only
  when `HSETNX` reports the session is new for the day. `HSETNX` is
  already the debounce signal, and both the view counter and the
  HyperLogLog are idempotent per session per day, so skipping them on
  later heartbeats changes nothing.
- The two peaks are string keys, so one `MGET` replaces two `GET`s.
- `SET ... EX` folds a `SET` and its `EXPIRE` into one call.

**Live stats** — 9 internal calls → 4. The two peaks and the view
counter are all string keys, so one `MGET` replaces four `GET`s. The
script now returns the updated peak values directly rather than
re-reading them after the update.

**Paper opens** — 7 internal calls → 5. The day-scoped keys only need
their TTL set when they are created, and `INCR` returns the new value,
so an `INCR` that returns 1 means the key is brand new. The lifetime
department key keeps its re-arm, because it spans days and must survive
as long as the department keeps being opened.

**The upload rate limit** — a Redis-backed limit cannot be the only
limit. When the quota is exhausted `ratelimit.limit()` throws and the
limiter fails open, so the abuse protection disappears exactly when the
service is under strain. The upload endpoint therefore keeps an
authoritative count in Postgres (`paper_submission_attempts`), which
counts attempts whether or not they succeed, so a Drive outage cannot
be used to hammer the Drive API either.

## Constraints

- Behaviour must not change. The values the dashboard shows today must
  be the values it shows after this.
- `getLiveStats` still takes `Math.max` with the live count, so a peak
  that is read before it is written is still reported correctly.
- Record the reasoning in `docs/adr/0004-upstash-bills-eval-internals.md`
  and update the cost notes in `STATS-PLAN.md`, so the next person
  counting requests does not repeat the mistake.

## Done when

- `pnpm build` succeeds and the scripts still parse.
- The live badge, the stats dashboard and the day history show the same
  numbers as before for a fixed sequence of heartbeats and opens.
- The Upstash dashboard shows a lower daily command count for the same
  traffic.
- The upload endpoint still enforces 5/day/IP with Redis completely
  unreachable. **Verified**: attempts 1–5 returned 503, attempt 6
  returned 429.
