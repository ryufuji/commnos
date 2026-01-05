// ============================================
// プラットフォーム管理ルート（VALUE ARCHITECTS専用）
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware, platformAdminMiddleware } from '../middleware/auth'
import { hashPassword, verifyPassword } from '../lib/password'
import { generateToken } from '../lib/jwt'

const platform = new Hono<AppContext>()

/**
 * POST /api/platform/auth/login
 * プラットフォーム管理者専用ログイン
 */
platform.post('/auth/login', async (c) => {
  const db = c.env.DB

  try {
    const { email, password } = await c.req.json()

    if (!email || !password) {
      return c.json({
        success: false,
        error: 'Email and password are required'
      }, 400)
    }

    // プラットフォーム管理者を取得
    const admin = await db
      .prepare('SELECT * FROM platform_admins WHERE email = ? AND is_active = 1')
      .bind(email)
      .first<any>()

    if (!admin) {
      return c.json({
        success: false,
        error: 'Invalid credentials'
      }, 401)
    }

    // パスワード検証
    const isValid = await verifyPassword(password, admin.password_hash)

    if (!isValid) {
      return c.json({
        success: false,
        error: 'Invalid credentials'
      }, 401)
    }

    // 最終ログイン日時更新
    await db
      .prepare('UPDATE platform_admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(admin.id)
      .run()

    // JWTトークン生成（tenantId不要、isPlatformAdmin: true）
    const secret = c.env.JWT_SECRET
    const token = await generateToken(
      {
        userId: admin.id,
        email: admin.email,
        isPlatformAdmin: true,
        tenantId: null,
        role: 'platform_admin'
      },
      secret
    )

    return c.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    })
  } catch (error) {
    console.error('[Platform Admin Login Error]', error)
    return c.json({
      success: false,
      error: 'Login failed'
    }, 500)
  }
})

/**
 * POST /api/platform/auth/register
 * プラットフォーム管理者登録（初回セットアップ用）
 * 本番環境では無効化推奨
 */
platform.post('/auth/register', async (c) => {
  const db = c.env.DB

  try {
    // 既存の管理者が存在する場合は登録不可
    const existingAdmin = await db
      .prepare('SELECT COUNT(*) as count FROM platform_admins')
      .first<any>()

    if (existingAdmin.count > 0) {
      return c.json({
        success: false,
        error: 'Admin registration is disabled'
      }, 403)
    }

    const { email, password, name } = await c.req.json()

    if (!email || !password || !name) {
      return c.json({
        success: false,
        error: 'Email, password, and name are required'
      }, 400)
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(password)

    // 管理者作成
    const result = await db
      .prepare(`
        INSERT INTO platform_admins (email, password_hash, name)
        VALUES (?, ?, ?)
      `)
      .bind(email, passwordHash, name)
      .run()

    if (!result.success) {
      throw new Error('Failed to create admin')
    }

    return c.json({
      success: true,
      message: 'Platform admin created successfully'
    })
  } catch (error) {
    console.error('[Platform Admin Register Error]', error)
    return c.json({
      success: false,
      error: 'Registration failed'
    }, 500)
  }
})

/**
 * GET /api/platform/dashboard
 * プラットフォーム全体のKPI取得
 */
platform.get('/dashboard', authMiddleware, platformAdminMiddleware, async (c) => {
  const db = c.env.DB

  try {
    // 総テナント数
    const tenantStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
        FROM tenants
      `)
      .first<any>()

    // 総ユーザー数
    const userStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as new_this_month
        FROM users
      `)
      .first<any>()

    // 総投稿数・コメント数
    const contentStats = await db
      .prepare(`
        SELECT 
          (SELECT COUNT(*) FROM posts) as total_posts,
          (SELECT COUNT(*) FROM comments) as total_comments
      `)
      .first<any>()

    // 収益サマリー（TODO: earnings_transactionsから計算）
    const revenueStats = await db
      .prepare(`
        SELECT 
          COALESCE(SUM(balance), 0) as total_balance,
          COALESCE(SUM(total_earned), 0) as total_earned,
          COALESCE(SUM(total_paid), 0) as total_paid
        FROM tenant_earnings
      `)
      .first<any>()

    // プラットフォーム手数料収益（20%）
    const platformRevenue = Math.floor((revenueStats.total_earned || 0) * 0.2)

    // トップテナント（収益順）
    const topTenants = await db
      .prepare(`
        SELECT 
          t.id, t.subdomain, t.name, t.member_count,
          te.total_earned, te.balance
        FROM tenants t
        LEFT JOIN tenant_earnings te ON t.id = te.tenant_id
        WHERE t.status = 'active'
        ORDER BY te.total_earned DESC
        LIMIT 10
      `)
      .all()

    return c.json({
      success: true,
      kpi: {
        tenants: {
          total: tenantStats.total || 0,
          active: tenantStats.active || 0,
          suspended: tenantStats.suspended || 0
        },
        users: {
          total: userStats.total || 0,
          new_this_month: userStats.new_this_month || 0
        },
        content: {
          total_posts: contentStats.total_posts || 0,
          total_comments: contentStats.total_comments || 0
        },
        revenue: {
          total_earned: revenueStats.total_earned || 0,
          platform_revenue: platformRevenue,
          tenant_revenue: (revenueStats.total_earned || 0) - platformRevenue,
          total_balance: revenueStats.total_balance || 0,
          total_paid: revenueStats.total_paid || 0
        }
      },
      top_tenants: topTenants.results || []
    })
  } catch (error) {
    console.error('[Platform Dashboard Error]', error)
    return c.json({
      success: false,
      error: 'Failed to load dashboard'
    }, 500)
  }
})

