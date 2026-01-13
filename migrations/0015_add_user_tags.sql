-- ユーザータグ機能のマイグレーション

-- タグマスタテーブル
CREATE TABLE IF NOT EXISTS user_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  created_at TEXT DEFAULT (datetime('now', '+9 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+9 hours')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, name)
);

-- ユーザーとタグの紐付けテーブル（多対多）
CREATE TABLE IF NOT EXISTS user_tag_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  assigned_by INTEGER,
  assigned_at TEXT DEFAULT (datetime('now', '+9 hours')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES user_tags(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(user_id, tag_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_tags_tenant ON user_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_assignments_user ON user_tag_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_assignments_tag ON user_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_assignments_tenant ON user_tag_assignments(tenant_id);
