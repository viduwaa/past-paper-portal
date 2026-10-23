# Drive access via OAuth refresh token, not a service account

Google Drive service accounts created after 2025-04-15 have zero storage
quota, so `files.create` against their own My Drive fails with
`storageQuotaExceeded`. A service account can only own files inside a
shared drive, and shared drives require a Google Workspace organisation
and separate sharing setup.

The portal instead authenticates as a real user via an OAuth 2.0 refresh
token with the `drive.file` scope, which is a non-sensitive scope and
therefore needs only basic app verification. The refresh token is held as
a Cloudflare Pages environment variable and exchanged for short-lived
access tokens on demand.

The OAuth consent screen must be published in **Production** status: an
app left in **Testing** is issued refresh tokens that expire after seven
days, which would silently break uploads.

## Consequences

- The app can only reach files it created, or files a user shared with it.
  It therefore maintains its own **Contributions Tree** rather than writing
  into the legacy folder tree that holds the maintainer-imported papers.
- Rotating the Drive password invalidates the refresh token and the
  authorisation flow must be repeated.
