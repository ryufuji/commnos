-- ============================================
-- Phase 6: ポイントシステム
-- ============================================

-- ポイント残高テーブル
CREATE TABLE IF NOT EXISTS user_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  balance INTEGER DEFAULT 0,  -- 現在のポイント残高
  total_earned INTEGER DEFAULT 0,  -- 累計獲得ポイント
  total_spent INTEGER DEFAULT 0,  -- 累計消費ポイント
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(user_id, tenant_id)
);

-- ポイント履歴テーブル
CREATE TABLE IF NOT EXISTS point_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,  -- 'earn' or 'spend'
  points INTEGER NOT NULL,  -- 増減ポイント数（正数）
  reason TEXT NOT NULL,  -- 理由（site_visit, signup, subscription, post_create, admin_grant, reward_exchange）
  reference_id INTEGER,  -- 関連ID（投稿ID、報酬IDなど）
  balance_after INTEGER NOT NULL,  -- 処理後の残高
  admin_id INTEGER,  -- 管理者による付与の場合
  note TEXT,  -- 備考
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- ポイント報酬（交換可能な商品・特典）テーブル
CREATE TABLE IF NOT EXISTS point_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,  -- 報酬名
  description TEXT,  -- 説明
  points_required INTEGER NOT NULL,  -- 必要ポイント数
  image_url TEXT,  -- 画像URL
  stock INTEGER DEFAULT -1,  -- 在庫数（-1は無制限）
  is_active INTEGER DEFAULT 1,  -- 有効フラグ
  display_order INTEGER DEFAULT 0,  -- 表示順
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ポイント報酬交換履歴テーブル
CREATE TABLE IF NOT EXISTS reward_exchanges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  reward_id INTEGER NOT NULL,
  points_spent INTEGER NOT NULL,  -- 消費したポイント数
  status TEXT DEFAULT 'pending',  -- pending, approved, completed, rejected
  admin_note TEXT,  -- 管理者メモ
  approved_by INTEGER,  -- 承認者
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (reward_id) REFERENCES point_rewards(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- ポイントルール設定テーブル
CREATE TABLE IF NOT EXISTS point_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  action TEXT NOT NULL UNIQUE,  -- site_visit, signup, subscription, post_create, comment_create
  points INTEGER NOT NULL,  -- 付与ポイント数
  is_active INTEGER DEFAULT 1,  -- 有効フラグ
  note TEXT,  -- 備考
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, action)
);

-- デフォルトポイントルール挿入トリガー
-- 新しいテナントが作成されたら自動的にデフォルトルールを挿入
CREATE TRIGGER IF NOT EXISTS insert_default_point_rules
AFTER INSERT ON tenants
FOR EACH ROW
BEGIN
  INSERT INTO point_rules (tenant_id, action, points, note) VALUES
    (NEW.id, 'site_visit', 1, 'サイト訪問（1日1回）'),
    (NEW.id, 'signup', 100, '会員登録'),
    (NEW.id, 'subscription', 500, 'サブスクリプション登録'),
    (NEW.id, 'post_create', 10, '投稿作成'),
    (NEW.id, 'comment_create', 5, 'コメント投稿');
END;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_points_user_tenant ON user_points(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_point_rewards_tenant ON point_rewards(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_reward_exchanges_user ON reward_exchanges(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_reward_exchanges_status ON reward_exchanges(status);
CREATE INDEX IF NOT EXISTS idx_point_rules_tenant ON point_rules(tenant_id);
