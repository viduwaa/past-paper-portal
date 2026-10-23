# Contribute Papers + Contributors Wall

Status: ready-for-agent

## Goal

Let anyone with a past paper add it to the portal by uploading a PDF, and
credit the people who contributed — both papers and code — on a visible
Contributors wall.

## Scope

Two new surfaces, plus the supporting data model:

- `/contribute` — an upload form. A contributor picks the paper's
  department, study year, semester and exam year, optionally gives a name
  and/or GitHub username, and uploads a PDF.
- `/contributors` — a wall listing every contributor with their paper and
  commit counts, merged on GitHub username.
- `/admin` — the review queue, behind Cloudflare Access. A reviewer
  approves or rejects each pending submission.

## Domain

Defined in `GLOSSARY.md`. The load-bearing distinctions:

- A **Paper Submission** is pending. It becomes a **Paper** only on
  approval.
- A **Contribution** is either a **Paper Contribution** (an approved
  submission) or a **Code Contribution** (a merged pull request).
- A **Contributor** is a person, keyed by GitHub login when they have one.

## Decisions

Settled across four grilling rounds; recorded in `docs/adr/`.

| # | Decision | ADR |
|---|---|---|
| 1 | Server relays the PDF to Drive; no Drive account needed from the contributor | — |
| 2 | Submissions are reviewed before they publish | `0002` |
| 3 | Drive access via an OAuth refresh token, not a service account | `0001` |
| 4 | Files are shared with the `tec.rjt.ac.lk` domain | `0003` |
| 5 | The app owns its own Drive tree | `0005` |
| 6 | Redis scripts are budgeted in billed calls, not requests | `0004` |
| 7 | The dedup key includes the file name, because a subject holds several papers per period | `0006` |

## Constraints

- **Cloudflare Workers free tier**: 10 ms CPU per request, 100 MB request
  body, 128 MB memory. The upload route must not hash the whole file.
- **Upstash free tier**: 500K commands/month. An EVAL bills as one command
  plus one per internal `redis.call`.
- **Neon free tier**: 100 CU-hr/month, 1 GB storage, 5 GB egress/month.
- **Drive**: service accounts have zero storage quota; `drive.file` reaches
  only files the app created. Quota is 1M units/min/project, but storage
  is the real limit.
- **GitHub API**: 60 requests/hour unauthenticated per IP, so contributor
  data is baked at build time, never fetched at runtime.

## Data model

See `scripts/migrate-contributions.sql`. Adds `source`,
`contributor_name` and `contributor_github` to `past_papers`; replaces
the dedup key with one that includes `file_name`; creates
`paper_submissions` and `contributors`.

**Applied.** The live database had no unique constraint at all, and three
vocabularies were in circulation for the same columns, so 38 duplicate
rows existed and the semester/year filters were hiding rows. The
migration normalises the vocabulary, merges the duplicates, and installs
the correct key. Verified: 933 rows, 0 key collisions, re-running is a
no-op.

## Issues

| # | Title | Status |
|---|---|---|
| 01 | Migrate the database for contributions | completed |
| 02 | Integrate Google Drive | ready-for-agent |
| 03 | Build the public upload endpoint | ready-for-agent |
| 04 | Build the review queue | ready-for-agent |
| 05 | Build the contributors wall | ready-for-agent |
| 06 | Build the contribute form | ready-for-agent |
| 07 | Reduce Upstash billed calls in the presence engine | completed |
| 08 | Add the expiry job and the contributor refresh workflow | ready-for-agent |
| 09 | Document the contribution flow | ready-for-agent |

## Outstanding

- **The Upstash free-tier quota is exhausted.** Every Redis command
  fails, including `PING`. The site degrades gracefully, but the live
  badge, presence tracking and the Redis rate limiter are inert until
  the monthly reset. Issue 07 reduces the burn; the quota will need
  monitoring either way.
- **The Drive credentials are not set.** `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN` must be configured
  as Cloudflare Pages environment variables before uploads work. The
  upload endpoint returns 503 until then, by design.
- **`CLEANUP_SECRET` is not set**, so the expiry sweep returns 503.
- **The Drive consent screen must be published in "Production"** or
  the refresh token expires every seven days.
