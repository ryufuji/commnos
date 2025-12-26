-- ============================================
-- Phase 1: コアテーブル作成
-- マルチテナント型コミュニティプラットフォーム
-- ============================================

-- --------------------------------------------
-- 1. users テーブル（グローバルユーザー）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- --------------------------------------------
-- 2. tenants テーブル（テナント基本情報）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subdomain TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  owner_user_id INTEGER NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  storage_used INTEGER DEFAULT 0,
  storage_limit INTEGER DEFAULT 1073741824,
  member_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX idx_tenants_status ON tenants(status);

-- --------------------------------------------
-- 3. tenant_memberships（テナント会員関係）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  plan_id INTEGER,
  member_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id),
  
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_memberships_tenant_user ON tenant_memberships(tenant_id, user_id);
CREATE INDEX idx_memberships_tenant_status ON tenant_memberships(tenant_id, status);
CREATE INDEX idx_memberships_user ON tenant_memberships(user_id);

-- --------------------------------------------
-- 4. tenant_customization（カスタマイズ設定）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_customization (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL UNIQUE,
  
  -- Phase 1: テーマ選択のみ
  theme_preset TEXT NOT NULL DEFAULT 'modern-business',
  
  -- Phase 2 で追加予定のカラム（コメント）
  -- logo_url TEXT,
  -- favicon_url TEXT,
  -- primary_color TEXT,
  -- secondary_color TEXT,
  
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_customization_tenant ON tenant_customization(tenant_id);

-- --------------------------------------------
-- 5. tenant_features（機能フラグ）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL UNIQUE,
  
  -- プランごとの制限
  max_members INTEGER DEFAULT 100,
  max_storage_gb INTEGER DEFAULT 1,
  max_posts_per_month INTEGER DEFAULT 100,
  
  -- Phase 1 では全て 0（機能なし）
  enable_file_sharing BOOLEAN DEFAULT 0,
  enable_events BOOLEAN DEFAULT 0,
  enable_polls BOOLEAN DEFAULT 0,
  enable_custom_domain BOOLEAN DEFAULT 0,
  
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_features_tenant ON tenant_features(tenant_id);

-- --------------------------------------------
-- 6. posts（投稿）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at DATETIME,
  scheduled_at DATETIME,
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX idx_posts_tenant_status ON posts(tenant_id, status);
CREATE INDEX idx_posts_tenant_published ON posts(tenant_id, published_at DESC);
CREATE INDEX idx_posts_author ON posts(author_id);

-- --------------------------------------------
-- 7. comments（コメント）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at DESC);
CREATE INDEX idx_comments_tenant ON comments(tenant_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- --------------------------------------------
-- 8. plans（プラン）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  features TEXT,
  is_active BOOLEAN DEFAULT 1,
  stripe_price_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_plans_tenant ON plans(tenant_id);
CREATE INDEX idx_plans_stripe_price ON plans(stripe_price_id);

-- --------------------------------------------
-- 9. subscriptions（サブスクリプション）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start DATETIME NOT NULL,
  current_period_end DATETIME NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT 0,
  canceled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- --------------------------------------------
-- 10. payment_history（決済履歴）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS payment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  subscription_id INTEGER,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'jpy',
  status TEXT NOT NULL,
  stripe_payment_id TEXT,
  stripe_invoice_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

CREATE INDEX idx_payment_history_user ON payment_history(user_id);
CREATE INDEX idx_payment_history_tenant ON payment_history(tenant_id);
CREATE INDEX idx_payment_history_stripe_invoice ON payment_history(stripe_invoice_id);
CREATE INDEX idx_payment_history_created ON payment_history(created_at DESC);

-- ============================================
-- Phase 1 スキーマ作成完了
-- ============================================
