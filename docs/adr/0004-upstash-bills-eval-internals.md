# Upstash bills every `redis.call` inside an EVAL

Upstash charges a Lua script as one command **plus one command for every
internal `redis.call` or `redis.pcall` it makes**. A script that runs a
`GET` and a `SET` costs three commands, not one.

This matters because the free tier allows 500,000 commands per month, and
the presence engine is the portal's heaviest Redis consumer. The heartbeat
script made nine internal calls on every heartbeat and up to fourteen on a
session's first touch of the day, so it cost ten to fifteen billed commands
per visible tab per minute — not the one the code comment claimed. The
sliding-window rate limiter makes four internal calls and so costs five
per request.

**This is not theoretical: the account's quota is exhausted.** Every
Redis command now fails with `ERR max requests limit exceeded`, including
`PING`. The site survives because every Redis path degrades to the
database, but the live badge, the presence tracking and the rate limiter
are all silently inert. The quota resets monthly, so this recurs.

Redis scripts are therefore budgeted in **billed calls**, not in requests.
The presence engine was rewritten to collapse the peak-tracking
`GET`/`SET`/`EXPIRE` triples and the first-touch debounce into single
hash operations, and the rate limiter was given a cheaper window.

After the change a repeat heartbeat — the common case, since the client
beats every 60 seconds — costs five internal calls, and a first touch of
the day costs ten. The live-stats read costs four, against nine before.

## Consequences

- A script that "looks like one call" can be the most expensive thing in
  the system. Read the script and count the internal calls before adding
  to it.
- The savings are only real if the collapse is measured in internal calls.
  Fewer HTTP requests to Redis is a latency win, not a quota win.
- Batch reads with `MGET` and fold a `SET` plus its `EXPIRE` into a
  single `SET ... EX` call. Both cut billed calls without changing
  behaviour.
- **A Redis-backed rate limit cannot be the only limit.** When the quota
  is exhausted, `ratelimit.limit()` throws and the limiter fails open —
  the abuse protection is gone exactly when the service is under strain.
  The upload endpoint therefore keeps an authoritative count in Postgres
  (`paper_submission_attempts`), which counts attempts whether or not
  they succeed, so a Drive outage cannot be used to hammer the Drive API
  either.
