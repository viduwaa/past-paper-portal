// ============================================================
// lib/drive.ts — Google Drive integration for the contributions feature
// ============================================================
//
// Module interface (everything a caller must know):
//   - uploadPaper(file, metadata)  → creates the file in the Pending folder
//   - approvePaper(fileId, meta)   → files it into the Contributions tree
//   - sharePaper(fileId)           → grants the university domain read access
//   - rejectPaper(fileId)          → moves it to the Rejected folder
//   - DRIVE_ROOT / PENDING_FOLDER / REJECTED_FOLDER
//
// Why hand-rolled fetch calls instead of the `googleapis` npm package:
// the SDK is Node-oriented and pulls in dependencies that the edge
// runtime does not need, and the Worker bundle is capped at 64 MiB.
// Only three Drive endpoints are needed, and calling them directly keeps
// the bundle small and the behaviour obvious.
//
// Auth: an OAuth 2.0 refresh token for the portal's Google account, with
// the `drive.file` scope. See docs/adr/0001-drive-oauth-over-service-account.md.
// The refresh token MUST come from a consent screen in "Production" status
// — a "Testing" consent screen issues refresh tokens that expire in 7 days.
//
// All functions are safe to call when Drive is not configured: they throw
// a descriptive error rather than crashing, and callers decide what to do.
// ============================================================

import { Redis } from "@upstash/redis";

// --- Configuration ------------------------------------------------

/** Root of the app-managed tree. Everything the app creates lives here. */
export const DRIVE_ROOT = "Contributions";
/** Holds uploads that have not yet been approved. Shared with reviewers. */
export const PENDING_FOLDER = "Pending";
/** Holds files from rejected submissions. */
export const REJECTED_FOLDER = "Rejected";

/** Domain granted read access to approved papers. */
export const SHARE_DOMAIN = "tec.rjt.ac.lk";

/**
 * Drive's single-request multipart upload is documented for files up to
 * 5 MB. Above that the resumable protocol is required.
 */
const MULTIPART_MAX_BYTES = 5 * 1024 * 1024;

/** Access tokens live ~60 min; refresh a little early. */
const ACCESS_TOKEN_TTL_SECONDS = 50 * 60;
/** Folder IDs are stable, so cache them well past a day's worth of use. */
const FOLDER_CACHE_TTL_SECONDS = 24 * 60 * 60;

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

// --- Errors -------------------------------------------------------

export class DriveError extends Error {
    constructor(
        message: string,
        readonly status?: number,
    ) {
        super(message);
        this.name = "DriveError";
    }
}

// --- Redis (lazy, degrades to null) -------------------------------

let _redis: Redis | null = null;
function getRedis(): Redis | null {
    if (_redis) return _redis;
    try {
        _redis = Redis.fromEnv();
        return _redis;
    } catch {
        return null;
    }
}

// --- Access tokens ------------------------------------------------

interface CachedToken {
    token: string;
    expiresAt: number;
}

// Per-isolate memo first: in the common case the same isolate serves
// several uploads and no Redis command is spent at all.
let _tokenMemo: CachedToken | null = null;

const TOKEN_CACHE_KEY = "drive:token";

function isDriveConfigured(): boolean {
    return Boolean(
        process.env.GOOGLE_CLIENT_ID &&
            process.env.GOOGLE_CLIENT_SECRET &&
            process.env.GOOGLE_REFRESH_TOKEN,
    );
}

/**
 * Exchange the stored refresh token for an access token.
 * Throws a DriveError with an actionable message when the refresh token
 * has been revoked or has expired (the 7-day Testing-mode trap).
 */
async function requestAccessToken(): Promise<string> {
    if (!isDriveConfigured()) {
        throw new DriveError(
            "Google Drive is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN.",
        );
    }

    const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
            grant_type: "refresh_token",
        }),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        if (response.status === 400 || response.status === 401) {
            throw new DriveError(
                `Drive authorisation failed (${response.status}). The refresh token is invalid, revoked, or expired. ` +
                    `If the OAuth consent screen is in "Testing" status, refresh tokens expire after 7 days — ` +
                    `publish the consent screen as "Production" and re-authorise. Response: ${body}`,
                response.status,
            );
        }
        throw new DriveError(
            `Drive token request failed (${response.status}): ${body}`,
            response.status,
        );
    }

    const payload = (await response.json()) as {
        access_token: string;
        expires_in: number;
    };

    return payload.access_token;
}

