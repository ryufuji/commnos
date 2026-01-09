-- ============================================
-- クーポンシステムの追加
-- コミュニティ管理者が月額費用を免除されるクーポン機能
-- ============================================

-- 1. クーポンマスタテーブル
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,                -- クーポンコード（例: 'LAUNCH2025', 'PARTNER-SPECIAL'）
  name TEXT NOT NULL,                       -- クーポン名（例: 'ローンチキャンペーン'）
  description TEXT,                         -- 説明
  discount_type TEXT NOT NULL DEFAULT 'free_forever',  -- 'free_forever', 'free_months', 'percent_off', 'amount_off'
  discount_value INTEGER,                   -- 値（例: 永久無料なら0、3ヶ月無料なら3、50%割引なら50）
  max_uses INTEGER DEFAULT -1,              -- 最大使用回数（-1 = 無制限）
  used_count INTEGER DEFAULT 0,             -- 使用済み回数
  valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 有効期間開始
  valid_until DATETIME,                     -- 有効期間終了（NULLなら無期限）
  applicable_plans TEXT,                    -- 適用可能プラン（JSON配列: ["starter", "growth"] または null=全プラン）
  is_active INTEGER DEFAULT 1,              -- 有効/無効
  created_by TEXT,                          -- 作成者（platform admin email）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);

-- 2. クーポン使用履歴テーブル
CREATE TABLE IF NOT EXISTS coupon_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,                 -- クーポンを適用したユーザー（オーナー）
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,                      -- クーポンの有効期限（期間限定の場合）
  status TEXT NOT NULL DEFAULT 'active',    -- 'active', 'expired', 'revoked'
  
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE(tenant_id)  -- 1テナントにつき1つのクーポンのみ適用可能
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_tenant ON coupon_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_status ON coupon_usage(status);

-- 3. tenants テーブルにクーポン関連カラムを追加
ALTER TABLE tenants ADD COLUMN has_coupon INTEGER DEFAULT 0;  -- クーポン適用中かどうか
ALTER TABLE tenants ADD COLUMN coupon_discount_type TEXT;     -- 適用中のクーポンの割引タイプ
ALTER TABLE tenants ADD COLUMN coupon_expires_at DATETIME;    -- クーポンの有効期限

CREATE INDEX IF NOT EXISTS idx_tenants_has_coupon ON tenants(has_coupon);

-- ============================================
-- 初期クーポンデータ（サンプル）
-- ============================================

-- 永久無料クーポン（パートナー企業向け）
INSERT OR IGNORE INTO coupons (code, name, description, discount_type, discount_value, max_uses, applicable_plans, created_by) 
VALUES ('PARTNER-PREMIUM', 'パートナー企業特別クーポン', 'パートナー企業向けの永久無料クーポン。全プランで月額費用が永久に無料になります。', 'free_forever', 0, -1, NULL, 'admin@valuearchitects.jp');

INSERT OR IGNORE INTO coupons (code, name, description, discount_type, discount_value, max_uses, applicable_plans, created_by)
VALUES ('LAUNCH2025', 'ローンチキャンペーン', '2025年ローンチキャンペーン。スターター・成長プランが6ヶ月間無料。', 'free_months', 6, 100, '["starter", "growth"]', 'admin@valuearchitects.jp');

INSERT OR IGNORE INTO coupons (code, name, description, discount_type, discount_value, max_uses, applicable_plans, created_by)
VALUES ('BETA-TESTER', 'βテスター特典', 'βテスター向け特別クーポン。永久50%割引。', 'percent_off', 50, 50, NULL, 'admin@valuearchitects.jp');

-- ============================================
-- フリープランのメンバー上限を50人→100人に変更
-- ============================================

UPDATE platform_plans 
SET member_limit = 100,
    description = '個人・小規模コミュニティ向けの無料プラン。最大100人まで参加可能で、基本的な投稿機能とストレージ1GBを提供します。',
    features = '{"posts": 10, "storage": "1GB", "members": 100, "support": "コミュニティ", "analytics": false, "custom_domain": false}',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'free';

-- ============================================
-- 注意事項
-- ============================================
-- 
-- クーポンの適用方法:
-- 1. テナント作成時にクーポンコードを入力
-- 2. または、既存テナントに後からクーポンを適用
-- 
-- クーポンの種類:
-- - free_forever: 永久無料（月額費用が永久に0円）
-- - free_months: N ヶ月間無料（例: 6ヶ月間無料）
-- - percent_off: N% 割引（例: 50% 割引）
-- - amount_off: N円 割引（例: 1000円 割引）
-- 
-- 請求時のロジック:
-- 1. has_coupon = 1 の場合、coupon_usage テーブルを確認
-- 2. discount_type が 'free_forever' なら月額費用は0円
-- 3. discount_type が 'free_months' なら、期限内なら0円
-- 4. discount_type が 'percent_off' なら、price * (100 - discount_value) / 100
-- 5. discount_type が 'amount_off' なら、price - discount_value
-- 
