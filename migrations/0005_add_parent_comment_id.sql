-- ============================================
-- Phase 2: コメント返信機能のためのカラム追加
-- ============================================

-- parent_comment_id カラムを追加（返信機能用）
ALTER TABLE comments ADD COLUMN parent_comment_id INTEGER DEFAULT NULL;

-- 返信コメントのインデックス
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
