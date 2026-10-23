# Paper submissions are reviewed before they publish

A Paper Submission never enters the published catalogue on arrival. It is
stored with `status = 'pending'` and becomes a Paper only when a reviewer
approves it.

Without this, anyone could publish arbitrary content to the portal and
attach their name to it, and the Drive quota the portal depends on would
be open to abuse by anonymous uploaders.

The review surface is `/admin`, protected by Cloudflare Access rather than
by application-level credentials — the portal has no user accounts, so
there is nothing to log in with. The application's own handlers still
verify the Access assertion header as defence in depth.

## Consequences

- Contributors see a delay between submitting and appearing in the
  catalogue.
- Rejected submissions keep their file in a **Rejected Folder** for
  inspection, so a wrong rejection can be reversed.
- Approval is the only path that writes to `past_papers`, which keeps the
  `source` and `contributor_*` columns trustworthy.
