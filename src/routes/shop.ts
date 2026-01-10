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

// ============================================
// カテゴリ管理API
// ============================================

/**
 * GET /api/shop/categories
 * カテゴリ一覧取得
 */
shop.get('/categories', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const categories = await db
      .prepare(`
        SELECT * FROM shop_categories 
        WHERE tenant_id = ? 
        ORDER BY display_order ASC, created_at DESC
      `)
      .bind(tenantId)
      .all()

    return c.json({
      success: true,
      categories: categories.results || []
    })
  } catch (error) {
    console.error('[Get Categories Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get categories'
    }, 500)
  }
})

/**
 * POST /api/shop/categories
 * カテゴリ作成（管理者のみ）
 */
shop.post('/categories', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const { name, description, display_order } = await c.req.json()

    if (!name || name.trim() === '') {
      return c.json({
        success: false,
        error: 'カテゴリ名は必須です'
      }, 400)
    }

    const result = await db
      .prepare(`
        INSERT INTO shop_categories (tenant_id, name, description, display_order)
        VALUES (?, ?, ?, ?)
      `)
      .bind(tenantId, name.trim(), description || null, display_order || 0)
      .run()

    return c.json({
      success: true,
      message: 'カテゴリを作成しました',
      category_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('[Create Category Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create category'
    }, 500)
  }
})

/**
 * PUT /api/shop/categories/:id
 * カテゴリ更新（管理者のみ）
 */
shop.put('/categories/:id', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const categoryId = c.req.param('id')
  const db = c.env.DB

  try {
    const { name, description, display_order } = await c.req.json()

    if (!name || name.trim() === '') {
      return c.json({
        success: false,
        error: 'カテゴリ名は必須です'
      }, 400)
    }

    const result = await db
      .prepare(`
        UPDATE shop_categories
        SET name = ?, description = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
      `)
      .bind(name.trim(), description || null, display_order || 0, categoryId, tenantId)
      .run()

    if (result.meta.changes === 0) {
      return c.json({
        success: false,
        error: 'カテゴリが見つかりません'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'カテゴリを更新しました'
    })
  } catch (error) {
    console.error('[Update Category Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update category'
    }, 500)
  }
})

/**
 * DELETE /api/shop/categories/:id
 * カテゴリ削除（管理者のみ）
 */
shop.delete('/categories/:id', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const categoryId = c.req.param('id')
  const db = c.env.DB

  try {
    // カテゴリに紐づく商品数を確認
    const productCount = await db
      .prepare(`
        SELECT COUNT(*) as count FROM shop_products 
        WHERE category_id = ? AND tenant_id = ?
      `)
      .bind(categoryId, tenantId)
      .first<{ count: number }>()

    if (productCount && productCount.count > 0) {
      return c.json({
        success: false,
        error: `このカテゴリには${productCount.count}件の商品が登録されています。先に商品を削除または別カテゴリに移動してください。`
      }, 400)
    }

    const result = await db
      .prepare('DELETE FROM shop_categories WHERE id = ? AND tenant_id = ?')
      .bind(categoryId, tenantId)
      .run()

    if (result.meta.changes === 0) {
      return c.json({
        success: false,
        error: 'カテゴリが見つかりません'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'カテゴリを削除しました'
    })
  } catch (error) {
    console.error('[Delete Category Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete category'
    }, 500)
  }
})

// ============================================
// 商品管理API
// ============================================

/**
 * GET /api/shop/products
 * 商品一覧取得
 */
shop.get('/products', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const categoryId = c.req.query('category_id')
    const type = c.req.query('type')
    const status = c.req.query('status')

    let query = `
      SELECT p.*, c.name as category_name
      FROM shop_products p
      LEFT JOIN shop_categories c ON p.category_id = c.id
      WHERE p.tenant_id = ?
    `
    const params: any[] = [tenantId]

    if (categoryId) {
      query += ' AND p.category_id = ?'
      params.push(categoryId)
    }

    if (type) {
      query += ' AND p.type = ?'
      params.push(type)
    }

    if (status === 'active') {
      query += ' AND p.is_active = 1'
    } else if (status === 'inactive') {
      query += ' AND p.is_active = 0'
    }

    query += ' ORDER BY p.created_at DESC'

    const products = await db
      .prepare(query)
      .bind(...params)
      .all()

    return c.json({
      success: true,
      products: products.results || []
    })
  } catch (error) {
    console.error('[Get Products Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get products'
    }, 500)
  }
})

/**
 * GET /api/shop/products/:id
 * 商品詳細取得
 */
shop.get('/products/:id', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const productId = c.req.param('id')
  const db = c.env.DB

  try {
    const product = await db
      .prepare(`
        SELECT p.*, c.name as category_name
        FROM shop_products p
        LEFT JOIN shop_categories c ON p.category_id = c.id
        WHERE p.id = ? AND p.tenant_id = ?
      `)
      .bind(productId, tenantId)
      .first()

    if (!product) {
      return c.json({
        success: false,
        error: '商品が見つかりません'
      }, 404)
    }

    return c.json({
      success: true,
      product
    })
  } catch (error) {
    console.error('[Get Product Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get product'
    }, 500)
  }
})

/**
 * POST /api/shop/products
 * 商品作成（管理者のみ）
 */
