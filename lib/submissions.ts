// ============================================================
// lib/submissions.ts — Paper Submission queue and approval flow
// ============================================================
//
// A Paper Submission is a community member's proposed Paper awaiting
// review. It becomes a Paper (a past_papers row) only on approval.
//
// Module interface:
//   - validateSubmission(input, options) → field-level errors
//   - createSubmission(input)             → insert a pending submission
//   - listSubmissions(status)              → the review queue
//   - approveSubmission(id, reviewer)      → publish into the catalogue
//   - rejectSubmission(id, reviewer)       → decline, keep the file for review
//   - expireStaleSubmissions(days)         → the 30-day cleanup sweep
//   - hashIp(ip)                           → salted hash for abuse tracking
//
// The validation helpers are pure so they can be unit-tested without a
// database or a Drive account.
// ============================================================

import { sql } from "@vercel/postgres";
import {
    DRIVE_ROOT,
    PENDING_FOLDER,
    fileApprovedPaper,
    fileRejectedPaper,
    uploadPaper,
} from "./drive";

// --- Types --------------------------------------------------------

export interface SubmissionInput {
    file: File;
    departmentCode: string;
    academicYear: string;
    semester: string;
    examYear: string;
    courseCode: string;
    courseName: string;
    contributorName?: string;
    contributorGithub?: string;
    notes?: string;
    ip?: string;
}

export interface SubmissionRecord {
    id: number;
    status: "pending" | "approved" | "rejected";
    fileName: string;
    fileSize: number;
    viewUrl: string;
    previewUrl: string;
    driveFileId: string;
    departmentCode: string | null;
    departmentName: string | null;
    academicYear: string | null;
    semester: string | null;
    examYear: string | null;
    courseCode: string | null;
    courseName: string | null;
    contributorName: string | null;
    contributorGithub: string | null;
    notes: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
}

// --- Limits -------------------------------------------------------

/** Maximum accepted upload size. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Submissions allowed per IP per day. */
export const DAILY_SUBMISSION_LIMIT = 5;
/** Pending submissions expire after this many days. */
export const SUBMISSION_TTL_DAYS = 30;
/** Longest accepted contributor display name. */
const MAX_NAME_LENGTH = 100;
/** Longest accepted GitHub login. */
const MAX_GITHUB_LENGTH = 39;
/** Longest accepted subject name. */
const MAX_COURSE_NAME_LENGTH = 500;
/** Longest accepted notes field. */
const MAX_NOTES_LENGTH = 1000;

/**
 * Subject codes look like "ICT 1209". The seeded corpus also contains
 * "CMT- 2301" and "FDT1201", so the pattern is deliberately tolerant of
 * the separator while the stored value is normalised.
 */
const COURSE_CODE_PATTERN = /^[A-Za-z]{2,4}\s*-?\s*\d{3,4}$/;

/** GitHub logins: alphanumeric or single hyphens, never leading/trailing. */
const GITHUB_LOGIN_PATTERN =
    /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

// --- Validation (pure) ---------------------------------------------

export interface ValidationOptions {
    departments: string[];
    years: string[];
    semesters: string[];
    examYears: string[];
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    /** The normalised values, present when `valid` is true. */
    normalised?: {
        courseCode: string;
        courseName: string;
        contributorName?: string;
        contributorGithub?: string;
    };
}

/**
 * Normalise a course code to the canonical "ICT 1209" form.
 * "CMT- 2301" and "CMT2301" both become "CMT 2301".
 */
export function normaliseCourseCode(code: string): string {
    const match = /^([A-Za-z]{2,4})\s*-?\s*(\d{3,4})$/.exec(code.trim());
    if (!match) return code.trim();
    return `${match[1].toUpperCase()} ${match[2]}`;
}

/**
 * Validate a submission's metadata against the catalogue's own values.
 * Whitelisting against the database is what stops a contributor from
 * inventing departments or years that no student will ever filter for.
 */
