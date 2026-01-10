-- ============================================
-- Phase 7: チケット・物販システム
-- 特定商取引法対応を含む
-- ============================================

-- 1. 特定商取引法に基づく事業者情報テーブル
CREATE TABLE IF NOT EXISTS shop_legal_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL UNIQUE,
  
  -- 必須項目（特定商取引法第11条）
  business_name TEXT NOT NULL,                    -- 事業者の氏名（名称）
  representative_name TEXT,                        -- 代表者名（法人の場合）
  postal_code TEXT NOT NULL,                      -- 郵便番号
  address TEXT NOT NULL,                          -- 住所
  phone_number TEXT NOT NULL,                     -- 電話番号
  email TEXT NOT NULL,                            -- メールアドレス
  business_hours TEXT,                            -- 営業時間
  
  -- 返品・交換ポリシー
  return_policy TEXT NOT NULL,                    -- 返品特約
  return_period INTEGER DEFAULT 8,                -- 返品可能期間（日数）
  return_shipping_fee TEXT NOT NULL,              -- 返品送料負担
  
  -- 配送関連
  delivery_time TEXT NOT NULL,                    -- 商品引渡時期
  shipping_fee_info TEXT NOT NULL,                -- 送料について
  
  -- 支払い関連
  payment_methods TEXT NOT NULL,                  -- 支払方法
  payment_timing TEXT NOT NULL,                   -- 支払時期
  
  -- その他
  additional_fees TEXT,                           -- その他費用
  product_liability TEXT,                         -- 商品瑕疵責任
  
  -- 承認・公開フラグ
  is_completed BOOLEAN DEFAULT 0,                 -- 情報入力完了フラグ
  is_approved BOOLEAN DEFAULT 0,                  -- 承認フラグ（プラットフォーム管理者）
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 2. 商品カテゴリ
CREATE TABLE IF NOT EXISTS shop_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,                             -- カテゴリ名
  description TEXT,                               -- 説明
  display_order INTEGER DEFAULT 0,                -- 表示順
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, name)
);

-- 3. 商品・チケットテーブル
CREATE TABLE IF NOT EXISTS shop_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  category_id INTEGER,
  
  -- 基本情報
  name TEXT NOT NULL,                             -- 商品名
  description TEXT,                               -- 説明
  product_type TEXT NOT NULL,                     -- 'physical' or 'ticket' or 'digital'
  
  -- 価格情報
  price INTEGER NOT NULL,                         -- 価格（円）
  tax_included BOOLEAN DEFAULT 1,                 -- 税込み価格かどうか
  
  -- 在庫管理
  stock_quantity INTEGER,                         -- 在庫数（NULL=無制限）
  is_unlimited_stock BOOLEAN DEFAULT 0,           -- 無制限在庫フラグ
  
  -- 販売期間
  sale_start_at DATETIME,                         -- 販売開始日時
  sale_end_at DATETIME,                           -- 販売終了日時
  
  -- イベント情報（チケットの場合）
  event_date DATETIME,                            -- イベント日時
  event_location TEXT,                            -- イベント場所
  
  -- 配送情報（物理商品の場合）
  requires_shipping BOOLEAN DEFAULT 1,            -- 配送が必要か
  shipping_fee INTEGER DEFAULT 0,                 -- 送料
  
  -- 画像
  image_url TEXT,                                 -- 商品画像URL
  
  -- 公開設定
  is_active BOOLEAN DEFAULT 1,                    -- 公開中かどうか
  is_featured BOOLEAN DEFAULT 0,                  -- おすすめ商品
  
  -- 制限
  purchase_limit INTEGER,                         -- 1人あたり購入制限数
  member_only BOOLEAN DEFAULT 0,                  -- 会員限定
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (category_id) REFERENCES shop_categories(id)
);

-- 4. 注文テーブル
CREATE TABLE IF NOT EXISTS shop_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  order_number TEXT NOT NULL UNIQUE,              -- 注文番号
  
  -- 金額
  subtotal INTEGER NOT NULL,                      -- 小計
  shipping_fee INTEGER DEFAULT 0,                 -- 送料
  total_amount INTEGER NOT NULL,                  -- 合計金額
  
  -- 決済情報
  payment_method TEXT NOT NULL,                   -- 支払方法
  payment_status TEXT DEFAULT 'pending',          -- pending/completed/failed/refunded
  stripe_payment_intent_id TEXT,                  -- Stripe PaymentIntent ID
  paid_at DATETIME,                               -- 支払完了日時
  
  -- 配送情報
  shipping_name TEXT,                             -- 配送先氏名
  shipping_postal_code TEXT,                      -- 配送先郵便番号
  shipping_address TEXT,                          -- 配送先住所
  shipping_phone TEXT,                            -- 配送先電話番号
  
  -- ステータス
  order_status TEXT DEFAULT 'pending',            -- pending/confirmed/shipped/delivered/cancelled
  shipped_at DATETIME,                            -- 発送日時
  delivered_at DATETIME,                          -- 配達完了日時
  cancelled_at DATETIME,                          -- キャンセル日時
  
  -- メモ
  customer_note TEXT,                             -- 顧客からのメモ
  admin_note TEXT,                                -- 管理者メモ
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. 注文明細テーブル
CREATE TABLE IF NOT EXISTS shop_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  
  -- 商品情報（注文時のスナップショット）
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  
  -- チケット情報
  ticket_code TEXT,                               -- チケットコード（チケットの場合）
  ticket_used_at DATETIME,                        -- チケット使用日時
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES shop_orders(id),
  FOREIGN KEY (product_id) REFERENCES shop_products(id)
);

-- 6. インデックス
CREATE INDEX IF NOT EXISTS idx_shop_products_tenant ON shop_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON shop_products(category_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_type ON shop_products(product_type);
CREATE INDEX IF NOT EXISTS idx_shop_products_active ON shop_products(is_active);
CREATE INDEX IF NOT EXISTS idx_shop_orders_tenant ON shop_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_number ON shop_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_payment ON shop_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_product ON shop_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_categories_tenant ON shop_categories(tenant_id);
