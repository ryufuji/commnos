// ============================================
// 管理者ルート（Week 3-4）
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware, requireRole } from '../middleware/auth'
import { globalQuery } from '../lib/db'

const admin = new Hono<AppContext>()

/**
 * GET /api/admin/members/pending
 * 承認待ち会員一覧
 */
admin.get('/members/pending', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const result = await globalQuery<any>(
      db,
      `SELECT tm.id, tm.user_id, tm.joined_at, u.email, u.nickname
       FROM tenant_memberships tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.tenant_id = ? AND tm.status = 'pending'
       ORDER BY tm.joined_at DESC`,
      [tenantId]
    )

    return c.json({
      success: true,
      members: result.results || []
    })
  } catch (error) {
    console.error('[Get Pending Members Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending members'
    }, 500)
  }
})

/**
 * POST /api/admin/members/:id/approve
 * 会員承認
 */
admin.post('/members/:id/approve', authMiddleware, requireRole('admin'), async (c) => {
  const membershipId = parseInt(c.req.param('id'))
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // メンバーシップ情報取得
    const membership = await db
      .prepare('SELECT * FROM tenant_memberships WHERE id = ? AND tenant_id = ?')
      .bind(membershipId, tenantId)
      .first<any>()

    if (!membership) {
      return c.json({ success: false, error: 'Membership not found' }, 404)
    }

    if (membership.status !== 'pending') {
      return c.json({ success: false, error: 'Membership is not pending' }, 400)
    }

    // 会員番号を生成（M-001, M-002, ...）
    const countResult = await db
      .prepare('SELECT COUNT(*) as count FROM tenant_memberships WHERE tenant_id = ? AND status = ?')
      .bind(tenantId, 'active')
      .first<{ count: number }>()

    const memberNumber = `M-${String((countResult?.count || 0) + 1).padStart(3, '0')}`

    // ステータスを active に更新
    await db
      .prepare(`
        UPDATE tenant_memberships 
        SET status = 'active', member_number = ?
        WHERE id = ?
      `)
      .bind(memberNumber, membershipId)
      .run()

    // テナントのメンバー数を更新
    await db
      .prepare('UPDATE tenants SET member_count = member_count + 1 WHERE id = ?')
      .bind(tenantId)
      .run()

    // TODO: 会員にメール通知（Phase 1 後半で実装）

    return c.json({
      success: true,
      member: {
        id: membershipId,
        member_number: memberNumber,
        status: 'active'
      }
    })
  } catch (error) {
    console.error('[Approve Member Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Approval failed'
    }, 500)
  }
})

/**
 * POST /api/admin/members/:id/reject
 * 会員却下
 */
admin.post('/members/:id/reject', authMiddleware, requireRole('admin'), async (c) => {
  const membershipId = parseInt(c.req.param('id'))
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // メンバーシップ情報取得
    const membership = await db
      .prepare('SELECT * FROM tenant_memberships WHERE id = ? AND tenant_id = ?')
      .bind(membershipId, tenantId)
      .first<any>()

    if (!membership) {
      return c.json({ success: false, error: 'Membership not found' }, 404)
    }

    if (membership.status !== 'pending') {
      return c.json({ success: false, error: 'Membership is not pending' }, 400)
    }

    // メンバーシップを削除
    await db
      .prepare('DELETE FROM tenant_memberships WHERE id = ?')
      .bind(membershipId)
      .run()

    // TODO: 却下メール通知（任意）

    return c.json({
      success: true,
      message: 'Membership rejected'
    })
  } catch (error) {
    console.error('[Reject Member Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Rejection failed'
    }, 500)
  }
})

export default admin
