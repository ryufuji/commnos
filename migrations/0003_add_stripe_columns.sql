-- ============================================
-- Week 9-10: Stripe 決済連携
-- テナントテーブルに Stripe 関連カラムを追加
-- ============================================

-- Stripe 関連カラムの追加
ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE tenants ADD COLUMN subscription_current_period_end DATETIME;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription ON tenants(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
