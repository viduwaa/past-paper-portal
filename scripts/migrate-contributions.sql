-- ============================================================
-- Contributions migration: provenance, dedup key, submission queue
-- ============================================================
--
-- Run with:
--   node --env-file=.env scripts/migrate-contributions.mjs
--
-- Idempotent: safe to re-run. Every statement is guarded so a
-- second run is a no-op.
--
-- Why this migration exists
-- ------------------------
-- 1. `past_papers` had no provenance columns, so a community-contributed
--    paper was indistinguishable from a maintainer-imported one. The
--    `source` / `contributor_name` / `contributor_github` columns let the
--    papers table show who contributed each paper, and the contributors
--    wall count them.
--
-- 2. The vocabulary was inconsistent. Three import paths wrote three
--    different formats for the same columns:
--      scripts/seed.sql                 -> '1st Semester', '2nd Year', 'CMT 2301'
--      scripts/import_papers_to_db.py   -> 'Semester I', 'Second Year', 'CMT- 2301'
--      data/scraped/*.json              -> 'Semester I', 'Second Year'
--    The UI hardcodes '1st Semester'/'2nd Semester' and filters with
--    exact string equality, so rows in the other formats were invisible
--    under the semester and year filters. This migration normalises
--    every row to the UI vocabulary.
--
-- 3. The production table has NO unique constraint at all — only its
--    primary key. The `UNIQUE (course_code, exam_year, academic_year)`
--    in database-setup.sql was never applied to production, so the same
--    paper could be imported any number of times. 35 duplicate rows
--    exist as a result: the same paper imported through both the old
--    DSpace scrape (named 'ELECTRONIC CIRCUITS') and the newer Drive
--    scrape (named 'ICT 1302 - Electronic Circuits.pdf').
--
--    The key cannot be (course_code, exam_year, academic_year): a
--    subject legitimately holds several papers in one period. CMT 1205
--    in 2025 Semester 1 has BOTH a Written Test and an Oral Test, and
--    the corpus also holds Theory/Practical pairs. The key therefore
--    includes `file_name`, which distinguishes the papers of one subject
--    from each other.
--
--    The merge keeps one row per paper, preferring the row with a
--    complete department name and a real Drive link, and recording the
--    superseded Drive links so nothing is silently lost.

BEGIN;

-- ============================================================
-- 1. Provenance columns on past_papers
-- ============================================================

ALTER TABLE past_papers
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'official';

ALTER TABLE past_papers
    ADD COLUMN IF NOT EXISTS contributor_name VARCHAR(100);

ALTER TABLE past_papers
    ADD COLUMN IF NOT EXISTS contributor_github VARCHAR(39);

-- Backfill: anything predating this migration is maintainer-imported.
UPDATE past_papers
SET source = 'official'
WHERE source IS NULL OR source = '';

-- ============================================================
-- 2. Vocabulary normalisation
-- ============================================================
-- Target vocabulary is the one the UI already uses:
--   academic_year : '1st Year' | '2nd Year' | '3rd Year' | '4th Year'
--   semester      : '1st Semester' | '2nd Semester'
--   course_code   : 'ICT 1209' (single space, no hyphen)

UPDATE past_papers
SET semester = CASE semester
        WHEN 'Semester I'   THEN '1st Semester'
        WHEN 'Semester II'  THEN '2nd Semester'
        WHEN 'Semester 1'   THEN '1st Semester'
        WHEN 'Semester 2'   THEN '2nd Semester'
        WHEN '1st Sem'      THEN '1st Semester'
        WHEN '2nd Sem'      THEN '2nd Semester'
        ELSE semester
    END
WHERE semester IN ('Semester I','Semester II','Semester 1','Semester 2','1st Sem','2nd Sem');

UPDATE past_papers
SET academic_year = CASE academic_year
        WHEN 'First Year'   THEN '1st Year'
        WHEN 'Second Year'  THEN '2nd Year'
        WHEN 'Third Year'   THEN '3rd Year'
        WHEN 'Fourth Year'  THEN '4th Year'
        WHEN 'Year 1'       THEN '1st Year'
        WHEN 'Year 2'       THEN '2nd Year'
        WHEN 'Year 3'       THEN '3rd Year'
        WHEN 'Year 4'       THEN '4th Year'
        ELSE academic_year
    END
WHERE academic_year IN ('First Year','Second Year','Third Year','Fourth Year',
                        'Year 1','Year 2','Year 3','Year 4');

-- Course codes arrive in every shape a human or a scrape can produce:
--   'CMT 2301', 'CMT- 2301', 'CMT-2301', 'CMT  -  2301', 'CMT2301',
--   'MTT - 4215', 'MMT- 2204'
-- All of them mean the same subject, so they all normalise to
-- 'CMT 2301'. The pattern tolerates any run of spaces and an optional
-- hyphen between the prefix and the number.
UPDATE past_papers
SET course_code = regexp_replace(
        btrim(course_code),
        '^([A-Za-z]{2,4})\s*-?\s*(\d{3,4})$',
        '\1 \2'
    )
WHERE course_code ~ '^[A-Za-z]{2,4}\s*-?\s*\d{3,4}$';

-- A handful of codes carry a typo that no pattern can fix on its own:
-- 'MMT- 2204' should be 'MTT 2204' (the MMT prefix belongs to no
-- department in this catalogue), and a trailing hyphen survives the
-- scrape ('BPT 2203-'). Fix the known typos, then normalise the rest.
UPDATE past_papers SET course_code = 'MTT 2204' WHERE course_code = 'MMT 2204';
UPDATE past_papers SET course_code = 'BPT 2203' WHERE course_code = 'BPT 2203-';
UPDATE past_papers SET course_code = 'MTT 2207' WHERE course_code = 'MTT 2207 -';

-- One row holds a combined code for a paper that covers two subjects
-- ('MTT 2209/MTT 2309' — Introduction to Polymer Technology (Repeat)).
-- The key needs a single subject, so the first code is used and the
-- full code is kept in the name.
UPDATE past_papers
SET course_code = 'MTT 2209'
WHERE course_code = 'MTT 2209/MTT 2309';

UPDATE past_papers
SET department_name = 'Common - CMT'
WHERE department_code = 'CMT' AND (department_name IS NULL OR department_name = '');

UPDATE past_papers
SET department_name = 'Complementary - CML'
WHERE department_code = 'CML' AND (department_name IS NULL OR department_name = '');

-- 'ITT' is the old name for what the catalogue now calls 'ICT'. The
-- filter layer already treats them as aliases, so the rows stay
-- reachable either way, but the canonical value is used for new rows.
UPDATE past_papers
SET department_code = 'ICT'
WHERE department_code = 'ITT';

UPDATE past_papers
SET department_name = 'Information Communication Technology - ICT'
WHERE department_code = 'ICT' AND (department_name IS NULL OR department_name = '');

-- Three rows carry a course code in the department_code column
-- ('FDT1201', 'CMT1009') because the scrape put it in the wrong field.
-- Move the code to course_code and give the row its real department.
UPDATE past_papers
SET course_code = 'FDT 1201', department_code = 'FDT',
    department_name = 'Food Technology - FDT'
WHERE department_code = 'FDT1201';

UPDATE past_papers
SET course_code = 'CMT 1009', department_code = 'CMT',
    department_name = 'Common - CMT'
WHERE department_code = 'CMT1009';

-- ============================================================
-- 3. Merge the duplicate rows
-- ============================================================
-- The same paper was imported through more than one pipeline. Keep one
-- row per paper and record the superseded rows, so nothing is lost and
-- a reviewer can find the other Drive copy.
--
-- The survivor is the row a student is most likely to want:
--   1. a real Drive link over an empty one
--   2. a populated department name over a null one
--   3. the lowest id, for a stable result
CREATE TABLE IF NOT EXISTS past_papers_merge_log (
    id SERIAL PRIMARY KEY,
    kept_id INTEGER NOT NULL,
    removed_id INTEGER NOT NULL,
    course_code VARCHAR(50),
    exam_year VARCHAR(10),
    academic_year VARCHAR(50),
    semester VARCHAR(50),
    file_name VARCHAR(500),
    removed_view_url TEXT,
    removed_department_name VARCHAR(200),
    merged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- A merge is recorded once. Re-running the migration must not
    -- duplicate the history, and must not erase it either.
    UNIQUE (kept_id, removed_id)
);

-- The table may predate the unique constraint if an earlier version of
-- this migration created it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'past_papers_merge_log'
          AND con.contype = 'u'
    ) THEN
        ALTER TABLE past_papers_merge_log
            ADD CONSTRAINT past_papers_merge_log_unique
            UNIQUE (kept_id, removed_id);
    END IF;
END
$$;

-- Pass 1: record every duplicate against the survivor of its group.
-- A group can hold more than two rows (CMT 2301 2025 has three), so the
-- ranking is over the whole group and every row after the first is
-- recorded — not just the second.
WITH ranked AS (
    SELECT
        id,
        course_code,
        exam_year,
        academic_year,
        semester,
        file_name,
        view_url,
        department_name,
        ROW_NUMBER() OVER (
            PARTITION BY
                COALESCE(course_code, ''),
                COALESCE(exam_year, ''),
                COALESCE(academic_year, ''),
                COALESCE(semester, ''),
                COALESCE(file_name, '')
            ORDER BY
                -- a real Drive link beats an empty one
                (CASE WHEN view_url IS NOT NULL AND view_url <> '' THEN 0 ELSE 1 END),
                -- a populated department name beats a null one
                (CASE WHEN department_name IS NOT NULL AND department_name <> '' THEN 0 ELSE 1 END),
                id
        ) AS rn
    FROM past_papers
)
INSERT INTO past_papers_merge_log (
    kept_id, removed_id, course_code, exam_year, academic_year,
    semester, file_name, removed_view_url, removed_department_name
)
SELECT
    keeper.id,
    dupe.id,
    dupe.course_code, dupe.exam_year, dupe.academic_year,
    dupe.semester, dupe.file_name, dupe.view_url, dupe.department_name
FROM ranked dupe
JOIN ranked keeper
    ON keeper.rn = 1
   AND COALESCE(keeper.course_code, '')  = COALESCE(dupe.course_code, '')
   AND COALESCE(keeper.exam_year, '')    = COALESCE(dupe.exam_year, '')
   AND COALESCE(keeper.academic_year, '') = COALESCE(dupe.academic_year, '')
   AND COALESCE(keeper.semester, '')      = COALESCE(dupe.semester, '')
   AND COALESCE(keeper.file_name, '')     = COALESCE(dupe.file_name, '')
WHERE dupe.rn > 1
ON CONFLICT (kept_id, removed_id) DO NOTHING;

-- Pass 2: a survivor may have no Drive link of its own while a removed
-- row has one. Adopt a removed row's link in that case, so no paper is
-- left without a URL.
UPDATE past_papers p
SET view_url = COALESCE(p.view_url, log.removed_view_url)
FROM (
    SELECT DISTINCT ON (kept_id) kept_id, removed_view_url
    FROM past_papers_merge_log
    WHERE removed_view_url IS NOT NULL AND removed_view_url <> ''
    ORDER BY kept_id, removed_id
) log
WHERE log.kept_id = p.id
  AND (p.view_url IS NULL OR p.view_url = '');

-- Pass 3: remove the losers.
DELETE FROM past_papers
WHERE id IN (SELECT removed_id FROM past_papers_merge_log);


-- ============================================================
-- 4. The dedup key
-- ============================================================
-- A subject may hold several papers in one period (CMT 1205 2025 Sem 1
-- has both a Written Test and an Oral Test), so the file name is part
-- of the key. Without it the constraint would forbid a legitimate
-- second paper.
--
-- The key is dropped and re-added so a pre-existing constraint with
-- different columns cannot block the change.
DO $$
DECLARE
    old_constraint TEXT;
BEGIN
    SELECT con.conname INTO old_constraint
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'past_papers'
      AND con.contype = 'u'
      AND (
          SELECT array_agg(att.attname::text ORDER BY ord.ord)
          FROM unnest(con.conkey) WITH ORDINALITY AS ord(attnum, ord)
          JOIN pg_attribute att
            ON att.attrelid = con.conrelid AND att.attnum = ord.attnum
      ) <> ARRAY['course_code','exam_year','academic_year','semester','file_name']
    LIMIT 1;

    IF old_constraint IS NOT NULL THEN
        EXECUTE format('ALTER TABLE past_papers DROP CONSTRAINT %I', old_constraint);
        RAISE NOTICE 'Dropped unique constraint %', old_constraint;
    END IF;
END
$$;

ALTER TABLE past_papers
    DROP CONSTRAINT IF EXISTS past_papers_unique_paper;

ALTER TABLE past_papers
    ADD CONSTRAINT past_papers_unique_paper
    UNIQUE (course_code, exam_year, academic_year, semester, file_name);

-- Index supporting the contributors-wall aggregation.
CREATE INDEX IF NOT EXISTS idx_papers_source ON past_papers(source);
CREATE INDEX IF NOT EXISTS idx_papers_contributor_github
    ON past_papers(contributor_github) WHERE contributor_github IS NOT NULL;

-- ============================================================
-- 5. Pending submission queue
-- ============================================================
-- A Paper Submission is a proposed contribution awaiting review. It only
-- becomes a Paper (a past_papers row) once approved.
CREATE TABLE IF NOT EXISTS paper_submissions (
    id SERIAL PRIMARY KEY,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected')),

    -- Drive coordinates. view_url/preview_url are stored so the admin
    -- queue can render a preview without an extra Drive round-trip.
    drive_file_id VARCHAR(128) NOT NULL,
    drive_folder_id VARCHAR(128),
    view_url TEXT NOT NULL,
    preview_url TEXT NOT NULL,

    file_name VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,

    -- Paper metadata, mirrors the past_papers vocabulary exactly.
    department_code VARCHAR(10),
    department_name VARCHAR(200),
    academic_year VARCHAR(50),
    semester VARCHAR(50),
    exam_year VARCHAR(10),
    course_code VARCHAR(50),
    course_name VARCHAR(500),

    -- Attribution. Both optional: anonymous submissions are allowed.
    contributor_name VARCHAR(100),
    contributor_github VARCHAR(39),

    notes TEXT,

    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(100),

    -- Salted hash of the submitter's IP. The raw IP is never stored.
    ip_hash CHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_paper_submissions_status
    ON paper_submissions(status, submitted_at DESC);

-- Partial index for the 30-day expiry sweep: only pending rows are
-- ever considered, so the index stays small.
CREATE INDEX IF NOT EXISTS idx_paper_submissions_expiry
    ON paper_submissions(submitted_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_paper_submissions_github
    ON paper_submissions(contributor_github) WHERE contributor_github IS NOT NULL;

-- Upload attempts, counted separately from submissions.
--
-- The Redis limiter stops a burst, but it fails open when Redis is
-- unreachable — and the free tier's 500K command quota is easy to
-- exhaust, which makes "Redis is down" a normal state rather than an
-- emergency. Counting attempts here means a failed upload still
-- consumes quota, so an outage cannot be used to hammer the Drive API.
CREATE TABLE IF NOT EXISTS paper_submission_attempts (
    id SERIAL PRIMARY KEY,
    ip_hash CHAR(64) NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    succeeded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_paper_submission_attempts_ip_time
    ON paper_submission_attempts(ip_hash, attempted_at DESC);

-- ============================================================
-- 6. Contributor identity
-- ============================================================
-- A Contributor is a person recognised by the portal. The GitHub login
-- is the join key between paper contributions and code contributions;
-- a contributor with no login still gets a row keyed by display name.
CREATE TABLE IF NOT EXISTS contributors (
    id SERIAL PRIMARY KEY,
    github_login VARCHAR(39) UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contributors_github
    ON contributors(github_login);

CREATE INDEX IF NOT EXISTS idx_contributors_display_name
    ON contributors(display_name);

COMMIT;