/**
 * A valid access token, refreshed and cached as needed.
 * Costs at most one Redis command per refresh window.
 */
export async function getAccessToken(): Promise<string> {
    const now = Date.now();

    if (_tokenMemo && _tokenMemo.expiresAt > now) {
        return _tokenMemo.token;
    }

    // Cross-isolate fallback: another isolate may have refreshed recently.
    const redis = getRedis();
    if (redis) {
        try {
            const cached = await redis.get<{ token: string; expiresAt: number }>(
                TOKEN_CACHE_KEY,
            );
            if (cached && cached.expiresAt > now) {
                _tokenMemo = cached;
                return cached.token;
            }
        } catch {
            // Cache miss is not fatal — fall through to a fresh token.
        }
    }

    const token = await requestAccessToken();
    const cached: CachedToken = {
        token,
        expiresAt: now + ACCESS_TOKEN_TTL_SECONDS * 1000,
    };
    _tokenMemo = cached;

    if (redis) {
        try {
            await redis.set(TOKEN_CACHE_KEY, cached, {
                ex: ACCESS_TOKEN_TTL_SECONDS,
            });
        } catch {
            // Caching is an optimisation, never a requirement.
        }
    }

    return token;
}

// --- Low-level Drive helpers --------------------------------------

async function driveFetch(
    path: string,
    init: RequestInit & { token: string },
): Promise<Response> {
    const { token, ...rest } = init;
    return fetch(`${DRIVE_API}${path}`, {
        ...rest,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(rest.headers ?? {}),
        },
    });
}

async function readDriveError(response: Response, action: string): Promise<string> {
    const body = await response.text().catch(() => "");
    let detail = body;
    try {
        const parsed = JSON.parse(body) as {
            error?: { message?: string };
        };
        if (parsed.error?.message) detail = parsed.error.message;
    } catch {
        // Not JSON — the raw body is the best we have.
    }
    return `Drive ${action} failed (${response.status}): ${detail}`;
}

// --- Folders ------------------------------------------------------

function folderCacheKey(path: string): string {
    return `drive:folder:${path}`;
}

/**
 * Find a folder by name under a parent, creating it when missing.
 * Folder IDs are cached in Redis so repeat approvals cost no Drive quota.
 */
