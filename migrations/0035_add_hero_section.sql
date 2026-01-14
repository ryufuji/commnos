-- ============================================
-- Phase 8: ヒーローセクション設定追加
-- カバー画像、オーバーレイ、ウェルカムメッセージ
-- ============================================

ALTER TABLE tenant_customization ADD COLUMN welcome_title TEXT;
ALTER TABLE tenant_customization ADD COLUMN welcome_subtitle TEXT;
