-- ============================================
-- マーケットプレイスモデル: テナント独自プラン・収益管理
-- ============================================

-- --------------------------------------------
-- 1. テナント独自プラン
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,                    -- プラン名（例: "ベーシック"、"プレミアム"）
  description TEXT,                      -- プラン説明
  price INTEGER NOT NULL,                -- 月額料金（円）
  member_limit INTEGER,                  -- メンバー数上限（NULLは無制限）
  storage_limit INTEGER,                 -- ストレージ上限（バイト）
  features TEXT,                         -- 機能リスト（JSON）
  is_active INTEGER DEFAULT 1,           -- 有効/無効
  stripe_price_id TEXT,                  -- Stripe Price ID
  stripe_product_id TEXT,                -- Stripe Product ID
  sort_order INTEGER DEFAULT 0,          -- 表示順序
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_plans_tenant ON tenant_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_active ON tenant_plans(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_stripe_price ON tenant_plans(stripe_price_id);

-- --------------------------------------------
-- 2. テナント収益管理
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_earnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL UNIQUE,
  balance INTEGER DEFAULT 0,              -- 保留残高（円）
  total_earned INTEGER DEFAULT 0,         -- 累計収益
  total_paid INTEGER DEFAULT 0,           -- 累計支払済み
  last_payout_at DATETIME,               -- 最終入金日時
  stripe_account_id TEXT,                -- Stripe Connected Account ID
  payout_enabled INTEGER DEFAULT 0,      -- 入金設定完了フラグ
  minimum_payout INTEGER DEFAULT 10000,  -- 最低入金額（デフォルト¥10,000）
  platform_fee_rate INTEGER DEFAULT 20,  -- プラットフォーム手数料率（%）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_earnings_tenant ON tenant_earnings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_earnings_balance ON tenant_earnings(balance);

-- --------------------------------------------
-- 3. サブスクリプション収益トランザクション
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS earnings_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  subscription_id TEXT NOT NULL,         -- Stripe Subscription ID
  invoice_id TEXT,                       -- Stripe Invoice ID
  amount INTEGER NOT NULL,               -- 決済額（円）
  platform_fee INTEGER NOT NULL,         -- プラットフォーム手数料（20%）
  tenant_revenue INTEGER NOT NULL,       -- テナント収益（80%）
  stripe_fee INTEGER,                    -- Stripe手数料（概算）
  net_revenue INTEGER,                   -- 純収益（Stripe手数料差し引き後）
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  transaction_type TEXT NOT NULL,        -- 'subscription', 'one_time'
  stripe_charge_id TEXT,                 -- Stripe Charge ID
  processed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_earnings_transactions_tenant ON earnings_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_earnings_transactions_subscription ON earnings_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_earnings_transactions_status ON earnings_transactions(status);
CREATE INDEX IF NOT EXISTS idx_earnings_transactions_created ON earnings_transactions(created_at);

-- --------------------------------------------
-- 4. 入金履歴
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,               -- 入金額（円）
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'failed'
  stripe_payout_id TEXT,                 -- Stripe Payout ID
  stripe_transfer_id TEXT,               -- Stripe Transfer ID
  bank_account TEXT,                     -- 入金先銀行口座（マスク済み）
  failure_reason TEXT,                   -- 失敗理由
  initiated_at DATETIME,                 -- 処理開始日時
  completed_at DATETIME,                 -- 完了日時
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payouts_tenant ON payouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created ON payouts(created_at);

-- --------------------------------------------
-- 5. 既存テナントに収益管理レコードを初期化
-- --------------------------------------------
INSERT OR IGNORE INTO tenant_earnings (tenant_id, balance, total_earned, total_paid)
SELECT id, 0, 0, 0 FROM tenants;
