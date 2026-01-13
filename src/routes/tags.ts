// ============================================
// ユーザータグ管理ルート
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { verifyToken } from '../lib/jwt'

const tags = new Hono<AppContext>()

/**
 * GET /api/tags?subdomain=xxx
 * タグ一覧取得（公開API）
 */
tags.get('/', async (c) => {
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.json({ success: false, error: 'Subdomain is required' }, 400)
  }

  const db = c.env.DB

  try {
    // サブドメインからテナントIDを取得
    const tenant = await db
      .prepare('SELECT id FROM tenants WHERE subdomain = ? AND status = ?')
      .bind(subdomain, 'active')
      .first() as { id: number } | null

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    // タグ一覧を取得
    const tagsResult = await db
      .prepare(`
        SELECT 
          id, name, color, description, created_at
        FROM user_tags
        WHERE tenant_id = ?
        ORDER BY name ASC
      `)
      .bind(tenant.id)
      .all()

    return c.json({
      success: true,
      tags: tagsResult.results || []
    })
  } catch (error) {
    console.error('[Get Tags Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tags'
    }, 500)
  }
})

/**
 * POST /api/tags
 * タグ作成（管理者のみ）
 */
tags.post('/', async (c) => {
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

    const tenantId = result.payload.tenantId
    const role = result.payload.role

    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403)
    }

    const { name, color, description } = await c.req.json()

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400)
    }

    // タグを作成
    const tagResult = await c.env.DB.prepare(`
      INSERT INTO user_tags (tenant_id, name, color, description)
      VALUES (?, ?, ?, ?)
    `).bind(tenantId, name, color || '#3B82F6', description || '').run()

    return c.json({
      success: true,
      tag: {
        id: tagResult.meta.last_row_id,
        name,
        color: color || '#3B82F6',
        description: description || ''
      }
    }, 201)
  } catch (error: any) {
    console.error('[Create Tag Error]', error)
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

/**
 * PUT /api/tags/:id
 * タグ更新（管理者のみ）
 */
tags.put('/:id', async (c) => {
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

    const tenantId = result.payload.tenantId
    const role = result.payload.role
    const tagId = c.req.param('id')

    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403)
    }

    const { name, color, description } = await c.req.json()

    // タグが存在し、テナントが一致するか確認
    const tag = await c.env.DB.prepare(`
      SELECT * FROM user_tags WHERE id = ? AND tenant_id = ?
    `).bind(tagId, tenantId).first()

    if (!tag) {
      return c.json({ success: false, error: 'Tag not found' }, 404)
    }

    // タグを更新
    await c.env.DB.prepare(`
      UPDATE user_tags
      SET name = ?, color = ?, description = ?, updated_at = datetime('now', '+9 hours')
      WHERE id = ? AND tenant_id = ?
    `).bind(name, color, description, tagId, tenantId).run()

    return c.json({
      success: true,
      tag: {
        id: parseInt(tagId),
        name,
        color,
        description
      }
    })
  } catch (error: any) {
    console.error('[Update Tag Error]', error)
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

/**
 * DELETE /api/tags/:id
 * タグ削除（管理者のみ）
 */
tags.delete('/:id', async (c) => {
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

    const tenantId = result.payload.tenantId
    const role = result.payload.role
    const tagId = c.req.param('id')

    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403)
    }

    // タグが存在し、テナントが一致するか確認
    const tag = await c.env.DB.prepare(`
      SELECT * FROM user_tags WHERE id = ? AND tenant_id = ?
    `).bind(tagId, tenantId).first()

    if (!tag) {
      return c.json({ success: false, error: 'Tag not found' }, 404)
    }

    // タグを削除（CASCADE で user_tag_assignments も自動削除される）
    await c.env.DB.prepare(`
      DELETE FROM user_tags WHERE id = ? AND tenant_id = ?
    `).bind(tagId, tenantId).run()

    return c.json({ success: true })
  } catch (error: any) {
    console.error('[Delete Tag Error]', error)
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

/**
 * POST /api/tags/:id/assign
 * ユーザーにタグを付与（管理者のみ）
 */
tags.post('/:id/assign', async (c) => {
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

    const tenantId = result.payload.tenantId
    const userId = result.payload.userId
    const role = result.payload.role
    const tagId = c.req.param('id')

    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403)
    }

    const { userIds } = await c.req.json() as { userIds: number[] }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return c.json({ success: false, error: 'User IDs are required' }, 400)
    }

    // タグが存在し、テナントが一致するか確認
    const tag = await c.env.DB.prepare(`
      SELECT * FROM user_tags WHERE id = ? AND tenant_id = ?
    `).bind(tagId, tenantId).first()

    if (!tag) {
      return c.json({ success: false, error: 'Tag not found' }, 404)
    }

    // ユーザーにタグを付与
    const assigned = []
    for (const targetUserId of userIds) {
      try {
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO user_tag_assignments (tenant_id, user_id, tag_id, assigned_by)
          VALUES (?, ?, ?, ?)
        `).bind(tenantId, targetUserId, tagId, userId).run()
        assigned.push(targetUserId)
      } catch (error) {
        console.error(`Failed to assign tag to user ${targetUserId}:`, error)
      }
    }

    return c.json({
      success: true,
      assignedCount: assigned.length
    })
  } catch (error: any) {
    console.error('[Assign Tag Error]', error)
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

/**
 * POST /api/tags/:id/unassign
 * ユーザーからタグを削除（管理者のみ）
 */
tags.post('/:id/unassign', async (c) => {
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

    const tenantId = result.payload.tenantId
    const role = result.payload.role
    const tagId = c.req.param('id')

    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403)
    }

    const { userIds } = await c.req.json() as { userIds: number[] }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return c.json({ success: false, error: 'User IDs are required' }, 400)
    }

    // ユーザーからタグを削除
    const unassigned = []
    for (const targetUserId of userIds) {
      try {
        await c.env.DB.prepare(`
          DELETE FROM user_tag_assignments
          WHERE tenant_id = ? AND user_id = ? AND tag_id = ?
        `).bind(tenantId, targetUserId, tagId).run()
        unassigned.push(targetUserId)
      } catch (error) {
        console.error(`Failed to unassign tag from user ${targetUserId}:`, error)
      }
    }

    return c.json({
      success: true,
      unassignedCount: unassigned.length
    })
  } catch (error: any) {
    console.error('[Unassign Tag Error]', error)
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

export default tags
