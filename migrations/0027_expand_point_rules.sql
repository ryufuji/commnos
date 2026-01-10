-- ============================================
-- Phase 6.2: ポイントルール拡張
-- より多くのポイント付与ケースを追加
-- ============================================

-- 新しいポイントルールを既存テナントに追加
-- 既存のテナントIDを取得して、各テナントに新ルールを追加

-- 1. いいね関連
INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'post_like', 1, '投稿にいいね', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'comment_like', 1, 'コメントにいいね', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'received_post_like', 2, '投稿にいいねされた', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'received_comment_like', 1, 'コメントにいいねされた', 1 FROM tenants;

-- 2. コメント関連
INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'comment_reply', 3, 'コメントに返信', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'received_comment', 5, '自分の投稿にコメントされた', 1 FROM tenants;

-- 3. プロフィール関連
INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'profile_complete', 50, 'プロフィール完成（アバター+自己紹介+誕生日）', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'avatar_upload', 10, 'アバター画像アップロード', 1 FROM tenants;

-- 4. 連続ログイン
INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'daily_login', 2, 'デイリーログイン', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'login_streak_7', 20, '7日連続ログイン', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'login_streak_30', 100, '30日連続ログイン', 1 FROM tenants;

-- 5. 投稿閲覧関連（既存のpost_viewとは別）
INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'post_share', 5, '投稿をシェア', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'post_bookmark', 1, '投稿をブックマーク', 1 FROM tenants;

-- 6. コミュニティ貢献
INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'first_comment', 10, '初めてのコメント', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'first_like', 5, '初めてのいいね', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'active_commenter', 30, '月間10コメント達成', 0 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'super_active', 100, '月間50コメント達成', 0 FROM tenants;

-- 7. 特別イベント
INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'birthday_bonus', 50, '誕生日ボーナス', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'anniversary', 100, '会員登録記念日', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'event_participation', 20, 'イベント参加', 0 FROM tenants;

-- 8. 招待・紹介
INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'invite_friend', 50, '友達を招待', 0 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'invited_signup', 30, '招待された友達が登録', 0 FROM tenants;

-- 9. アンケート・フィードバック
INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'survey_complete', 20, 'アンケート回答', 1 FROM tenants;

INSERT OR IGNORE INTO point_rules (tenant_id, action, points, note, is_active)
SELECT id, 'feedback_submit', 10, 'フィードバック送信', 1 FROM tenants;

-- トリガーを再作成（新規テナント向けに全ルールを追加）
DROP TRIGGER IF EXISTS insert_default_point_rules;

CREATE TRIGGER insert_default_point_rules
AFTER INSERT ON tenants
FOR EACH ROW
BEGIN
  -- 基本アクション
  INSERT INTO point_rules (tenant_id, action, points, note, is_active) VALUES
    (NEW.id, 'signup', 100, '会員登録', 1),
    (NEW.id, 'daily_login', 2, 'デイリーログイン', 1),
    (NEW.id, 'post_view', 3, '記事閲覧（1日1回）', 1),
    (NEW.id, 'comment_create', 5, 'コメント投稿', 1);
  
  -- いいね関連
  INSERT INTO point_rules (tenant_id, action, points, note, is_active) VALUES
    (NEW.id, 'post_like', 1, '投稿にいいね', 1),
    (NEW.id, 'comment_like', 1, 'コメントにいいね', 1),
    (NEW.id, 'received_post_like', 2, '投稿にいいねされた', 1),
    (NEW.id, 'received_comment_like', 1, 'コメントにいいねされた', 1);
  
  -- コメント関連
  INSERT INTO point_rules (tenant_id, action, points, note, is_active) VALUES
    (NEW.id, 'comment_reply', 3, 'コメントに返信', 1),
    (NEW.id, 'received_comment', 5, '自分の投稿にコメントされた', 1);
  
  -- プロフィール関連
  INSERT INTO point_rules (tenant_id, action, points, note, is_active) VALUES
    (NEW.id, 'profile_complete', 50, 'プロフィール完成', 1),
    (NEW.id, 'avatar_upload', 10, 'アバター画像アップロード', 1);
  
  -- 連続ログイン
  INSERT INTO point_rules (tenant_id, action, points, note, is_active) VALUES
    (NEW.id, 'login_streak_7', 20, '7日連続ログイン', 1),
    (NEW.id, 'login_streak_30', 100, '30日連続ログイン', 1);
  
  -- その他
  INSERT INTO point_rules (tenant_id, action, points, note, is_active) VALUES
    (NEW.id, 'post_share', 5, '投稿をシェア', 1),
    (NEW.id, 'post_bookmark', 1, '投稿をブックマーク', 1),
    (NEW.id, 'first_comment', 10, '初めてのコメント', 1),
    (NEW.id, 'first_like', 5, '初めてのいいね', 1),
    (NEW.id, 'birthday_bonus', 50, '誕生日ボーナス', 1),
    (NEW.id, 'anniversary', 100, '会員登録記念日', 1),
    (NEW.id, 'survey_complete', 20, 'アンケート回答', 1),
    (NEW.id, 'feedback_submit', 10, 'フィードバック送信', 1);
  
  -- デフォルトで無効（管理者が必要に応じて有効化）
  INSERT INTO point_rules (tenant_id, action, points, note, is_active) VALUES
    (NEW.id, 'subscription', 500, 'サブスクリプション登録', 0),
    (NEW.id, 'active_commenter', 30, '月間10コメント達成', 0),
    (NEW.id, 'super_active', 100, '月間50コメント達成', 0),
    (NEW.id, 'event_participation', 20, 'イベント参加', 0),
    (NEW.id, 'invite_friend', 50, '友達を招待', 0),
    (NEW.id, 'invited_signup', 30, '招待された友達が登録', 0);
END;
