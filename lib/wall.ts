// ============================================================
// lib/wall.ts — Contributors Wall aggregation
// ============================================================
//
// The wall lists every Contributor and what they have contributed:
// approved Paper contributions from the database, and Code contributions
// from the baked GitHub snapshot.
//
// Module interface:
//   - getContributorsWall() → the merged, render-ready list
//   - loadGitHubContributors() → the baked build-time artifact
//
// The GitHub half is baked at build time rather than fetched at runtime:
// the unauthenticated GitHub API allows 60 requests per hour per IP, and
// a wall that polls it would eventually be rate-limited into showing
// nothing. See scripts/fetch-contributors.mjs.
// ============================================================

import { sql } from "@vercel/postgres";
import githubContributors from "@/data/github-contributors.json";

// --- Types --------------------------------------------------------

export interface GitHubContributor {
    login: string;
    avatarUrl: string | null;
    profileUrl: string;
    contributions: number;
}

export interface WallContributor {
    /** Stable key for React lists and for merging. */
    key: string;
    displayName: string;
    githubLogin: string | null;
    avatarUrl: string | null;
    profileUrl: string | null;
    paperContributions: number;
    codeContributions: number;
    /** True when the contributor gave no name and no handle. */
    anonymous: boolean;
}

// --- Baked GitHub snapshot ----------------------------------------

/**
 * The artifact produced by scripts/fetch-contributors.mjs. Reading it is
 * a local file access, so it costs no network request and no Redis
 * command on the read path.
 */
export function loadGitHubContributors(): GitHubContributor[] {
    const raw = githubContributors as unknown;
    if (!Array.isArray(raw)) return [];

    return raw
        .filter(
            (entry): entry is Record<string, unknown> =>
                typeof entry === "object" && entry !== null,
        )
        .map((entry) => ({
            login: String(entry.login ?? ""),
            avatarUrl: (entry.avatarUrl as string | null) ?? null,
            profileUrl: String(entry.profileUrl ?? ""),
            contributions: Number(entry.contributions ?? 0),
        }))
        .filter((c) => c.login.length > 0);
}

// --- Database aggregation ------------------------------------------

interface PaperContributionRow {
    contributor_github: string | null;
    contributor_name: string | null;
    count: number;
}

/**
 * Count approved papers per contributor.
 *
 * A contributor with a GitHub login is keyed by that login; one without
 * is keyed by display name. Anonymous contributions (neither field set)
 * are aggregated into a single bucket.
 */
async function getPaperContributions(): Promise<PaperContributionRow[]> {
    try {
        const result = await sql`
            SELECT contributor_github, contributor_name, count(*)::int AS count
            FROM past_papers
            WHERE source = 'contributed'
            GROUP BY contributor_github, contributor_name
        `;
        return result.rows as PaperContributionRow[];
    } catch (error) {
        console.error("Failed to aggregate paper contributions:", error);
        return [];
    }
}

// --- Merge ---------------------------------------------------------

/**
 * Build the wall.
 *
 * Contributors are merged on GitHub login when both sides have one, so
 * someone who uploaded papers and also wrote code appears as a single
 * card with both counts. Paper-only contributors keep their display name.
 */
export async function getContributorsWall(): Promise<WallContributor[]> {
    const [github, papers] = await Promise.all([
        Promise.resolve(loadGitHubContributors()),
        getPaperContributions(),
    ]);

    const byKey = new Map<string, WallContributor>();

    // GitHub contributors first — they carry the avatar and profile link.
    for (const person of github) {
        const key = `github:${person.login.toLowerCase()}`;
        byKey.set(key, {
            key,
            displayName: person.login,
            githubLogin: person.login,
            avatarUrl: person.avatarUrl,
            profileUrl: person.profileUrl,
            paperContributions: 0,
            codeContributions: person.contributions,
            anonymous: false,
        });
    }

    let anonymousPapers = 0;

    for (const row of papers) {
        const githubLogin = row.contributor_github?.trim() || null;
        const displayName = row.contributor_name?.trim() || null;

        if (!githubLogin && !displayName) {
            anonymousPapers += row.count;
            continue;
        }

        const key = githubLogin
            ? `github:${githubLogin.toLowerCase()}`
            : `name:${(displayName as string).toLowerCase()}`;

        const existing = byKey.get(key);

        if (existing) {
            existing.paperContributions += row.count;
            // Prefer a real display name over the bare GitHub login.
            if (existing.displayName === existing.githubLogin && displayName) {
                existing.displayName = displayName;
            }
            continue;
        }

        byKey.set(key, {
            key,
            displayName: displayName ?? (githubLogin as string),
            githubLogin,
            avatarUrl: null,
            profileUrl: githubLogin
                ? `https://github.com/${githubLogin}`
                : null,
            paperContributions: row.count,
            codeContributions: 0,
            anonymous: false,
        });
    }

    if (anonymousPapers > 0) {
        byKey.set("anonymous", {
            key: "anonymous",
            displayName: "Anonymous",
            githubLogin: null,
            avatarUrl: null,
            profileUrl: null,
            paperContributions: anonymousPapers,
            codeContributions: 0,
            anonymous: true,
        });
    }

    // Most contributions first, then alphabetical for a stable order.
    return Array.from(byKey.values()).sort((a, b) => {
        const totalA = a.paperContributions + a.codeContributions;
        const totalB = b.paperContributions + b.codeContributions;
        if (totalA !== totalB) return totalB - totalA;
        return a.displayName.localeCompare(b.displayName);
    });
}
