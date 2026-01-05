-- 投稿画像テーブル（複数画像対応）
CREATE TABLE IF NOT EXISTS post_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_order ON post_images(post_id, display_order);

-- 動画URLカラムを追加（まだない場合）
-- ALTER TABLE posts ADD COLUMN video_url TEXT;

-- 既存のthumbnail_urlは残す（後方互換性のため）
