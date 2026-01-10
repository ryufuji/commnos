-- 0023_add_payment_reminders.sql
-- 支払いリマインダー機能の追加

-- payment_remindersテーブル（支払いリマインダー）
CREATE TABLE IF NOT EXISTS payment_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  subscription_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'jpy',
  status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'resolved', 'cancelled')),
  reminder_count INTEGER DEFAULT 0,
  next_reminder_at DATETIME,
  last_reminder_sent_at DATETIME,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_user ON payment_reminders(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_status ON payment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_next ON payment_reminders(next_reminder_at);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_subscription ON payment_reminders(subscription_id);
