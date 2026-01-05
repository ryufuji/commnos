import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { AppContext } from '../types'

const notifications = new Hono<AppContext>()

// ============================================
// 通知一覧取得（認証必須）
// ============================================
notifications.get('/', authMiddleware, async (c) => {
  const { DB } = c.env
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  
  try {
    // クエリパラメータ
    const page = Number(c.req.query('page')) || 1
    const perPage = Number(c.req.query('perPage')) || 20
    const unreadOnly = c.req.query('unreadOnly') === 'true'
    const offset = (page - 1) * perPage
    
    // 通知総数を取得
    let countQuery = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND tenant_id = ?
    `
    if (unreadOnly) {
      countQuery += ' AND is_read = 0'
    }
    
    const countResult = await DB.prepare(countQuery)
      .bind(userId, tenantId)
      .first()
    
    const totalCount = countResult?.count || 0
    
    // 通知を取得
    let query = `
      SELECT 
        n.*,
        u.nickname as actor_name,
        u.avatar_url as actor_avatar
      FROM notifications n
      LEFT JOIN users u ON n.actor_id = u.id
      WHERE n.user_id = ? AND n.tenant_id = ?
    `
    if (unreadOnly) {
      query += ' AND n.is_read = 0'
    }
    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?'
    
    const result = await DB.prepare(query)
      .bind(userId, tenantId, perPage, offset)
      .all()
    
    const notifications = result.results || []
    
    // 未読数を取得
    const unreadCountResult = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND tenant_id = ? AND is_read = 0
    `).bind(userId, tenantId).first()
    
    const unreadCount = unreadCountResult?.count || 0
    
    return c.json({
      success: true,
      notifications,
      pagination: {
        page,
        perPage,
        totalCount,
        totalPages: Math.ceil(totalCount / perPage)
      },
      unreadCount
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return c.json({ success: false, error: 'Failed to fetch notifications' }, 500)
  }
})

// ============================================
// 未読通知数取得（認証必須）
// ============================================
notifications.get('/unread-count', authMiddleware, async (c) => {
  const { DB } = c.env
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  
  try {
    const result = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND tenant_id = ? AND is_read = 0
    `).bind(userId, tenantId).first()
    
    const unreadCount = result?.count || 0
    
    return c.json({
      success: true,
      unreadCount
    })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to fetch unread count',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// ============================================
// 通知を既読にする（認証必須）
// ============================================
notifications.put('/:notificationId/read', authMiddleware, async (c) => {
  const { DB } = c.env
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const notificationId = Number(c.req.param('notificationId'))
  
  if (!notificationId || isNaN(notificationId)) {
    return c.json({ success: false, error: 'Invalid notification ID' }, 400)
  }
  
  try {
    // 通知の所有権を確認
    const notification = await DB.prepare(`
      SELECT id FROM notifications
      WHERE id = ? AND user_id = ? AND tenant_id = ?
    `).bind(notificationId, userId, tenantId).first()
    
    if (!notification) {
      return c.json({ success: false, error: 'Notification not found' }, 404)
    }
    
    // 既読に更新
    await DB.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(notificationId).run()
    
    return c.json({
      success: true,
      message: 'Notification marked as read'
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return c.json({ success: false, error: 'Failed to mark notification as read' }, 500)
  }
})

// ============================================
// すべての通知を既読にする（認証必須）
// ============================================
notifications.put('/read-all', authMiddleware, async (c) => {
  const { DB } = c.env
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  
  try {
    await DB.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ? AND is_read = 0
    `).bind(userId, tenantId).run()
    
    return c.json({
      success: true,
      message: 'All notifications marked as read'
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return c.json({ success: false, error: 'Failed to mark all notifications as read' }, 500)
  }
})

// ============================================
// 通知作成（内部使用 - ヘルパー関数）
// ============================================
export async function createNotification(
  DB: any,
  data: {
    tenantId: number
    userId: number
    actorId: number
    type: string
    targetType: string
    targetId: number
    message: string
  }
) {
  try {
    // 自分自身への通知は作成しない
    if (data.userId === data.actorId) {
      return { success: true, message: 'Skipped self-notification' }
    }
    
    await DB.prepare(`
      INSERT INTO notifications (tenant_id, user_id, actor_id, type, target_type, target_id, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.tenantId,
      data.userId,
      data.actorId,
      data.type,
      data.targetType,
      data.targetId,
      data.message
    ).run()
    
    return { success: true, message: 'Notification created' }
  } catch (error) {
    console.error('Error creating notification:', error)
    return { success: false, error: 'Failed to create notification' }
  }
}

export default notifications
