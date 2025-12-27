-- Migration: 投稿に公開範囲（visibility）を追加
-- Date: 2025-12-27
-- Description: 投稿を「会員限定」または「パブリック」に設定できるようにする

-- postsテーブルにvisibilityカラムを追加
ALTER TABLE posts ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';

-- visibility: 'public' または 'members_only'
-- public: 誰でも閲覧可能
-- members_only: テナントの会員のみ閲覧可能

-- インデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_visibility ON posts(tenant_id, visibility);
