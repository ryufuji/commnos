// ============================================
// 会員管理ルート（Week 3-4）
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { tenantMiddleware } from '../middleware/auth'
import { hashPassword } from '../lib/password'
import { 
  sendEmail, 
  getMemberApplicationReceivedEmail,
  getNewApplicationNotificationEmail 
} from '../lib/email'

const members = new Hono<AppContext>()

/**
 * POST /api/members/apply
 * 会員申請
 */
members.post('/apply', tenantMiddleware, async (c) => {
  const { email, password, nickname, survey_responses } = await c.req.json<{
    email: string
    password: string
    nickname: string
    survey_responses?: Array<{
      survey_id: number
      question_id: number
      answer: string | number | string[]
    }>
  }>()

  if (!email || !password || !nickname) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }

  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // メールアドレス重複チェック（グローバル）
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()

    let userId: number

    if (existingUser) {
      // 既存ユーザーの場合
      userId = (existingUser as any).id

      // すでにこのテナントに申請済みかチェック
      const existingMembership = await db
        .prepare('SELECT id, status FROM tenant_memberships WHERE tenant_id = ? AND user_id = ?')
        .bind(tenantId, userId)
        .first()

      if (existingMembership) {
        const status = (existingMembership as any).status
        if (status === 'active') {
          return c.json({ success: false, error: 'Already a member' }, 409)
        } else if (status === 'pending') {
          return c.json({ success: false, error: 'Application already submitted' }, 409)
        }
      }
    } else {
      // 新規ユーザーの場合
      const passwordHash = await hashPassword(password)

      const userResult = await db
        .prepare('INSERT INTO users (email, password_hash, nickname, status) VALUES (?, ?, ?, ?)')
        .bind(email, passwordHash, nickname, 'active')
        .run()

      if (!userResult.success) {
        throw new Error('Failed to create user')
      }

      // 作成したユーザー ID を取得
      const user = await db
        .prepare('SELECT id FROM users WHERE email = ?')
        .bind(email)
        .first<{ id: number }>()

      if (!user) {
        throw new Error('Failed to retrieve user')
      }

      userId = user.id
    }

    // テナントメンバーシップ作成（status: pending）
    await db
      .prepare(`
        INSERT INTO tenant_memberships (tenant_id, user_id, role, status, joined_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `)
      .bind(tenantId, userId, 'member', 'pending')
      .run()

    // アンケート回答を保存
    if (survey_responses && survey_responses.length > 0) {
      for (const response of survey_responses) {
        await db.prepare(`
          INSERT INTO survey_responses 
          (survey_id, question_id, user_id, tenant_id, response_type, answer)
          VALUES (?, ?, ?, ?, 'join', ?)
        `).bind(
          response.survey_id,
          response.question_id,
          userId,
          tenantId,
          typeof response.answer === 'object' ? JSON.stringify(response.answer) : String(response.answer)
        ).run()
      }
    }

    // テナント情報取得（メール送信用）
    const tenant = await db
      .prepare('SELECT name FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<{ name: string }>()

    const communityName = tenant?.name || 'コミュニティ'

    // 申請者にメール送信
    const resendApiKey = c.env.RESEND_API_KEY
    if (resendApiKey) {
      const emailTemplate = getMemberApplicationReceivedEmail({
        nickname,
        communityName
      })
      
      await sendEmail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      }, resendApiKey)
    }

    // 管理者にメール通知（オーナーのメールアドレス取得）
    if (resendApiKey) {
      const owner = await db
        .prepare(`
          SELECT u.email, u.nickname 
          FROM users u 
          JOIN tenant_memberships tm ON u.id = tm.user_id 
          WHERE tm.tenant_id = ? AND tm.role = 'owner' AND tm.status = 'active'
        `)
        .bind(tenantId)
        .first<{ email: string; nickname: string }>()

      if (owner) {
        const emailTemplate = getNewApplicationNotificationEmail({
          applicantNickname: nickname,
          applicantEmail: email,
          communityName,
          dashboardUrl: `https://commons.com/members` // TODO: 実際のURLに置換
        })
        
        await sendEmail({
          to: owner.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        }, resendApiKey)
      }
    }

    return c.json({
      success: true,
      message: '申請を受け付けました。承認をお待ちください。'
    })
  } catch (error) {
    console.error('[Member Apply Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Application failed'
    }, 500)
  }
})

/**
 * GET /api/members?subdomain=xxx
 * テナントのメンバー一覧を取得（公開API - 認証不要）
 */
members.get('/', async (c) => {
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

    // テナントのメンバー一覧を取得
    const membersResult = await db
      .prepare(`
        SELECT 
          u.id,
          u.email,
          u.nickname,
          u.avatar_url,
          m.status,
          m.role
        FROM memberships m
        JOIN users u ON m.user_id = u.id
        WHERE m.tenant_id = ? AND m.status = 'active'
        ORDER BY u.nickname ASC
      `)
      .bind(tenant.id)
      .all()

    return c.json({
      success: true,
      members: membersResult.results || []
    })
  } catch (error) {
    console.error('[Get Members Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get members'
    }, 500)
  }
})

export default members


