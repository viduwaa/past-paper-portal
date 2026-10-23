# Integrate Google Drive

Status: ready-for-agent

## What

`lib/drive.ts`: OAuth refresh-token handling plus the Drive calls the
contribution flow needs.

## Why

Files are relayed through the server, so the server needs write access to
Drive. A service account cannot do this — service accounts created after
2025-04-15 have **zero storage quota**, so `files.create` against their
own My Drive fails with `storageQuotaExceeded`. A service account can only
own files inside a shared drive, which needs a Workspace organisation.

With an OAuth refresh token and the `drive.file` scope, the app creates
files in the account's Drive. `drive.file` is a non-sensitive scope, so
only basic app verification is required.

## How

`lib/drive.ts` exposes:

- `uploadPaper(file, { name, folderSegments })` — uploads into a folder
  path, creating the folders on demand. Files up to 5 MB use a single
  `uploadType=multipart` request; larger files use the resumable
  protocol (init, then one `PUT` of the bytes).
- `fileApprovedPaper(target)` — moves the file into the Contributions
  tree, renames it, and shares it.
- `fileRejectedPaper(fileId)` — moves the file into the Rejected folder.
- `sharePaper(fileId)` — grants `type: domain`, `role: reader`,
  `domain: tec.rjt.ac.lk`. Falls back to `type: anyone` if the account
  rejects domain sharing, and reports which path was taken so the
  fallback is never silent.
- `shareFolderWithUsers(folderId, emails)` — shares the Pending folder
  with the reviewers.
- `resolveFolder(segments)` — folder path → folder id, cached in Redis
  under `drive:folder:<path>` for 24 hours. `files.list` costs 100 quota
  units, so the cache matters.

## Constraints

- Hand-rolled `fetch` calls, **not** the `googleapis` npm package. The
  SDK is Node-oriented and would bloat the Worker bundle, which is capped
  at 64 MiB. Only three endpoints are needed.
- `process.env` resolves at runtime on Pages, so the credentials can be
  environment variables rather than build-time constants.
- The access token is cached in Redis for 50 minutes, with a per-isolate
  memo so the common case costs no Redis command.
- **The consent screen must be in `Production` status.** An app in
  `Testing` is issued refresh tokens that expire after 7 days, which
  breaks uploads silently.

## Done when

- `uploadPaper` puts a file in the Pending folder and returns its id and
  links.
- `sharePaper` returns `"domain"` on a Workspace account.
- No Node-only APIs are used, so the code still runs on the edge.
