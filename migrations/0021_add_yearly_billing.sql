-- 0021_add_yearly_billing.sql
-- 年間一括払い機能の追加

-- tenant_plansテーブルに年間価格カラムを追加
ALTER TABLE tenant_plans ADD COLUMN yearly_price INTEGER;

-- Stripe年間価格IDを追加
ALTER TABLE tenant_plans ADD COLUMN stripe_yearly_price_id TEXT;

-- tenant_membershipsテーブルに期間タイプを追加
ALTER TABLE tenant_memberships ADD COLUMN billing_interval TEXT DEFAULT 'month';

-- コメント：
-- yearly_price: 年間一括払いの価格（月額の10ヶ月分を推奨）
-- stripe_yearly_price_id: Stripeで作成した年間プランの価格ID
-- billing_interval: 'month' または 'year'
