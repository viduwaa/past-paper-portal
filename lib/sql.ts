// ============================================================
// lib/sql.ts — Postgres access (postgres.js)
//
// Replaces @vercel/postgres, whose pool (`sql`) rejects any
// connection string that does not contain "-pooler." in the
// hostname — including a PgBouncer/Supavisor pooler on port
// 6543 at a bare IP or a *.pooler.* hostname. Port alone does
// not satisfy its check, so an IP:6543 POSTGRES_URL always
// threw `invalid_connection_string` before any query ran.
//
// postgres.js speaks the wire protocol directly and accepts any
// host/port. It imports Node builtins (net/tls/crypto), so it
// cannot be bundled for the Edge runtime — every route that
// (transitively) imports this module must use
// `export const runtime = "nodejs"`. On Cloudflare Pages that
// runs in workerd with nodejs_compat (already set up for
// next-on-pages), which selects postgres.js's workerd build;
// on Node hosts it uses the regular Node build.
//
// API surface kept identical to the old @vercel/postgres `sql`:
//   await sql`SELECT ... ${value}`      → { rows }
//   await sql<T>`SELECT ...`            → { rows: T[] }
//   await sql.query(text, params)       → { rows }
// Callers only ever read `.rows`.
//
// `prepare: false` is required behind transaction-mode
// poolers (6543): prepared statements don't survive the
// pooler assigning a different backend per transaction.
// ============================================================

import postgres from "postgres";

export interface QueryResult<T = Record<string, unknown>> {
    rows: T[];
}

// Lazily-created singleton: POSTGRES_URL is only read on first
// query, so importing this module (e.g. at build time) never
// needs the database to be reachable.
let client: ReturnType<typeof postgres> | undefined;

function getClient(): ReturnType<typeof postgres> {
    if (!client) {
        const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
        if (!url) {
            throw new Error(
                "Missing Postgres connection string: set POSTGRES_URL.",
            );
        }
        client = postgres(url, {
            prepare: false,
            max: 5,
            idle_timeout: 20,
            connect_timeout: 10,
        });
    }
    return client;
}

export interface SqlTag {
    <T = Record<string, unknown>>(
        strings: TemplateStringsArray,
        ...values: unknown[]
    ): Promise<QueryResult<T>>;
    query<T = Record<string, unknown>>(
        text: string,
        params?: unknown[],
    ): Promise<QueryResult<T>>;
}

async function run<T>(
    promise: Promise<unknown>,
): Promise<QueryResult<T>> {
    const rows = (await promise) as T[];
    return { rows: Array.from(rows) };
}

export const sql = Object.assign(
    <T = Record<string, unknown>>(
        strings: TemplateStringsArray,
        ...values: unknown[]
    ): Promise<QueryResult<T>> =>
        run<T>(
            (getClient() as unknown as SqlTag)(
                strings,
                ...(values as never[]),
            ) as unknown as Promise<unknown>,
        ),
    {
        query: <T = Record<string, unknown>>(
            text: string,
            params?: unknown[],
        ): Promise<QueryResult<T>> =>
            run<T>(getClient().unsafe(text, params as never[]) as Promise<unknown>),
    },
) as SqlTag;
