-- ============================================
-- Phase 8: テナントカスタマイズ機能
-- テナントごとのロゴ・ファビコン設定
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_customization (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL UNIQUE,
  
  -- ロゴ・ファビコン
  logo_url TEXT,
  favicon_url TEXT,
  
  -- カバー画像（将来の拡張用）
  cover_image_url TEXT,
  cover_overlay_opacity REAL DEFAULT 0.5,
  
  -- ナビゲーション設定（JSON）
  navigation_config TEXT DEFAULT '{"items":["home","posts","events","members","chat","points","shop"],"order":["home","posts","events","members","chat","points","shop"]}',
  
  -- カラーテーマ（将来の拡張用）
  primary_color TEXT DEFAULT '#00BCD4',
  primary_dark TEXT DEFAULT '#0097A7',
  primary_light TEXT DEFAULT '#B2EBF2',
  secondary_color TEXT DEFAULT '#FDB714',
  
  -- フォント（将来の拡張用）
  font_family_heading TEXT DEFAULT 'Noto Sans JP',
  font_family_body TEXT DEFAULT 'Noto Sans JP',
  
  -- レイアウトプリセット（将来の拡張用）
  layout_preset TEXT DEFAULT 'modern',
  
  -- カスタムCSS（将来の拡張用）
  custom_css TEXT,
  
  -- ダークモード対応（将来の拡張用）
  enable_dark_mode INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_customization_tenant ON tenant_customization(tenant_id);
