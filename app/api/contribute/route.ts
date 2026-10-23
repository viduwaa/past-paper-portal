import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/db";
import { DriveError } from "@/lib/drive";
import { uploadRatelimit } from "@/lib/ratelimit";
import {
    DAILY_SUBMISSION_LIMIT,
    MAX_FILE_BYTES,
    countAttemptsToday,
    createSubmission,
    hashIp,
    isPdfFile,
    recordAttempt,
} from "@/lib/submissions";

export const runtime = "edge";

/**
 * Accept a community-contributed past paper.
 *
 * The request is multipart/form-data: one PDF file plus the metadata
 * describing it. The file is uploaded to Google Drive and a pending
 * Paper Submission row is created; nothing appears in the public
 * catalogue until a reviewer approves it.
 *
 * Defence in depth, cheapest check first:
 *   1. Rate limit in Redis — stops a burst before any work is done.
 *      Fails open, because the free tier's command quota is easy to
 *      exhaust and "Redis is down" is a normal state, not an emergency.
 *   2. Authoritative daily attempt count in Postgres — survives a
 *      Redis outage, and counts attempts whether or not they succeed,
 *      so a Drive outage cannot be used to hammer the Drive API.
 *   3. Size cap — the body is rejected before it is buffered.
 *   4. PDF magic bytes — the declared type and extension are not trusted.
 *   5. Metadata whitelist — every field is checked against the
 *      catalogue's own values, so a contributor cannot invent rows.
 */

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "127.0.0.1"
    );
}

export async function POST(request: NextRequest) {
    try {
        const ip = getClientIp(request);
        const ipHash = await hashIp(ip);

        // 1. Rate limit (Redis). Fails open when Redis is unreachable —
        //    the authoritative limit is the Postgres attempt count below.
        try {
            const { success } = await uploadRatelimit.limit(ip);
            if (!success) {
                return NextResponse.json(
                    {
                        error:
                            "You have reached the daily upload limit. Please try again tomorrow.",
                    },
                    { status: 429 },
                );
            }
        } catch (error) {
            console.error("Upload rate limit error:", error);
        }

        // 2. Authoritative daily attempt count, independent of Redis.
        //    Attempts are counted even when they fail, so an outage
        //    cannot be used to hammer the Drive API.
        const attemptsToday = await countAttemptsToday(ipHash);
        if (attemptsToday >= DAILY_SUBMISSION_LIMIT) {
            return NextResponse.json(
                {
                    error:
                        "You have reached the daily upload limit. Please try again tomorrow.",
                },
                { status: 429 },
            );
        }

        // 3. Size cap, checked from the declared content length before
        //    the body is parsed.
        const contentLength = Number(
            request.headers.get("content-length") ?? "0",
        );
        if (contentLength > MAX_FILE_BYTES + 64 * 1024) {
            return NextResponse.json(
                { error: "File is too large. The maximum size is 10 MB." },
                { status: 413 },
            );
        }

        const form = await request.formData();
        const file = form.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "No file was uploaded." },
                { status: 400 },
            );
        }

        if (file.size === 0) {
            return NextResponse.json(
                { error: "The uploaded file is empty." },
                { status: 400 },
            );
        }

        if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json(
                { error: "File is too large. The maximum size is 10 MB." },
                { status: 413 },
            );
        }

        // 4. PDF magic bytes. The declared MIME type and the filename
        //    extension are both attacker-controlled; the header is not.
        if (!(await isPdfFile(file))) {
            return NextResponse.json(
                { error: "Only PDF files are accepted." },
                { status: 400 },
            );
        }

        // 5. Metadata, whitelisted against the catalogue.
        const [options, examYears] = await Promise.all([
            Database.getFilterOptions(),
            Database.getExamYears(),
        ]);

        const field = (name: string) => {
            const value = form.get(name);
            return typeof value === "string" ? value : "";
        };

        // The attempt is recorded before the Drive upload, so a failed
        // upload still consumes the daily quota.
        await recordAttempt(ipHash);

        const submission = await createSubmission(
            {
                file,
                departmentCode: field("departmentCode"),
                academicYear: field("academicYear"),
                semester: field("semester"),
                examYear: field("examYear"),
                courseCode: field("courseCode"),
                courseName: field("courseName"),
                contributorName: field("contributorName") || undefined,
                contributorGithub: field("contributorGithub") || undefined,
                notes: field("notes") || undefined,
                ip,
            },
            {
                departments: options.departments,
                years: options.years,
                semesters: options.semesters,
                examYears,
            },
        );

        return NextResponse.json(
            {
                message:
                    "Thank you! Your paper has been submitted and is awaiting review.",
                submissionId: submission.id,
            },
            { status: 201 },
        );
    } catch (error) {
        // Validation failures are the user's to fix, so surface them.
        if (
            error instanceof Error &&
            error.message.startsWith("Invalid submission:")
        ) {
            return NextResponse.json(
                { error: error.message.replace("Invalid submission: ", "") },
                { status: 400 },
            );
        }

        // Drive is not configured. Say so plainly — it is a setup
        // problem, not a user problem, and the contributor cannot fix it.
        if (error instanceof DriveError) {
            console.error("Contribution upload failed:", error.message);
            return NextResponse.json(
                {
                    error:
                        "Uploads are not available right now. The site maintainer has been notified.",
                },
                { status: 503 },
            );
        }

        console.error("Contribution upload error:", error);
        return NextResponse.json(
            {
                error:
                    "Something went wrong while processing your upload. Please try again later.",
            },
            { status: 500 },
        );
    }
}