shop.post('/products', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // 販売機能の利用可否をチェック
    const legalInfo = await db
      .prepare('SELECT is_completed FROM shop_legal_info WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ is_completed: number }>()

    if (!legalInfo || legalInfo.is_completed !== 1) {
      return c.json({
        success: false,
        error: '商品を作成するには、まず特定商取引法に基づく事業者情報を登録してください'
      }, 403)
    }

    const {
      name,
      description,
      price,
      category_id,
      type,
      image_url,
      stock_quantity,
      is_unlimited_stock,
      requires_shipping,
      shipping_info,
      event_date,
      event_location,
      event_description,
      sale_start_date,
      sale_end_date,
      max_purchase_per_person,
      is_member_only,
      member_plan_id,
      is_active
    } = await c.req.json()

    // バリデーション
    if (!name || name.trim() === '') {
      return c.json({
        success: false,
        error: '商品名は必須です'
      }, 400)
    }

    if (price === undefined || price < 0) {
      return c.json({
        success: false,
        error: '価格は0以上で指定してください'
      }, 400)
    }

    if (!type || !['physical', 'ticket', 'digital'].includes(type)) {
      return c.json({
        success: false,
        error: '商品タイプは physical, ticket, digital のいずれかを指定してください'
      }, 400)
    }

    // チケットの場合、イベント日時は必須
    if (type === 'ticket' && !event_date) {
      return c.json({
        success: false,
        error: 'チケットの場合、イベント日時は必須です'
      }, 400)
    }

    const result = await db
      .prepare(`
        INSERT INTO shop_products (
          tenant_id, name, description, price, category_id, type,
          image_url, stock_quantity, is_unlimited_stock, requires_shipping,
          shipping_info, event_date, event_location, event_description,
          sale_start_date, sale_end_date, max_purchase_per_person,
          is_member_only, member_plan_id, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        tenantId,
        name.trim(),
        description || null,
        price,
        category_id || null,
        type,
        image_url || null,
        stock_quantity || 0,
        is_unlimited_stock ? 1 : 0,
        requires_shipping ? 1 : 0,
        shipping_info || null,
        event_date || null,
        event_location || null,
        event_description || null,
        sale_start_date || null,
        sale_end_date || null,
        max_purchase_per_person || null,
        is_member_only ? 1 : 0,
        member_plan_id || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      )
      .run()

    return c.json({
      success: true,
      message: '商品を作成しました',
      product_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('[Create Product Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product'
    }, 500)
  }
})

/**
 * PUT /api/shop/products/:id
 * 商品更新（管理者のみ）
 */
shop.put('/products/:id', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const productId = c.req.param('id')
  const db = c.env.DB

  try {
    const {
      name,
      description,
      price,
      category_id,
      type,
      image_url,
      stock_quantity,
      is_unlimited_stock,
      requires_shipping,
      shipping_info,
      event_date,
      event_location,
      event_description,
      sale_start_date,
      sale_end_date,
      max_purchase_per_person,
      is_member_only,
      member_plan_id,
      is_active
    } = await c.req.json()

    // バリデーション
    if (!name || name.trim() === '') {
      return c.json({
        success: false,
        error: '商品名は必須です'
      }, 400)
    }

    if (price === undefined || price < 0) {
      return c.json({
        success: false,
        error: '価格は0以上で指定してください'
      }, 400)
    }

    // チケットの場合、イベント日時は必須
    if (type === 'ticket' && !event_date) {
      return c.json({
        success: false,
        error: 'チケットの場合、イベント日時は必須です'
      }, 400)
    }

    const result = await db
      .prepare(`
        UPDATE shop_products
        SET name = ?, description = ?, price = ?, category_id = ?, type = ?,
            image_url = ?, stock_quantity = ?, is_unlimited_stock = ?,
            requires_shipping = ?, shipping_info = ?, event_date = ?,
            event_location = ?, event_description = ?, sale_start_date = ?,
            sale_end_date = ?, max_purchase_per_person = ?, is_member_only = ?,
            member_plan_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
      `)
      .bind(
        name.trim(),
        description || null,
        price,
        category_id || null,
        type,
        image_url || null,
        stock_quantity || 0,
        is_unlimited_stock ? 1 : 0,
        requires_shipping ? 1 : 0,
        shipping_info || null,
        event_date || null,
        event_location || null,
        event_description || null,
        sale_start_date || null,
        sale_end_date || null,
        max_purchase_per_person || null,
        is_member_only ? 1 : 0,
        member_plan_id || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        productId,
        tenantId
      )
      .run()

    if (result.meta.changes === 0) {
      return c.json({
        success: false,
        error: '商品が見つかりません'
      }, 404)
    }

    return c.json({
      success: true,
      message: '商品を更新しました'
    })
  } catch (error) {
    console.error('[Update Product Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product'
    }, 500)
  }
})

/**
 * DELETE /api/shop/products/:id
 * 商品削除（管理者のみ）
 */
shop.delete('/products/:id', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const productId = c.req.param('id')
  const db = c.env.DB

  try {
    // 注文履歴がある商品は削除不可
    const orderCount = await db
      .prepare(`
        SELECT COUNT(*) as count FROM shop_order_items 
        WHERE product_id = ?
      `)
      .bind(productId)
      .first<{ count: number }>()

    if (orderCount && orderCount.count > 0) {
      return c.json({
        success: false,
        error: 'この商品には注文履歴があるため削除できません。非公開にすることをお勧めします。'
      }, 400)
    }

    const result = await db
      .prepare('DELETE FROM shop_products WHERE id = ? AND tenant_id = ?')
      .bind(productId, tenantId)
      .run()

    if (result.meta.changes === 0) {
      return c.json({
        success: false,
        error: '商品が見つかりません'
      }, 404)
    }

    return c.json({
      success: true,
      message: '商品を削除しました'
    })
  } catch (error) {
    console.error('[Delete Product Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete product'
    }, 500)
  }
})

export default shop
