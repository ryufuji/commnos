-- ============================================
-- Phase 6: ポイント報酬の交換対象設定機能
-- ============================================

-- point_rewardsテーブルに交換対象設定カラムを追加
ALTER TABLE point_rewards ADD COLUMN eligibility_type TEXT DEFAULT 'all';
-- 'all': 全会員が交換可能
-- 'tags': 特定のタグを持つ会員のみ交換可能

ALTER TABLE point_rewards ADD COLUMN eligible_tag_ids TEXT;
-- 交換可能なタグIDのJSON配列（例: "[1,2,3]"）
-- eligibility_type='tags'の場合のみ使用

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_point_rewards_eligibility ON point_rewards(eligibility_type);
