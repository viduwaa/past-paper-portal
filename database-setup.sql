-- Create the website_feedback table
CREATE TABLE IF NOT EXISTS website_feedback (
    id SERIAL PRIMARY KEY,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    browser_id VARCHAR(255) NOT NULL UNIQUE,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on browser_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_website_feedback_browser_id ON website_feedback(browser_id);

-- Create an index on timestamp for faster ordering
CREATE INDEX IF NOT EXISTS idx_website_feedback_timestamp ON website_feedback(timestamp DESC);

-- ============================================================
-- Past Papers Table
-- ============================================================
CREATE TABLE IF NOT EXISTS past_papers (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(500) NOT NULL,
    view_url TEXT NOT NULL,
    preview_url TEXT NOT NULL,
    department_code VARCHAR(10),
    department_name VARCHAR(200),
    academic_year VARCHAR(50),
    semester VARCHAR(50),
    exam_year VARCHAR(10),
    course_code VARCHAR(50),
    course_name VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Provenance: 'official' = imported by a maintainer, 'contributed' =
    -- submitted by a community member and approved. NULL contributor
    -- columns mean the paper predates the contributions feature.
    source VARCHAR(20) NOT NULL DEFAULT 'official',
    contributor_name VARCHAR(100),
    contributor_github VARCHAR(39),
    -- Prevent exact duplicates during import. The file name is part of
    -- the key because one subject legitimately holds several papers in a
    -- single period (CMT 1205 2025 Semester 1 has both a Written Test
    -- and an Oral Test) — see scripts/migrate-contributions.sql.
    UNIQUE (course_code, exam_year, academic_year, semester, file_name)
);

-- Indexes for fast lookups and filtering
CREATE INDEX IF NOT EXISTS idx_papers_dept ON past_papers(department_code);
CREATE INDEX IF NOT EXISTS idx_papers_year ON past_papers(exam_year);
CREATE INDEX IF NOT EXISTS idx_papers_course ON past_papers(course_code);
CREATE INDEX IF NOT EXISTS idx_papers_semester ON past_papers(semester);
CREATE INDEX IF NOT EXISTS idx_papers_source ON past_papers(source);
CREATE INDEX IF NOT EXISTS idx_papers_contributor_github
    ON past_papers(contributor_github) WHERE contributor_github IS NOT NULL;

-- ============================================================
-- Paper Submissions (community contribution queue)
-- ============================================================
-- A Paper Submission is a proposed contribution awaiting review. It
-- becomes a Paper (a past_papers row) only once approved.
CREATE TABLE IF NOT EXISTS paper_submissions (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected')),
    drive_file_id VARCHAR(128) NOT NULL,
    drive_folder_id VARCHAR(128),
    view_url TEXT NOT NULL,
    preview_url TEXT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    department_code VARCHAR(10),
    department_name VARCHAR(200),
    academic_year VARCHAR(50),
    semester VARCHAR(50),
    exam_year VARCHAR(10),
    course_code VARCHAR(50),
    course_name VARCHAR(500),
    contributor_name VARCHAR(100),
    contributor_github VARCHAR(39),
    notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(100),
    ip_hash CHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_paper_submissions_status
    ON paper_submissions(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_paper_submissions_expiry
    ON paper_submissions(submitted_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_paper_submissions_github
    ON paper_submissions(contributor_github) WHERE contributor_github IS NOT NULL;

-- ============================================================
-- Contributors (wall identity)
-- ============================================================
-- A Contributor is a person recognised by the portal. The GitHub login
-- is the join key between paper contributions and code contributions.
CREATE TABLE IF NOT EXISTS contributors (
    id SERIAL PRIMARY KEY,
    github_login VARCHAR(39) UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contributors_github ON contributors(github_login);
CREATE INDEX IF NOT EXISTS idx_contributors_display_name ON contributors(display_name);

-- ============================================================
-- Permanent stats mirror (Neon/Postgres) — see STATS-PLAN.md
-- ============================================================

-- Daily usage snapshot. Populated lazily (no cron): every
-- /api/stats/history request upserts the Redis days it reads,
-- so values are frozen in Postgres before the 90-day TTL
-- erases them from Redis. Merges are monotonic (GREATEST) so
-- repeated snapshots of an in-progress day never lose ground.
CREATE TABLE IF NOT EXISTS pstats_daily (
    day DATE PRIMARY KEY,
    views INTEGER NOT NULL DEFAULT 0,
    uniques INTEGER NOT NULL DEFAULT 0,
    peak INTEGER NOT NULL DEFAULT 0,
    opens INTEGER NOT NULL DEFAULT 0,
    departments JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ship cumulative counters out of Redis only (all-time peak,
-- total opens): one row per counter, monotonic merges.
CREATE TABLE IF NOT EXISTS pstats_meta (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pstats_daily_day_desc
    ON pstats_daily (day DESC);
