import { Github, FileText, Code2, Users } from "lucide-react";

import type { WallContributor } from "@/lib/wall";

interface ContributorWallProps {
    contributors: WallContributor[];
}

function initials(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(/[\s_-]+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
}

export function ContributorWall({ contributors }: ContributorWallProps) {
    if (contributors.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                No contributions yet. Be the first!
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contributors.map((contributor) => {
                const total =
                    contributor.paperContributions +
                    contributor.codeContributions;

                return (
                    <div
                        key={contributor.key}
                        className="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
                    >
                        <div className="flex items-center gap-3">
                            {contributor.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={contributor.avatarUrl}
                                    alt=""
                                    width={44}
                                    height={44}
                                    className="h-11 w-11 shrink-0 rounded-full bg-muted object-cover"
                                />
                            ) : (
                                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                    {initials(contributor.displayName)}
                                </span>
                            )}

                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                    {contributor.displayName}
                                </p>
                                {contributor.githubLogin && (
                                    <a
                                        href={contributor.profileUrl ?? "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <Github className="h-3 w-3" />
                                        @{contributor.githubLogin}
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {contributor.paperContributions > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                    <FileText className="h-3 w-3" />
                                    {contributor.paperContributions} paper
                                    {contributor.paperContributions === 1
                                        ? ""
                                        : "s"}
                                </span>
                            )}
                            {contributor.codeContributions > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                                    <Code2 className="h-3 w-3" />
                                    {contributor.codeContributions} commit
                                    {contributor.codeContributions === 1
                                        ? ""
                                        : "s"}
                                </span>
                            )}
                            {total === 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                    <Users className="h-3 w-3" />
                                    Contributor
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
