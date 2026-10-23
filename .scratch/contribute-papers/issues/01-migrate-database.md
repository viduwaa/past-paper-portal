# Migrate the database for contributions

Status: completed

## What

Apply the schema changes the contributions feature needs.

## Why

The existing `past_papers` table cannot record where a paper came from,
and it has no constraint preventing the same paper being imported twice.

Three vocabularies were in circulation for the same columns, because the
import scripts write different formats:

| Source | `academic_year` | `semester` | `course_code` |
|---|---|---|---|
| `scripts/seed.sql` | `2nd Year` | `2nd Semester` | `CMT 2301` |
| `scripts/import_papers_to_db.py` | `Second Year` | `Semester II` | `CMT- 2301` |
| `data/scraped/*.json` | `Second Year` | `Semester I` | `CMT- 2301` |

`Filters.tsx` hardcodes `["1st Semester", "2nd Semester"]` and
`lib/db.ts` compares `p.semester !== semester` exactly, so rows in the
other formats were **invisible under the semester filter**. 86 of the
rows used `ITT` with a null `department_name`, while the DB's canonical
department codes are `ICT/BPT/FDT/EET/MTT/CMT/CML/ENT`.

## What the investigation found

Two things were not knowable from the schema alone.

**The production table had no unique constraint at all** — only its
primary key. The `UNIQUE (course_code, exam_year, academic_year)` in
`database-setup.sql` was never applied to production, so the same paper
could be imported any number of times. 38 duplicate rows existed as a
result: the same paper imported through both the old DSpace scrape
(named `ELECTRONIC CIRCUITS`) and the newer Drive scrape (named
`ICT 1302 - Electronic Circuits.pdf`).

**The dedup key cannot be the subject alone.** A subject legitimately
holds several papers in one period — CMT 1205 in 2025 Semester 1 has
*both* a Written Test and an Oral Test, and the corpus also holds
Theory/Practical pairs. A key of
`(course_code, exam_year, academic_year, semester)` would forbid a
legitimate second paper. The key therefore includes `file_name`, which
distinguishes the papers of one subject from each other:

```
UNIQUE (course_code, exam_year, academic_year, semester, file_name)
```

## How

`scripts/migrate-contributions.sql` is the source of truth; run it with
`node --env-file=.env scripts/migrate-contributions.mjs`. It:

1. Adds `source`, `contributor_name` and `contributor_github` to
   `past_papers`, backfilling `source = 'official'`.
2. Normalises the vocabulary to the UI's: `Semester I` → `1st Semester`,
   `First Year` → `1st Year`, `CMT- 2301` → `CMT 2301`. The course-code
   pattern tolerates any run of spaces and an optional hyphen, because
   the corpus holds `CMT - 2215` and `MMT- 2204` as well as `CMT 2301`.
   A few typos need fixing by hand: `MMT- 2204` → `MTT 2204`,
   `BPT 2203-` → `BPT 2203`, and `MTT 2209/MTT 2309` → `MTT 2209`.
3. Moves three rows whose course code sat in `department_code`
   (`FDT1201`, `CMT1009`) to the right column, and maps the old `ITT`
   department code to `ICT`.
4. Merges the 38 duplicate rows, keeping one row per paper and
   preferring the row with a real Drive link and a populated department
   name. The superseded rows are recorded in `past_papers_merge_log`, so
   the other Drive copy is still findable.
5. Replaces the unique constraint with the five-column one.
6. Creates `paper_submissions` and `contributors` with their indexes.

The merge log carries `UNIQUE (kept_id, removed_id)` and the insert uses
`ON CONFLICT DO NOTHING`, so re-running the migration neither
duplicates nor erases the history.

`database-setup.sql` is updated to match, so a fresh install gets the
same shape.

`scripts/import_papers_to_db.py` and `scripts/generate_seed.py` are
updated to the same five-column key, in both their Python-level dedup
and their `ON CONFLICT` target — Postgres rejects an `ON CONFLICT` target
that does not match a real unique index.

## Also

- Bump the Redis cache keys in `lib/cache.ts` from `v2` to `v3`. The
  cached v2 rows predate the new columns and the normalisation, and the
  papers list is cached for 24 hours.
- Add `source`, `contributor_name` and `contributor_github` to the
  `PastPaper` interface in `lib/db.ts`.

## Done when

- `node --env-file=.env scripts/migrate-contributions.mjs` reports the
  new constraint, both new tables and the three provenance columns.
- Re-running it is a no-op. **Verified**: two consecutive runs both
  report 933 rows and 38 merges.
- Every row in `past_papers` uses the UI vocabulary. **Verified**: 0
  non-canonical course codes, 0 remaining key collisions, semesters
  split 539/394, academic years 193/368/233/139.
- The CMT 1205 Written Test and Oral Test both survive. **Verified**.
- The Semester II CMT 2301 paper, lost at seed time, is recoverable
  from the merge log or the Drive folder.
