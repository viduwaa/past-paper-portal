"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Check,
    X,
    ExternalLink,
    FileText,
    Loader2,
    RefreshCw,
    Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface Submission {
    id: number;
    status: "pending" | "approved" | "rejected";
    fileName: string;
    fileSize: number;
    viewUrl: string;
    previewUrl: string;
    departmentCode: string | null;
    academicYear: string | null;
    semester: string | null;
    examYear: string | null;
    courseCode: string | null;
    courseName: string | null;
    contributorName: string | null;
    contributorGithub: string | null;
    notes: string | null;
    submittedAt: string;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAge(iso: string): string {
    const then = new Date(iso).getTime();
    const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

export function AdminQueue() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/admin/submissions?status=pending");
            if (!response.ok) {
                const body = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };
                throw new Error(body.error ?? "Failed to load submissions.");
            }
            const data = (await response.json()) as { submissions: Submission[] };
            setSubmissions(data.submissions);
        } catch (fetchError) {
            setError(
                fetchError instanceof Error
                    ? fetchError.message
                    : "Failed to load submissions.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function act(id: number, action: "approve" | "reject") {
        setBusyId(id);
        setError(null);
        setNotice(null);
        try {
            const response = await fetch(`/api/admin/submissions/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            const body = (await response.json().catch(() => ({}))) as {
                error?: string;
                message?: string;
            };
            if (!response.ok) {
                throw new Error(body.error ?? "Action failed.");
            }
            setNotice(body.message ?? "Done.");
            await load();
        } catch (actionError) {
            setError(
                actionError instanceof Error
                    ? actionError.message
                    : "Action failed.",
            );
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {loading
                        ? "Loading…"
                        : `${submissions.length} pending submission${submissions.length === 1 ? "" : "s"}`}
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={load}
                    disabled={loading}
                >
                    <RefreshCw
                        className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {notice && (
                <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                    {notice}
                </div>
            )}

            {!loading && submissions.length === 0 && !error && (
                <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                    Nothing waiting for review.
                </div>
            )}

            <div className="space-y-3">
                {submissions.map((submission) => (
                    <motion.div
                        key={submission.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border bg-card p-4"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="font-mono text-sm font-semibold">
                                        {submission.courseCode ?? "—"}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {submission.courseName}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span>
                                        {submission.departmentCode ?? "—"} ·{" "}
                                        {submission.academicYear ?? "—"} ·{" "}
                                        {submission.semester ?? "—"}
                                    </span>
                                    <span>Exam {submission.examYear ?? "—"}</span>
                                    <span>{formatSize(submission.fileSize)}</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatAge(submission.submittedAt)}
                                    </span>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    Submitted by{" "}
                                    <span className="font-medium text-foreground">
                                        {submission.contributorName ||
                                            submission.contributorGithub ||
                                            "Anonymous"}
                                    </span>
                                    {submission.contributorGithub && (
                                        <>
                                            {" · "}
                                            <a
                                                href={`https://github.com/${submission.contributorGithub}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline hover:text-foreground"
                                            >
                                                @{submission.contributorGithub}
                                            </a>
                                        </>
                                    )}
                                </div>

                                {submission.notes && (
                                    <p className="rounded bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                        {submission.notes}
                                    </p>
                                )}
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                >
                                    <a
                                        href={submission.previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Preview
                                    </a>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => act(submission.id, "reject")}
                                    disabled={busyId === submission.id}
                                >
                                    {busyId === submission.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <X className="h-3.5 w-3.5" />
                                    )}
                                    Reject
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => act(submission.id, "approve")}
                                    disabled={busyId === submission.id}
                                >
                                    {busyId === submission.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Check className="h-3.5 w-3.5" />
                                    )}
                                    Approve
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
