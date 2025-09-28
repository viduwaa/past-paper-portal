-- Create the website_feedback table
CREATE TABLE IF NOT EXISTS website_feedback (
    id SERIAL PRIMARY KEY,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    browser_id VARCHAR(255) NOT NULL UNIQUE,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on browser_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_website_feedback_browser_id ON website_feedback(browser_id);

-- Create an index on timestamp for faster ordering
CREATE INDEX IF NOT EXISTS idx_website_feedback_timestamp ON website_feedback(timestamp DESC);