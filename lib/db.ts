import { describeError, getSupabase } from "@/lib/supabase";

export interface WebsiteFeedback {
    id: number;
    rating: number;
    browserId: string;
    userAgent: string | null;
    timestamp: Date;
}

export interface PastPaper {
    id: number;
    file_name: string;
    view_url: string;
    preview_url: string;
    /** Nullable in the database — a handful of legacy rows have no code. */
    department_code: string | null;
    department_name: string | null;
    academic_year: string;
    semester: string;
    exam_year: string;
    course_code: string | null;
    course_name: string | null;
    created_at: Date;
    /** 'official' = imported by a maintainer, 'contributed' = community. */
    source: "official" | "contributed";
    contributor_name: string | null;
    contributor_github: string | null;
}

export interface PaperFilters {
    year?: string;
    semester?: string;
    department?: string;
    courseCode?: string;
    searchQuery?: string;
}

type PaperRow = Omit<PastPaper, "created_at"> & { created_at: string };

function toPaper(row: PaperRow): PastPaper {
    return { ...row, created_at: new Date(row.created_at) };
}

function toFeedback(row: {
    id: number;
    rating: number;
    browser_id: string;
    user_agent: string | null;
    timestamp: string;
}): WebsiteFeedback {
    return {
        id: row.id,
        rating: row.rating,
        browserId: row.browser_id,
        userAgent: row.user_agent,
        timestamp: new Date(row.timestamp),
    };
}

export class Database {
    static async testConnection(): Promise<void> {
        try {
            const { error } = await getSupabase()
                .from("past_papers")
                .select("id", { count: "exact", head: true })
                .limit(1);
            if (error) throw error;
        } catch (error) {
            // supabase-js/PostgREST sometimes return an empty-message error
            // (e.g. Kong answers 401 with plain text, which fails JSON
            // parsing downstream). A raw probe distinguishes "bad URL/key"
            // (HTTP 401/404) from "unreachable host" (fetch throws), so
            // include its status and body snippet in the message.
            let probe = "";
            try {
                const url = process.env.SUPABASE_URL?.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
                const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
                if (url && key) {
                    const res = await fetch(`${url}/rest/v1/past_papers?select=id&limit=1`, {
                        headers: { apikey: key, Authorization: `Bearer ${key}` },
                    });
                    const body = (await res.text()).slice(0, 200);
                    probe = ` Probe: HTTP ${res.status} ${body}`;
                } else {
                    probe = " Probe: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing or empty.";
                }
            } catch (probeError) {
                probe = ` Probe failed: ${describeError(probeError)}`;
            }
            throw new Error(`Database connection failed: ${describeError(error)}.${probe}`);
        }
    }

    // ============================================================
    // Past Papers Methods
    // ============================================================

    static async getAllPapers(): Promise<PastPaper[]> {
        const { data, error } = await getSupabase()
            .from("past_papers")
            .select("*")
            .order("exam_year", { ascending: false })
            .order("course_code", { ascending: true });
        if (error) throw error;
        return (data as PaperRow[]).map(toPaper);
    }

    static filterPapers(papers: PastPaper[], filters: PaperFilters): PastPaper[] {
        const { year, semester, department, courseCode, searchQuery } = filters;

        return papers.filter((p) => {
            const courseCodeValue = (p.course_code ?? "").toLowerCase();
            const courseNameValue = (p.course_name ?? "").toLowerCase();
            const fileNameValue = (p.file_name ?? "").toLowerCase();

            if (year && p.academic_year !== year) return false;
            if (semester && p.semester !== semester) return false;
            if (department) {
                const common = ["CMT", "CML"];
                const deptCode = p.department_code ?? "";
                if (department === "ITT" || department === "ICT") {
                    const allowed = [department, "ICT", "ITT", ...common];
                    if (!allowed.includes(deptCode)) return false;
                } else {
                    const allowed = [department, ...common];
                    if (!allowed.includes(deptCode)) return false;
                }
            }
            if (courseCode) {
                if (!courseCodeValue.includes(courseCode.toLowerCase())) return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (
                    !courseNameValue.includes(q) &&
                    !fileNameValue.includes(q) &&
                    !courseCodeValue.includes(q)
                )
                    return false;
            }
            return true;
        });
    }

    static async getPapers(filters: PaperFilters): Promise<PastPaper[]> {
        // PostgREST can't express the OR'd ILIKE search cleanly, and the
        // catalogue is small enough that /api/papers already loads it all
        // and filters in memory — so filter here the same way.
        try {
            const papers = await Database.getAllPapers();
            return Database.filterPapers(papers, filters);
        } catch (error) {
            console.error("Failed to fetch papers:", error);
            throw new Error("Failed to fetch papers");
        }
    }

