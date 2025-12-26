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
  const { email, password, nickname } = await c.req.json<{
    email: string
    password: string
    nickname: string
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

export default members

