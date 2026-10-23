// One-off migration runner for the contributions feature.
// Run: node --env-file=.env scripts/migrate-contributions.mjs
//
// Executes scripts/migrate-contributions.sql against the Neon database
// that POSTGRES_URL points at, then verifies the resulting schema.
// The SQL file is the source of truth; this script only runs and checks it.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
const sqlFile = join(here, "migrate-contributions.sql");

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

const migration = await readFile(sqlFile, "utf8");

try {
    // No parameters => simple query protocol => the whole file, including
    // the DO $$ blocks and BEGIN/COMMIT, runs as one transaction.
    await sql.unsafe(migration);
    console.log("Migration applied.");
} catch (error) {
    console.error("Migration FAILED (transaction rolled back):");
    console.error(error.message);
    process.exitCode = 1;
}

if (!process.exitCode) {
    // Verify the new constraint and the vocabulary normalisation.
    const constraint = await sql`
        SELECT conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'past_papers' AND con.contype = 'u'
    `;
    console.log("past_papers unique constraints:", constraint.map((c) => c.conname).join(", "));

    const vocab = await sql`
        SELECT semester, count(*)::int AS n
        FROM past_papers GROUP BY 1 ORDER BY 1
    `;
    console.log("semester values:", vocab.map((v) => `${v.semester}=${v.n}`).join(", "));

    const years = await sql`
        SELECT academic_year, count(*)::int AS n
        FROM past_papers GROUP BY 1 ORDER BY 1
    `;
    console.log("academic_year values:", years.map((v) => `${v.academic_year}=${v.n}`).join(", "));

    const tables = await sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_name IN ('paper_submissions','contributors')
        ORDER BY table_name
    `;
    console.log("new tables present:", tables.map((t) => t.table_name).join(", ") || "NONE");

    const cols = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'past_papers'
          AND column_name IN ('source','contributor_name','contributor_github')
        ORDER BY column_name
    `;
    console.log("provenance columns:", cols.map((c) => c.column_name).join(", "));

    const total = await sql`SELECT count(*)::int AS n FROM past_papers`;
    console.log("past_papers row count:", total[0].n);

    const merged = await sql`
        SELECT count(*)::int AS n FROM past_papers_merge_log
    `;
    console.log("duplicate rows merged:", merged[0].n);

    const key = await sql`
        SELECT pg_get_constraintdef(con.oid) AS def
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'past_papers'
          AND con.contype = 'u'
    `;
    console.log("unique constraint:", key.map((k) => k.def).join(" | "));
}

await sql.end();
