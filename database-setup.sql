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
    -- Prevent exact duplicates during import
    UNIQUE (course_code, exam_year, academic_year)
);

-- Indexes for fast lookups and filtering
CREATE INDEX IF NOT EXISTS idx_papers_dept ON past_papers(department_code);
CREATE INDEX IF NOT EXISTS idx_papers_year ON past_papers(exam_year);
CREATE INDEX IF NOT EXISTS idx_papers_course ON past_papers(course_code);
CREATE INDEX IF NOT EXISTS idx_papers_semester ON past_papers(semester);

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
