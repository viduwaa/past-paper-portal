# FOT Past Papers Portal

The portal for browsing Rajarata University Faculty of Technology past
examination papers, and for the community that contributes them.

## Language

### Papers

**Paper**:
A past examination paper that is published on the portal. A Paper is
identified by its subject code, the year of the exam, the year of study it
belongs to, and the semester it was sat in.
_Avoid_: Contribution, Submission, Document

**Study Year**:
The year of the degree programme a paper belongs to, written `1st Year`
through `4th Year`. Distinct from the **Exam Year**.
_Avoid_: Academic Year, Year, Level

**Exam Year**:
The calendar year the examination was sat, written as a four-digit year.
_Avoid_: Past Paper Year, Year, Study Year

**Semester**:
Which half of the academic year a paper was sat in, written `1st Semester`
or `2nd Semester`. A subject is examined in both semesters, so a subject
code alone does not identify a Paper.
_Avoid_: Term, Session, Half

**Department**:
The academic department that owns a paper, identified by a short code such
as `ICT` or `MTT`. Some codes (`CMT`, `CML`) denote subjects common to all
departments rather than a department of their own.
_Avoid_: Faculty, Programme, Branch

**Subject Code**:
The code identifying the subject a paper examines, such as `ICT 1209`.
_Avoid_: Course Code, Paper Code, Module Code

**Subject Name**:
The human-readable title of a subject, such as `Web Technologies`.
_Avoid_: Course Name, Title, Paper Name

**Official Paper**:
A Paper sourced by a maintainer from the university's own repository.
_Avoid_: Original, Seeded, Imported

### Contributions

**Paper Submission**:
A community member's proposed Paper, awaiting review. A Paper Submission
holds the uploaded file and the metadata describing it, but is not part of
the published catalogue until it is approved.
_Avoid_: Paper, Contribution, Upload, Request

**Approved**:
A Paper Submission that a reviewer has accepted. On approval the
Submission becomes a Paper and enters the published catalogue.
_Avoid_: Accepted, Published, Live

**Rejected**:
A Paper Submission a reviewer has declined. The file is retained for
inspection but never becomes a Paper.
_Avoid_: Denied, Refused, Deleted

**Contributor**:
A person recognised by the portal, identified by their GitHub login when
they have one and by their display name otherwise. A Contributor may have
made Paper contributions, code contributions, or both.
_Avoid_: User, Member, Author, Student

**Contribution**:
One act of giving to the project. A Contribution is either a **Paper
Contribution** (an approved Paper Submission) or a **Code Contribution** (a
merged pull request).
_Avoid_: Submission, Credit, Entry

**Paper Contribution**:
A Contribution consisting of an approved Paper Submission, credited to the
Contributor who submitted it.
_Avoid_: Upload, Attachment, Donation

**Code Contribution**:
A Contribution consisting of a merged pull request, credited to its GitHub
author. Tracked from the repository's commit history rather than recorded
in the database.
_Avoid_: Commit, Pull Request, Change

**Contributors Wall**:
The page that lists every Contributor and the Contributions they have made.
_Avoid_: Credits, Hall of Fame, Leaderboard

**Display Name**:
The name a Contributor is shown under, supplied by the Contributor
themselves when they make a Paper Submission. Not verified, and not
necessarily their legal name.
_Avoid_: Full Name, Real Name, Username

**GitHub Login**:
A Contributor's GitHub username, used to join Paper Contributions to Code
Contributions. Optional.
_Avoid_: Username, Handle, GitHub Handle

### Storage

**Drive Folder**:
A folder in the Google Drive account that holds the portal's papers.
_Avoid_: Directory, Bucket, Folder

**Contributions Tree**:
The app-managed Drive folder structure that community-contributed Papers
are filed into, separate from the legacy folder tree that holds Official
Papers.
_Avoid_: Upload Folder, New Folder, Submissions

**Pending Folder**:
The Drive folder holding uploaded files that have not yet been approved.
Shared with reviewers so they can preview submissions.
_Avoid_: Inbox, Staging, Queue

**Rejected Folder**:
The Drive folder holding files from rejected Paper Submissions, retained
for inspection.
_Avoid_: Trash, Bin, Spam
