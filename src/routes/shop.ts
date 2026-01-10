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

    const body = await c.req.json()
    
    const missingFields: string[] = []
    for (const [field, label] of Object.entries(requiredFields)) {
      const value = body[field]
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
    if (!emailRegex.test(body.email)) {
      return c.json({
        success: false,
        error: 'メールアドレスの形式が正しくありません'
      }, 400)
    }

    // 郵便番号の形式チェック（ハイフンあり/なし両方対応）
    const postalCodeRegex = /^\d{3}-?\d{4}$/
    if (!postalCodeRegex.test(body.postal_code)) {
      return c.json({
        success: false,
        error: '郵便番号の形式が正しくありません（例: 123-4567）'
      }, 400)
    }

    // 電話番号の形式チェック（ハイフンあり/なし両方対応）
    const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{4}$/
    if (!phoneRegex.test(body.phone_number)) {
      return c.json({
        success: false,
        error: '電話番号の形式が正しくありません（例: 03-1234-5678）'
      }, 400)
    }

    // データを変数に割り当て
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
    } = body

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
      query += ' AND p.product_type = ?'
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
 * POST /api/shop/products/upload-image
 * 商品画像アップロード（管理者のみ）
 */
shop.post('/products/upload-image', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const r2 = c.env.R2

  try {
    // FormDataから画像を取得
    const formData = await c.req.formData()
    const file = formData.get('image') as File

    if (!file) {
      return c.json({
        success: false,
        error: '画像ファイルが選択されていません'
      }, 400)
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return c.json({
        success: false,
        error: '画像ファイルはJPEG、PNG、WebP、GIF形式のみアップロード可能です'
      }, 400)
    }

    // ファイルサイズチェック（5MB以下）
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return c.json({
        success: false,
        error: '画像ファイルのサイズは5MB以下にしてください'
      }, 400)
    }

    // ファイル名生成（重複を避けるためタイムスタンプとランダム文字列を使用）
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `shop/products/${tenantId}/${timestamp}-${randomStr}.${ext}`

    // R2にアップロード
    const arrayBuffer = await file.arrayBuffer()
    await r2.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    // 公開URLを生成
    const imageUrl = `https://commons-images.ryufuji.com/${fileName}`

    return c.json({
      success: true,
      image_url: imageUrl,
      message: '画像をアップロードしました'
    })
  } catch (error) {
    console.error('[Upload Image Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image'
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
          tenant_id, name, description, price, category_id, product_type,
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
        SET name = ?, description = ?, price = ?, category_id = ?, product_type = ?,
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

// ============================================
// 会員向け商品表示API（購入フロー）
// ============================================

/**
 * GET /api/shop/public/products
 * 公開中の商品一覧取得（会員向け）
 */
shop.get('/public/products', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const categoryId = c.req.query('category_id')
    const type = c.req.query('type')
    const search = c.req.query('search')

    let query = `
      SELECT p.*, c.name as category_name
      FROM shop_products p
      LEFT JOIN shop_categories c ON p.category_id = c.id
      WHERE p.tenant_id = ? AND p.is_active = 1
    `
    const params: any[] = [tenantId]

    // 販売期間チェック
    const now = new Date().toISOString()
    query += ` AND (p.sale_start_date IS NULL OR p.sale_start_date <= ?)`
    params.push(now)
    query += ` AND (p.sale_end_date IS NULL OR p.sale_end_date >= ?)`
    params.push(now)

    if (categoryId) {
      query += ' AND p.category_id = ?'
      params.push(categoryId)
    }

    if (type) {
      query += ' AND p.product_type = ?'
      params.push(type)
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern)
    }

    query += ' ORDER BY p.created_at DESC'

    const products = await db
      .prepare(query)
      .bind(...params)
      .all()

    // 在庫状況を計算
    const productsWithStock = (products.results || []).map((product: any) => ({
      ...product,
      is_available: product.is_unlimited_stock === 1 || product.stock_quantity > 0
    }))

    return c.json({
      success: true,
      products: productsWithStock
    })
  } catch (error) {
    console.error('[Get Public Products Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get products'
    }, 500)
  }
})

/**
 * GET /api/shop/public/products/:id
 * 商品詳細取得（会員向け）
 */
