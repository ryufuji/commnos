-- ============================================
-- Phase 6.3: point_rulesのUNIQUE制約修正
-- actionのグローバルUNIQUE制約を削除
-- ============================================

-- 外部キー制約を一時的に無効化
PRAGMA foreign_keys = OFF;

-- 1. 既存データをバックアップ
CREATE TABLE IF NOT EXISTS point_rules_backup AS SELECT * FROM point_rules;

-- 2. 既存テーブルを削除
DROP TABLE IF EXISTS point_rules;

-- 3. 正しい制約でテーブルを再作成
CREATE TABLE point_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  action TEXT NOT NULL,  -- グローバルUNIQUEを削除
  points INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, action)  -- テナントごとのUNIQUE制約のみ
);

-- 4. バックアップからデータを復元
INSERT INTO point_rules (id, tenant_id, action, points, is_active, note, created_at, updated_at)
SELECT id, tenant_id, action, points, is_active, note, created_at, updated_at
FROM point_rules_backup;

-- 5. バックアップテーブルを削除
DROP TABLE point_rules_backup;

-- 6. インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_point_rules_tenant ON point_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_point_rules_action ON point_rules(action);

-- 7. 外部キー制約を再有効化
PRAGMA foreign_keys = ON;
