import type { Metadata } from "next";
import { HeartHandshake, ShieldCheck, Users } from "lucide-react";

import { ContributeForm } from "@/app/_components/ContributeForm";

export const metadata: Metadata = {
    title: "Contribute a Paper | FOT Portal",
    description:
        "Upload a past examination paper to the FOT Past Papers Portal. Your submission is reviewed before it is published.",
    keywords: [
        "contribute past paper",
        "upload past paper",
        "share past paper",
        "FOT past papers",
        "Rajarata University",
        "past paper upload",
    ],
    openGraph: {
        title: "Contribute a Paper | FOT Portal",
        description:
            "Upload a past examination paper. Submissions are reviewed before publication.",
        type: "website",
    },
};

export default function ContributePage() {
    return (
        <div className="mx-auto w-full max-w-3xl">
            <div className="mb-8 space-y-3">
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <HeartHandshake className="h-5 w-5" />
                    </span>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Contribute a Past Paper
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Help the students who come after you.
                        </p>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground">
                    Upload a PDF of an exam paper you still have. Tell us
                    which subject and year it belongs to, and optionally
                    add your name so you get credit on the contributors
                    wall.
                </p>
            </div>

            <div className="mb-8 grid gap-3 sm:grid-cols-3">
                <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3">
                    <FileIcon />
                    <p className="text-xs text-muted-foreground">
                        PDF only, up to 10 MB.
                    </p>
                </div>
                <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                        Every submission is reviewed before it goes live.
                    </p>
                </div>
                <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                        Stay anonymous, or add your GitHub username to
                        merge with your code contributions.
                    </p>
                </div>
            </div>

            <ContributeForm />
        </div>
    );
}

function FileIcon() {
    return (
        <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
    );
}
