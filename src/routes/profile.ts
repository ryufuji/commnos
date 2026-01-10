// ============================================
// プロフィール管理ルート（Week 5-6）
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const profile = new Hono<AppContext>()

/**
 * GET /api/profile
 * 自分のプロフィール取得
 */
profile.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const user = await db
      .prepare('SELECT id, email, nickname, avatar_url, bio, birthday, status, created_at, last_login_at FROM users WHERE id = ?')
      .bind(userId)
      .first<any>()

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }

    // テナント情報がある場合、そのテナントでの役割を取得
    let role = null
    if (tenantId) {
      const membership = await db
        .prepare('SELECT role FROM tenant_memberships WHERE user_id = ? AND tenant_id = ?')
        .bind(userId, tenantId)
        .first<{ role: string }>()
      
      role = membership?.role || 'member'
    }

    return c.json({
      success: true,
      user: {
        ...user,
        role
      }
    })
  } catch (error) {
    console.error('[Get Profile Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profile'
    }, 500)
  }
})

/**
 * PUT /api/profile
 * プロフィール更新（ニックネーム、自己紹介）
 */
profile.put('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { nickname, email, bio, birthday } = await c.req.json<{ nickname?: string; email?: string; bio?: string; birthday?: string }>()
  const db = c.env.DB

  try {
    // バリデーション
    if (nickname && nickname.length < 1) {
      return c.json({ success: false, error: 'Nickname is required' }, 400)
    }

    if (nickname && nickname.length > 50) {
      return c.json({ success: false, error: 'Nickname must be 50 characters or less' }, 400)
    }

    // メールアドレスのバリデーション
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return c.json({ success: false, error: 'Invalid email format' }, 400)
      }

      // メールアドレスの重複チェック（自分以外）
      const existingUser = await db
        .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
        .bind(email, userId)
        .first()

      if (existingUser) {
        return c.json({ success: false, error: 'Email is already in use' }, 400)
      }
    }

    if (bio && bio.length > 500) {
      return c.json({ success: false, error: 'Bio must be 500 characters or less' }, 400)
    }

    // 誕生日のバリデーション（YYYY-MM-DD形式）
    if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return c.json({ success: false, error: 'Birthday must be in YYYY-MM-DD format' }, 400)
    }

    // プロフィール更新
    const updates: string[] = []
    const values: any[] = []

    if (nickname !== undefined) {
      updates.push('nickname = ?')
      values.push(nickname)
    }

    if (email !== undefined) {
      updates.push('email = ?')
      values.push(email)
    }

    if (bio !== undefined) {
      updates.push('bio = ?')
      values.push(bio)
    }

    if (birthday !== undefined) {
      updates.push('birthday = ?')
      values.push(birthday)
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400)
    }

    values.push(userId)

    await db
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    // 更新後のユーザー情報を取得
    const user = await db
      .prepare('SELECT id, email, nickname, avatar_url, bio, birthday, status, created_at, last_login_at FROM users WHERE id = ?')
      .bind(userId)
      .first<any>()

    // プロフィール完成度チェック（ポイント付与）
    let profileCompletePoints = 0
    try {
      const tenantId = c.get('tenantId')
      if (tenantId && user) {
        // プロフィール完成度: ニックネーム、自己紹介、誕生日、アバターがすべて入力されている
        const isProfileComplete = user.nickname && user.bio && user.birthday && user.avatar_url
        
        if (isProfileComplete) {
          // プロフィール完成ボーナスルールを取得
          const profileCompleteRule = await db
            .prepare(`
              SELECT points FROM point_rules
              WHERE tenant_id = ? AND action = 'profile_complete' AND is_active = 1
            `)
            .bind(tenantId)
            .first<any>()

          if (profileCompleteRule && profileCompleteRule.points > 0) {
            // 既にプロフィール完成ボーナスを獲得しているかチェック
            const alreadyEarned = await db
              .prepare(`
                SELECT id FROM point_transactions
                WHERE user_id = ? AND tenant_id = ? AND reason = 'profile_complete'
              `)
              .bind(userId, tenantId)
              .first()

            if (!alreadyEarned) {
              // ポイント残高を取得または作成
              let userPoints = await db
                .prepare(`
                  SELECT * FROM user_points WHERE user_id = ? AND tenant_id = ?
                `)
                .bind(userId, tenantId)
                .first<any>()

              if (!userPoints) {
                await db
                  .prepare(`
                    INSERT INTO user_points (user_id, tenant_id, balance, total_earned, total_spent, created_at, updated_at)
                    VALUES (?, ?, 0, 0, 0, datetime('now'), datetime('now'))
                  `)
                  .bind(userId, tenantId)
                  .run()

                userPoints = { balance: 0, total_earned: 0 }
              }

              // ポイント付与
              const newBalance = (userPoints.balance || 0) + profileCompleteRule.points
              const newTotalEarned = (userPoints.total_earned || 0) + profileCompleteRule.points

              await db
                .prepare(`
                  UPDATE user_points
                  SET balance = ?, total_earned = ?, updated_at = datetime('now')
                  WHERE user_id = ? AND tenant_id = ?
                `)
                .bind(newBalance, newTotalEarned, userId, tenantId)
                .run()

              // トランザクション記録
              await db
                .prepare(`
                  INSERT INTO point_transactions 
                  (user_id, tenant_id, action_type, reason, points, balance_after, created_at)
                  VALUES (?, ?, 'earn', 'profile_complete', ?, ?, datetime('now'))
                `)
                .bind(userId, tenantId, profileCompleteRule.points, newBalance)
                .run()

              profileCompletePoints = profileCompleteRule.points
            }
          }
        }
      }
    } catch (profileCompleteError) {
      console.error('[Profile Complete Points Error]', profileCompleteError)
      // プロフィール完成ポイント付与に失敗してもプロフィール更新は継続
    }

    return c.json({
      success: true,
      user,
      message: profileCompletePoints > 0 
        ? `プロフィールを更新しました（+${profileCompletePoints}ポイント）` 
        : 'Profile updated successfully',
      points_earned: profileCompletePoints
    })
  } catch (error) {
    console.error('[Update Profile Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile'
    }, 500)
  }
})

