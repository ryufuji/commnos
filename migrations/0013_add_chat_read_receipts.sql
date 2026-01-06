-- Migration: Add read receipts for chat messages
-- Created: 2026-01-06

-- メッセージ既読テーブル
CREATE TABLE IF NOT EXISTS chat_message_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  read_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(message_id, user_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_message_id ON chat_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_user_id ON chat_message_reads(user_id);
