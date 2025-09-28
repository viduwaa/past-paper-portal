import { sql } from "@vercel/postgres";

export interface WebsiteFeedback {
    id: number;
    rating: number;
    browserId: string;
    userAgent: string | null;
    timestamp: Date;
}

export class Database {
    static async testConnection(): Promise<void> {
        try {
            await sql`SELECT 1`;
        } catch (error) {
            throw new Error(`Database connection failed: ${error}`);
        }
    }

    static async findRecentFeedback(
        browserId: string
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
        userAgent: string | null
    ): Promise<WebsiteFeedback> {
        try {
            // First try to update existing record
            const updateResult = await sql`
    UPDATE website_feedback
    SET 
        rating = ${rating}, 
        timestamp = NOW(),     
        user_agent = ${userAgent}
    WHERE browser_id = ${browserId}
    RETURNING id, rating, browser_id, user_agent, timestamp
`

            if (updateResult.rows.length > 0) {
                const row = updateResult.rows[0];
                return {
                    id: row.id,
                    rating: row.rating,
                    browserId: row.browser_id,
                    userAgent: row.user_agent,
                    timestamp: row.timestamp,
                };
            }

            // If no existing record, insert new one
            const insertResult = await sql`
                INSERT INTO website_feedback (rating, browser_id, user_agent)
                VALUES (${rating}, ${browserId}, ${userAgent})
                RETURNING id, rating, browser_id, user_agent, timestamp
            `;

            const row = insertResult.rows[0];
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

            return result.rows.map((row: any) => ({
                id: row.id,
                rating: row.rating,
                browserId: row.browser_id,
                userAgent: row.user_agent,
                timestamp: row.timestamp,
            }));
        } catch (error) {
            throw new Error(`Failed to get all feedback: ${error}`);
        }
    }
}