shop.get('/public/products/:id', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const productId = c.req.param('id')
  const db = c.env.DB

  try {
    const product = await db
      .prepare(`
        SELECT p.*, c.name as category_name
        FROM shop_products p
        LEFT JOIN shop_categories c ON p.category_id = c.id
        WHERE p.id = ? AND p.tenant_id = ? AND p.is_active = 1
      `)
      .bind(productId, tenantId)
      .first()

    if (!product) {
      return c.json({
        success: false,
        error: '商品が見つかりません'
      }, 404)
    }

    // 販売期間チェック
    const now = new Date()
    const saleStartDate = product.sale_start_date ? new Date(product.sale_start_date) : null
    const saleEndDate = product.sale_end_date ? new Date(product.sale_end_date) : null

    const isOnSale = (!saleStartDate || saleStartDate <= now) && (!saleEndDate || saleEndDate >= now)

    if (!isOnSale) {
      return c.json({
        success: false,
        error: 'この商品は現在販売期間外です'
      }, 400)
    }

    // 在庫状況を計算
    const productWithStock = {
      ...product,
      is_available: product.is_unlimited_stock === 1 || product.stock_quantity > 0
    }

    return c.json({
      success: true,
      product: productWithStock
    })
  } catch (error) {
    console.error('[Get Public Product Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get product'
    }, 500)
  }
})

/**
 * GET /api/shop/public/categories
 * 公開中のカテゴリ一覧取得（会員向け）
 */
shop.get('/public/categories', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // 商品が1つ以上あるカテゴリのみ取得
    const categories = await db
      .prepare(`
        SELECT c.*, COUNT(p.id) as product_count
        FROM shop_categories c
        LEFT JOIN shop_products p ON c.id = p.category_id AND p.is_active = 1
        WHERE c.tenant_id = ?
        GROUP BY c.id
        HAVING product_count > 0
        ORDER BY c.display_order ASC, c.created_at DESC
      `)
      .bind(tenantId)
      .all()

    return c.json({
      success: true,
      categories: categories.results || []
    })
  } catch (error) {
    console.error('[Get Public Categories Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get categories'
    }, 500)
  }
})

// ============================================
// 注文管理API
// ============================================

/**
 * POST /api/shop/orders
 * 注文作成（Stripe決済前の仮注文）
 */
shop.post('/orders', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const db = c.env.DB

  try {
    const { items, shipping_address, shipping_name, shipping_phone } = await c.req.json()

    if (!items || items.length === 0) {
      return c.json({
        success: false,
        error: '商品が選択されていません'
      }, 400)
    }

    // 商品情報を取得
    let totalAmount = 0
    let shippingFee = 0
    const orderItems = []
    let requiresShipping = false

    for (const item of items) {
      const product = await db
        .prepare(`
          SELECT * FROM shop_products 
          WHERE id = ? AND tenant_id = ? AND is_active = 1
        `)
        .bind(item.product_id, tenantId)
        .first()

      if (!product) {
        return c.json({
          success: false,
          error: `商品ID ${item.product_id} が見つかりません`
        }, 404)
      }

      // 在庫チェック
      if (product.is_unlimited_stock !== 1 && product.stock_quantity < item.quantity) {
        return c.json({
          success: false,
          error: `${product.name}の在庫が不足しています`
        }, 400)
      }

      // 購入上限チェック
      if (product.max_purchase_per_person && item.quantity > product.max_purchase_per_person) {
        return c.json({
          success: false,
          error: `${product.name}の購入上限は${product.max_purchase_per_person}個です`
        }, 400)
      }

      const subtotal = product.price * item.quantity
      totalAmount += subtotal

      if (product.requires_shipping === 1) {
        requiresShipping = true
      }

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_type: product.product_type,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal: subtotal,
        event_date: product.event_date,
        event_location: product.event_location
      })
    }

    // 配送が必要な場合、配送先チェック
    if (requiresShipping) {
      if (!shipping_address || !shipping_name || !shipping_phone) {
        return c.json({
          success: false,
          error: '配送先情報が必要です'
        }, 400)
      }
      // 送料計算（簡易版: 一律500円）
      shippingFee = 500
    }

    const finalAmount = totalAmount + shippingFee

    // 注文番号生成
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // 注文作成
    const orderResult = await db
      .prepare(`
        INSERT INTO shop_orders (
          tenant_id, user_id, order_number, total_amount, shipping_fee,
          payment_status, order_status, shipping_address, shipping_name, shipping_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        tenantId,
        userId,
        orderNumber,
        finalAmount,
        shippingFee,
        'pending', // 決済待ち
        'pending', // 注文処理待ち
        shipping_address || null,
        shipping_name || null,
        shipping_phone || null
      )
      .run()

    const orderId = orderResult.meta.last_row_id

    // 注文明細作成
    for (const item of orderItems) {
      await db
        .prepare(`
          INSERT INTO shop_order_items (
            order_id, product_id, product_name, product_type, quantity,
            unit_price, subtotal, event_date, event_location
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          orderId,
          item.product_id,
          item.product_name,
          item.product_type,
          item.quantity,
          item.unit_price,
          item.subtotal,
          item.event_date || null,
          item.event_location || null
        )
        .run()
    }

    return c.json({
      success: true,
      message: '注文を作成しました',
      order: {
        id: orderId,
        order_number: orderNumber,
        total_amount: finalAmount,
        shipping_fee: shippingFee
      }
    })
  } catch (error) {
    console.error('[Create Order Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order'
    }, 500)
  }
})

