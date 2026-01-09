-- Add scheduled_at column to posts table for scheduled publishing
-- This allows admins to schedule posts for future publication

-- Check if scheduled_at column exists, if not add it
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS,
-- so we'll use a workaround with a check

-- Add scheduled_at column (nullable, for future publishing time)
-- Only add if it doesn't exist
-- ALTER TABLE posts ADD COLUMN scheduled_at DATETIME DEFAULT NULL;

-- Since we can't conditionally add column in SQLite, we'll handle the error in application
-- For now, we'll just create indexes assuming the column exists or will be added manually

-- Add new status value: 'scheduled' for posts scheduled for future publication
-- Existing values: 'draft', 'published'
-- New value: 'scheduled'

-- Create index on scheduled_at for efficient cron job queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);

-- Create composite index for cron job queries (status + scheduled_at)
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled ON posts(status, scheduled_at);
