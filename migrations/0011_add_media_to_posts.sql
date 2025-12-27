-- Add media support to posts table
-- Support for images, videos, and multiple media attachments

-- Add media_type column to posts (image, video, mixed)
ALTER TABLE posts ADD COLUMN media_type TEXT DEFAULT 'none';

-- Add video_url column for video attachments
ALTER TABLE posts ADD COLUMN video_url TEXT;

-- Create media_attachments table for multiple media support
CREATE TABLE IF NOT EXISTS media_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  media_type TEXT NOT NULL, -- 'image' or 'video'
  media_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_media_post ON media_attachments(post_id, display_order);