/**
 * POST /api/profile/avatar
 * アバター画像アップロード（Cloudflare R2）
 */
profile.post('/avatar', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const db = c.env.DB
  const avatars = c.env.AVATARS

  try {
    // FormData から画像を取得
    const formData = await c.req.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return c.json({ success: false, error: 'No file uploaded' }, 400)
    }

    // ファイルサイズチェック（最大 5MB）
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return c.json({ success: false, error: 'File size must be less than 5MB' }, 400)
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ success: false, error: 'Only JPEG, PNG, and WebP images are allowed' }, 400)
    }

    // ファイル名生成（ユーザーID + タイムスタンプ + 拡張子）
    const ext = file.name.split('.').pop()
    const filename = `avatars/${userId}-${Date.now()}.${ext}`

    // R2 にアップロード
    const arrayBuffer = await file.arrayBuffer()
    await avatars.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    // R2 の公開URL（実際の本番環境では Custom Domain を使用）
    // 開発環境では一時的に空文字列を設定
    const avatarUrl = `/api/profile/avatar/${filename.replace('avatars/', '')}`

    // データベースに avatar_url を保存
    await db
      .prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
      .bind(avatarUrl, userId)
      .run()

    // 更新後のユーザー情報を取得
    const user = await db
      .prepare('SELECT id, email, nickname, avatar_url, bio, birthday, status, created_at, last_login_at FROM users WHERE id = ?')
      .bind(userId)
      .first<any>()

    // アバターアップロードポイント付与
    let avatarUploadPoints = 0
    try {
      const tenantId = c.get('tenantId')
      if (tenantId) {
        // アバターアップロードルールを取得
        const avatarUploadRule = await db
          .prepare(`
            SELECT points FROM point_rules
            WHERE tenant_id = ? AND action = 'avatar_upload' AND is_active = 1
          `)
          .bind(tenantId)
          .first<any>()

        if (avatarUploadRule && avatarUploadRule.points > 0) {
          // 既にアバターアップロードボーナスを獲得しているかチェック
          const alreadyEarned = await db
            .prepare(`
              SELECT id FROM point_transactions
              WHERE user_id = ? AND tenant_id = ? AND reason = 'avatar_upload'
            `)
            .bind(userId, tenantId)
            .first()

          if (!alreadyEarned) {
            // ポイント残高を取得または作成
            let userPoints = await db
              .prepare(`
                SELECT * FROM user_points WHERE user_id = ? AND tenant_id = ?
              `)
              .bind(userId, tenantId)
              .first<any>()

            if (!userPoints) {
              await db
                .prepare(`
                  INSERT INTO user_points (user_id, tenant_id, balance, total_earned, total_spent, created_at, updated_at)
                  VALUES (?, ?, 0, 0, 0, datetime('now'), datetime('now'))
                `)
                .bind(userId, tenantId)
                .run()

              userPoints = { balance: 0, total_earned: 0 }
            }

            // ポイント付与
            const newBalance = (userPoints.balance || 0) + avatarUploadRule.points
            const newTotalEarned = (userPoints.total_earned || 0) + avatarUploadRule.points

            await db
              .prepare(`
                UPDATE user_points
                SET balance = ?, total_earned = ?, updated_at = datetime('now')
                WHERE user_id = ? AND tenant_id = ?
              `)
              .bind(newBalance, newTotalEarned, userId, tenantId)
              .run()

            // トランザクション記録
            await db
              .prepare(`
                INSERT INTO point_transactions 
                (user_id, tenant_id, action_type, reason, points, balance_after, created_at)
                VALUES (?, ?, 'earn', 'avatar_upload', ?, ?, datetime('now'))
              `)
              .bind(userId, tenantId, avatarUploadRule.points, newBalance)
              .run()

            avatarUploadPoints = avatarUploadRule.points
          }
        }

        // プロフィール完成度チェック（アバター追加で完成する場合）
        if (user && user.nickname && user.bio && user.birthday) {
          const profileCompleteRule = await db
            .prepare(`
              SELECT points FROM point_rules
              WHERE tenant_id = ? AND action = 'profile_complete' AND is_active = 1
            `)
            .bind(tenantId)
            .first<any>()

          if (profileCompleteRule && profileCompleteRule.points > 0) {
            const alreadyEarned = await db
              .prepare(`
                SELECT id FROM point_transactions
                WHERE user_id = ? AND tenant_id = ? AND reason = 'profile_complete'
              `)
              .bind(userId, tenantId)
              .first()

            if (!alreadyEarned) {
              let userPoints = await db
                .prepare(`
                  SELECT * FROM user_points WHERE user_id = ? AND tenant_id = ?
                `)
                .bind(userId, tenantId)
                .first<any>()

              if (!userPoints) {
                await db
                  .prepare(`
                    INSERT INTO user_points (user_id, tenant_id, balance, total_earned, total_spent, created_at, updated_at)
                    VALUES (?, ?, 0, 0, 0, datetime('now'), datetime('now'))
                  `)
                  .bind(userId, tenantId)
                  .run()

                userPoints = { balance: 0, total_earned: 0 }
              }

              const newBalance = (userPoints.balance || 0) + profileCompleteRule.points
              const newTotalEarned = (userPoints.total_earned || 0) + profileCompleteRule.points

              await db
                .prepare(`
                  UPDATE user_points
                  SET balance = ?, total_earned = ?, updated_at = datetime('now')
                  WHERE user_id = ? AND tenant_id = ?
                `)
                .bind(newBalance, newTotalEarned, userId, tenantId)
                .run()

              await db
                .prepare(`
                  INSERT INTO point_transactions 
                  (user_id, tenant_id, action_type, reason, points, balance_after, created_at)
                  VALUES (?, ?, 'earn', 'profile_complete', ?, ?, datetime('now'))
                `)
                .bind(userId, tenantId, profileCompleteRule.points, newBalance)
                .run()

              avatarUploadPoints += profileCompleteRule.points
            }
          }
        }
      }
    } catch (avatarUploadError) {
      console.error('[Avatar Upload Points Error]', avatarUploadError)
      // アバターアップロードポイント付与に失敗してもアップロードは継続
    }

    return c.json({
      success: true,
      user,
      message: avatarUploadPoints > 0 
        ? `アバターをアップロードしました（+${avatarUploadPoints}ポイント）` 
        : 'Avatar uploaded successfully',
      points_earned: avatarUploadPoints
    })
  } catch (error) {
    console.error('[Upload Avatar Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload avatar'
    }, 500)
  }
})

/**
 * GET /api/profile/avatar/:filename
 * アバター画像取得（R2から配信）
 */
profile.get('/avatar/:filename', async (c) => {
  const filename = c.req.param('filename')
  const avatars = c.env.AVATARS

  try {
    const object = await avatars.get(`avatars/${filename}`)

    if (!object) {
      return c.notFound()
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000' // 1年間キャッシュ
      }
    })
  } catch (error) {
    console.error('[Get Avatar Error]', error)
    return c.notFound()
  }
})

export default profile