export function validateSubmission(
    input: Omit<SubmissionInput, "file" | "ip">,
    options: ValidationOptions,
): ValidationResult {
    const errors: string[] = [];

    const department = input.departmentCode?.trim() ?? "";
    if (!department) {
        errors.push("Select a department.");
    } else if (!options.departments.includes(department)) {
        errors.push("Unknown department.");
    }

    const year = input.academicYear?.trim() ?? "";
    if (!year) {
        errors.push("Select a study year.");
    } else if (!options.years.includes(year)) {
        errors.push("Unknown study year.");
    }

    const semester = input.semester?.trim() ?? "";
    if (!semester) {
        errors.push("Select a semester.");
    } else if (!options.semesters.includes(semester)) {
        errors.push("Unknown semester.");
    }

    const examYear = input.examYear?.trim() ?? "";
    if (!/^\d{4}$/.test(examYear)) {
        errors.push("Past paper year must be a four-digit year.");
    } else if (options.examYears.length > 0 && !options.examYears.includes(examYear)) {
        errors.push("Unknown past paper year.");
    }

    const courseCode = input.courseCode?.trim() ?? "";
    if (!courseCode) {
        errors.push("Enter the subject code.");
    } else if (!COURSE_CODE_PATTERN.test(courseCode)) {
        errors.push("Subject code must look like ICT 1209.");
    }

    const courseName = input.courseName?.trim() ?? "";
    if (!courseName) {
        errors.push("Enter the subject name.");
    } else if (courseName.length > MAX_COURSE_NAME_LENGTH) {
        errors.push("Subject name is too long.");
    }

    // Attribution is entirely optional.
    const contributorName = input.contributorName?.trim();
    if (contributorName && contributorName.length > MAX_NAME_LENGTH) {
        errors.push("Name is too long.");
    }

    const contributorGithub = input.contributorGithub?.trim();
    if (contributorGithub) {
        if (contributorGithub.length > MAX_GITHUB_LENGTH) {
            errors.push("GitHub username is too long.");
        } else if (!GITHUB_LOGIN_PATTERN.test(contributorGithub)) {
            errors.push("GitHub username is not valid.");
        }
    }

    if (input.notes && input.notes.length > MAX_NOTES_LENGTH) {
        errors.push("Notes are too long.");
    }

    if (errors.length > 0) return { valid: false, errors };

    return {
        valid: true,
        errors: [],
        normalised: {
            courseCode: normaliseCourseCode(courseCode),
            courseName,
            ...(contributorName ? { contributorName } : {}),
            ...(contributorGithub ? { contributorGithub } : {}),
        },
    };
}

/**
 * Check the file is a PDF by its magic bytes. The declared MIME type and
 * the filename extension are attacker-controlled; the header is not.
 */
export async function isPdfFile(file: File): Promise<boolean> {
    if (file.size < 5) return false;
    const header = await file.slice(0, 5).text();
    return header === "%PDF-";
}

/**
 * Build the filename stored on Drive and in the catalogue. Derived from
 * the validated metadata, never from the uploaded filename, so a
 * contributor cannot inject path separators or control characters.
 */
