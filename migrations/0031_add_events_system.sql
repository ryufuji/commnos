-- Migration: Add Events System
-- イベント管理システムの追加

-- イベントテーブル
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'general', -- general, live, meetup, online, other
  
  -- 日時情報
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME,
  timezone TEXT DEFAULT 'Asia/Tokyo',
  is_all_day BOOLEAN DEFAULT 0,
  
  -- 場所情報
  location_type TEXT DEFAULT 'physical', -- physical, online, hybrid
  location_name TEXT,
  location_address TEXT,
  location_url TEXT, -- オンラインイベントのURL
  
  -- チケット・参加情報
  max_participants INTEGER, -- NULL = 無制限
  requires_ticket BOOLEAN DEFAULT 0,
  ticket_price INTEGER DEFAULT 0,
  ticket_url TEXT, -- 外部チケットシステムのURL
  
  -- 表示設定
  thumbnail_url TEXT,
  is_featured BOOLEAN DEFAULT 0, -- 注目イベント
  is_published BOOLEAN DEFAULT 1,
  
  -- メンバー限定
  is_member_only BOOLEAN DEFAULT 0,
  member_plan_id INTEGER, -- 特定プランのみ
  
  -- メタデータ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (member_plan_id) REFERENCES tenant_plans(id)
);

-- イベント参加者テーブル
CREATE TABLE IF NOT EXISTS event_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  
  -- 参加ステータス
  status TEXT NOT NULL DEFAULT 'registered', -- registered, attended, cancelled, waitlist
  
  -- チケット情報
  ticket_code TEXT UNIQUE,
  ticket_used_at DATETIME,
  
  -- メタデータ
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  
  UNIQUE(event_id, user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status);
