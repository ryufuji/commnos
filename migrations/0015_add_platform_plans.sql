-- ============================================
-- プラットフォームプラン定義テーブル（フェーズ1: VALUE ARCHITECTS向け）
-- ストレージ上限、メンバー数上限、手数料率などを管理
-- ============================================

CREATE TABLE IF NOT EXISTS platform_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,                -- 内部識別名（例: 'free', 'starter', 'growth', 'enterprise'）
  display_name TEXT NOT NULL,               -- 表示名（例: 'フリー', 'スターター', '成長', 'エンタープライズ'）
  price INTEGER NOT NULL,                   -- 月額料金（円）
  member_limit INTEGER NOT NULL,            -- メンバー数上限（-1 = 無制限）
  storage_limit_gb INTEGER NOT NULL,        -- ストレージ上限（GB）
  platform_fee_rate INTEGER NOT NULL DEFAULT 20,  -- プラットフォーム手数料率（%）
  features TEXT,                            -- 機能リスト（JSON）
  description TEXT,                         -- プラン説明
  is_active INTEGER DEFAULT 1,              -- 有効/無効
  sort_order INTEGER DEFAULT 0,             -- 表示順序
  stripe_price_id TEXT,                     -- Stripe Price ID（将来的な自動課金用）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_plans_active ON platform_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_platform_plans_name ON platform_plans(name);
CREATE INDEX IF NOT EXISTS idx_platform_plans_sort ON platform_plans(sort_order);

-- ============================================
-- 初期プランデータ
-- ============================================

INSERT INTO platform_plans (name, display_name, price, member_limit, storage_limit_gb, platform_fee_rate, features, description, sort_order) VALUES
  (
    'free',
    'フリー',
    0,
    50,
    1,
    20,
    '{"posts": 10, "storage": "1GB", "members": 50, "support": "コミュニティ", "analytics": false, "custom_domain": false}',
    '個人・小規模コミュニティ向けの無料プラン。最大50人まで参加可能で、基本的な投稿機能とストレージ1GBを提供します。',
    1
  ),
  (
    'starter',
    'スターター',
    3000,
    100,
    5,
    20,
    '{"posts": "無制限", "storage": "5GB", "members": 100, "support": "メール", "analytics": true, "custom_domain": false}',
    '成長中のコミュニティ向けプラン。最大100人まで参加可能で、無制限の投稿、5GBのストレージ、メールサポート、基本的な分析機能を提供します。',
    2
  ),
  (
    'growth',
    '成長',
    10000,
    500,
    50,
    20,
    '{"posts": "無制限", "storage": "50GB", "members": 500, "support": "優先対応", "analytics": true, "custom_domain": true, "advanced_moderation": true}',
    '中規模コミュニティ向けプラン。最大500人まで参加可能で、50GBのストレージ、優先サポート、カスタムドメイン、高度なモデレーション機能を提供します。',
    3
  ),
  (
    'enterprise',
    'エンタープライズ',
    30000,
    -1,
    500,
    15,
    '{"posts": "無制限", "storage": "500GB", "members": "無制限", "support": "専任担当", "analytics": true, "custom_domain": true, "advanced_moderation": true, "sla": true, "white_label": true, "api_access": true}',
    '大規模コミュニティ・企業向けプラン。無制限のメンバー、500GBのストレージ、専任サポート担当、SLA保証、ホワイトラベル、API アクセスを提供します。手数料率15%。',
    4
  );

-- ============================================
-- tenants テーブルに platform_plan_id カラムを追加
-- ============================================

ALTER TABLE tenants ADD COLUMN platform_plan_id INTEGER REFERENCES platform_plans(id);

-- ============================================
-- 既存データの移行
-- 既存の plan カラム（文字列）から platform_plan_id（整数）へ
-- ============================================

UPDATE tenants SET platform_plan_id = (SELECT id FROM platform_plans WHERE name = 'free') WHERE plan = 'free' OR plan IS NULL;
UPDATE tenants SET platform_plan_id = (SELECT id FROM platform_plans WHERE name = 'starter') WHERE plan = 'starter';
UPDATE tenants SET platform_plan_id = (SELECT id FROM platform_plans WHERE name = 'growth') WHERE plan = 'pro' OR plan = 'growth';
UPDATE tenants SET platform_plan_id = (SELECT id FROM platform_plans WHERE name = 'enterprise') WHERE plan = 'enterprise';

-- デフォルト値設定（まだnullの場合はfreeに）
UPDATE tenants SET platform_plan_id = (SELECT id FROM platform_plans WHERE name = 'free') WHERE platform_plan_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_platform_plan ON tenants(platform_plan_id);

-- ============================================
-- tenant_earnings テーブルと platform_plans の連携
-- 手数料率をプランから自動取得できるようにする
-- ============================================

-- NOTE: tenant_earnings.platform_fee_rate は残す（個別カスタマイズ用）
-- デフォルト値はプランから取得するが、個別に変更可能にする
