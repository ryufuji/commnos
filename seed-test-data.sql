-- テストユーザーを作成
INSERT OR IGNORE INTO users (id, email, password_hash, nickname, status, created_at) VALUES 
(1, 'owner@example.com', '$2a$10$abcdefghijklmnopqrstuv', 'オーナー', 'active', datetime('now')),
(2, 'admin@example.com', '$2a$10$abcdefghijklmnopqrstuv', '管理者', 'active', datetime('now')),
(3, 'member@example.com', '$2a$10$abcdefghijklmnopqrstuv', '会員', 'active', datetime('now'));

-- テストテナントを作成
INSERT OR IGNORE INTO tenants (id, subdomain, name, subtitle, owner_user_id, status, member_count, is_public, created_at) VALUES 
(1, 'test', 'テストコミュニティ', 'テスト用のコミュニティです', 1, 'active', 3, 1, datetime('now'));

-- テストメンバーシップを作成
INSERT OR IGNORE INTO tenant_memberships (id, tenant_id, user_id, role, member_number, status, joined_at) VALUES 
(1, 1, 1, 'owner', 'M-001', 'active', datetime('now')),
(2, 1, 2, 'admin', 'M-002', 'active', datetime('now')),
(3, 1, 3, 'member', 'M-003', 'active', datetime('now'));
