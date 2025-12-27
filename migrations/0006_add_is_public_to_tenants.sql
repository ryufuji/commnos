-- マイグレーション: テナントに公開/非公開設定を追加（カラム追加のみ）

-- is_public カラムを追加（デフォルト: 公開）
ALTER TABLE tenants ADD COLUMN is_public INTEGER DEFAULT 1;
