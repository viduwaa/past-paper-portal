import { NextRequest, NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/admin-auth";
import { invalidatePapersCache } from "@/lib/cache";
import { approveSubmission, rejectSubmission } from "@/lib/submissions";

export const runtime = "edge";

/**
 * Approve or reject a Paper Submission.
 *
 * Approving files the PDF into the Contributions tree on Drive, shares it
 * with the university domain, publishes it to the catalogue and
 * invalidates the cached paper list so it appears immediately. Rejecting
 * moves the file into the Rejected folder and leaves it out of the
 * catalogue.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const identity = getAdminIdentity(request);
    if (!identity) {
        return NextResponse.json(
            { error: "Not authorised." },
            { status: 401 },
        );
    }

    const { id } = await params;
    const submissionId = Number(id);
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
        return NextResponse.json(
            { error: "Invalid submission id." },
            { status: 400 },
        );
    }

    let action: string;
    try {
        const body = (await request.json()) as { action?: string };
        action = body.action ?? "";
    } catch {
        return NextResponse.json(
            { error: "Invalid request body." },
            { status: 400 },
        );
    }

    try {
        if (action === "approve") {
            const result = await approveSubmission(submissionId, identity.email);

            // The catalogue is cached for 24 hours, so the new paper
            // would not appear without this.
            await invalidatePapersCache();

            return NextResponse.json({
                message:
                    result.sharedAs === "domain"
                        ? "Approved and shared with the university domain."
                        : "Approved. Shared publicly — the Drive account does not support domain sharing.",
                sharedAs: result.sharedAs,
            });
        }

        if (action === "reject") {
            await rejectSubmission(submissionId, identity.email);
            return NextResponse.json({
                message: "Rejected. The file has been moved to the Rejected folder.",
            });
        }

        return NextResponse.json(
            { error: "Unknown action. Use 'approve' or 'reject'." },
            { status: 400 },
        );
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";

        if (message.includes("not found")) {
            return NextResponse.json(
                { error: "Submission not found." },
                { status: 404 },
            );
        }
        if (message.includes("already")) {
            return NextResponse.json(
                { error: message },
                { status: 409 },
            );
        }

        console.error("Failed to review submission:", error);
        return NextResponse.json(
            { error: "Failed to complete the action. Please try again." },
            { status: 500 },
        );
    }
}
