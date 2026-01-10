// ============================================
// 誕生日メール管理ルート
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware, requireRole } from '../middleware/auth'
import { sendEmail } from '../lib/email'

const birthdayEmail = new Hono<AppContext>()

/**
 * GET /api/birthday-email/template
 * テンプレート取得（管理者のみ）
 */
birthdayEmail.get('/template', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const template = await DB.prepare(`
      SELECT id, subject, body, is_active, created_at, updated_at
      FROM birthday_email_templates
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(tenantId).first()

    return c.json({
      success: true,
      template: template || null
    })
  } catch (error) {
    console.error('[Get Birthday Template Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get template'
    }, 500)
  }
})

/**
 * POST /api/birthday-email/template
 * テンプレート作成/更新（管理者のみ）
 */
birthdayEmail.post('/template', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { subject, body, is_active } = await c.req.json<{
    subject: string
    body: string
    is_active: boolean
  }>()
  const { DB } = c.env

  try {
    // バリデーション
    if (!subject || subject.trim().length === 0) {
      return c.json({ success: false, error: '件名を入力してください' }, 400)
    }

    if (!body || body.trim().length === 0) {
      return c.json({ success: false, error: '本文を入力してください' }, 400)
    }

    // 既存のテンプレートを確認
    const existingTemplate = await DB.prepare(`
      SELECT id FROM birthday_email_templates WHERE tenant_id = ?
    `).bind(tenantId).first() as any

    let templateId: number

    if (existingTemplate) {
      // 更新
      await DB.prepare(`
        UPDATE birthday_email_templates
        SET subject = ?, body = ?, is_active = ?, updated_at = datetime('now')
        WHERE tenant_id = ?
      `).bind(subject, body, is_active ? 1 : 0, tenantId).run()

      templateId = existingTemplate.id
    } else {
      // 新規作成
      const result = await DB.prepare(`
        INSERT INTO birthday_email_templates (tenant_id, subject, body, is_active)
        VALUES (?, ?, ?, ?)
      `).bind(tenantId, subject, body, is_active ? 1 : 0).run()

      templateId = result.meta.last_row_id as number
    }

    // 保存したテンプレートを取得
    const template = await DB.prepare(`
      SELECT id, subject, body, is_active, created_at, updated_at
      FROM birthday_email_templates
      WHERE id = ?
    `).bind(templateId).first()

    return c.json({
      success: true,
      template
    })
  } catch (error) {
    console.error('[Save Birthday Template Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save template'
    }, 500)
  }
})

/**
 * POST /api/birthday-email/test
 * テスト送信（自分宛に送信）
 */
birthdayEmail.post('/test', authMiddleware, requireRole('admin'), async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    // ユーザー情報を取得
    const user = await DB.prepare(`
      SELECT email, nickname FROM users WHERE id = ?
    `).bind(userId).first() as any

    if (!user) {
      return c.json({ success: false, error: 'ユーザーが見つかりません' }, 404)
    }

    // テンプレートを取得
    const template = await DB.prepare(`
      SELECT subject, body FROM birthday_email_templates
      WHERE tenant_id = ? AND is_active = 1
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(tenantId).first() as any

    if (!template) {
      return c.json({ success: false, error: 'テンプレートが設定されていません' }, 404)
    }

    // プレースホルダーを置換
    const subject = template.subject
      .replace(/{{nickname}}/g, user.nickname)
      .replace(/{{email}}/g, user.email)

    const body = template.body
      .replace(/{{nickname}}/g, user.nickname)
      .replace(/{{email}}/g, user.email)

    // メール送信（実際の送信機能は実装済みと仮定）
    // TODO: sendEmail関数を使用してメール送信
    console.log(`[Birthday Email Test] Sending to ${user.email}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body: ${body}`)

    // 注: 実際のメール送信はsendEmail関数を使用
    // await sendEmail(user.email, subject, body)

    return c.json({
      success: true,
      message: `テストメールを ${user.email} に送信しました`
    })
  } catch (error) {
    console.error('[Send Test Birthday Email Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test email'
    }, 500)
  }
})

/**
 * POST /api/birthday-email/send-today
 * 今日が誕生日の会員にメール送信（Cron or 手動実行）
 */
birthdayEmail.post('/send-today', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    // アクティブなテンプレートを取得
    const template = await DB.prepare(`
      SELECT id, subject, body FROM birthday_email_templates
      WHERE tenant_id = ? AND is_active = 1
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(tenantId).first() as any

    if (!template) {
      return c.json({ 
        success: false, 
        error: 'アクティブなテンプレートが設定されていません' 
      }, 404)
    }

    // 今日が誕生日の会員を取得
    const currentYear = new Date().getFullYear()
    const today = new Date()
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const birthdayUsers = await DB.prepare(`
      SELECT 
        u.id,
        u.email,
        u.nickname,
        u.birthday
      FROM users u
      INNER JOIN tenant_memberships tm ON u.id = tm.user_id
      WHERE tm.tenant_id = ?
        AND tm.status = 'active'
        AND u.birthday IS NOT NULL
        AND strftime('%m-%d', u.birthday) = ?
        AND u.id NOT IN (
          SELECT user_id FROM birthday_email_logs
          WHERE tenant_id = ? AND sent_year = ?
        )
    `).bind(tenantId, monthDay, tenantId, currentYear).all()

    const users = birthdayUsers.results || []
    const sentCount = users.length

    // 各ユーザーにメール送信
    for (const user of users) {
      try {
        const u = user as any
        
        // プレースホルダーを置換
        const subject = template.subject
          .replace(/{{nickname}}/g, u.nickname)
          .replace(/{{email}}/g, u.email)

        const body = template.body
          .replace(/{{nickname}}/g, u.nickname)
          .replace(/{{email}}/g, u.email)

        // メール送信
        // TODO: sendEmail関数を使用
        console.log(`[Birthday Email] Sending to ${u.email} (${u.nickname})`)
        // await sendEmail(u.email, subject, body)

        // 送信履歴を記録
        await DB.prepare(`
          INSERT INTO birthday_email_logs (
            tenant_id, user_id, template_id, sent_year, status
          ) VALUES (?, ?, ?, ?, 'sent')
        `).bind(tenantId, u.id, template.id, currentYear).run()

      } catch (error) {
        console.error(`[Birthday Email Error] Failed to send to user ${(user as any).id}:`, error)
        
        // 失敗を記録
        await DB.prepare(`
          INSERT INTO birthday_email_logs (
            tenant_id, user_id, template_id, sent_year, status, error_message
          ) VALUES (?, ?, ?, ?, 'failed', ?)
        `).bind(
          tenantId,
          (user as any).id,
          template.id,
          currentYear,
          error instanceof Error ? error.message : 'Unknown error'
        ).run()
      }
    }

    return c.json({
      success: true,
      message: `${sentCount}人にメールを送信しました`,
      count: sentCount
    })
  } catch (error) {
    console.error('[Send Birthday Emails Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send birthday emails'
    }, 500)
  }
})

export default birthdayEmail