async function findOrCreateFolder(
    parentId: string | null,
    name: string,
    token: string,
): Promise<string> {
    const redis = getRedis();
    const cacheKey = folderCacheKey(`${parentId ?? "root"}/${name}`);

    if (redis) {
        try {
            const cached = await redis.get<string>(cacheKey);
            if (cached) return cached;
        } catch {
            // Cache miss is not fatal.
        }
    }

    // Look for an existing folder first. `files.list` costs 100 quota units,
    // so it is worth the cache above but not worth repeating per upload.
    const query = parentId
        ? `name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
        : `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    const listResponse = await driveFetch(`/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
        token,
    });

    if (listResponse.ok) {
        const listed = (await listResponse.json()) as {
            files?: { id: string; name: string }[];
        };
        const existing = listed.files?.[0];
        if (existing) {
            await cacheFolderId(redis, cacheKey, existing.id);
            return existing.id;
        }
    }

    // Not found — create it.
    const createResponse = await driveFetch("/files", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name,
            mimeType: "application/vnd.google-apps.folder",
            ...(parentId ? { parents: [parentId] } : {}),
        }),
    });

    if (!createResponse.ok) {
        throw new DriveError(
            await readDriveError(createResponse, `folder creation for "${name}"`),
            createResponse.status,
        );
    }

    const created = (await createResponse.json()) as { id: string };
    await cacheFolderId(redis, cacheKey, created.id);
    return created.id;
}

async function cacheFolderId(
    redis: Redis | null,
    key: string,
    id: string,
): Promise<void> {
    if (!redis) return;
    try {
        await redis.set(key, id, { ex: FOLDER_CACHE_TTL_SECONDS });
    } catch {
        // Caching is an optimisation, never a requirement.
    }
}

/**
 * Resolve a slash-separated path under the app-managed tree, creating any
 * missing folders. `[]` resolves to the Contributions root itself.
 */
export async function resolveFolder(
    segments: string[],
    token: string,
): Promise<string | null> {
    if (segments.length === 0) return null;

    let parentId: string | null = null;
    for (const segment of segments) {
        parentId = await findOrCreateFolder(parentId, segment, token);
    }
    return parentId;
}

// --- Uploads ------------------------------------------------------

export interface UploadResult {
    fileId: string;
    viewUrl: string;
    previewUrl: string;
}

/**
 * Upload a file into the Pending folder.
 *
 * Files up to 5 MB use a single multipart request; larger files use the
 * resumable protocol (an init request followed by a PUT of the bytes).
 * Either way the file lands in the Pending folder and is NOT shared —
 * it becomes readable only once a reviewer approves it.
 */
export async function uploadPaper(
    file: File,
    metadata: { name: string; folderSegments?: string[] },
): Promise<UploadResult> {
    const token = await getAccessToken();

    const segments = metadata.folderSegments ?? [DRIVE_ROOT, PENDING_FOLDER];
    const folderId = await resolveFolder(segments, token);

    const fileMetadata = {
        name: metadata.name,
        mimeType: "application/pdf",
        ...(folderId ? { parents: [folderId] } : {}),
    };

    const fileId =
        file.size <= MULTIPART_MAX_BYTES
            ? await multipartUpload(file, fileMetadata, token)
            : await resumableUpload(file, fileMetadata, token);

    return {
        fileId,
        viewUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    };
}

async function multipartUpload(
    file: File,
    metadata: Record<string, unknown>,
    token: string,
): Promise<string> {
    const boundary = "fot-portal-contributions-boundary";
    const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
        JSON.stringify(metadata),
        `\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
        file,
        `\r\n--${boundary}--`,
    ]);

    const response = await fetch(
        `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id&supportsAllDrives=true`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body,
        },
    );

    if (!response.ok) {
        throw new DriveError(
            await readDriveError(response, "upload"),
            response.status,
        );
    }

    const created = (await response.json()) as { id: string };
    return created.id;
}

async function resumableUpload(
    file: File,
    metadata: Record<string, unknown>,
    token: string,
): Promise<string> {
    // Step 1: open a session.
    const initResponse = await fetch(
        `${DRIVE_UPLOAD_API}/files?uploadType=resumable&supportsAllDrives=true`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Type": "application/pdf",
                "X-Upload-Content-Length": String(file.size),
            },
            body: JSON.stringify(metadata),
        },
    );

    if (!initResponse.ok) {
        throw new DriveError(
            await readDriveError(initResponse, "resumable session init"),
            initResponse.status,
        );
    }

    const sessionUrl = initResponse.headers.get("Location");
    if (!sessionUrl) {
        throw new DriveError(
            "Drive did not return a resumable session URL for the upload.",
        );
    }

    // Step 2: send the bytes. A single request is fine — the Worker holds
    // the whole file already, and chunking would cost extra round-trips
    // for no benefit at these sizes.
    const uploadResponse = await fetch(sessionUrl, {
        method: "PUT",
        headers: {
            "Content-Length": String(file.size),
            "Content-Type": "application/pdf",
        },
        body: file,
    });

    if (!uploadResponse.ok) {
        throw new DriveError(
            await readDriveError(uploadResponse, "resumable upload"),
            uploadResponse.status,
        );
    }

    const created = (await uploadResponse.json()) as { id: string };
    return created.id;
}

// --- File operations ----------------------------------------------

/**
 * Move a file to a new parent folder. Drive re-evaluates permissions
 * against the new parent when a file is moved.
 */
