// ============================================
// テナント認証API（Phase 2: テナント会員の入口）
// 会員登録とログイン
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import * as bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const tenantAuth = new Hono<AppContext>()

// ============================================
// テナント会員登録API（POST /api/tenant/register）
// ============================================
tenantAuth.post('/register', async (c) => {
  const { DB } = c.env
  const { email, password, nickname, subdomain } = await c.req.json()

  try {
    // Validation
    if (!email || !password || !nickname || !subdomain) {
      return c.json({
        success: false,
        message: 'すべての項目を入力してください'
      }, 400)
    }

    // Get tenant by subdomain
    const tenant = await DB.prepare(`
      SELECT id FROM tenants WHERE subdomain = ?
    `).bind(subdomain).first() as any

    if (!tenant) {
      return c.json({
        success: false,
        message: 'テナントが見つかりません'
      }, 404)
    }

    // Check if user already exists
    const existingUser = await DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first()

    if (existingUser) {
      return c.json({
        success: false,
        message: 'このメールアドレスは既に登録されています'
      }, 400)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user
    const userResult = await DB.prepare(`
      INSERT INTO users (email, password_hash, nickname, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(email, hashedPassword, nickname).run()

    if (!userResult.success) {
      throw new Error('ユーザーの作成に失敗しました')
    }

    const userId = userResult.meta.last_row_id

    // Get next member number
    const memberCountResult = await DB.prepare(`
      SELECT COUNT(*) as count FROM tenant_memberships WHERE tenant_id = ?
    `).bind(tenant.id).first() as any

    const memberNumber = `M-${String(memberCountResult.count + 1).padStart(3, '0')}`

    // Create tenant membership (status: pending - waiting for approval)
    const membershipResult = await DB.prepare(`
      INSERT INTO tenant_memberships (tenant_id, user_id, role, member_number, status, joined_at)
      VALUES (?, ?, 'member', ?, 'pending', datetime('now'))
    `).bind(tenant.id, userId, memberNumber).run()

    if (!membershipResult.success) {
      // Rollback user creation
      await DB.prepare(`DELETE FROM users WHERE id = ?`).bind(userId).run()
      throw new Error('会員申請の送信に失敗しました')
    }

    return c.json({
      success: true,
      message: '会員申請を送信しました。管理者の承認をお待ちください。',
      user: {
        id: userId,
        email,
        nickname,
        memberNumber
      }
    }, 201)
  } catch (error: any) {
    console.error('Tenant register error:', error)
    return c.json({
      success: false,
      message: error.message || '会員登録に失敗しました'
    }, 500)
  }
})

// ============================================
// テナント会員ログインAPI（POST /api/tenant/login）
// ============================================
tenantAuth.post('/login', async (c) => {
  const { DB } = c.env
  const { email, password, subdomain } = await c.req.json()

  try {
    // Validation
    if (!email || !password || !subdomain) {
      return c.json({
        success: false,
        message: 'すべての項目を入力してください'
      }, 400)
    }

    // Get tenant by subdomain
    const tenant = await DB.prepare(`
      SELECT id, name FROM tenants WHERE subdomain = ?
    `).bind(subdomain).first() as any

    if (!tenant) {
      return c.json({
        success: false,
        message: 'テナントが見つかりません'
      }, 404)
    }

    // Get user by email
    const user = await DB.prepare(`
      SELECT id, email, password_hash, nickname, avatar_url, created_at
      FROM users
      WHERE email = ?
    `).bind(email).first() as any

    if (!user) {
      return c.json({
        success: false,
        message: 'メールアドレスまたはパスワードが正しくありません'
      }, 401)
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash)

    if (!passwordValid) {
      return c.json({
        success: false,
        message: 'メールアドレスまたはパスワードが正しくありません'
      }, 401)
    }

    // Check tenant membership
    const membership = await DB.prepare(`
      SELECT role, member_number, status, joined_at
      FROM tenant_memberships
      WHERE tenant_id = ? AND user_id = ?
    `).bind(tenant.id, user.id).first() as any

    if (!membership) {
      return c.json({
        success: false,
        message: 'このテナントの会員ではありません'
      }, 403)
    }

    // Check membership status
    if (membership.status === 'pending') {
      return c.json({
        success: false,
        message: '会員申請は承認待ちです。管理者の承認をお待ちください。'
      }, 403)
    }

    if (membership.status !== 'active' && membership.status !== 'approved') {
      return c.json({
        success: false,
        message: '会員ステータスが無効です。管理者にお問い合わせください。'
      }, 403)
    }

    // Generate JWT token
    const secret = new TextEncoder().encode(c.env.JWT_SECRET || 'your-secret-key')
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: membership.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    return c.json({
      success: true,
      message: 'ログインに成功しました',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        role: membership.role,
        memberNumber: membership.member_number,
        tenantId: tenant.id,
        tenantName: tenant.name
      }
    })
  } catch (error: any) {
    console.error('Tenant login error:', error)
    return c.json({
      success: false,
      message: error.message || 'ログインに失敗しました'
    }, 500)
  }
})

export default tenantAuth
