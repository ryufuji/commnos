// ============================================
// イベント管理API
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const events = new Hono<AppContext>()

// ============================================
// イベント一覧取得（管理者用）
// ============================================
events.get('/', authMiddleware, async (c) => {
  const { DB } = c.env
  const { tenantId, role } = c.get('auth')
  
  // 管理者チェック
  if (role !== 'owner' && role !== 'admin') {
    return c.json({ error: 'Permission denied' }, 403)
  }
  
  // イベント一覧を取得
  const result = await DB.prepare(`
    SELECT e.*, u.nickname as creator_name
    FROM events e
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.tenant_id = ?
    ORDER BY e.start_datetime DESC
  `).bind(tenantId).all()
  
  return c.json({
    success: true,
    events: result.results || []
  })
})

// ============================================
// イベント詳細取得
// ============================================
events.get('/:id', authMiddleware, async (c) => {
  const { DB } = c.env
  const { tenantId, role } = c.get('auth')
  const eventId = c.req.param('id')
  
  // 管理者チェック
  if (role !== 'owner' && role !== 'admin') {
    return c.json({ error: 'Permission denied' }, 403)
  }
  
  const event = await DB.prepare(`
    SELECT e.*, u.nickname as creator_name,
           (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id AND status = 'registered') as participant_count
    FROM events e
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.id = ? AND e.tenant_id = ?
  `).bind(eventId, tenantId).first()
  
  if (!event) {
    return c.json({ error: 'Event not found' }, 404)
  }
  
  return c.json({
    success: true,
    event
  })
})

// ============================================
// イベント作成
// ============================================
events.post('/', authMiddleware, async (c) => {
  const { DB } = c.env
  const { tenantId, role, userId } = c.get('auth')
  
  // 管理者チェック
  if (role !== 'owner' && role !== 'admin') {
    return c.json({ error: 'Permission denied' }, 403)
  }
  
  const body = await c.req.json()
  const {
    title,
    description,
    event_type = 'general',
    start_datetime,
    end_datetime,
    timezone = 'Asia/Tokyo',
    is_all_day = 0,
    location_type = 'physical',
    location_name,
    location_address,
    location_url,
    max_participants,
    requires_ticket = 0,
    ticket_price = 0,
    ticket_url,
    thumbnail_url,
    is_featured = 0,
    is_published = 1,
    is_member_only = 0,
    member_plan_id
  } = body
  
  // バリデーション
  if (!title) {
    return c.json({ error: 'Title is required' }, 400)
  }
  if (!start_datetime) {
    return c.json({ error: 'Start datetime is required' }, 400)
  }
  
  // イベント作成
  const result = await DB.prepare(`
    INSERT INTO events (
      tenant_id, title, description, event_type,
      start_datetime, end_datetime, timezone, is_all_day,
      location_type, location_name, location_address, location_url,
      max_participants, requires_ticket, ticket_price, ticket_url,
      thumbnail_url, is_featured, is_published,
      is_member_only, member_plan_id, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId, title, description, event_type,
    start_datetime, end_datetime, timezone, is_all_day ? 1 : 0,
    location_type, location_name, location_address, location_url,
    max_participants, requires_ticket ? 1 : 0, ticket_price, ticket_url,
    thumbnail_url, is_featured ? 1 : 0, is_published ? 1 : 0,
    is_member_only ? 1 : 0, member_plan_id, userId
  ).run()
  
  return c.json({
    success: true,
    message: 'イベントを作成しました',
    event_id: result.meta.last_row_id
  })
})

// ============================================
// イベント更新
// ============================================
events.put('/:id', authMiddleware, async (c) => {
  const { DB } = c.env
  const { tenantId, role } = c.get('auth')
  const eventId = c.req.param('id')
  
  // 管理者チェック
  if (role !== 'owner' && role !== 'admin') {
    return c.json({ error: 'Permission denied' }, 403)
  }
  
  const body = await c.req.json()
  const {
    title,
    description,
    event_type,
    start_datetime,
    end_datetime,
    timezone,
    is_all_day,
    location_type,
    location_name,
    location_address,
    location_url,
    max_participants,
    requires_ticket,
    ticket_price,
    ticket_url,
    thumbnail_url,
    is_featured,
    is_published,
    is_member_only,
    member_plan_id
  } = body
  
  // イベント更新
  await DB.prepare(`
    UPDATE events SET
      title = ?,
      description = ?,
      event_type = ?,
      start_datetime = ?,
      end_datetime = ?,
      timezone = ?,
      is_all_day = ?,
      location_type = ?,
      location_name = ?,
      location_address = ?,
      location_url = ?,
      max_participants = ?,
      requires_ticket = ?,
      ticket_price = ?,
      ticket_url = ?,
      thumbnail_url = ?,
      is_featured = ?,
      is_published = ?,
      is_member_only = ?,
      member_plan_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ?
  `).bind(
    title, description, event_type,
    start_datetime, end_datetime, timezone, is_all_day ? 1 : 0,
    location_type, location_name, location_address, location_url,
    max_participants, requires_ticket ? 1 : 0, ticket_price, ticket_url,
    thumbnail_url, is_featured ? 1 : 0, is_published ? 1 : 0,
    is_member_only ? 1 : 0, member_plan_id,
    eventId, tenantId
  ).run()
  
  return c.json({
    success: true,
    message: 'イベントを更新しました'
  })
})

// ============================================
// イベント削除
// ============================================
events.delete('/:id', authMiddleware, async (c) => {
  const { DB } = c.env
  const { tenantId, role } = c.get('auth')
  const eventId = c.req.param('id')
  
  // 管理者チェック
  if (role !== 'owner' && role !== 'admin') {
    return c.json({ error: 'Permission denied' }, 403)
  }
  
  // イベント削除
  await DB.prepare(`
    DELETE FROM events WHERE id = ? AND tenant_id = ?
  `).bind(eventId, tenantId).run()
  
  return c.json({
    success: true,
    message: 'イベントを削除しました'
  })
})

// ============================================
// イベント参加者一覧
// ============================================
events.get('/:id/participants', authMiddleware, async (c) => {
  const { DB } = c.env
  const { tenantId, role } = c.get('auth')
  const eventId = c.req.param('id')
  
  // 管理者チェック
  if (role !== 'owner' && role !== 'admin') {
    return c.json({ error: 'Permission denied' }, 403)
  }
  
  const result = await DB.prepare(`
    SELECT ep.*, u.nickname, u.email
    FROM event_participants ep
    JOIN users u ON ep.user_id = u.id
    WHERE ep.event_id = ? AND ep.tenant_id = ?
    ORDER BY ep.registered_at DESC
  `).bind(eventId, tenantId).all()
  
  return c.json({
    success: true,
    participants: result.results || []
  })
})

export default events
