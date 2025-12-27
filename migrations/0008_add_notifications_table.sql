-- 通知テーブル (Phase 5)
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,              -- 通知を受け取るユーザー
  actor_id INTEGER,                       -- 通知を引き起こしたユーザー（いいねした人、コメントした人など）
  type TEXT NOT NULL,                     -- 通知タイプ: 'post_like', 'comment_like', 'comment', 'mention', 'follow'
  target_type TEXT NOT NULL,              -- 対象タイプ: 'post', 'comment'
  target_id INTEGER NOT NULL,             -- 対象ID（投稿ID、コメントIDなど）
  message TEXT NOT NULL,                  -- 通知メッセージ
  is_read INTEGER DEFAULT 0,              -- 既読フラグ (0: 未読, 1: 既読)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,                       -- 既読日時
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_tenant ON notifications(user_id, tenant_id, is_read);
