# Build the public upload endpoint

Status: ready-for-agent

## What

`POST /api/contribute` accepts a PDF plus its metadata and creates a
pending Paper Submission.

## Why

The upload endpoint is the only route in the app that a stranger can
call, and it writes to a shared Drive account. It needs to be cheap to
abuse and impossible to use to inject content.

## How

`app/api/contribute/route.ts`, edge runtime, `multipart/form-data`.

Defence in depth, cheapest check first:

1. **Rate limit** — a dedicated `uploadRatelimit` in `lib/ratelimit.ts`
   (5 per 24 h per IP, own prefix so upload traffic cannot consume the
   browsing budget). Fails open on a Redis error, because a Redis outage
   must not block every contribution.
2. **Authoritative daily count** — `countSubmissionsToday` in
   `lib/submissions.ts` counts rows in Postgres. Redis is the fast path;
   Postgres is the limit that survives a Redis wipe.
3. **Size cap** — 10 MB, checked from `Content-Length` before the body is
   parsed, and again on the file itself. Cloudflare's own limit is 100 MB,
   so the cap has to be ours.
4. **PDF magic bytes** — `isPdfFile` checks the first five bytes are
   `%PDF-`. The declared MIME type and the filename extension are
   attacker-controlled; the header is not.
5. **Metadata whitelist** — every field is checked against the
   catalogue's own values via `Database.getFilterOptions()` and
   `Database.getExamYears()`. A contributor cannot invent a department or
   year that no student will ever filter for.

`lib/submissions.ts` holds the pure validation helpers so they can be
tested without a database or a Drive account:
`validateSubmission`, `normaliseCourseCode`, `isPdfFile`,
`buildFileName`, `hashIp`.

## Constraints

- The submitter's IP is stored only as a salted SHA-256 hash
  (`SUBMISSIONS_PEPPER`). The raw IP is never written.
- `buildFileName` derives the stored name from the validated metadata,
  never from the uploaded filename, so a contributor cannot inject path
  separators or control characters.
- The file is uploaded to Drive **before** the row is inserted, so a row
  never references a file that does not exist. The trade-off is that a
  failed insert leaves an orphan file in the Pending folder, which the
  expiry sweep collects.
- Do not hash the whole file. The 10 ms CPU budget is for the entire
  request, and hashing is not free.

## Done when

- A valid PDF creates a pending submission and returns 201.
- A 12 MB file is rejected with 413.
- A `.pdf` file that is not a PDF is rejected with 400.
- An unknown department is rejected with 400 and a readable message.
- The sixth submission in a day is rejected with 429.
