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

-- 7. テナントID=2に全ルールを追加（既存ルールがあれば無視）
INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active) VALUES
  (2, 'signup', 100, '会員登録', 1),
  (2, 'daily_login', 1, 'デイリーログイン', 1),
  (2, 'post_view', 3, '記事閲覧（1日1回）', 1),
  (2, 'comment_create', 5, 'コメント投稿', 1),
  (2, 'post_like', 1, '投稿にいいね', 1),
  (2, 'comment_like', 1, 'コメントにいいね', 1),
  (2, 'received_post_like', 2, '投稿にいいねされた', 1),
  (2, 'received_comment_like', 1, 'コメントにいいねされた', 1),
  (2, 'comment_reply', 3, 'コメントに返信', 1),
  (2, 'received_comment', 5, '自分の投稿にコメントされた', 1),
  (2, 'first_comment', 10, '初めてのコメント', 1),
  (2, 'profile_complete', 20, 'プロフィール完成', 1),
  (2, 'avatar_upload', 10, 'アバター画像アップロード', 1),
  (2, 'login_streak_7', 50, '7日連続ログイン', 1),
  (2, 'login_streak_30', 200, '30日連続ログイン', 1),
  (2, 'post_share', 5, '投稿をシェア', 1),
  (2, 'post_bookmark', 2, '投稿をブックマーク', 1),
  (2, 'first_like', 20, '初めてのいいね', 1),
  (2, 'birthday_bonus', 100, '誕生日ボーナス', 1),
  (2, 'anniversary', 50, '会員登録記念日', 1),
  (2, 'survey_complete', 10, 'アンケート回答', 1),
  (2, 'feedback_submit', 20, 'フィードバック送信', 1),
  (2, 'subscription', 500, 'サブスクリプション登録', 0),
  (2, 'active_commenter', 100, '月間10コメント達成', 0),
  (2, 'super_active', 300, '月間50コメント達成', 0),
  (2, 'event_participation', 50, 'イベント参加', 0),
  (2, 'invite_friend', 100, '友達を招待', 0),
  (2, 'invited_signup', 50, '招待された友達が登録', 0);

-- 8. 外部キー制約を再有効化
PRAGMA foreign_keys = ON;
