# Drive files are shared with the university domain, not the public

Approved papers are shared with `type: 'domain'`, `role: 'reader'`,
`domain: 'tec.rjt.ac.lk'` rather than `type: 'anyone'`.

The portal's existing papers are already restricted to that domain, and the
README warns that many of them can only be viewed with a valid
tec.rjt.ac.lk address. Matching that behaviour keeps a newly contributed
paper no more exposed than the ones already published, and a paper scanned
by a student often carries their own name and index number.

## Consequences

- Students without a university address cannot read contributed papers.
- The Drive account must be a Google Workspace account for domain sharing
  to be accepted. If it is not, the code falls back to `type: 'anyone'`
  and logs the fallback, so the failure is visible rather than silent.
