# Build the review queue

Status: ready-for-agent

## What

`/admin` — the list of pending Paper Submissions, with approve and reject
actions.

## Why

Submissions never publish on their own. Without a review step, anyone
could publish arbitrary content to the portal and attach their name to
it, and the Drive quota the portal depends on would be open to abuse by
anonymous uploaders.

## How

**`lib/admin-auth.ts`** — the guard. The portal has no user accounts, so
the queue is protected by Cloudflare Access rather than by application
credentials. `getAdminIdentity` requires both
`CF-Access-Authenticated-User-Email` and `CF-Access-Jwt-Assertion`.
Cloudflare strips those headers from incoming requests, so a client cannot
forge them, and requiring both means a misconfigured Access application
that forwards only one does not unlock the queue.

**`app/api/admin/submissions/route.ts`** — `GET` the queue.

**`app/api/admin/submissions/[id]/route.ts`** — `POST` with
`{ action: "approve" | "reject" }`.

- Approve: file the PDF into the Contributions tree, share it, publish it
  to the catalogue, and **invalidate the cached paper list** — it is
  cached for 24 hours, so without that the new paper would not appear
  for a day.
- Reject: move the file into the Rejected folder.

**`app/_components/AdminQueue.tsx`** — the queue UI.

**`app/admin/page.tsx`** — the page, with `robots: { index: false }`.

## Constraints

- The Drive work happens **before** the database write. A Drive failure
  must not leave a published row pointing at an unshared file.
- The catalogue insert and the status flip are one statement, using a
  data-modifying CTE. `@vercel/postgres` exposes no transaction API, and
  a CTE gives the same atomicity in a single round trip. The insert is
  `ON CONFLICT DO NOTHING`, so re-approving a duplicate cannot create a
  second row.
- Approval must invalidate the Redis papers cache — see
  `invalidatePapersCache` in `lib/cache.ts`.

## Done when

- An unauthenticated request to `/api/admin/submissions` gets 401.
- An approved submission appears in the catalogue immediately.
- An approved file opens in Drive from a `tec.rjt.ac.lk` account and is
  refused from outside the domain.
- A rejected file lands in the Rejected folder and is absent from the
  catalogue.
