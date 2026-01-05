// ============================================
// テナントプラン管理ルート（マーケットプレイスモデル）
// ============================================

import { Hono } from 'hono'
import Stripe from 'stripe'
import type { AppContext } from '../types'
import { authMiddleware, requireRole } from '../middleware/auth'

const tenantPlans = new Hono<AppContext>()

/**
 * GET /api/tenant-plans
 * テナントのプラン一覧取得（オーナーのみ）
 */
tenantPlans.get('/', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const plans = await db
      .prepare(`
        SELECT 
          id, tenant_id, name, description, price,
          member_limit, storage_limit, features,
          is_active, stripe_price_id, stripe_product_id,
          sort_order, created_at, updated_at
        FROM tenant_plans
        WHERE tenant_id = ?
        ORDER BY sort_order ASC, created_at ASC
      `)
      .bind(tenantId)
      .all()

    return c.json({
      success: true,
      plans: plans.results || []
    })
  } catch (error) {
    console.error('[Get Tenant Plans Error]', error)
    return c.json({
      success: false,
      error: 'Failed to fetch plans'
    }, 500)
  }
})

/**
 * POST /api/tenant-plans
 * 新規プラン作成（オーナーのみ）
 */
tenantPlans.post('/', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const body = await c.req.json()
    const {
      name,
      description,
      price,
      member_limit,
      storage_limit,
      features
    } = body

    // バリデーション
    if (!name || typeof price !== 'number' || price < 0) {
      return c.json({
        success: false,
        error: 'Invalid plan data'
      }, 400)
    }

    // テナント情報取得
    const tenant = await db
      .prepare('SELECT subdomain, name FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<any>()

    if (!tenant) {
      return c.json({
        success: false,
        error: 'Tenant not found'
      }, 404)
    }

    // Stripe Product & Price作成
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia'
    })

    // Stripe Product作成
    const product = await stripe.products.create({
      name: `${tenant.name} - ${name}`,
      description: description || undefined,
      metadata: {
        tenant_id: tenantId.toString(),
        tenant_subdomain: tenant.subdomain,
        plan_name: name
      }
    })

    // Stripe Price作成（プラットフォーム手数料20%を考慮）
    const stripePrice = await stripe.prices.create({
      product: product.id,
      currency: 'jpy',
      recurring: {
        interval: 'month'
      },
      unit_amount: price,
      metadata: {
        tenant_id: tenantId.toString(),
        platform_fee_rate: '20'
      }
    })

    // データベースに保存
    const result = await db
      .prepare(`
        INSERT INTO tenant_plans (
          tenant_id, name, description, price,
          member_limit, storage_limit, features,
          stripe_price_id, stripe_product_id, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 
          COALESCE((SELECT MAX(sort_order) + 1 FROM tenant_plans WHERE tenant_id = ?), 0)
        )
      `)
      .bind(
        tenantId,
        name,
        description || null,
        price,
        member_limit || null,
        storage_limit || null,
        features ? JSON.stringify(features) : null,
        stripePrice.id,
        product.id,
        tenantId
      )
      .run()

    if (!result.success) {
      throw new Error('Failed to save plan to database')
    }

    // 作成されたプランを取得
    const newPlan = await db
      .prepare(`
        SELECT * FROM tenant_plans 
        WHERE id = last_insert_rowid()
      `)
      .first<any>()

    return c.json({
      success: true,
      plan: newPlan
    })
  } catch (error) {
    console.error('[Create Tenant Plan Error]', error)
    return c.json({
      success: false,
      error: 'Failed to create plan'
    }, 500)
  }
})

/**
 * PATCH /api/tenant-plans/:id
 * プラン更新（オーナーのみ）
 */
tenantPlans.patch('/:id', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const planId = c.req.param('id')
  const db = c.env.DB

  try {
    const body = await c.req.json()
    const {
      name,
      description,
      price,
      member_limit,
      storage_limit,
      features,
      is_active,
      sort_order
    } = body

    // 既存プラン取得
    const existingPlan = await db
      .prepare('SELECT * FROM tenant_plans WHERE id = ? AND tenant_id = ?')
      .bind(planId, tenantId)
      .first<any>()

    if (!existingPlan) {
      return c.json({
        success: false,
        error: 'Plan not found'
      }, 404)
    }

    // 価格が変更された場合、新しいStripe Priceを作成
    let newStripePriceId = existingPlan.stripe_price_id
    if (price && price !== existingPlan.price) {
      const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-12-18.acacia'
      })

      // 新しいPriceを作成（既存のProductに紐付け）
      const newPrice = await stripe.prices.create({
        product: existingPlan.stripe_product_id,
        currency: 'jpy',
        recurring: {
          interval: 'month'
        },
        unit_amount: price,
        metadata: {
          tenant_id: tenantId.toString(),
          platform_fee_rate: '20'
        }
      })

      newStripePriceId = newPrice.id

      // 古いPriceを非アクティブ化
      await stripe.prices.update(existingPlan.stripe_price_id, {
        active: false
      })
    }

    // データベース更新
    await db
      .prepare(`
        UPDATE tenant_plans
        SET 
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          price = COALESCE(?, price),
          member_limit = COALESCE(?, member_limit),
          storage_limit = COALESCE(?, storage_limit),
          features = COALESCE(?, features),
          is_active = COALESCE(?, is_active),
          sort_order = COALESCE(?, sort_order),
          stripe_price_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
      `)
      .bind(
        name || null,
        description || null,
        price || null,
        member_limit || null,
        storage_limit || null,
        features ? JSON.stringify(features) : null,
        is_active !== undefined ? is_active : null,
        sort_order || null,
        newStripePriceId,
        planId,
        tenantId
      )
      .run()

    // 更新されたプラン取得
    const updatedPlan = await db
      .prepare('SELECT * FROM tenant_plans WHERE id = ? AND tenant_id = ?')
      .bind(planId, tenantId)
      .first<any>()

    return c.json({
      success: true,
      plan: updatedPlan
    })
  } catch (error) {
    console.error('[Update Tenant Plan Error]', error)
    return c.json({
      success: false,
      error: 'Failed to update plan'
    }, 500)
  }
})

/**
 * DELETE /api/tenant-plans/:id
 * プラン削除（オーナーのみ）
 */
tenantPlans.delete('/:id', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const planId = c.req.param('id')
  const db = c.env.DB

  try {
    // 既存プラン取得
    const existingPlan = await db
      .prepare('SELECT * FROM tenant_plans WHERE id = ? AND tenant_id = ?')
      .bind(planId, tenantId)
      .first<any>()

    if (!existingPlan) {
      return c.json({
        success: false,
        error: 'Plan not found'
      }, 404)
    }

    // アクティブなサブスクリプションがあるかチェック
    // TODO: 実装後にチェック追加

    // 論理削除（is_active = 0）
    await db
      .prepare(`
        UPDATE tenant_plans
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
      `)
      .bind(planId, tenantId)
      .run()

    // Stripe Priceも非アクティブ化
    if (existingPlan.stripe_price_id) {
      const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-12-18.acacia'
      })

      await stripe.prices.update(existingPlan.stripe_price_id, {
        active: false
      })
    }

    return c.json({
      success: true,
      message: 'Plan deactivated successfully'
    })
  } catch (error) {
    console.error('[Delete Tenant Plan Error]', error)
    return c.json({
      success: false,
      error: 'Failed to delete plan'
    }, 500)
  }
})

export default tenantPlans
