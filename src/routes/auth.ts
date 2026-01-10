// ============================================
// 認証ルート（Phase 1）
// ============================================

import { Hono } from 'hono'
import type { AppContext, RegisterRequest, LoginRequest, AuthResponse } from '../types'
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/password'
import { generateToken } from '../lib/jwt'
import { globalQuery } from '../lib/db'

const auth = new Hono<AppContext>()

/**
 * POST /api/auth/register
 * テナント作成（新規登録）
 */
auth.post('/register', async (c) => {
  const body = await c.req.json<RegisterRequest>()
  const { email, password, subdomain, communityName, subtitle, isPublic } = body

  // バリデーション
  if (!email || !password || !subdomain || !communityName) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }

  // パスワード強度チェック
  const passwordValidation = validatePasswordStrength(password)
  if (!passwordValidation.valid) {
    return c.json({ success: false, error: passwordValidation.errors.join(', ') }, 400)
  }

  // サブドメイン形式チェック（英数字とハイフンのみ、3-20文字）
  const subdomainRegex = /^[a-z0-9-]{3,20}$/
  if (!subdomainRegex.test(subdomain)) {
    return c.json({
      success: false,
      error: 'Subdomain must be 3-20 characters (lowercase, numbers, and hyphens only)'
    }, 400)
  }

  const db = c.env.DB

  try {
    // サブドメイン重複チェック
    const existingTenant = await db
      .prepare('SELECT id FROM tenants WHERE subdomain = ?')
      .bind(subdomain)
      .first()

    if (existingTenant) {
      return c.json({ success: false, error: 'Subdomain already exists' }, 409)
    }

    // メールアドレス重複チェック
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()

    if (existingUser) {
      return c.json({ success: false, error: 'Email already exists' }, 409)
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(password)

    // トランザクション的に実行（D1 は現在トランザクション未対応のため順次実行）
    
    // 1. ユーザー作成
    const userResult = await db
      .prepare('INSERT INTO users (email, password_hash, nickname, status) VALUES (?, ?, ?, ?)')
      .bind(email, passwordHash, communityName, 'active')
      .run()

    if (!userResult.success) {
      throw new Error('Failed to create user')
    }

    // 作成したユーザー ID を取得
    const user = await db
      .prepare('SELECT id, email, nickname, status, created_at FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: number; email: string; nickname: string; status: string; created_at: string }>()

    if (!user) {
      throw new Error('Failed to retrieve user')
    }

    // 2. テナント作成
    const tenantResult = await db
      .prepare(`
        INSERT INTO tenants (subdomain, name, subtitle, owner_user_id, plan, status, storage_limit, member_count, is_public)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(subdomain, communityName, subtitle || null, user.id, 'free', 'active', 1073741824, 1, isPublic !== undefined ? isPublic : 1)
      .run()

    if (!tenantResult.success) {
      throw new Error('Failed to create tenant')
    }

    // 作成したテナント ID を取得
    const tenant = await db
      .prepare('SELECT * FROM tenants WHERE subdomain = ?')
      .bind(subdomain)
      .first()

    if (!tenant) {
      throw new Error('Failed to retrieve tenant')
    }

    const tenantId = (tenant as any).id

    // 3. テナントメンバーシップ作成（owner 権限）
    // オーナーは会員番号 0、一般メンバーは 001 から開始
    await db
      .prepare(`
        INSERT INTO tenant_memberships (tenant_id, user_id, role, member_number, status, joined_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(tenantId, user.id, 'owner', '0', 'active')
      .run()

    // 4. テナント機能設定（Free プラン）
    await db
      .prepare(`
        INSERT INTO tenant_features (tenant_id, max_members, max_storage_gb, max_posts_per_month)
        VALUES (?, ?, ?, ?)
      `)
      .bind(tenantId, 100, 1, 100)
      .run()

    // JWT トークン生成
    const token = await generateToken(user.id, tenantId, 'owner', c.env.JWT_SECRET)

    // TODO: Welcome メール送信（Phase 1 後半で実装）

    const response: AuthResponse = {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: null,
        status: user.status,
        created_at: user.created_at,
        last_login_at: null
      },
      tenant: tenant as any
    }

    return c.json(response, 201)
  } catch (error) {
    console.error('[Register Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed'
    }, 500)
  }
})

/**
 * POST /api/auth/login
 * ログイン
 */
auth.post('/login', async (c) => {
  const body = await c.req.json<LoginRequest>()
  const { email, password } = body

  if (!email || !password) {
    return c.json({ success: false, error: 'Missing email or password' }, 400)
  }

  const db = c.env.DB

  try {
    // ユーザー取得
    const user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<any>()

    if (!user) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401)
    }

    // パスワード検証
    const valid = await verifyPassword(password, user.password_hash)

    if (!valid) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401)
    }

    // 最終ログイン日時を更新
    await db
      .prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?')
      .bind(user.id)
      .run()

    // デイリーログインポイント付与
    try {
      // テナントメンバーシップを先に取得（ポイント付与に必要）
      const tempMembership = await db
        .prepare(`
          SELECT tm.tenant_id
          FROM tenant_memberships tm
          JOIN tenants t ON tm.tenant_id = t.id
          WHERE tm.user_id = ? AND tm.status = 'active' AND t.status = 'active'
          ORDER BY tm.joined_at DESC
          LIMIT 1
        `)
        .bind(user.id)
        .first<any>()

      if (tempMembership) {
        // デイリーログインルールを取得
        const dailyLoginRule = await db
          .prepare(`
            SELECT points FROM point_rules
            WHERE tenant_id = ? AND action = 'daily_login' AND is_active = 1
          `)
          .bind(tempMembership.tenant_id)
          .first<any>()

        if (dailyLoginRule && dailyLoginRule.points > 0) {
          // 今日既にログインボーナスを獲得しているかチェック
          const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
          const alreadyEarned = await db
            .prepare(`
              SELECT id FROM point_transactions
              WHERE user_id = ? AND tenant_id = ? AND reason = 'daily_login'
                AND DATE(created_at) = ?
            `)
            .bind(user.id, tempMembership.tenant_id, today)
            .first()

          if (!alreadyEarned) {
            // ポイント残高を取得または作成
            let userPoints = await db
              .prepare(`
                SELECT * FROM user_points WHERE user_id = ? AND tenant_id = ?
              `)
              .bind(user.id, tempMembership.tenant_id)
              .first<any>()

            if (!userPoints) {
              await db
                .prepare(`
                  INSERT INTO user_points (user_id, tenant_id, balance, total_earned, total_spent, created_at, updated_at)
                  VALUES (?, ?, 0, 0, 0, datetime('now'), datetime('now'))
                `)
                .bind(user.id, tempMembership.tenant_id)
                .run()

              userPoints = { balance: 0, total_earned: 0 }
            }

            // ポイント付与
            const newBalance = (userPoints.balance || 0) + dailyLoginRule.points
            const newTotalEarned = (userPoints.total_earned || 0) + dailyLoginRule.points

            await db
              .prepare(`
                UPDATE user_points
                SET balance = ?, total_earned = ?, updated_at = datetime('now')
                WHERE user_id = ? AND tenant_id = ?
              `)
              .bind(newBalance, newTotalEarned, user.id, tempMembership.tenant_id)
              .run()

            // トランザクション記録
            await db
              .prepare(`
                INSERT INTO point_transactions 
                (user_id, tenant_id, action_type, reason, points, balance_after, created_at)
                VALUES (?, ?, 'earn', 'daily_login', ?, ?, datetime('now'))
              `)
              .bind(user.id, tempMembership.tenant_id, dailyLoginRule.points, newBalance)
              .run()
          }
        }
      }
    } catch (dailyLoginError) {
      console.error('[Daily Login Points Error]', dailyLoginError)
      // デイリーログインポイント付与に失敗してもログインは継続
    }

    // テナントメンバーシップを取得（最初のアクティブなもの）
    const membership = await db
      .prepare(`
        SELECT tm.*, t.subdomain, t.name as tenant_name
        FROM tenant_memberships tm
        JOIN tenants t ON tm.tenant_id = t.id
        WHERE tm.user_id = ? AND tm.status = 'active' AND t.status = 'active'
        ORDER BY tm.joined_at DESC
        LIMIT 1
      `)
      .bind(user.id)
      .first<any>()

    if (!membership) {
      return c.json({ success: false, error: 'No active membership found' }, 403)
    }

    // JWT トークン生成
    const token = await generateToken(
      user.id,
      membership.tenant_id,
      membership.role,
      c.env.JWT_SECRET
    )

    const response: AuthResponse = {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        status: user.status,
        created_at: user.created_at,
        last_login_at: user.last_login_at
      },
      membership: {
        id: membership.id,
        tenant_id: membership.tenant_id,
        user_id: membership.user_id,
        role: membership.role,
        plan_id: membership.plan_id,
        member_number: membership.member_number,
        status: membership.status,
        joined_at: membership.joined_at,
        expires_at: membership.expires_at,
        subdomain: membership.subdomain,        // Add subdomain
        tenant_name: membership.tenant_name      // Add tenant name
      }
    }

    return c.json(response)
  } catch (error) {
    console.error('[Login Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    }, 500)
  }
})

/**
 * POST /api/auth/logout
 * ログアウト（Phase 1 では実質的な処理なし）
 */
auth.post('/logout', async (c) => {
  // Phase 1: トークン無効化機能なし
  // クライアント側で localStorage からトークンを削除するだけ
  return c.json({ success: true, message: 'Logged out successfully' })
})

export default auth
