# Document the contribution flow

Status: ready-for-agent

## What

Document the feature for contributors and for maintainers, and record the
decisions in the domain docs.

## Why

The upload flow needs one-time setup that is not discoverable from the
code — a Google Cloud project, a consent screen in the right status, a
refresh token, four environment variables. A maintainer who misses the
"Production" status step will find uploads silently failing after seven
days.

## How

**`README.md`** — rewrite the "Adding New Past Papers" section. It
currently describes the old flow (upload to Drive yourself, open an
issue). The new section covers the Contribute page, the review step, the
optional attribution, and the limits. Add a "Maintainer setup"
subsection listing the Google Cloud steps, the three Drive environment
variables, `CLEANUP_SECRET`, `SUBMISSIONS_PEPPER`, and how to run the
migration.

**`GLOSSARY.md`** — the domain vocabulary: Paper, Paper Submission,
Approved, Rejected, Contributor, Contribution, Paper Contribution, Code
Contribution, Contributors Wall, Display Name, GitHub Login, Study Year,
Exam Year, Semester, Department, Subject Code, Subject Name, plus the
Drive folder terms.

**`docs/adr/`** — the five decisions that are hard to reverse:

- `0001-drive-oauth-over-service-account.md` — service accounts have zero
  Drive storage quota.
- `0002-approval-queue-before-publish.md` — submissions never auto-publish.
- `0003-domain-restricted-drive-sharing.md` — `type=domain` for
  `tec.rjt.ac.lk`.
- `0004-upstash-bills-eval-internals.md` — Redis scripts are budgeted in
  billed calls, not requests.
- `0005-app-managed-contributions-tree.md` — the app owns its own tree.

**`.scratch/contribute-papers/spec.md`** and the issue files under
`.scratch/contribute-papers/issues/` — the spec and the tracked work.

**`docs/agents/domain.md`** already describes where these live, so
nothing there needs changing.

## Constraints

- The ADRs explain *why*, not *what*. A reader should not need the
  issue tracker to understand them.
- The glossary holds domain terms only. No implementation detail, no
  general programming vocabulary.
- `AGENTS.md` already points at `GLOSSARY.md` and `docs/adr/`, so no
  change there.

## Done when

- A maintainer can follow the README from an empty database to a working
  upload form.
- Every term in the new UI appears in `GLOSSARY.md`.
- Each ADR explains a decision a future reader would otherwise question.
