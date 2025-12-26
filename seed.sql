-- ============================================
-- Phase 1: テストデータ
-- ============================================

-- パスワードハッシュ: 'password123' の bcrypt ハッシュ
-- 実際の実装では bcrypt.hash() で生成すること

-- --------------------------------------------
-- 1. テストユーザー作成
-- --------------------------------------------
INSERT OR IGNORE INTO users (id, email, password_hash, nickname, status) VALUES 
  (1, 'owner@commons.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Platform Owner', 'active'),
  (2, 'alice@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Alice Johnson', 'active'),
  (3, 'bob@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Bob Smith', 'active'),
  (4, 'charlie@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Charlie Brown', 'active'),
  (5, 'pending@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Pending User', 'active');

-- --------------------------------------------
-- 2. テストテナント作成
-- --------------------------------------------
INSERT OR IGNORE INTO tenants (id, subdomain, name, subtitle, owner_user_id, plan, status, member_count) VALUES 
  (1, 'golf-club', 'ゴルフサークル「あみーず」', '週末ゴルフ仲間', 1, 'starter', 'active', 3),
  (2, 'yoga-community', 'ヨガコミュニティ', '心と体の健康', 2, 'free', 'active', 1),
  (3, 'tech-meetup', 'Tech勉強会', '最新技術を学ぶ', 3, 'pro', 'active', 2);

-- --------------------------------------------
-- 3. テナントカスタマイズ設定
-- --------------------------------------------
INSERT OR IGNORE INTO tenant_customization (tenant_id, theme_preset) VALUES 
  (1, 'modern-business'),
  (2, 'wellness-nature'),
  (3, 'tech-innovation');

-- --------------------------------------------
-- 4. テナント機能設定
-- --------------------------------------------
INSERT OR IGNORE INTO tenant_features (tenant_id, max_members, max_storage_gb, max_posts_per_month) VALUES 
  (1, 500, 5, 999999),   -- Starter
  (2, 100, 1, 100),       -- Free
  (3, 999999, 50, 999999); -- Pro

-- --------------------------------------------
-- 5. テナントメンバーシップ
-- --------------------------------------------
INSERT OR IGNORE INTO tenant_memberships (tenant_id, user_id, role, member_number, status) VALUES 
  -- golf-club
  (1, 1, 'owner', 'M-001', 'active'),
  (1, 2, 'admin', 'M-002', 'active'),
  (1, 3, 'member', 'M-003', 'active'),
  (1, 5, 'member', NULL, 'pending'),  -- 承認待ち
  
  -- yoga-community
  (2, 2, 'owner', 'M-001', 'active'),
  
  -- tech-meetup
  (3, 3, 'owner', 'M-001', 'active'),
  (3, 4, 'member', 'M-002', 'active');

-- --------------------------------------------
-- 6. テストプラン
-- --------------------------------------------
INSERT OR IGNORE INTO plans (id, tenant_id, name, description, price, billing_interval, features) VALUES 
  (1, 1, 'ベーシック', '基本的な機能', 980, 'monthly', '["投稿閲覧", "コメント"]'),
  (2, 1, 'プレミアム', 'すべての機能', 2980, 'monthly', '["投稿閲覧", "コメント", "イベント参加"]'),
  (3, 3, 'スタンダード', '技術勉強会メンバー', 1500, 'monthly', '["投稿閲覧", "コメント", "資料ダウンロード"]');

-- --------------------------------------------
-- 7. テスト投稿
-- --------------------------------------------
INSERT OR IGNORE INTO posts (id, tenant_id, author_id, title, content, excerpt, status, published_at) VALUES 
  (1, 1, 1, '新年のご挨拶', 'あけましておめでとうございます。今年もよろしくお願いします。', 'あけましておめでとうございます...', 'published', datetime('now')),
  (2, 1, 2, '次回ゴルフコンペのお知らせ', '来月のゴルフコンペについてお知らせします。\n\n日時: 2025年1月15日\n場所: 〇〇ゴルフクラブ', '来月のゴルフコンペについて...', 'published', datetime('now')),
  (3, 1, 1, '下書き投稿', 'これは下書きです。', 'これは下書きです。', 'draft', NULL),
  (4, 2, 2, 'ヨガクラスのスケジュール', '今月のヨガクラスのスケジュールをお知らせします。', '今月のヨガクラスのスケジュール...', 'published', datetime('now')),
  (5, 3, 3, 'React 19の新機能', 'React 19がリリースされました。新機能をまとめます。', 'React 19がリリースされました...', 'published', datetime('now'));

-- --------------------------------------------
-- 8. テストコメント
-- --------------------------------------------
INSERT OR IGNORE INTO comments (tenant_id, post_id, user_id, content) VALUES 
  (1, 1, 2, 'あけましておめでとうございます！'),
  (1, 1, 3, '今年もよろしくお願いします。'),
  (1, 2, 3, '参加します！楽しみです。'),
  (2, 4, 2, 'スケジュール確認しました。'),
  (3, 5, 4, 'Concurrent Rendering が気になります。');

-- ============================================
-- Phase 1 テストデータ作成完了
-- ============================================
