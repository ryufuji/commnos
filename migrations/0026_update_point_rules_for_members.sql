-- ============================================
-- Phase 6.1: ポイントルール更新（一般会員向け）
-- post_create（投稿作成）を post_view（記事閲覧）に変更
-- ============================================

-- 既存のpost_createルールをpost_viewに変更
UPDATE point_rules 
SET action = 'post_view', 
    points = 3,
    note = '記事閲覧（1日1回）',
    updated_at = CURRENT_TIMESTAMP
WHERE action = 'post_create';

-- トリガーを再作成（post_viewに変更）
DROP TRIGGER IF EXISTS insert_default_point_rules;

CREATE TRIGGER insert_default_point_rules
AFTER INSERT ON tenants
FOR EACH ROW
BEGIN
  INSERT INTO point_rules (tenant_id, action, points, note) VALUES
    (NEW.id, 'site_visit', 1, 'サイト訪問（1日1回）'),
    (NEW.id, 'signup', 100, '会員登録'),
    (NEW.id, 'subscription', 500, 'サブスクリプション登録'),
    (NEW.id, 'post_view', 3, '記事閲覧（1日1回）'),
    (NEW.id, 'comment_create', 5, 'コメント投稿');
END;
