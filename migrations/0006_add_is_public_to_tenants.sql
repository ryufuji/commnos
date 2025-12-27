-- マイグレーション: テナントに公開/非公開設定を追加
-- コミュニティディレクトリ機能のため

-- is_public カラムを追加（デフォルト: 公開）
ALTER TABLE tenants ADD COLUMN is_public INTEGER DEFAULT 1;

-- 既存のすべてのテナントを公開に設定
UPDATE tenants SET is_public = 1 WHERE is_public IS NULL;
