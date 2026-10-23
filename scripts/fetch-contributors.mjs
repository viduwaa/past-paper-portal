// Bake GitHub code-contribution counts into data/github-contributors.json.
//
// Run: node scripts/fetch-contributors.mjs
//
// Why bake instead of fetching at runtime: the unauthenticated GitHub API
// allows 60 requests per hour per IP. A wall that polled it would
// eventually be rate-limited into showing nothing, and every visitor
// would burn part of that budget. Instead the counts are fetched once,
// written to a file, and committed — the app reads the file at build
// time and never touches the GitHub API at runtime.
//
// The GitHub token is optional. With no token the script uses the
// unauthenticated limit (60 req/hour), which is plenty for a single
// run; set GITHUB_TOKEN to raise it to 5,000 requests/hour.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(here, "..", "data", "github-contributors.json");

const REPO = process.env.GITHUB_REPO ?? "viduwaa/past-paper-portal";
const TOKEN = process.env.GITHUB_TOKEN;

const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "fot-past-paper-portal-contributor-baker",
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function fetchJson(path) {
    const response = await fetch(`https://api.github.com${path}`, { headers });
    if (!response.ok) {
        throw new Error(
            `GitHub API ${path} failed (${response.status}): ${await response.text()}`,
        );
    }
    return response.json();
}

async function main() {
    const contributors = await fetchJson(
        `/repos/${REPO}/contributors?per_page=100`,
    );

    const baked = contributors
        .filter((c) => c.type === "User" && c.login)
        .map((c) => ({
            login: c.login,
            avatarUrl: c.avatar_url ?? null,
            profileUrl: c.html_url ?? `https://github.com/${c.login}`,
            contributions: Number(c.contributions ?? 0),
        }))
        // GitHub sorts by contributions descending already, but sort
        // explicitly so the artifact is stable regardless of API order.
        .sort((a, b) => b.contributions - a.contributions);

    await writeFile(OUTPUT_FILE, `${JSON.stringify(baked, null, 2)}\n`, "utf8");

    console.log(
        `Wrote ${baked.length} contributors to ${OUTPUT_FILE}:`,
    );
    for (const c of baked) {
        console.log(`  ${c.login} — ${c.contributions} contributions`);
    }
}

main().catch((error) => {
    console.error("Failed to bake contributors:", error.message);
    process.exit(1);
});