    static async getFilterOptions() {
        try {
            // PostgREST has no DISTINCT; fetch the single column and
            // dedupe in JS (the catalogue is a few thousand rows).
            const distinct = async (column: string): Promise<string[]> => {
                const { data, error } = await getSupabase()
                    .from("past_papers")
                    .select(column)
                    .not(column, "is", null)
                    .order(column, { ascending: true });
                if (error) throw error;
                const values = new Set(
                    (data as unknown as Record<string, unknown>[]).map(
                        (r) => r[column] as string,
                    ),
                );
                return Array.from(values);
            };

            const [years, semesters, departments] = await Promise.all([
                distinct("academic_year"),
                distinct("semester"),
                distinct("department_code"),
            ]);

            return { years, semesters, departments };
        } catch (error) {
            console.error("Failed to fetch filter options:", error);
            return { years: [], semesters: [], departments: [] };
        }
    }

    /**
     * Every exam year a paper can belong to, newest first.
     *
     * The catalogue's own years plus the current calendar year, because a
     * student should be able to upload this year's paper as soon as it is
     * out — before any 2026 row exists, a DISTINCT alone would not
     * offer it and the server-side whitelist would reject it.
     */
    static async getExamYears() {
        const currentYear = String(new Date().getUTCFullYear());
        try {
            const { data, error } = await getSupabase()
                .from("past_papers")
                .select("exam_year")
                .not("exam_year", "is", null);
            if (error) throw error;
            const years = new Set(
                (data as { exam_year: string }[]).map((r) => r.exam_year),
            );
            years.add(currentYear);
            return Array.from(years)
                .filter(Boolean)
                .sort((a, b) => Number(b) - Number(a));
        } catch (error) {
            console.error("Failed to fetch exam years:", error);
            return [currentYear];
        }
    }

    /**
     * Every subject code in the catalogue, with its name, for the
     * contribute form's datalist. Codes are stored in more than one
     * shape across the corpus ("ICT 1209", "CMT- 2301", "FDT1201"), so
     * they are normalised on the way out to avoid duplicate suggestions.
     */
    static async getDistinctCourseCodes() {
        try {
            const { data, error } = await getSupabase()
                .from("past_papers")
                .select("course_code, course_name")
                .not("course_code", "is", null)
                .neq("course_code", "")
                .order("course_code", { ascending: true });
            if (error) throw error;

            const seen = new Map<string, string>();
            for (const row of data as {
                course_code: string;
                course_name: string | null;
            }[]) {
                const normalised = row.course_code
                    .trim()
                    .replace(/^([A-Za-z]{2,4})\s*-?\s*(\d{3,4})$/, "$1 $2")
                    .toUpperCase();
                if (!normalised) continue;
                if (!seen.has(normalised)) {
                    seen.set(normalised, row.course_name ?? "");
                }
            }

            return Array.from(seen.entries())
                .map(([code, name]) => ({ code, name }))
                .sort((a, b) => a.code.localeCompare(b.code));
        } catch (error) {
            console.error("Failed to fetch course codes:", error);
            return [];
        }
    }

    // ============================================================
    // Feedback Methods
    // ============================================================

    static async findRecentFeedback(
        browserId: string,
    ): Promise<WebsiteFeedback | null> {
        try {
            const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data, error } = await getSupabase()
                .from("website_feedback")
                .select("id, rating, browser_id, user_agent, timestamp")
                .eq("browser_id", browserId)
                .gte("timestamp", since)
                .order("timestamp", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            return toFeedback(
                data as {
                    id: number;
                    rating: number;
                    browser_id: string;
                    user_agent: string | null;
                    timestamp: string;
                },
            );
        } catch (error) {
            throw new Error(`Failed to find recent feedback: ${describeError(error)}`);
        }
    }

    static async upsertFeedback(
        rating: number,
        browserId: string,
        userAgent: string | null,
    ): Promise<WebsiteFeedback> {
        try {
            const { data, error } = await getSupabase()
                .from("website_feedback")
                .upsert(
                    { rating, browser_id: browserId, user_agent: userAgent },
                    { onConflict: "browser_id" },
                )
                .select("id, rating, browser_id, user_agent, timestamp")
                .single();
            if (error) throw error;
            return toFeedback(
                data as {
                    id: number;
                    rating: number;
                    browser_id: string;
                    user_agent: string | null;
                    timestamp: string;
                },
            );
        } catch (error) {
            throw new Error(`Failed to upsert feedback: ${describeError(error)}`);
        }
    }

    static async getAllFeedback(): Promise<WebsiteFeedback[]> {
        try {
            const { data, error } = await getSupabase()
                .from("website_feedback")
                .select("id, rating, browser_id, user_agent, timestamp")
                .order("timestamp", { ascending: false });
            if (error) throw error;
            return (data as Parameters<typeof toFeedback>[0][]).map(toFeedback);
        } catch (error) {
            throw new Error(`Failed to get all feedback: ${describeError(error)}`);
        }
    }
}

