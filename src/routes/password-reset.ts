// ============================================
// パスワードリセットAPI
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/password'
import { sendPasswordResetEmail } from '../lib/email'

const passwordReset = new Hono<AppContext>()

/**
 * POST /api/auth/forgot-password
 * パスワードリセット申請
 */
passwordReset.post('/forgot-password', async (c) => {
  const db = c.env.DB

  try {
    const { email } = await c.req.json()

    if (!email) {
      return c.json({
        success: false,
        error: 'メールアドレスを入力してください'
      }, 400)
    }

    // ユーザーを検索
    const user = await db
      .prepare('SELECT id, email, nickname FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: number; email: string; nickname: string }>()

    // セキュリティ上、ユーザーが存在しない場合でも成功レスポンスを返す
    // （メールアドレスの存在確認を防ぐため）
    if (!user) {
      console.log('[Password Reset] User not found:', email)
      return c.json({
        success: true,
        message: 'パスワードリセットメールを送信しました。メールをご確認ください。'
      })
    }

    // 既存の未使用トークンを無効化
    await db
      .prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0')
      .bind(user.id)
      .run()

    // ランダムトークン生成（URL安全）
    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後

    // トークンを保存
    await db
      .prepare(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `)
      .bind(user.id, token, expiresAt.toISOString())
      .run()

    // リセットリンク生成
    const host = c.req.header('Host') || 'commons-webapp.pages.dev'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const resetLink = `${protocol}://${host}/reset-password?token=${token}`

    // パスワードリセットメール送信
    const emailResult = await sendPasswordResetEmail(user.email, resetLink, user.nickname)

    if (!emailResult.success) {
      console.error('[Password Reset] Email sending failed:', emailResult.error)
      // メール送信失敗でもトークンは保存済みなので、成功レスポンスを返す
    }

    console.log('[Password Reset] Token generated for user:', user.id, 'Token:', token)

    return c.json({
      success: true,
      message: 'パスワードリセットメールを送信しました。メールをご確認ください。'
    })
  } catch (error) {
    console.error('[Password Reset Error]', error)
    return c.json({
      success: false,
      error: 'パスワードリセット申請に失敗しました'
    }, 500)
  }
})

/**
 * POST /api/auth/reset-password
 * パスワードリセット実行
 */
passwordReset.post('/reset-password', async (c) => {
  const db = c.env.DB

  try {
    const { token, password } = await c.req.json()

    if (!token || !password) {
      return c.json({
        success: false,
        error: 'トークンとパスワードを入力してください'
      }, 400)
    }

    // パスワード強度チェック
    const validation = validatePasswordStrength(password)
    if (!validation.valid) {
      return c.json({
        success: false,
        error: validation.errors[0]
      }, 400)
    }

    // トークンを検証
    const resetToken = await db
      .prepare(`
        SELECT rt.*, u.id as user_id, u.email
        FROM password_reset_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = ? AND rt.used = 0
      `)
      .bind(token)
      .first<{
        id: number
        user_id: number
        token: string
        expires_at: string
        used: number
        email: string
      }>()

    if (!resetToken) {
      return c.json({
        success: false,
        error: '無効または期限切れのリセットリンクです'
      }, 400)
    }

    // トークンの有効期限チェック
    const expiresAt = new Date(resetToken.expires_at)
    if (expiresAt < new Date()) {
      return c.json({
        success: false,
        error: 'リセットリンクの有効期限が切れています。再度申請してください。'
      }, 400)
    }

    // パスワードをハッシュ化
    const passwordHash = await hashPassword(password)

    // パスワード更新
    await db
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(passwordHash, resetToken.user_id)
      .run()

    // トークンを使用済みにする
    await db
      .prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?')
      .bind(resetToken.id)
      .run()

    console.log('[Password Reset] Password updated for user:', resetToken.user_id)

    return c.json({
      success: true,
      message: 'パスワードが正常に変更されました。新しいパスワードでログインしてください。'
    })
  } catch (error) {
    console.error('[Password Reset Error]', error)
    return c.json({
      success: false,
      error: 'パスワードリセットに失敗しました'
    }, 500)
  }
})

/**
 * GET /api/auth/verify-reset-token
 * リセットトークンの有効性を検証
 */
passwordReset.get('/verify-reset-token', async (c) => {
  const db = c.env.DB

  try {
    const token = c.req.query('token')

    if (!token) {
      return c.json({
        success: false,
        error: 'トークンが指定されていません'
      }, 400)
    }

    // トークンを検証
    const resetToken = await db
      .prepare(`
        SELECT rt.*, u.email, u.nickname
        FROM password_reset_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = ? AND rt.used = 0
      `)
      .bind(token)
      .first<{
        id: number
        user_id: number
        expires_at: string
        email: string
        nickname: string
      }>()

    if (!resetToken) {
      return c.json({
        success: false,
        error: '無効なリセットリンクです'
      }, 400)
    }

    // 有効期限チェック
    const expiresAt = new Date(resetToken.expires_at)
    if (expiresAt < new Date()) {
      return c.json({
        success: false,
        error: 'リセットリンクの有効期限が切れています'
      }, 400)
    }

    return c.json({
      success: true,
      email: resetToken.email,
      nickname: resetToken.nickname
    })
  } catch (error) {
    console.error('[Verify Reset Token Error]', error)
    return c.json({
      success: false,
      error: 'トークン検証に失敗しました'
    }, 500)
  }
})

/**
 * セキュアなランダムトークン生成
 * URL安全な64文字のトークンを生成
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export default passwordReset
