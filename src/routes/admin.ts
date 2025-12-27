// ============================================
// 管理者ルート（Week 3-4）
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware, requireRole } from '../middleware/auth'
import { globalQuery } from '../lib/db'
import { 
  sendEmail, 
  getMemberApprovedEmail,
  getMemberRejectedEmail 
} from '../lib/email'

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

    // 承認通知メール送信
    const resendApiKey = c.env.RESEND_API_KEY
    if (resendApiKey) {
      // ユーザー情報とテナント情報取得
      const user = await db
        .prepare('SELECT email, nickname FROM users WHERE id = ?')
        .bind(membership.user_id)
        .first<{ email: string; nickname: string }>()

      const tenant = await db
        .prepare('SELECT name, subdomain FROM tenants WHERE id = ?')
        .bind(tenantId)
        .first<{ name: string; subdomain: string }>()

      if (user && tenant) {
        const emailTemplate = getMemberApprovedEmail({
          nickname: user.nickname,
          communityName: tenant.name,
          memberNumber,
          loginUrl: `https://${tenant.subdomain}.commons.com/member/login`
        })
        
        await sendEmail({
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        }, resendApiKey)
      }
    }

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

    // ユーザー情報とテナント情報取得（メール送信用）
    const user = await db
      .prepare('SELECT email, nickname FROM users WHERE id = ?')
      .bind(membership.user_id)
      .first<{ email: string; nickname: string }>()

    const tenant = await db
      .prepare('SELECT name FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<{ name: string }>()

    // メンバーシップを削除
    await db
      .prepare('DELETE FROM tenant_memberships WHERE id = ?')
      .bind(membershipId)
      .run()

    // 拒否通知メール送信
    const resendApiKey = c.env.RESEND_API_KEY
    if (resendApiKey && user && tenant) {
      const emailTemplate = getMemberRejectedEmail({
        nickname: user.nickname,
        communityName: tenant.name
      })
      
      await sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      }, resendApiKey)
    }

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

/**
 * GET /api/admin/members/active
 * 承認済み会員一覧
 */
admin.get('/members/active', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const result = await globalQuery<any>(
      db,
      `SELECT tm.id, tm.user_id, tm.member_number, tm.role, tm.joined_at, u.email, u.nickname, u.avatar_url
       FROM tenant_memberships tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.tenant_id = ? AND tm.status = 'active'
       ORDER BY tm.joined_at DESC`,
      [tenantId]
    )

    return c.json({
      success: true,
      members: result.results || []
    })
  } catch (error) {
    console.error('[Get Active Members Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get active members'
    }, 500)
  }
})

/**
 * GET /api/admin/tenant/settings
 * テナント設定取得
 */
admin.get('/tenant/settings', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const tenant = await db
      .prepare('SELECT id, subdomain, name, subtitle, is_public, plan, status FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first()

    return c.json({
      success: true,
      tenant
    })
  } catch (error) {
    console.error('[Get Tenant Settings Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tenant settings'
    }, 500)
  }
})

/**
 * PUT /api/admin/tenant/privacy
 * 公開設定変更
 */
admin.put('/tenant/privacy', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB
  const { isPublic } = await c.req.json<{ isPublic: number }>()

  if (isPublic !== 0 && isPublic !== 1) {
    return c.json({ success: false, error: 'Invalid isPublic value. Must be 0 or 1' }, 400)
  }

  try {
    await db
      .prepare('UPDATE tenants SET is_public = ? WHERE id = ?')
      .bind(isPublic, tenantId)
      .run()

    return c.json({
      success: true,
      message: 'Privacy setting updated successfully'
    })
  } catch (error) {
    console.error('[Update Privacy Setting Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update privacy setting'
    }, 500)
  }
})

/**
 * GET /api/admin/members/:id
 * 会員詳細取得
 */
