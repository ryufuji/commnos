-- ============================================
-- Migration: プランベースのアクセス制御
-- Created: 2026-01-08
-- Purpose: プランによるコンテンツ制限機能の追加
-- ============================================

-- 1. tenant_plans にプランレベルを追加
-- plan_level: プランの階層（数値が大きいほど上位プラン）
-- 0=無料, 1=ベーシック, 2=スタンダード, 3=プレミアム など
ALTER TABLE tenant_plans ADD COLUMN plan_level INTEGER DEFAULT 0;

-- 2. posts テーブルに制限フィールドを追加
-- required_plan_level: この投稿を見るために必要な最小プランレベル
ALTER TABLE posts ADD COLUMN required_plan_level INTEGER DEFAULT 0;

-- is_members_only: 会員限定フラグ（ログイン必須）
ALTER TABLE posts ADD COLUMN is_members_only INTEGER DEFAULT 0;

-- is_premium_content: プレミアムコンテンツフラグ（検索結果などでの表示用）
ALTER TABLE posts ADD COLUMN is_premium_content INTEGER DEFAULT 0;

-- preview_length: プレビュー表示可能な文字数（0=全文表示可能）
ALTER TABLE posts ADD COLUMN preview_length INTEGER DEFAULT 0;

-- 3. カテゴリテーブルの作成（オプション）
CREATE TABLE IF NOT EXISTS post_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  required_plan_level INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, slug)
);

-- カテゴリインデックス
CREATE INDEX IF NOT EXISTS idx_post_categories_tenant ON post_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_post_categories_active ON post_categories(is_active);

-- 4. posts にカテゴリ関連付け
ALTER TABLE posts ADD COLUMN category_id INTEGER;

-- カテゴリインデックス
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);

-- 5. アクセスログテーブル（分析用・オプション）
CREATE TABLE IF NOT EXISTS post_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER,
  tenant_id INTEGER NOT NULL,
  access_granted INTEGER DEFAULT 1,
  user_plan_level INTEGER DEFAULT 0,
  required_plan_level INTEGER DEFAULT 0,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- アクセスログインデックス
CREATE INDEX IF NOT EXISTS idx_post_access_logs_post ON post_access_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_post_access_logs_user ON post_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_post_access_logs_tenant ON post_access_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_post_access_logs_date ON post_access_logs(accessed_at);

-- 6. 既存のプランにデフォルトのプランレベルを設定
-- 価格に基づいて自動的にレベルを設定（例として）
UPDATE tenant_plans 
SET plan_level = CASE 
  WHEN price = 0 THEN 0
  WHEN price < 1000 THEN 1
  WHEN price < 3000 THEN 2
  ELSE 3
END
WHERE plan_level = 0;

-- 7. 既存の投稿はすべて無料（plan_level=0）に設定
UPDATE posts SET required_plan_level = 0 WHERE required_plan_level IS NULL;
