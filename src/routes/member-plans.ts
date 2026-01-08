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
 * 一般会員向け: プラン変更（Stripe Checkout統合）
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
    // テナント情報取得
    const tenant = await DB.prepare(`
      SELECT id, subdomain, name FROM tenants WHERE subdomain = ?
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

    // ユーザー情報取得
    const user = await DB.prepare(`
      SELECT email, nickname FROM users WHERE id = ?
    `).bind(userId).first()

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }

    // Stripe Checkoutセッション作成
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia'
    })

    // 既存のサブスクリプションをチェック
    const existingSubscription = await DB.prepare(`
      SELECT stripe_subscription_id FROM tenant_memberships
      WHERE user_id = ? AND tenant_id = ? AND stripe_subscription_id IS NOT NULL
    `).bind(userId, (tenant as any).id).first()

    let checkoutSession

    if ((existingSubscription as any)?.stripe_subscription_id) {
      // 既存サブスクリプションがある場合は変更（ポータル経由）
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: (membership as any).stripe_customer_id,
        return_url: `${c.env.PLATFORM_DOMAIN}/tenant/member-plans?subdomain=${subdomain}`
      })

      return c.json({
        success: true,
        redirect_url: portalSession.url,
        is_portal: true,
        message: 'サブスクリプション管理ポータルにリダイレクトします'
      })
    } else {
      // 新規サブスクリプション作成
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: (plan as any).stripe_price_id,
            quantity: 1
          }
        ],
        customer_email: (user as any).email,
        metadata: {
          user_id: userId.toString(),
          tenant_id: (tenant as any).id.toString(),
          plan_id: plan_id.toString(),
          subdomain: subdomain
        },
        subscription_data: {
          metadata: {
            user_id: userId.toString(),
            tenant_id: (tenant as any).id.toString(),
            plan_id: plan_id.toString(),
            tenant_name: (tenant as any).name
          }
        },
        success_url: `${c.env.PLATFORM_DOMAIN}/tenant/member-plans?subdomain=${subdomain}&success=true`,
        cancel_url: `${c.env.PLATFORM_DOMAIN}/tenant/member-plans?subdomain=${subdomain}&canceled=true`
      })

      return c.json({
        success: true,
        checkout_url: checkoutSession.url,
        session_id: checkoutSession.id,
        message: 'Stripe Checkoutにリダイレクトします'
      })
    }
  } catch (error) {
    console.error('[Change Plan Error]', error)
    return c.json({
      success: false,
      error: 'Failed to change plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default memberPlans