admin.get('/members/:id', authMiddleware, requireRole('admin'), async (c) => {
  const membershipId = parseInt(c.req.param('id'))
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // 会員情報取得
    const member = await db
      .prepare(`
        SELECT 
          tm.id, tm.user_id, tm.member_number, tm.role, tm.status, tm.joined_at,
          u.email, u.nickname, u.avatar_url, u.bio
        FROM tenant_memberships tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.id = ? AND tm.tenant_id = ?
      `)
      .bind(membershipId, tenantId)
      .first<any>()

    if (!member) {
      return c.json({ success: false, error: 'Member not found' }, 404)
    }

    // 会員の投稿数を取得
    const postCount = await db
      .prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ? AND tenant_id = ?')
      .bind(member.user_id, tenantId)
      .first<{ count: number }>()

    // 会員のコメント数を取得
    const commentCount = await db
      .prepare('SELECT COUNT(*) as count FROM comments WHERE user_id = ?')
      .bind(member.user_id)
      .first<{ count: number }>()

    // 最新の投稿10件を取得
    const recentPostsResult = await db
      .prepare(`
        SELECT id, title, status, view_count, created_at
        FROM posts
        WHERE author_id = ? AND tenant_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `)
      .bind(member.user_id, tenantId)
      .all()

    // 最新のコメント10件を取得（投稿タイトルも含む）
    const recentCommentsResult = await db
      .prepare(`
        SELECT c.id, c.content, c.created_at, p.id as post_id, p.title as post_title
        FROM comments c
        JOIN posts p ON c.post_id = p.id
        WHERE c.user_id = ? AND p.tenant_id = ?
        ORDER BY c.created_at DESC
        LIMIT 10
      `)
      .bind(member.user_id, tenantId)
      .all()

    // いいね数を取得
    const likeCount = await db
      .prepare('SELECT COUNT(*) as count FROM likes WHERE user_id = ?')
      .bind(member.user_id)
      .first<{ count: number }>()

    return c.json({
      success: true,
      member: {
        ...member,
        post_count: postCount?.count || 0,
        comment_count: commentCount?.count || 0,
        like_count: likeCount?.count || 0,
        recent_posts: recentPostsResult?.results || [],
        recent_comments: recentCommentsResult?.results || []
      }
    })
  } catch (error) {
    console.error('[Get Member Detail Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get member detail'
    }, 500)
  }
})

/**
 * PATCH /api/admin/members/:id/status
 * 会員ステータス変更
 */
admin.patch('/members/:id/status', authMiddleware, requireRole('admin'), async (c) => {
  const membershipId = parseInt(c.req.param('id'))
  const tenantId = c.get('tenantId')
  const db = c.env.DB
  const { status } = await c.req.json<{ status: string }>()

  // ステータスの検証
  const validStatuses = ['active', 'suspended', 'withdrawn']
  if (!validStatuses.includes(status)) {
    return c.json({ 
      success: false, 
      error: 'Invalid status. Must be one of: active, suspended, withdrawn' 
    }, 400)
  }

  try {
    // 会員情報取得
    const member = await db
      .prepare('SELECT * FROM tenant_memberships WHERE id = ? AND tenant_id = ?')
      .bind(membershipId, tenantId)
      .first<any>()

    if (!member) {
      return c.json({ success: false, error: 'Member not found' }, 404)
    }

    // オーナーのステータスは変更できない
    if (member.role === 'owner') {
      return c.json({ 
        success: false, 
        error: 'Cannot change owner status' 
      }, 403)
    }

    const oldStatus = member.status

    // ステータス更新
    await db
      .prepare('UPDATE tenant_memberships SET status = ? WHERE id = ?')
      .bind(status, membershipId)
      .run()

    // アクティブ会員数を更新
    if (oldStatus === 'active' && status !== 'active') {
      // アクティブ → 非アクティブ
      await db
        .prepare('UPDATE tenants SET member_count = member_count - 1 WHERE id = ?')
        .bind(tenantId)
        .run()
    } else if (oldStatus !== 'active' && status === 'active') {
      // 非アクティブ → アクティブ
      await db
        .prepare('UPDATE tenants SET member_count = member_count + 1 WHERE id = ?')
        .bind(tenantId)
        .run()
    }

    return c.json({
      success: true,
      message: 'Status updated successfully',
      member: {
        id: membershipId,
        status
      }
    })
  } catch (error) {
    console.error('[Update Member Status Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status'
    }, 500)
  }
})

/**
 * PATCH /api/admin/members/:id/role
 * 会員役割変更（オーナーのみ）
 */
admin.patch('/members/:id/role', authMiddleware, requireRole('owner'), async (c) => {
  const membershipId = parseInt(c.req.param('id'))
  const tenantId = c.get('tenantId')
  const db = c.env.DB
  const { role } = await c.req.json<{ role: string }>()

  // 役割の検証
  const validRoles = ['member', 'admin']
  if (!validRoles.includes(role)) {
    return c.json({ 
      success: false, 
      error: 'Invalid role. Must be one of: member, admin' 
    }, 400)
  }

  try {
    // 会員情報取得
    const member = await db
      .prepare('SELECT * FROM tenant_memberships WHERE id = ? AND tenant_id = ?')
      .bind(membershipId, tenantId)
      .first<any>()

    if (!member) {
      return c.json({ success: false, error: 'Member not found' }, 404)
    }

    // オーナーの役割は変更できない
    if (member.role === 'owner') {
      return c.json({ 
        success: false, 
        error: 'Cannot change owner role' 
      }, 403)
    }

    // 役割更新
    await db
      .prepare('UPDATE tenant_memberships SET role = ? WHERE id = ?')
      .bind(role, membershipId)
      .run()

    return c.json({
      success: true,
      message: 'Role updated successfully',
      member: {
        id: membershipId,
        role
      }
    })
  } catch (error) {
    console.error('[Update Member Role Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role'
    }, 500)
  }
})

export default admin
