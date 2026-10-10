// One-off migration: create the permanent stats mirror tables in the
// Postgres/Neon database that POSTGRES_URL points at.
// Run: node --env-file=.env scripts/migrate-pstats-daily.mjs
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

const STATS_SETUP = `
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
`;

await sql.unsafe(STATS_SETUP);

// Verify
const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_name IN ('pstats_daily', 'pstats_meta')
`;
console.log(
    "pstats tables present:",
    tables.map((t) => t.table_name).sort().join(", ") || "NONE",
);

const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'pstats_daily' ORDER BY ordinal_position
`;
console.log(
    "pstats_daily columns:",
    cols.map((c) => c.column_name).join(", "),
);

await sql.end();