export function buildFileName(
    courseCode: string,
    courseName: string,
): string {
    const safeName = courseName
        // Strip control characters, then path separators, then collapse
        // runs of whitespace so the name is safe for Drive and for the UI.
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .replace(/[/\\]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

    return `${courseCode} - ${safeName}.pdf`;
}

// --- IP hashing ----------------------------------------------------

/** Salted hash so a submitter's IP is never stored in the clear. */
export async function hashIp(ip: string | undefined): Promise<string | null> {
    if (!ip) return null;
    const pepper =
        process.env.SUBMISSIONS_PEPPER ?? "fot-portal-submissions-v1";
    const data = new TextEncoder().encode(`${ip}|${pepper}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// --- Database operations -------------------------------------------

/**
 * Count upload attempts made by an IP today.
 *
 * Attempts are counted whether or not they succeed, so a Drive outage
 * cannot be used to hammer the Drive API. This is the authoritative
 * daily limit: the Redis limiter is the fast path, but it fails open
 * when Redis is unreachable, and the free tier's command quota is easy
 * enough to exhaust that "Redis is down" is a normal state rather than
 * an emergency.
 */
export async function countAttemptsToday(
    ipHash: string | null,
): Promise<number> {
    if (!ipHash) return 0;
    try {
        const result = await sql`
            SELECT count(*)::int AS n
            FROM paper_submission_attempts
            WHERE ip_hash = ${ipHash}
              AND attempted_at >= NOW() - INTERVAL '1 day'
        `;
        return result.rows[0]?.n ?? 0;
    } catch (error) {
        console.error("Failed to count daily attempts:", error);
        return 0;
    }
}

/**
 * Record an upload attempt.
 *
 * Called before the Drive upload so a failed attempt still consumes
 * quota. Rows are cheap; they are pruned by the cleanup sweep.
 */
export async function recordAttempt(
    ipHash: string | null,
    succeeded = false,
): Promise<void> {
    if (!ipHash) return;
    try {
        await sql`
            INSERT INTO paper_submission_attempts (ip_hash, succeeded)
            VALUES (${ipHash}, ${succeeded})
        `;
    } catch (error) {
        // Never fail an upload because the attempt could not be logged.
        console.error("Failed to record upload attempt:", error);
    }
}

/**
 * Count submissions made by an IP today.
 *
 * Counts rows in `paper_submissions`, which are only written once a
 * submission has been *created*. An attempt that fails later — a Drive
 * outage, a malformed file — leaves no row, so it does not count.
 *
 * The Redis limiter is the fast path and stops a burst before any work
 * is done. This is the backstop that survives a Redis outage, and it is
 * deliberately generous: it must not lock a legitimate contributor out
 * because their Drive upload failed. The two limits are complementary,
 * not interchangeable — Redis limits attempt *rate*, this limits
 * completed submissions per day.
 */
export async function countSubmissionsToday(
    ipHash: string | null,
): Promise<number> {
    if (!ipHash) return 0;
    try {
        const result = await sql`
            SELECT count(*)::int AS n
            FROM paper_submissions
            WHERE ip_hash = ${ipHash}
              AND submitted_at >= NOW() - INTERVAL '1 day'
        `;
        return result.rows[0]?.n ?? 0;
    } catch (error) {
        console.error("Failed to count daily submissions:", error);
        return 0;
    }
}

/**
 * Insert a pending submission. The file is uploaded to Drive first so
 * that a row never references a file that does not exist.
 */
export async function createSubmission(
    input: SubmissionInput,
    options: ValidationOptions,
): Promise<{ id: number; viewUrl: string }> {
    const validation = validateSubmission(input, options);
    if (!validation.valid || !validation.normalised) {
        throw new Error(
            `Invalid submission: ${validation.errors.join(" ")}`,
        );
    }

    const fileName = buildFileName(
        validation.normalised.courseCode,
        validation.normalised.courseName,
    );

    const upload = await uploadPaper(input.file, {
        name: fileName,
        folderSegments: [DRIVE_ROOT, PENDING_FOLDER],
    });

    const ipHash = await hashIp(input.ip);

    const result = await sql`
        INSERT INTO paper_submissions (
            file_name, file_size, view_url, preview_url,
            drive_file_id, department_code, academic_year, semester,
            exam_year, course_code, course_name,
            contributor_name, contributor_github, notes, ip_hash
        )
        VALUES (
            ${fileName}, ${input.file.size}, ${upload.viewUrl}, ${upload.previewUrl},
            ${upload.fileId}, ${input.departmentCode.trim()},
            ${input.academicYear.trim()}, ${input.semester.trim()},
            ${input.examYear.trim()}, ${validation.normalised.courseCode},
            ${validation.normalised.courseName},
            ${validation.normalised.contributorName ?? null},
            ${validation.normalised.contributorGithub ?? null},
            ${input.notes?.trim() || null}, ${ipHash}
        )
        RETURNING id
    `;

    return { id: result.rows[0].id, viewUrl: upload.viewUrl };
}

/** The review queue. */
export async function listSubmissions(
    status: "pending" | "approved" | "rejected" = "pending",
    limit = 100,
): Promise<SubmissionRecord[]> {
    try {
        const result = await sql`
            SELECT id, status, file_name, file_size, view_url, preview_url,
                   drive_file_id, department_code, department_name,
                   academic_year, semester, exam_year, course_code, course_name,
                   contributor_name, contributor_github, notes,
                   submitted_at, reviewed_at, reviewed_by
            FROM paper_submissions
            WHERE status = ${status}
            ORDER BY submitted_at DESC
            LIMIT ${limit}
        `;

        return result.rows.map((row: unknown) => {
            const r = row as Record<string, unknown>;
            return {
                id: r.id as number,
                status: r.status as SubmissionRecord["status"],
                fileName: r.file_name as string,
                fileSize: r.file_size as number,
                viewUrl: r.view_url as string,
                previewUrl: r.preview_url as string,
                driveFileId: r.drive_file_id as string,
                departmentCode: r.department_code as string | null,
                departmentName: r.department_name as string | null,
                academicYear: r.academic_year as string | null,
                semester: r.semester as string | null,
                examYear: r.exam_year as string | null,
                courseCode: r.course_code as string | null,
                courseName: r.course_name as string | null,
                contributorName: r.contributor_name as string | null,
                contributorGithub: r.contributor_github as string | null,
                notes: r.notes as string | null,
                submittedAt: new Date(r.submitted_at as string).toISOString(),
                reviewedAt: r.reviewed_at
                    ? new Date(r.reviewed_at as string).toISOString()
                    : null,
                reviewedBy: r.reviewed_by as string | null,
            };
        });
    } catch (error) {
        console.error("Failed to list submissions:", error);
        throw new Error("Failed to list submissions");
    }
}

async function getSubmission(id: number): Promise<SubmissionRecord | null> {
    const result = await sql`
        SELECT id, status, file_name, file_size, view_url, preview_url,
               drive_file_id, department_code, department_name,
               academic_year, semester, exam_year, course_code, course_name,
               contributor_name, contributor_github, notes,
               submitted_at, reviewed_at, reviewed_by
        FROM paper_submissions
        WHERE id = ${id}
    `;
    if (result.rows.length === 0) return null;
    const r = result.rows[0] as Record<string, unknown>;
    return {
        id: r.id as number,
        status: r.status as SubmissionRecord["status"],
        fileName: r.file_name as string,
        fileSize: r.file_size as number,
        viewUrl: r.view_url as string,
        previewUrl: r.preview_url as string,
        driveFileId: r.drive_file_id as string,
        departmentCode: r.department_code as string | null,
        departmentName: r.department_name as string | null,
        academicYear: r.academic_year as string | null,
        semester: r.semester as string | null,
        examYear: r.exam_year as string | null,
        courseCode: r.course_code as string | null,
        courseName: r.course_name as string | null,
        contributorName: r.contributor_name as string | null,
        contributorGithub: r.contributor_github as string | null,
        notes: r.notes as string | null,
        submittedAt: new Date(r.submitted_at as string).toISOString(),
        reviewedAt: r.reviewed_at
            ? new Date(r.reviewed_at as string).toISOString()
            : null,
        reviewedBy: r.reviewed_by as string | null,
    };
}

/**
 * Approve a submission: publish it into the catalogue and file it on
 * Drive.
 *
 * The catalogue write and the status flip happen in one transaction so a
 * failure cannot leave a Paper with no matching submission. Drive
 * operations happen first — if they fail, nothing is published.
 */
export async function approveSubmission(
    id: number,
    reviewer: string,
): Promise<{ id: number; sharedAs: "domain" | "anyone" }> {
    const submission = await getSubmission(id);
    if (!submission) throw new Error("Submission not found");
    if (submission.status !== "pending") {
        throw new Error(`Submission is already ${submission.status}`);
    }

    const department = submission.departmentCode ?? "General";
    const folderSegments = [
        department,
        submission.academicYear ?? "Unspecified",
        submission.semester ?? "Unspecified",
        submission.examYear ?? "Unspecified",
    ];

    // File and share the file first. A Drive failure must not leave a
    // published row pointing at an unshared file.
    const sharedAs = await fileApprovedPaper({
        fileId: submission.driveFileId,
        folderSegments,
        fileName: submission.fileName,
    });

    // Publish and mark approved in one statement.
    //
    // `@vercel/postgres` exposes no transaction API, so atomicity comes
    // from a data-modifying CTE: both writes run inside a single
    // statement, and Postgres executes every data-modifying CTE exactly
    // once regardless of whether the outer query reads its output. The
    // INSERT is idempotent (ON CONFLICT DO NOTHING) so re-approving a
    // duplicate submission cannot create a second catalogue row.
    await sql`
        WITH published AS (
            INSERT INTO past_papers (
                file_name, view_url, preview_url, department_code,
                department_name, academic_year, semester, exam_year,
                course_code, course_name, source, contributor_name,
                contributor_github
            )
            VALUES (
                ${submission.fileName}, ${submission.viewUrl}, ${submission.previewUrl},
                ${submission.departmentCode}, ${submission.departmentName},
                ${submission.academicYear}, ${submission.semester},
                ${submission.examYear}, ${submission.courseCode},
                ${submission.courseName}, 'contributed',
                ${submission.contributorName}, ${submission.contributorGithub}
            )
            ON CONFLICT (course_code, exam_year, academic_year, semester)
            DO NOTHING
        )
        UPDATE paper_submissions
        SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP,
            reviewed_by = ${reviewer}
        WHERE id = ${id}
        RETURNING id
    `;

    // Record the contributor so the wall can show them.
    await recordContributor(submission);

    return { id, sharedAs };
}

/** Decline a submission. The file is kept in the Rejected folder. */
export async function rejectSubmission(
    id: number,
    reviewer: string,
): Promise<{ id: number }> {
    const submission = await getSubmission(id);
    if (!submission) throw new Error("Submission not found");
    if (submission.status !== "pending") {
        throw new Error(`Submission is already ${submission.status}`);
    }

    await fileRejectedPaper(submission.driveFileId);

    await sql`
        UPDATE paper_submissions
        SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP,
            reviewed_by = ${reviewer}
        WHERE id = ${id}
    `;

    return { id };
}

/**
 * Expire pending submissions older than the TTL. Their files are moved to
 * the Rejected folder rather than deleted, matching the manual rejection
 * path.
 */
export async function expireStaleSubmissions(
    days = SUBMISSION_TTL_DAYS,
): Promise<{ expired: number }> {
    const stale = await sql`
        SELECT id, drive_file_id
        FROM paper_submissions
        WHERE status = 'pending'
          AND submitted_at < NOW() - (${days} || ' days')::interval
    `;

    let expired = 0;
    for (const row of stale.rows) {
        const r = row as { id: number; drive_file_id: string };
        try {
            await fileRejectedPaper(r.drive_file_id);
            await sql`
                UPDATE paper_submissions
                SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP,
                    reviewed_by = 'auto-expiry'
                WHERE id = ${r.id}
            `;
            expired += 1;
        } catch (error) {
            // A Drive failure must not abort the whole sweep — try the
            // next one and leave this row pending for the next run.
            console.error(`[submissions] failed to expire ${r.id}:`, error);
        }
    }

    return { expired };
}

// --- Contributors ---------------------------------------------------

async function recordContributor(
    submission: SubmissionRecord,
): Promise<void> {
    const name = submission.contributorName;
    const github = submission.contributorGithub;
    if (!name && !github) return;

    try {
        if (github) {
            await sql`
                INSERT INTO contributors (github_login, display_name)
                VALUES (${github}, ${name ?? github})
                ON CONFLICT (github_login) DO UPDATE
                SET last_seen = CURRENT_TIMESTAMP,
                    display_name = COALESCE(
                        NULLIF(contributors.display_name, ''),
                        EXCLUDED.display_name
                    )
            `;
            return;
        }

        // No GitHub login — match on display name so repeat anonymous
        // submissions accumulate under one card.
        await sql`
            INSERT INTO contributors (display_name)
            SELECT ${name}
            WHERE NOT EXISTS (
                SELECT 1 FROM contributors
                WHERE github_login IS NULL AND display_name = ${name}
            )
        `;
        await sql`
            UPDATE contributors
            SET last_seen = CURRENT_TIMESTAMP
            WHERE github_login IS NULL AND display_name = ${name}
        `;
    } catch (error) {
        // Recording a contributor must never block an approval.
        console.error("Failed to record contributor:", error);
    }
}