/**
 * GET /api/platform/tenants
 * 全テナント一覧
 */
platform.get('/tenants', authMiddleware, platformAdminMiddleware, async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('per_page') || '20')
  const status = c.req.query('status') // active, suspended, all
  const search = c.req.query('search')

  try {
    let whereConditions = []
    let bindParams: any[] = []

    if (status && status !== 'all') {
      whereConditions.push('t.status = ?')
      bindParams.push(status)
    }

    if (search) {
      whereConditions.push('(t.subdomain LIKE ? OR t.name LIKE ?)')
      bindParams.push(`%${search}%`, `%${search}%`)
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

    // 総件数
    const countResult = await db
      .prepare(`SELECT COUNT(*) as count FROM tenants t ${whereClause}`)
      .bind(...bindParams)
      .first<any>()

    const totalCount = countResult.count || 0
    const totalPages = Math.ceil(totalCount / perPage)
    const offset = (page - 1) * perPage

    // テナント一覧
    const tenants = await db
      .prepare(`
        SELECT 
          t.id, t.subdomain, t.name, t.status, t.plan,
          t.member_count, t.storage_used, t.storage_limit,
          t.created_at,
          u.nickname as owner_nickname, u.email as owner_email,
          te.balance, te.total_earned
        FROM tenants t
        LEFT JOIN users u ON t.owner_user_id = u.id
        LEFT JOIN tenant_earnings te ON t.id = te.tenant_id
        ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...bindParams, perPage, offset)
      .all()

    return c.json({
      success: true,
      tenants: tenants.results || [],
      pagination: {
        page,
        per_page: perPage,
        total_count: totalCount,
        total_pages: totalPages
      }
    })
  } catch (error) {
    console.error('[Platform Tenants Error]', error)
    return c.json({
      success: false,
      error: 'Failed to load tenants'
    }, 500)
  }
})

/**
 * GET /api/platform/tenants/:id
 * テナント詳細
 */
platform.get('/tenants/:id', authMiddleware, platformAdminMiddleware, async (c) => {
  const db = c.env.DB
  const tenantId = c.req.param('id')

  try {
    // テナント基本情報
    const tenant = await db
      .prepare(`
        SELECT 
          t.*,
          u.nickname as owner_nickname, u.email as owner_email,
          te.balance, te.total_earned, te.total_paid, te.last_payout_at
        FROM tenants t
        LEFT JOIN users u ON t.owner_user_id = u.id
        LEFT JOIN tenant_earnings te ON t.id = te.tenant_id
        WHERE t.id = ?
      `)
      .bind(tenantId)
      .first<any>()

    if (!tenant) {
      return c.json({
        success: false,
        error: 'Tenant not found'
      }, 404)
    }

    // テナントのプラン一覧
    const plans = await db
      .prepare(`
        SELECT * FROM tenant_plans 
        WHERE tenant_id = ? 
        ORDER BY sort_order ASC, created_at ASC
      `)
      .bind(tenantId)
      .all()

    // メンバー統計
    const memberStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN role = 'owner' THEN 1 ELSE 0 END) as owners,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
          SUM(CASE WHEN role = 'member' THEN 1 ELSE 0 END) as members,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM tenant_memberships
        WHERE tenant_id = ?
      `)
      .bind(tenantId)
      .first<any>()

    // 投稿統計
    const postStats = await db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
          COALESCE(SUM(view_count), 0) as total_views
        FROM posts
        WHERE tenant_id = ?
      `)
      .bind(tenantId)
      .first<any>()

    return c.json({
      success: true,
      tenant,
      plans: plans.results || [],
      stats: {
        members: memberStats,
        posts: postStats
      }
    })
  } catch (error) {
    console.error('[Platform Tenant Detail Error]', error)
    return c.json({
      success: false,
      error: 'Failed to load tenant detail'
    }, 500)
  }
})

/**
 * PATCH /api/platform/tenants/:id/status
 * テナントステータス変更（停止/再開）
 */
platform.patch('/tenants/:id/status', authMiddleware, platformAdminMiddleware, async (c) => {
  const db = c.env.DB
  const tenantId = c.req.param('id')
  const { status } = await c.req.json()

  if (!['active', 'suspended'].includes(status)) {
    return c.json({
      success: false,
      error: 'Invalid status. Must be "active" or "suspended"'
    }, 400)
  }

  try {
    await db
      .prepare('UPDATE tenants SET status = ? WHERE id = ?')
      .bind(status, tenantId)
      .run()

    return c.json({
      success: true,
      message: `Tenant status updated to ${status}`
    })
  } catch (error) {
    console.error('[Platform Tenant Status Error]', error)
    return c.json({
      success: false,
      error: 'Failed to update tenant status'
    }, 500)
  }
})

/**
 * GET /api/platform/media
 * 全メディアコンテンツ一覧（画像・動画）
 */
platform.get('/media', authMiddleware, platformAdminMiddleware, async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('per_page') || '50')
  const tenantId = c.req.query('tenant_id')
  const mediaType = c.req.query('type') // image, video
  const search = c.req.query('search')

  try {
    let whereConditions = []
    let bindParams: any[] = []

    if (tenantId) {
      whereConditions.push('p.tenant_id = ?')
      bindParams.push(tenantId)
    }

    if (mediaType === 'image') {
      whereConditions.push('p.thumbnail_url IS NOT NULL')
    } else if (mediaType === 'video') {
      whereConditions.push('p.video_url IS NOT NULL')
    }

    if (search) {
      whereConditions.push('(p.title LIKE ? OR u.nickname LIKE ?)')
      bindParams.push(`%${search}%`, `%${search}%`)
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

    // 総件数
    const countResult = await db
      .prepare(`
        SELECT COUNT(*) as count 
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        ${whereClause}
      `)
      .bind(...bindParams)
      .first<any>()

    const totalCount = countResult.count || 0
    const totalPages = Math.ceil(totalCount / perPage)
    const offset = (page - 1) * perPage

    // メディア一覧
    const media = await db
      .prepare(`
        SELECT 
          p.id, p.title, p.thumbnail_url, p.video_url,
          p.status, p.created_at,
          p.tenant_id, t.subdomain, t.name as tenant_name,
          u.id as user_id, u.nickname, u.email
        FROM posts p
        LEFT JOIN tenants t ON p.tenant_id = t.id
        LEFT JOIN users u ON p.user_id = u.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...bindParams, perPage, offset)
      .all()

    return c.json({
      success: true,
      media: media.results || [],
      pagination: {
        page,
        per_page: perPage,
        total_count: totalCount,
        total_pages: totalPages
      }
    })
  } catch (error) {
    console.error('[Platform Media Error]', error)
    return c.json({
      success: false,
      error: 'Failed to load media'
    }, 500)
  }
})

/**
 * DELETE /api/platform/media/:id
 * メディアコンテンツ削除（投稿削除）
 */
platform.delete('/media/:id', authMiddleware, platformAdminMiddleware, async (c) => {
  const db = c.env.DB
  const postId = c.req.param('id')

  try {
    // 投稿を削除（カスケードでコメント・いいねも削除される）
    const result = await db
      .prepare('DELETE FROM posts WHERE id = ?')
      .bind(postId)
      .run()

    if (result.success) {
      return c.json({
        success: true,
        message: 'Media content deleted'
      })
    } else {
      throw new Error('Failed to delete post')
    }
  } catch (error) {
    console.error('[Platform Media Delete Error]', error)
    return c.json({
      success: false,
      error: 'Failed to delete media content'
    }, 500)
  }
})

export default platform
