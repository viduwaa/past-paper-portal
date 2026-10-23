# Add the expiry job and the contributor refresh workflow

Status: ready-for-agent

## What

Two GitHub Actions workflows, and the cleanup endpoint they call.

## Why

Pending submissions must not sit in Drive forever, and contributor counts
must stay current without the app ever calling the GitHub API.

## How

**`app/api/admin/cleanup/route.ts`** — `POST`, expiring pending
submissions older than 30 days. Their files move to the Rejected folder,
matching the manual rejection path, and the rows flip to `rejected` with
`reviewed_by = 'auto-expiry'`.

The endpoint is protected by a shared secret rather than by Cloudflare
Access, because a scheduled job cannot present an Access session.
`secretsMatch` in `lib/admin-auth.ts` compares in constant time.

**`.github/workflows/cleanup-submissions.yml`** — daily at 03:17 UTC, and
on manual dispatch. Deliberately off the hour, since every workflow at
`:00` competes for the same runner pool. Needs the `CLEANUP_SECRET`
secret and the `SITE_URL` repository variable.

**`.github/workflows/refresh-contributors.yml`** — daily, running
`scripts/fetch-contributors.mjs` and opening a pull request when
`data/github-contributors.json` changes. The portal's own build picks it
up on merge.

## Constraints

- The cleanup must never abort halfway. A Drive failure on one
  submission is logged and that row is left pending for the next run.
- The refresh workflow must not fail the build when the GitHub API is
  unreachable: the script exits non-zero, so the workflow step should
  tolerate it and the committed file should remain the fallback.
- Both workflows need `permissions: contents: write` and
  `pull-requests: write` for the refresh job.

## Done when

- `POST /api/admin/cleanup` with the right secret expires a 31-day-old
  submission and returns `{"expired": 1}`.
- The same call without the secret returns 401.
- The refresh workflow opens a pull request when the contributor data
  changes and does nothing when it does not.
