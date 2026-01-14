-- ============================================
-- Phase 8: ヒーローセクション設定追加
-- ウェルカムメッセージとサブタイトル
-- ============================================

ALTER TABLE tenant_customization ADD COLUMN hero_title TEXT;
ALTER TABLE tenant_customization ADD COLUMN hero_subtitle TEXT;
