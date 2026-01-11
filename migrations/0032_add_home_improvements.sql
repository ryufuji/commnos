-- Migration: ホームページ改善機能
-- 1. お知らせテーブル
-- 2. 投稿のピン留め機能
-- 3. テナントのカスタムコンテンツエリア

-- お知らせテーブル
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, warning, success, error
  is_active INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0, -- 高い数字ほど優先表示
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- NULL = 無期限
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority DESC);

-- 投稿テーブルにピン留めフィールドを追加
ALTER TABLE posts ADD COLUMN is_pinned INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(is_pinned, created_at DESC);

-- テナントテーブルにカスタムコンテンツフィールドを追加
ALTER TABLE tenants ADD COLUMN hero_custom_content TEXT;
ALTER TABLE tenants ADD COLUMN footer_custom_content TEXT;
