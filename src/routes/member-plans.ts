// ============================================
// 一般会員向けプラン管理API
// ============================================

import { Hono } from 'hono'
import Stripe from 'stripe'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const memberPlans = new Hono<AppContext>()

/**
 * GET /api/tenant/member/plans
 * 一般会員向け: 利用可能なプラン一覧取得
 */
memberPlans.get('/plans', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')

  if (!subdomain) {
    return c.json({ success: false, error: 'Subdomain required' }, 400)
  }

  try {
    // テナントID取得
    const tenant = await DB.prepare(`
      SELECT id FROM tenants WHERE subdomain = ?
    `).bind(subdomain).first()

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    // アクティブなプラン一覧を取得
    const plans = await DB.prepare(`
      SELECT 
        id, name, description, price, features,
        stripe_price_id, stripe_product_id, sort_order
      FROM tenant_plans
      WHERE tenant_id = ? AND is_active = 1
      ORDER BY sort_order ASC, price ASC
    `).bind((tenant as any).id).all()

    return c.json({
      success: true,
      plans: plans.results || []
    })
  } catch (error) {
    console.error('[Get Member Plans Error]', error)
    return c.json({
      success: false,
      error: 'Failed to fetch plans'
    }, 500)
  }
})

/**
 * GET /api/tenant/member/current-plan
 * 一般会員向け: 現在のプラン情報取得
 */
memberPlans.get('/current-plan', authMiddleware, async (c) => {
  const { DB } = c.env
  const userId = c.get('userId')
  const subdomain = c.req.query('subdomain')

  if (!subdomain) {
    return c.json({ success: false, error: 'Subdomain required' }, 400)
  }

  try {
    // テナントID取得
    const tenant = await DB.prepare(`
      SELECT id FROM tenants WHERE subdomain = ?
    `).bind(subdomain).first()

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    // ユーザーのメンバーシップとプラン情報を取得
    const membership = await DB.prepare(`
      SELECT 
        tm.plan_id,
        tm.expires_at,
        tp.name,
        tp.description,
        tp.price,
        tp.features
      FROM tenant_memberships tm
      LEFT JOIN tenant_plans tp ON tm.plan_id = tp.id
      WHERE tm.user_id = ? AND tm.tenant_id = ? AND tm.status = 'active'
    `).bind(userId, (tenant as any).id).first()

    if (!membership || !(membership as any).plan_id) {
      return c.json({
        success: true,
        plan: null,
        message: 'プランが設定されていません'
      })
    }

    return c.json({
      success: true,
      plan: {
        id: (membership as any).plan_id,
        name: (membership as any).name,
        description: (membership as any).description,
        price: (membership as any).price,
        features: (membership as any).features ? JSON.parse((membership as any).features) : null
      },
      expires_at: (membership as any).expires_at
    })
  } catch (error) {
    console.error('[Get Current Plan Error]', error)
    return c.json({
      success: false,
      error: 'Failed to fetch current plan'
    }, 500)
  }
})

/**
 * POST /api/tenant/member/change-plan
 * 一般会員向け: プラン変更
 */
memberPlans.post('/change-plan', authMiddleware, async (c) => {
  const { DB } = c.env
  const userId = c.get('userId')
  const { subdomain, plan_id } = await c.req.json()

  if (!subdomain || !plan_id) {
    return c.json({ 
      success: false, 
      error: 'Subdomain and plan_id required' 
    }, 400)
  }

  try {
    // テナントID取得
    const tenant = await DB.prepare(`
      SELECT id FROM tenants WHERE subdomain = ?
    `).bind(subdomain).first()

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    // プラン存在確認
    const plan = await DB.prepare(`
      SELECT * FROM tenant_plans 
      WHERE id = ? AND tenant_id = ? AND is_active = 1
    `).bind(plan_id, (tenant as any).id).first()

    if (!plan) {
      return c.json({ 
        success: false, 
        error: 'Plan not found or inactive' 
      }, 404)
    }

    // ユーザーのメンバーシップ確認
    const membership = await DB.prepare(`
      SELECT * FROM tenant_memberships 
      WHERE user_id = ? AND tenant_id = ? AND status = 'active'
    `).bind(userId, (tenant as any).id).first()

    if (!membership) {
      return c.json({ 
        success: false, 
        error: 'Membership not found' 
      }, 404)
    }

    // プラン変更（Stripe処理は後で実装）
    await DB.prepare(`
      UPDATE tenant_memberships
      SET plan_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(plan_id, userId, (tenant as any).id).run()

    // TODO: Stripe処理
    // 1. 既存のサブスクリプションを取得
    // 2. サブスクリプションアイテムを更新
    // 3. 請求を prorating で処理

    return c.json({
      success: true,
      message: 'プランを変更しました',
      plan: {
        id: (plan as any).id,
        name: (plan as any).name,
        description: (plan as any).description,
        price: (plan as any).price
      }
    })
  } catch (error) {
    console.error('[Change Plan Error]', error)
    return c.json({
      success: false,
      error: 'Failed to change plan'
    }, 500)
  }
})

export default memberPlans
