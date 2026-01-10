-- 0024_add_birthday_feature.sql
-- 誕生日機能の追加

-- usersテーブルに誕生日カラムを追加
ALTER TABLE users ADD COLUMN birthday DATE;

-- 誕生日メールテンプレート管理テーブル
CREATE TABLE IF NOT EXISTS birthday_email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  subject TEXT NOT NULL DEFAULT 'お誕生日おめでとうございます！',
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_birthday_templates_tenant ON birthday_email_templates(tenant_id);

-- 誕生日メール送信履歴テーブル
CREATE TABLE IF NOT EXISTS birthday_email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  template_id INTEGER,
  sent_year INTEGER NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL CHECK(status IN ('sent', 'failed')),
  error_message TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES birthday_email_templates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_birthday_logs_user ON birthday_email_logs(user_id, sent_year);
CREATE INDEX IF NOT EXISTS idx_birthday_logs_tenant ON birthday_email_logs(tenant_id, sent_year);
CREATE UNIQUE INDEX IF NOT EXISTS idx_birthday_logs_unique ON birthday_email_logs(user_id, sent_year);
