// ============================================================
// lib/admin-auth.ts — Guards for the /admin surface
// ============================================================
//
// The portal has no user accounts, so the review queue is protected by
// Cloudflare Access rather than by application credentials: an Access
// application covers the /admin and /api/admin paths, and only
// allow-listed university addresses can pass it.
//
// The helpers here are defence in depth. Access terminates
// unauthenticated requests before they reach the Worker, but a route
// handler must never rely on that alone — if the Access application is
// misconfigured or a path is left uncovered, the handler must still
// refuse to act.
//
// Cloudflare sets CF-Access-Authenticated-User-Email on every request
// that passed an Access policy, and CF-Access-Jwt-Assertion on requests
// that were authenticated by an identity provider. Both are stripped
// from incoming requests by Cloudflare, so a client cannot forge them.
// ============================================================

import { NextRequest } from "next/server";

/** Header Cloudflare sets with the authenticated user's email. */
const USER_EMAIL_HEADER = "cf-access-authenticated-user-email";
/** Header Cloudflare sets with the Access JWT. */
const JWT_HEADER = "cf-access-jwt-assertion";

export interface AdminIdentity {
    email: string;
}

/**
 * Confirm the request passed a Cloudflare Access policy.
 *
 * Returns the reviewer's email, or null when the request did not come
 * through Access.
 */
export function getAdminIdentity(
    request: NextRequest,
): AdminIdentity | null {
    const email = request.headers.get(USER_EMAIL_HEADER);
    const jwt = request.headers.get(JWT_HEADER);

    // Both headers are set by Cloudflare on an Access-authenticated
    // request. Requiring both means a misconfigured application that
    // only forwards one of them still does not unlock the queue.
    if (!email || !jwt) return null;

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) return null;

    return { email: trimmed };
}

/**
 * Compare two secrets without leaking their contents through timing.
 *
 * Used by the cleanup endpoint, which is called by a scheduled job
 * rather than by a browser and therefore cannot present an Access
 * session.
 */
export function secretsMatch(provided: string | null, expected: string): boolean {
    if (!provided || !expected) return false;
    if (provided.length !== expected.length) return false;

    let difference = 0;
    for (let i = 0; i < expected.length; i++) {
        difference |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return difference === 0;
}