export async function moveFile(
    fileId: string,
    newParentId: string,
    token: string,
): Promise<void> {
    const fileResponse = await driveFetch(
        `/files/${fileId}?fields=parents&supportsAllDrives=true`,
        { token },
    );

    if (!fileResponse.ok) {
        throw new DriveError(
            await readDriveError(fileResponse, "file lookup"),
            fileResponse.status,
        );
    }

    const file = (await fileResponse.json()) as { parents?: string[] };
    const oldParents = file.parents ?? [];

    const response = await driveFetch(
        `/files/${fileId}?addParents=${encodeURIComponent(newParentId)}&removeParents=${encodeURIComponent(oldParents.join(","))}&supportsAllDrives=true`,
        {
            method: "PATCH",
            token,
            headers: { "Content-Type": "application/json" },
            body: "{}",
        },
    );

    if (!response.ok) {
        throw new DriveError(
            await readDriveError(response, "file move"),
            response.status,
        );
    }
}

/**
 * Grant read access to the university domain.
 *
 * Domain sharing only works on a Google Workspace account. On a personal
 * account Drive rejects it, so we fall back to "anyone with the link" and
 * report which path was taken — the fallback must never be silent.
 */
export async function sharePaper(
    fileId: string,
    token: string,
): Promise<"domain" | "anyone"> {
    const domainResponse = await driveFetch(
        `/files/${fileId}/permissions?supportsAllDrives=true`,
        {
            method: "POST",
            token,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                role: "reader",
                type: "domain",
                domain: SHARE_DOMAIN,
            }),
        },
    );

    if (domainResponse.ok) return "domain";

    // Fall back to public link sharing.
    const anyoneResponse = await driveFetch(
        `/files/${fileId}/permissions?supportsAllDrives=true`,
        {
            method: "POST",
            token,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                role: "reader",
                type: "anyone",
            }),
        },
    );

    if (!anyoneResponse.ok) {
        throw new DriveError(
            await readDriveError(anyoneResponse, "permission grant"),
            anyoneResponse.status,
        );
    }

    return "anyone";
}

/**
 * Share a folder with specific reviewers so they can preview pending
 * submissions directly in Drive, without the file passing through the
 * Worker.
 */
export async function shareFolderWithUsers(
    folderId: string,
    emails: string[],
    token: string,
): Promise<void> {
    for (const email of emails) {
        const response = await driveFetch(
            `/files/${folderId}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
            {
                method: "POST",
                token,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: "reader",
                    type: "user",
                    emailAddress: email,
                }),
            },
        );

        if (!response.ok) {
            throw new DriveError(
                await readDriveError(
                    response,
                    `folder share with ${email}`,
                ),
                response.status,
            );
        }
    }
}

// --- Composite operations used by the admin routes -----------------

export interface ApprovalTarget {
    fileId: string;
    /** Path segments under the Contributions root, e.g. ["ICT","2nd Year"]. */
    folderSegments: string[];
    fileName: string;
}

/**
 * File an approved paper into the Contributions tree and share it.
 * Returns which sharing mode was actually applied.
 */
export async function fileApprovedPaper(
    target: ApprovalTarget,
): Promise<"domain" | "anyone"> {
    const token = await getAccessToken();
    const folderId = await resolveFolder(
        [DRIVE_ROOT, ...target.folderSegments],
        token,
    );

    if (folderId) {
        await moveFile(target.fileId, folderId, token);
    }

    // Rename the file to match the catalogue entry.
    await driveFetch(`/files/${target.fileId}?supportsAllDrives=true`, {
        method: "PATCH",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: target.fileName }),
    }).catch((error) => {
        // A failed rename must not block publication — the link still works.
        console.warn("[drive] rename failed:", error);
    });

    return sharePaper(target.fileId, token);
}

/**
 * Move a rejected submission's file into the Rejected folder.
 */
export async function fileRejectedPaper(fileId: string): Promise<void> {
    const token = await getAccessToken();
    const folderId = await resolveFolder(
        [DRIVE_ROOT, REJECTED_FOLDER],
        token,
    );

    if (!folderId) return;
    await moveFile(fileId, folderId, token);
}
