# Build the contributors wall

Status: ready-for-agent

## What

`/contributors` — every contributor, with their paper and commit counts.

## Why

Contributing is invisible without credit. The wall is what turns a
one-off upload into recognition.

## How

**Two sources, merged.**

*Code contributions* come from `data/github-contributors.json`, baked at
build time by `scripts/fetch-contributors.mjs`. The GitHub API allows
only 60 requests per hour per IP unauthenticated, so a wall that polled
it would eventually be rate-limited into showing nothing — and every
visitor would burn part of that budget.

*Paper contributions* come from Neon: approved rows in `past_papers`
where `source = 'contributed'`, grouped by contributor.

**`lib/wall.ts`** merges them. A contributor with a GitHub login is
keyed by that login, so someone who uploaded papers and also wrote code
appears as one card with both counts. A contributor with no login keeps
their display name. Fully anonymous contributions aggregate into a single
"Anonymous" card.

**`app/contributors/page.tsx`** is a server component, so the read path
costs no Redis command and no client fetch. `revalidate = 3600` — the
wall changes only when a submission is approved or the repository moves.

**`app/_components/ContributorWall.tsx`** renders the cards.

## Constraints

- No runtime GitHub API call, ever.
- The wall must not break if the baked file is missing or empty: it
  renders the paper contributors alone.
- Contributor names are user-supplied. React escapes them by default;
  the database column is capped at 100 characters.

## Done when

- A GitHub contributor with no papers appears with a commit count.
- Someone who uploaded a paper and gave their GitHub username appears as
  one card with both counts.
- An anonymous submission appears under a single Anonymous card.
- The page renders without any Redis command.
