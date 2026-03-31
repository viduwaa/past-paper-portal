import { sql } from "@vercel/postgres";

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
    department_code: string;
    department_name: string;
    academic_year: string;
    semester: string;
    exam_year: string;
    course_code: string;
    course_name: string;
    created_at: Date;
}

export interface PaperFilters {
    year?: string;
    semester?: string;
    department?: string;
    courseCode?: string;
    searchQuery?: string;
}

export class Database {
    static async testConnection(): Promise<void> {
        try {
            await sql`SELECT 1`;
        } catch (error) {
            throw new Error(`Database connection failed: ${error}`);
        }
    }

    // ============================================================
    // Past Papers Methods
    // ============================================================

    static async getPapers(filters: PaperFilters): Promise<PastPaper[]> {
        const { year, semester, department, courseCode, searchQuery } = filters;

        try {
            // Start the base query
            let query = `SELECT * FROM past_papers WHERE 1=1`;
            const params: (string | number)[] = [];
            let paramIndex = 1;

            if (year) {
                query += ` AND academic_year = $${paramIndex}`;
                params.push(year);
                paramIndex++;
            }

            if (semester) {
                query += ` AND semester = $${paramIndex}`;
                params.push(semester);
                paramIndex++;
            }

            if (department) {
                // Include CMT and CML as they are common subjects for all departments
                // Treat ITT and ICT as equivalent since they share/cross-list same core subjects
                if (department === "ITT" || department === "ICT") {
                    query += ` AND department_code IN ($${paramIndex}, 'ICT', 'ITT', 'CMT', 'CML')`;
                } else {
                    query += ` AND department_code IN ($${paramIndex}, 'CMT', 'CML')`;
                }
                params.push(department);
                paramIndex++;
            }

            if (courseCode) {
                query += ` AND course_code ILIKE $${paramIndex}`;
                params.push(`%${courseCode}%`);
                paramIndex++;
            }

            if (searchQuery) {
                query += ` AND (course_name ILIKE $${paramIndex} OR file_name ILIKE $${paramIndex} OR course_code ILIKE $${paramIndex})`;
                params.push(`%${searchQuery}%`);
                paramIndex++;
            }

            query += ` ORDER BY exam_year DESC, course_code ASC`;

            // Using raw query for dynamic filtering since Vercel Postgres template tags
            // don't support dynamic WHERE clauses easily without query builders
            const result = await sql.query(query, params);
            return result.rows as PastPaper[];
        } catch (error) {
            console.error("Failed to fetch papers:", error);
            throw new Error("Failed to fetch papers");
        }
    }

    static async getFilterOptions() {
        try {
            // Fetch unique values for the filter dropdowns efficiently
            const [years, semesters, departments] = await Promise.all([
                sql`SELECT DISTINCT academic_year FROM past_papers WHERE academic_year IS NOT NULL ORDER BY academic_year`,
                sql`SELECT DISTINCT semester FROM past_papers WHERE semester IS NOT NULL ORDER BY semester`,
                sql`SELECT DISTINCT department_code FROM past_papers WHERE department_code IS NOT NULL ORDER BY department_code`,
            ]);

            return {
                years: years.rows.map((r) => r.academic_year),
                semesters: semesters.rows.map((r) => r.semester),
                departments: departments.rows.map((r) => r.department_code),
            };
        } catch (error) {
            console.error("Failed to fetch filter options:", error);
            return { years: [], semesters: [], departments: [] };
        }
    }

    // ============================================================
    // Feedback Methods
    // ============================================================

    static async findRecentFeedback(
        browserId: string,
    ): Promise<WebsiteFeedback | null> {
        try {
            const result = await sql`
                SELECT id, rating, browser_id, user_agent, timestamp
                FROM website_feedback
                WHERE browser_id = ${browserId}
                AND timestamp >= NOW() - INTERVAL '1 hour'
                ORDER BY timestamp DESC
                LIMIT 1
            `;

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                rating: row.rating,
                browserId: row.browser_id,
                userAgent: row.user_agent,
                timestamp: row.timestamp,
            };
        } catch (error) {
            throw new Error(`Failed to find recent feedback: ${error}`);
        }
    }

    static async upsertFeedback(
        rating: number,
        browserId: string,
        userAgent: string | null,
    ): Promise<WebsiteFeedback> {
        try {
            // Use ON CONFLICT for upsert functionality
            const result = await sql`
                INSERT INTO website_feedback (rating, browser_id, user_agent)
                VALUES (${rating}, ${browserId}, ${userAgent})
                ON CONFLICT (browser_id)
                DO UPDATE SET
                    rating = EXCLUDED.rating,
                    user_agent = EXCLUDED.user_agent,
                    timestamp = CURRENT_TIMESTAMP
                RETURNING id, rating, browser_id, user_agent, timestamp
            `;

            const row = result.rows[0];
            return {
                id: row.id,
                rating: row.rating,
                browserId: row.browser_id,
                userAgent: row.user_agent,
                timestamp: row.timestamp,
            };
        } catch (error) {
            throw new Error(`Failed to upsert feedback: ${error}`);
        }
    }

    static async getAllFeedback(): Promise<WebsiteFeedback[]> {
        try {
            const result = await sql`
                SELECT id, rating, browser_id, user_agent, timestamp
                FROM website_feedback
                ORDER BY timestamp DESC
            `;

            return result.rows.map((row: unknown) => {
                const r = row as {
                    id: number;
                    rating: number;
                    browser_id: string;
                    user_agent: string | null;
                    timestamp: Date;
                };
                return {
                    id: r.id,
                    rating: r.rating,
                    browserId: r.browser_id,
                    userAgent: r.user_agent,
                    timestamp: r.timestamp,
                };
            });
        } catch (error) {
            throw new Error(`Failed to get all feedback: ${error}`);
        }
    }
}
