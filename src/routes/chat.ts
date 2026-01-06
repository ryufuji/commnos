import { Hono } from 'hono'

const chat = new Hono()

// 型定義
type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

// JWT検証関数
async function verifyToken(token: string, secret: string) {
  try {
    const encoder = new TextEncoder()
    const secretKey = encoder.encode(secret)
    const [header, payload, signature] = token.split('.')
    
    const data = `${header}.${payload}`
    const expectedSignature = await crypto.subtle
      .importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      .then(key => crypto.subtle.sign('HMAC', key, encoder.encode(data)))
      .then(sig => btoa(String.fromCharCode(...new Uint8Array(sig)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''))
    
    if (signature !== expectedSignature) {
      return { valid: false, payload: null }
    }
    
    const payloadData = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    
    if (payloadData.exp && Date.now() >= payloadData.exp * 1000) {
      return { valid: false, payload: null }
    }
    
    return { valid: true, payload: payloadData }
  } catch (error) {
    return { valid: false, payload: null }
  }
}

/**
 * GET /api/chat/rooms
 * チャットルーム一覧取得
 */
chat.get('/rooms', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const userId = result.payload.userId
    const tenantId = result.payload.tenantId

    // ユーザーが参加しているチャットルーム一覧を取得
    const rooms = await c.env.DB.prepare(`
      SELECT 
        cr.id, cr.name, cr.description, cr.is_private, cr.created_at,
        u.nickname as creator_name,
        (SELECT COUNT(*) FROM chat_room_members WHERE room_id = cr.id) as member_count,
        (SELECT message FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM chat_rooms cr
      INNER JOIN chat_room_members crm ON cr.id = crm.room_id
      LEFT JOIN users u ON cr.created_by = u.id
      WHERE cr.tenant_id = ? AND crm.user_id = ?
      ORDER BY cr.updated_at DESC
    `).bind(tenantId, userId).all()

    return c.json({
      success: true,
      rooms: rooms.results || []
    })
  } catch (error: any) {
    console.error('[Chat Rooms List Error]', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * POST /api/chat/rooms
 * チャットルーム作成（管理者のみ）
 */
chat.post('/rooms', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const userId = result.payload.userId
    const tenantId = result.payload.tenantId
    const role = result.payload.role

    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403)
    }

    const { name, description, isPrivate, memberIds } = await c.req.json()

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400)
    }

    // チャットルーム作成
    const roomResult = await c.env.DB.prepare(`
      INSERT INTO chat_rooms (tenant_id, name, description, created_by, is_private)
      VALUES (?, ?, ?, ?, ?)
    `).bind(tenantId, name, description || '', userId, isPrivate ? 1 : 0).run()

    const roomId = roomResult.meta.last_row_id

    // 作成者を自動的にメンバーに追加
    await c.env.DB.prepare(`
      INSERT INTO chat_room_members (room_id, user_id)
      VALUES (?, ?)
    `).bind(roomId, userId).run()

    // 招待されたメンバーを追加
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      for (const memberId of memberIds) {
        if (memberId !== userId) { // 作成者は既に追加済み
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO chat_room_members (room_id, user_id)
            VALUES (?, ?)
          `).bind(roomId, memberId).run()
        }
      }
    }

    return c.json({
      success: true,
      room: {
        id: roomId,
        name,
        description,
        isPrivate
      }
    }, 201)
  } catch (error: any) {
    console.error('[Chat Room Create Error]', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * GET /api/chat/rooms/:id
 * チャットルーム詳細取得
 */
chat.get('/rooms/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const userId = result.payload.userId
    const roomId = c.req.param('id')

    // ルーム情報取得
    const room = await c.env.DB.prepare(`
      SELECT 
        cr.id, cr.name, cr.description, cr.is_private, cr.created_at,
        cr.created_by,
        u.nickname as creator_name
      FROM chat_rooms cr
      LEFT JOIN users u ON cr.created_by = u.id
      WHERE cr.id = ?
    `).bind(roomId).first()

    if (!room) {
      return c.json({ success: false, error: 'Room not found' }, 404)
    }

    // メンバーシップチェック
    const membership = await c.env.DB.prepare(`
      SELECT * FROM chat_room_members
      WHERE room_id = ? AND user_id = ?
    `).bind(roomId, userId).first()

    if (!membership) {
      return c.json({ success: false, error: 'Access denied' }, 403)
    }

    // メンバー一覧取得
    const members = await c.env.DB.prepare(`
      SELECT 
        u.id, u.nickname, u.avatar_url,
        crm.joined_at
      FROM chat_room_members crm
      INNER JOIN users u ON crm.user_id = u.id
      WHERE crm.room_id = ?
      ORDER BY crm.joined_at ASC
    `).bind(roomId).all()

    return c.json({
      success: true,
      room: {
        ...room,
        members: members.results || []
      }
    })
  } catch (error: any) {
    console.error('[Chat Room Detail Error]', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * GET /api/chat/rooms/:id/messages
 * チャットメッセージ取得
 */
chat.get('/rooms/:id/messages', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const userId = result.payload.userId
    const roomId = c.req.param('id')
    const limit = parseInt(c.req.query('limit') || '50')
    const before = c.req.query('before') // メッセージID（ページネーション用）

    // メンバーシップチェック
    const membership = await c.env.DB.prepare(`
      SELECT * FROM chat_room_members
      WHERE room_id = ? AND user_id = ?
    `).bind(roomId, userId).first()

    if (!membership) {
      return c.json({ success: false, error: 'Access denied' }, 403)
    }

    // メッセージ取得
    let query = `
      SELECT 
        cm.id, cm.message, cm.created_at,
        u.id as user_id, u.nickname, u.avatar_url
      FROM chat_messages cm
      INNER JOIN users u ON cm.user_id = u.id
      WHERE cm.room_id = ?
    `
    const params: any[] = [roomId]

    if (before) {
      query += ` AND cm.id < ?`
      params.push(before)
    }

    query += ` ORDER BY cm.created_at DESC LIMIT ?`
    params.push(limit)

    const messages = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      messages: (messages.results || []).reverse() // 古い順に並び替え
    })
  } catch (error: any) {
    console.error('[Chat Messages Error]', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * POST /api/chat/rooms/:id/messages
 * メッセージ送信
 */
chat.post('/rooms/:id/messages', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const userId = result.payload.userId
    const roomId = c.req.param('id')
    const { message } = await c.req.json()

    if (!message || message.trim() === '') {
      return c.json({ success: false, error: 'Message is required' }, 400)
    }

    // メンバーシップチェック
    const membership = await c.env.DB.prepare(`
      SELECT * FROM chat_room_members
      WHERE room_id = ? AND user_id = ?
    `).bind(roomId, userId).first()

    if (!membership) {
      return c.json({ success: false, error: 'Access denied' }, 403)
    }

    // メッセージ保存
    const messageResult = await c.env.DB.prepare(`
      INSERT INTO chat_messages (room_id, user_id, message)
      VALUES (?, ?, ?)
    `).bind(roomId, userId, message.trim()).run()

    // ルームの更新日時を更新
    await c.env.DB.prepare(`
      UPDATE chat_rooms SET updated_at = datetime('now')
      WHERE id = ?
    `).bind(roomId).run()

    // 送信したメッセージを取得
    const newMessage = await c.env.DB.prepare(`
      SELECT 
        cm.id, cm.message, cm.created_at,
        u.id as user_id, u.nickname, u.avatar_url
      FROM chat_messages cm
      INNER JOIN users u ON cm.user_id = u.id
      WHERE cm.id = ?
    `).bind(messageResult.meta.last_row_id).first()

    return c.json({
      success: true,
      message: newMessage
    }, 201)
  } catch (error: any) {
    console.error('[Chat Message Send Error]', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * POST /api/chat/rooms/:id/members
 * チャットルームにメンバーを招待（管理者のみ）
 */
chat.post('/rooms/:id/members', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const userId = result.payload.userId
    const role = result.payload.role
    const roomId = c.req.param('id')
    const { userIds } = await c.req.json()

    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403)
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return c.json({ success: false, error: 'User IDs are required' }, 400)
    }

    // ルーム存在チェック
    const room = await c.env.DB.prepare(`
      SELECT * FROM chat_rooms WHERE id = ?
    `).bind(roomId).first()

    if (!room) {
      return c.json({ success: false, error: 'Room not found' }, 404)
    }

    // メンバー追加
    const added = []
    for (const memberId of userIds) {
      try {
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO chat_room_members (room_id, user_id)
          VALUES (?, ?)
        `).bind(roomId, memberId).run()
        added.push(memberId)
      } catch (error) {
        console.error(`Failed to add member ${memberId}:`, error)
      }
    }

    return c.json({
      success: true,
      addedCount: added.length
    })
  } catch (error: any) {
    console.error('[Chat Add Members Error]', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default chat
