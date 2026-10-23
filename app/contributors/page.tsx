import type { Metadata } from "next";
import { Users } from "lucide-react";

import { ContributorWall } from "@/app/_components/ContributorWall";
import { getContributorsWall } from "@/lib/wall";

export const metadata: Metadata = {
    title: "Contributors | FOT Portal",
    description:
        "The students and developers who have contributed past papers and code to the FOT Past Papers Portal.",
    keywords: [
        "contributors",
        "credits",
        "FOT portal contributors",
        "past paper contributors",
    ],
    openGraph: {
        title: "Contributors | FOT Portal",
        description:
            "The students and developers who have contributed past papers and code to the FOT Past Papers Portal.",
        type: "website",
    },
};

// The wall reads from Postgres and a local file, and changes only when
// a submission is approved or the repository is updated. Re-render it
// hourly rather than on every request.
export const revalidate = 3600;

export default async function ContributorsPage() {
    const contributors = await getContributorsWall();

    const totalPapers = contributors.reduce(
        (sum, c) => sum + c.paperContributions,
        0,
    );
    const totalCommits = contributors.reduce(
        (sum, c) => sum + c.codeContributions,
        0,
    );

    return (
        <div className="mx-auto w-full max-w-5xl">
            <div className="mb-8 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                </span>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Contributors
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {contributors.length} contributor
                        {contributors.length === 1 ? "" : "s"} ·{" "}
                        {totalPapers} paper{totalPapers === 1 ? "" : "s"} ·{" "}
                        {totalCommits} commit{totalCommits === 1 ? "" : "s"}
                    </p>
                </div>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
                Every paper on this site was scanned, uploaded or written by
                someone. Thank you.
            </p>

            <ContributorWall contributors={contributors} />
        </div>
    );
}
