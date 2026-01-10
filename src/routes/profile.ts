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
  const { nickname, bio, birthday } = await c.req.json<{ nickname?: string; bio?: string; birthday?: string }>()
  const db = c.env.DB

  try {
    // バリデーション
    if (nickname && nickname.length < 1) {
      return c.json({ success: false, error: 'Nickname is required' }, 400)
    }

    if (nickname && nickname.length > 50) {
      return c.json({ success: false, error: 'Nickname must be 50 characters or less' }, 400)
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
      .prepare('SELECT id, email, nickname, avatar_url, bio, status, created_at, last_login_at FROM users WHERE id = ?')
      .bind(userId)
      .first<any>()

    return c.json({
      success: true,
      user,
      message: 'Profile updated successfully'
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
      .prepare('SELECT id, email, nickname, avatar_url, bio, status, created_at, last_login_at FROM users WHERE id = ?')
      .bind(userId)
      .first<any>()

    return c.json({
      success: true,
      user,
      message: 'Avatar uploaded successfully'
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
