-- ============================================
-- 0004: tenants テーブルに theme カラムを追加
-- Week 11-12: テーマシステム実装
-- ============================================

-- tenants テーブルに theme カラムを追加
-- デフォルト: 'modern-business'
ALTER TABLE tenants ADD COLUMN theme TEXT NOT NULL DEFAULT 'modern-business';

-- theme カラムにインデックスを追加（頻繁にアクセスするため）
CREATE INDEX IF NOT EXISTS idx_tenants_theme ON tenants(theme);
