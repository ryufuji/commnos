-- ============================================
-- プラットフォームプランの改善とクーポン機能の追加
-- ============================================

-- 1. フリープランのメンバー上限を100人に変更
UPDATE platform_plans 
SET member_limit = 100,
    description = '個人・小規模コミュニティ向けの無料プラン。最大100人まで参加可能で、基本的な投稿機能とストレージ1GBを提供します。'
WHERE name = 'free';

-- ============================================
-- 2. クーポンテーブルの作成
-- ============================================

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,                -- クーポンコード（例: 'LAUNCH2025', 'VIPACCESS'）
  name TEXT NOT NULL,                       -- クーポン名（例: 'ローンチキャンペーン', 'VIPパートナー向け'）
  description TEXT,                         -- クーポンの説明
  discount_type TEXT NOT NULL DEFAULT 'free_forever',  -- 'free_forever', 'free_months', 'percentage', 'fixed_amount'
  discount_value INTEGER,                   -- 割引値（free_months: 月数、percentage: %、fixed_amount: 円）
  max_redemptions INTEGER DEFAULT -1,       -- 最大使用回数（-1 = 無制限）
  redemptions_count INTEGER DEFAULT 0,      -- 現在の使用回数
  valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 有効期間開始
  valid_until DATETIME,                     -- 有効期限（NULL = 無期限）
  is_active INTEGER DEFAULT 1,              -- 有効/無効
  created_by INTEGER,                       -- 作成者（platform_admins.id）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid ON coupons(valid_from, valid_until);

-- ============================================
-- 3. テナントのクーポン使用履歴テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_coupon_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  coupon_id INTEGER NOT NULL,
  redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,                      -- クーポンの有効期限（free_months用）
  is_active INTEGER DEFAULT 1,              -- 現在有効かどうか
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  
  UNIQUE(tenant_id, coupon_id)  -- 同じクーポンは1回のみ使用可能
);

CREATE INDEX IF NOT EXISTS idx_tenant_coupons_tenant ON tenant_coupon_redemptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_coupons_active ON tenant_coupon_redemptions(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_coupons_expires ON tenant_coupon_redemptions(expires_at);

-- ============================================
-- 4. tenants テーブルに is_coupon_active カラムを追加
-- ============================================

ALTER TABLE tenants ADD COLUMN is_coupon_active INTEGER DEFAULT 0;  -- クーポンが有効かどうか

CREATE INDEX IF NOT EXISTS idx_tenants_coupon_active ON tenants(is_coupon_active);

-- ============================================
-- 5. 初期クーポンデータの挿入（サンプル）
-- ============================================

-- VIPパートナー向け永久無料クーポン
INSERT INTO coupons (code, name, description, discount_type, max_redemptions) VALUES
  ('VIP2025', 'VIPパートナー向け永久無料', 'VIPパートナー様向けの特別クーポン。プラットフォーム利用料が永久に無料になります。', 'free_forever', 50);

-- ローンチキャンペーン: 6ヶ月間無料
INSERT INTO coupons (code, name, description, discount_type, discount_value, max_redemptions, valid_until) VALUES
  ('LAUNCH2025', 'ローンチキャンペーン6ヶ月無料', 'サービスローンチ記念！6ヶ月間プラットフォーム利用料が無料になります。', 'free_months', 6, 100, '2025-12-31 23:59:59');

-- アーリーアダプター向け: 3ヶ月間無料
INSERT INTO coupons (code, name, description, discount_type, discount_value, max_redemptions, valid_until) VALUES
  ('EARLY2025', 'アーリーアダプター3ヶ月無料', 'アーリーアダプター様向け特典。3ヶ月間プラットフォーム利用料が無料になります。', 'free_months', 3, 200, '2025-06-30 23:59:59');

-- 50%割引クーポン（12ヶ月間有効）
INSERT INTO coupons (code, name, description, discount_type, discount_value, max_redemptions, valid_until) VALUES
  ('HALF2025', '50%割引キャンペーン', '全プラン50%割引！お得にコミュニティを始めましょう。', 'percentage', 50, 500, '2025-12-31 23:59:59');

-- ============================================
-- 6. 既存テナントのクーポンフラグを設定（デフォルトはクーポンなし）
-- ============================================

UPDATE tenants SET is_coupon_active = 0 WHERE is_coupon_active IS NULL;
