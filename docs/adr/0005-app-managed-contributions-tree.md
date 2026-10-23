# The app owns its own Drive folder tree

Community-contributed papers are filed into an app-managed
**Contributions Tree**, separate from the legacy folder tree that holds
the maintainer-imported papers.

The reason is the `drive.file` scope: it grants access only to files the
app created or that a user shared with it through the Picker. The app
cannot write into the legacy tree, because it never created those files
and nobody shared them with it.

The alternative — broadening the scope to `drive` — is a restricted scope
requiring a full OAuth verification and, if restricted-scope data is
stored server-side, a security assessment. That is a disproportionate
cost for a student project.

## Consequences

- The portal's Drive storage has two parallel trees. The legacy tree is
  untouched and keeps its existing share links; contributed papers get
  their own.
- Folder IDs are created on demand and cached in Redis, so repeated
  approvals do not re-create them or spend Drive list quota (100 units
  per `files.list` call).
