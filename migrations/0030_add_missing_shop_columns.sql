-- ============================================
-- Phase 7: 不足しているカラムを追加
-- ============================================

-- shop_products テーブルに shipping_info カラムを追加
ALTER TABLE shop_products ADD COLUMN shipping_info TEXT;

-- shop_products テーブルに event_description カラムを追加
ALTER TABLE shop_products ADD COLUMN event_description TEXT;

-- shop_products テーブルに sale_start_date カラムを追加
ALTER TABLE shop_products ADD COLUMN sale_start_date DATETIME;

-- shop_products テーブルに sale_end_date カラムを追加
ALTER TABLE shop_products ADD COLUMN sale_end_date DATETIME;

-- shop_products テーブルに max_purchase_per_person カラムを追加
ALTER TABLE shop_products ADD COLUMN max_purchase_per_person INTEGER;

-- shop_products テーブルに is_member_only カラムを追加
ALTER TABLE shop_products ADD COLUMN is_member_only BOOLEAN DEFAULT 0;

-- shop_products テーブルに member_plan_id カラムを追加
ALTER TABLE shop_products ADD COLUMN member_plan_id INTEGER;