/**
 * GET /api/shop/orders
 * 注文履歴取得（会員向け）
 */
shop.get('/orders', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const db = c.env.DB

  try {
    const orders = await db
      .prepare(`
        SELECT * FROM shop_orders
        WHERE tenant_id = ? AND user_id = ?
        ORDER BY created_at DESC
      `)
      .bind(tenantId, userId)
      .all()

    return c.json({
      success: true,
      orders: orders.results || []
    })
  } catch (error) {
    console.error('[Get Orders Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get orders'
    }, 500)
  }
})

/**
 * GET /api/shop/orders/:id
 * 注文詳細取得（会員向け）
 */
shop.get('/orders/:id', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const orderId = c.req.param('id')
  const db = c.env.DB

  try {
    const order = await db
      .prepare(`
        SELECT * FROM shop_orders
        WHERE id = ? AND tenant_id = ? AND user_id = ?
      `)
      .bind(orderId, tenantId, userId)
      .first()

    if (!order) {
      return c.json({
        success: false,
        error: '注文が見つかりません'
      }, 404)
    }

    // 注文明細を取得
    const items = await db
      .prepare(`
        SELECT * FROM shop_order_items
        WHERE order_id = ?
      `)
      .bind(orderId)
      .all()

    return c.json({
      success: true,
      order: {
        ...order,
        items: items.results || []
      }
    })
  } catch (error) {
    console.error('[Get Order Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get order'
    }, 500)
  }
})

// ============================================
// 管理者向け注文管理API
// ============================================

/**
 * GET /api/shop/admin/orders
 * 全注文一覧取得（管理者のみ）
 */
shop.get('/admin/orders', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const status = c.req.query('status')
    const paymentStatus = c.req.query('payment_status')
    
    let query = `
      SELECT o.*, u.email, u.nickname
      FROM shop_orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.tenant_id = ?
    `
    const params: any[] = [tenantId]

    if (status) {
      query += ' AND o.order_status = ?'
      params.push(status)
    }

    if (paymentStatus) {
      query += ' AND o.payment_status = ?'
      params.push(paymentStatus)
    }

    query += ' ORDER BY o.created_at DESC'

    const orders = await db
      .prepare(query)
      .bind(...params)
      .all()

    return c.json({
      success: true,
      orders: orders.results || []
    })
  } catch (error) {
    console.error('[Admin Get Orders Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get orders'
    }, 500)
  }
})

/**
 * GET /api/shop/admin/orders/:id
 * 注文詳細取得（管理者のみ）
 */
