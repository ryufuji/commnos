// ============================================
// ショップシステム（Phase 7）
// 特定商取引法対応 + チケット・物販
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware, requireRole } from '../middleware/auth'

const shop = new Hono<AppContext>()

// ============================================
// 特定商取引法対応：事業者情報API
// ============================================

/**
 * GET /api/shop/legal-info
 * 事業者情報取得
 */
shop.get('/legal-info', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const legalInfo = await db
      .prepare(`
        SELECT * FROM shop_legal_info WHERE tenant_id = ?
      `)
      .bind(tenantId)
      .first()

    return c.json({
      success: true,
      legal_info: legalInfo || null
    })
  } catch (error) {
    console.error('[Get Legal Info Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get legal info'
    }, 500)
  }
})

/**
 * POST /api/shop/legal-info
 * 事業者情報登録・更新（管理者のみ）
 */
shop.post('/legal-info', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const {
      business_name,
      representative_name,
      postal_code,
      address,
      phone_number,
      email,
      business_hours,
      return_policy,
      return_period,
      return_shipping_fee,
      delivery_time,
      shipping_fee_info,
      payment_methods,
      payment_timing,
      additional_fees,
      product_liability
    } = await c.req.json()

    // 必須項目のバリデーション
    const requiredFields = {
      business_name: '事業者名',
      postal_code: '郵便番号',
      address: '住所',
      phone_number: '電話番号',
      email: 'メールアドレス',
      return_policy: '返品ポリシー',
      return_shipping_fee: '返品送料負担',
      delivery_time: '商品引渡時期',
      shipping_fee_info: '送料について',
      payment_methods: '支払方法',
      payment_timing: '支払時期'
    }

    const missingFields: string[] = []
    for (const [field, label] of Object.entries(requiredFields)) {
      const value = (c.req as any).parsedBody?.[field]
      if (!value || value.toString().trim() === '') {
        missingFields.push(label)
      }
    }

    if (missingFields.length > 0) {
      return c.json({
        success: false,
        error: `以下の必須項目が入力されていません: ${missingFields.join('、')}`,
        missing_fields: missingFields
      }, 400)
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.json({
        success: false,
        error: 'メールアドレスの形式が正しくありません'
      }, 400)
    }

    // 郵便番号の形式チェック（ハイフンあり/なし両方対応）
    const postalCodeRegex = /^\d{3}-?\d{4}$/
    if (!postalCodeRegex.test(postal_code)) {
      return c.json({
        success: false,
        error: '郵便番号の形式が正しくありません（例: 123-4567）'
      }, 400)
    }

    // 電話番号の形式チェック（ハイフンあり/なし両方対応）
    const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{4}$/
    if (!phoneRegex.test(phone_number)) {
      return c.json({
        success: false,
        error: '電話番号の形式が正しくありません（例: 03-1234-5678）'
      }, 400)
    }

    // 既存のレコードを確認
    const existing = await db
      .prepare('SELECT id FROM shop_legal_info WHERE tenant_id = ?')
      .bind(tenantId)
      .first()

    const isCompleted = 1 // すべての必須項目が入力されたのでフラグを立てる

    if (existing) {
      // 更新
      await db
        .prepare(`
          UPDATE shop_legal_info
          SET business_name = ?, representative_name = ?, postal_code = ?,
              address = ?, phone_number = ?, email = ?, business_hours = ?,
              return_policy = ?, return_period = ?, return_shipping_fee = ?,
              delivery_time = ?, shipping_fee_info = ?, payment_methods = ?,
              payment_timing = ?, additional_fees = ?, product_liability = ?,
              is_completed = ?, updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = ?
        `)
        .bind(
          business_name, representative_name, postal_code, address,
          phone_number, email, business_hours, return_policy,
          return_period || 8, return_shipping_fee, delivery_time,
          shipping_fee_info, payment_methods, payment_timing,
          additional_fees || null, product_liability || null,
          isCompleted, tenantId
        )
        .run()
    } else {
      // 新規作成
      await db
        .prepare(`
          INSERT INTO shop_legal_info (
            tenant_id, business_name, representative_name, postal_code,
            address, phone_number, email, business_hours, return_policy,
            return_period, return_shipping_fee, delivery_time, shipping_fee_info,
            payment_methods, payment_timing, additional_fees, product_liability,
            is_completed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          tenantId, business_name, representative_name, postal_code,
          address, phone_number, email, business_hours, return_policy,
          return_period || 8, return_shipping_fee, delivery_time,
          shipping_fee_info, payment_methods, payment_timing,
          additional_fees || null, product_liability || null, isCompleted
        )
        .run()
    }

    // 更新後の情報を取得
    const updatedInfo = await db
      .prepare('SELECT * FROM shop_legal_info WHERE tenant_id = ?')
      .bind(tenantId)
      .first()

    return c.json({
      success: true,
      message: '特定商取引法に基づく事業者情報を保存しました',
      legal_info: updatedInfo
    })
  } catch (error) {
    console.error('[Save Legal Info Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save legal info'
    }, 500)
  }
})

/**
 * GET /api/shop/legal-info/status
 * 販売機能の利用可否チェック
 */
shop.get('/legal-info/status', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const legalInfo = await db
      .prepare(`
        SELECT is_completed, is_approved FROM shop_legal_info WHERE tenant_id = ?
      `)
      .bind(tenantId)
      .first<{ is_completed: number; is_approved: number }>()

    const canSell = legalInfo ? legalInfo.is_completed === 1 : false

    return c.json({
      success: true,
      can_sell: canSell,
      is_completed: legalInfo?.is_completed === 1,
      is_approved: legalInfo?.is_approved === 1,
      message: canSell 
        ? '販売機能が利用可能です' 
        : '販売機能を利用するには、特定商取引法に基づく事業者情報の登録が必要です'
    })
  } catch (error) {
    console.error('[Get Legal Info Status Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status'
    }, 500)
  }
})

export default shop
