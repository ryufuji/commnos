-- ============================================
-- Phase 8.1: ヒーローセクション カラム名修正
-- hero_title → welcome_title
-- hero_subtitle → welcome_subtitle
-- ============================================

-- SQLiteはALTER TABLE RENAME COLUMNをサポートしていないため
-- 新しいカラムを作成してデータをコピー

ALTER TABLE tenant_customization ADD COLUMN welcome_title TEXT;
ALTER TABLE tenant_customization ADD COLUMN welcome_subtitle TEXT;

UPDATE tenant_customization 
SET welcome_title = hero_title, 
    welcome_subtitle = hero_subtitle;

-- 古いカラムを削除（SQLiteでは直接削除できないため、そのまま残す）
-- hero_title と hero_subtitle は今後使用しない