shop.get('/admin/orders/:id', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const orderId = c.req.param('id')
  const db = c.env.DB

  try {
    const order = await db
      .prepare(`
        SELECT o.*, u.email, u.nickname
        FROM shop_orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = ? AND o.tenant_id = ?
      `)
      .bind(orderId, tenantId)
      .first()

    if (!order) {
      return c.json({
        success: false,
        error: '注文が見つかりません'
      }, 404)
    }

    // 注文明細を取得
    const items = await db
      .prepare(`
        SELECT * FROM shop_order_items
        WHERE order_id = ?
      `)
      .bind(orderId)
      .all()

    return c.json({
      success: true,
      order: {
        ...order,
        items: items.results || []
      }
    })
  } catch (error) {
    console.error('[Admin Get Order Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get order'
    }, 500)
  }
})

/**
 * PUT /api/shop/admin/orders/:id/status
 * 注文ステータス更新（管理者のみ）
 */
shop.put('/admin/orders/:id/status', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const orderId = c.req.param('id')
  const db = c.env.DB

  try {
    const { order_status, payment_status, admin_note } = await c.req.json()

    // 注文の存在確認
    const order = await db
      .prepare('SELECT id FROM shop_orders WHERE id = ? AND tenant_id = ?')
      .bind(orderId, tenantId)
      .first()

    if (!order) {
      return c.json({
        success: false,
        error: '注文が見つかりません'
      }, 404)
    }

    // ステータスのバリデーション
    const validOrderStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    const validPaymentStatuses = ['pending', 'completed', 'failed', 'refunded']

    if (order_status && !validOrderStatuses.includes(order_status)) {
      return c.json({
        success: false,
        error: '無効な注文ステータスです'
      }, 400)
    }

    if (payment_status && !validPaymentStatuses.includes(payment_status)) {
      return c.json({
        success: false,
        error: '無効な決済ステータスです'
      }, 400)
    }

    // ステータス更新
    const updates: string[] = []
    const values: any[] = []

    if (order_status !== undefined) {
      updates.push('order_status = ?')
      values.push(order_status)
    }

    if (payment_status !== undefined) {
      updates.push('payment_status = ?')
      values.push(payment_status)
    }

    if (admin_note !== undefined) {
      updates.push('admin_note = ?')
      values.push(admin_note)
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(orderId, tenantId)

    await db
      .prepare(`
        UPDATE shop_orders
        SET ${updates.join(', ')}
        WHERE id = ? AND tenant_id = ?
      `)
      .bind(...values)
      .run()

    return c.json({
      success: true,
      message: 'ステータスを更新しました'
    })
  } catch (error) {
    console.error('[Admin Update Order Status Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update order status'
    }, 500)
  }
})

/**
 * GET /api/shop/admin/stats
 * 注文統計情報取得（管理者のみ）
 */
shop.get('/admin/stats', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // 全注文数
    const totalOrders = await db
      .prepare(`
        SELECT COUNT(*) as count FROM shop_orders WHERE tenant_id = ?
      `)
      .bind(tenantId)
      .first<{ count: number }>()

    // 処理待ち注文数
    const pendingOrders = await db
      .prepare(`
        SELECT COUNT(*) as count FROM shop_orders 
        WHERE tenant_id = ? AND order_status = 'pending'
      `)
      .bind(tenantId)
      .first<{ count: number }>()

    // 今月の売上
    const thisMonth = await db
      .prepare(`
        SELECT SUM(total_amount) as total FROM shop_orders
        WHERE tenant_id = ? 
        AND payment_status = 'completed'
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `)
      .bind(tenantId)
      .first<{ total: number | null }>()

    // 総売上
    const totalRevenue = await db
      .prepare(`
        SELECT SUM(total_amount) as total FROM shop_orders
        WHERE tenant_id = ? AND payment_status = 'completed'
      `)
      .bind(tenantId)
      .first<{ total: number | null }>()

    // ステータス別注文数
    const statusCounts = await db
      .prepare(`
        SELECT order_status, COUNT(*) as count FROM shop_orders
        WHERE tenant_id = ?
        GROUP BY order_status
      `)
      .bind(tenantId)
      .all()

    return c.json({
      success: true,
      stats: {
        total_orders: totalOrders?.count || 0,
        pending_orders: pendingOrders?.count || 0,
        this_month_revenue: thisMonth?.total || 0,
        total_revenue: totalRevenue?.total || 0,
        status_counts: statusCounts.results || []
      }
    })
  } catch (error) {
    console.error('[Admin Get Stats Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats'
    }, 500)
  }
})

export default shop
