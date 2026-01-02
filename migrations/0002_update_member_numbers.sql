-- ============================================
-- マイグレーション: 会員番号の形式を変更
-- ============================================

-- オーナーの会員番号を '0' に変更
UPDATE tenant_memberships 
SET member_number = '0' 
WHERE role = 'owner' AND (member_number IS NULL OR member_number != '0');

-- 既存の一般メンバーの会員番号を更新（M-001 → 001 形式に変換）
UPDATE tenant_memberships 
SET member_number = substr(member_number, 3)
WHERE role != 'owner' AND member_number LIKE 'M-%';
