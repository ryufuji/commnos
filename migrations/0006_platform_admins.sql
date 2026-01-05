-- ============================================
-- プラットフォーム管理者テーブル（VALUE ARCHITECTS専用）
-- ============================================

-- プラットフォーム管理者
CREATE TABLE IF NOT EXISTS platform_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);
CREATE INDEX IF NOT EXISTS idx_platform_admins_active ON platform_admins(is_active);

-- 初期管理者アカウント作成用のサンプル（手動で実行）
-- パスワード: Admin@2026 のハッシュ（実際には環境に応じて変更）
-- INSERT INTO platform_admins (email, password_hash, name) 
-- VALUES ('admin@valuearchitects.jp', '$2a$10$...', 'VALUE ARCHITECTS Admin');
