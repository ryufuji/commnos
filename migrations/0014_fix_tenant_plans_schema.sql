-- ============================================
-- tenant_plans テーブルの修正
-- ストレージとメンバー数上限はテナント全体の制限であり、
-- メンバー向けプランには関係ないため削除
-- ============================================

-- SQLiteはALTER TABLE DROP COLUMNをサポートしていないため、
-- 新しいテーブルを作成して移行する

-- 1. 新しいテーブルを作成（不要なフィールドを除外）
CREATE TABLE IF NOT EXISTS tenant_plans_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,                    -- プラン名（例: 「ベーシック」、「プレミアム」）
  description TEXT,                      -- プラン説明
  price INTEGER NOT NULL,                -- 月額料金（円）
  features TEXT,                         -- 機能リスト（JSON）- メンバー向け特典
  is_active INTEGER DEFAULT 1,           -- 有効/無効
  stripe_price_id TEXT,                  -- Stripe Price ID
  stripe_product_id TEXT,                -- Stripe Product ID
  sort_order INTEGER DEFAULT 0,          -- 表示順序
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 2. 既存データを移行（storage_limit と member_limit を除外）
INSERT INTO tenant_plans_new (
  id, tenant_id, name, description, price, features,
  is_active, stripe_price_id, stripe_product_id, sort_order,
  created_at, updated_at
)
SELECT 
  id, tenant_id, name, description, price, features,
  is_active, stripe_price_id, stripe_product_id, sort_order,
  created_at, updated_at
FROM tenant_plans;

-- 3. 古いテーブルを削除
DROP TABLE tenant_plans;

-- 4. 新しいテーブルをリネーム
ALTER TABLE tenant_plans_new RENAME TO tenant_plans;

-- 5. インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_tenant_plans_tenant ON tenant_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_active ON tenant_plans(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_stripe_price ON tenant_plans(stripe_price_id);
