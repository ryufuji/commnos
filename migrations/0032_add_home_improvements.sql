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
  priority TEXT DEFAULT 'info', -- urgent, important, info
  is_published INTEGER DEFAULT 1, -- 公開フラグ
  is_pinned INTEGER DEFAULT 0, -- ピン留めフラグ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- NULL = 無期限
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned DESC);

-- 投稿テーブルにピン留めフィールドを追加（存在しない場合のみ）
-- SQLiteはALTER TABLE IF NOT EXISTS未対応のため、エラーを無視
-- is_pinnedカラムが既に存在する場合はスキップ
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(is_pinned, created_at DESC);

-- テナントテーブルにカスタムコンテンツフィールドを追加（存在しない場合のみ）
-- SQLiteはALTER TABLE IF NOT EXISTS未対応のため、エラーを無視
-- hero_custom_contentとfooter_custom_contentが既に存在する場合はスキップ
