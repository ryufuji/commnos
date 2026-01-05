-- Add subscription-related fields to tenants table
-- Note: stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end already exist

-- サブスクリプション期間開始日
ALTER TABLE tenants ADD COLUMN subscription_current_period_start DATETIME;

-- キャンセル予定日
ALTER TABLE tenants ADD COLUMN subscription_cancel_at DATETIME;

-- トライアル終了日
ALTER TABLE tenants ADD COLUMN trial_end DATETIME;

-- 最終更新日時
ALTER TABLE tenants ADD COLUMN subscription_updated_at DATETIME;

-- Stripe顧客IDのインデックス（高速検索用）
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription ON tenants(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
