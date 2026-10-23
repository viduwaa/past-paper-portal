import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { AdminQueue } from "@/app/_components/AdminQueue";

export const metadata: Metadata = {
    title: "Review Queue | FOT Portal",
    description: "Review community-contributed past papers.",
    // The review queue must never be indexed.
    robots: { index: false, follow: false },
};

export default function AdminPage() {
    return (
        <div className="mx-auto w-full max-w-4xl">
            <div className="mb-8 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Review Queue
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Community-contributed papers awaiting approval.
                    </p>
                </div>
            </div>

            <AdminQueue />
        </div>
    );
}
