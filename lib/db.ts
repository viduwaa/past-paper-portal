import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
        process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
});

export interface WebsiteFeedback {
    id: number;
    rating: number;
    browserId: string;
    userAgent: string | null;
    timestamp: Date;
}

export class Database {
    static async testConnection(): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query("SELECT 1");
        } finally {
            client.release();
        }
    }

    static async findRecentFeedback(
        browserId: string
    ): Promise<WebsiteFeedback | null> {
        const client = await pool.connect();
        try {
            const result = await client.query(
                "SELECT id, rating, browser_id, user_agent, timestamp FROM website_feedback WHERE browser_id = $1 AND timestamp >= $2 ORDER BY timestamp DESC LIMIT 1",
                [browserId, new Date(Date.now() - 3600000)] // Last hour
            );
            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                rating: row.rating,
                browserId: row.browser_id,
                userAgent: row.user_agent,
                timestamp: row.timestamp,
            };
        } finally {
            client.release();
        }
    }

    static async upsertFeedback(
        rating: number,
        browserId: string,
        userAgent: string | null
    ): Promise<WebsiteFeedback> {
        const client = await pool.connect();
        try {
            // First try to update existing record
            const updateResult = await client.query(
                "UPDATE website_feedback SET rating = $1, timestamp = $2, user_agent = $3 WHERE browser_id = $4 RETURNING id, rating, browser_id, user_agent, timestamp",
                [rating, new Date(), userAgent, browserId]
            );

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
            const insertResult = await client.query(
                "INSERT INTO website_feedback (rating, browser_id, user_agent) VALUES ($1, $2, $3) RETURNING id, rating, browser_id, user_agent, timestamp",
                [rating, browserId, userAgent]
            );

            const row = insertResult.rows[0];
            return {
                id: row.id,
                rating: row.rating,
                browserId: row.browser_id,
                userAgent: row.user_agent,
                timestamp: row.timestamp,
            };
        } finally {
            client.release();
        }
    }

    static async getAllFeedback(): Promise<WebsiteFeedback[]> {
        const client = await pool.connect();
        try {
            const result = await client.query(
                "SELECT id, rating, browser_id, user_agent, timestamp FROM website_feedback ORDER BY timestamp DESC"
            );

            return result.rows.map(
                (row: {
                    id: number;
                    rating: number;
                    browser_id: string;
                    user_agent: string | null;
                    timestamp: Date;
                }) => ({
                    id: row.id,
                    rating: row.rating,
                    browserId: row.browser_id,
                    userAgent: row.user_agent,
                    timestamp: row.timestamp,
                })
            );
        } finally {
            client.release();
        }
    }
}

export default pool;
