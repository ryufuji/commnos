// ============================================
// サブスクリプション管理ルート
// ============================================

import { Hono } from 'hono'
import Stripe from 'stripe'
import type { AppContext } from '../types'
import { authMiddleware, requireRole } from '../middleware/auth'

const subscription = new Hono<AppContext>()

/**
 * GET /api/subscription/status
 * サブスクリプション状態取得（オーナーのみ）
 */
subscription.get('/status', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // テナント情報を取得
    const tenant = await db
      .prepare(`
        SELECT 
          id, subdomain, name, plan, status,
          stripe_customer_id, stripe_subscription_id,
          subscription_status, subscription_current_period_start,
          subscription_current_period_end, subscription_cancel_at,
          trial_end, subscription_updated_at,
          member_count, storage_used, storage_limit
        FROM tenants
        WHERE id = ?
      `)
      .bind(tenantId)
      .first<any>()

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    // Stripeから最新のサブスクリプション情報を取得
    let stripeSubscription = null
    if (tenant.stripe_subscription_id) {
      const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-12-18.acacia'
      })

      try {
        stripeSubscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)
      } catch (error) {
        console.error('Failed to retrieve Stripe subscription:', error)
      }
    }

    return c.json({
      success: true,
      subscription: {
        tenant: {
          id: tenant.id,
          subdomain: tenant.subdomain,
          name: tenant.name,
          status: tenant.status
        },
        plan: tenant.plan,
        subscription_status: tenant.subscription_status,
        current_period_start: tenant.subscription_current_period_start,
        current_period_end: tenant.subscription_current_period_end,
        cancel_at: tenant.subscription_cancel_at,
        trial_end: tenant.trial_end,
        updated_at: tenant.subscription_updated_at,
        usage: {
          member_count: tenant.member_count,
          storage_used: tenant.storage_used,
          storage_limit: tenant.storage_limit,
          storage_used_mb: Math.round(tenant.storage_used / 1024 / 1024),
          storage_limit_mb: Math.round(tenant.storage_limit / 1024 / 1024)
        },
        stripe: stripeSubscription ? {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          current_period_start: stripeSubscription.current_period_start,
          current_period_end: stripeSubscription.current_period_end,
          cancel_at: stripeSubscription.cancel_at,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end,
          items: stripeSubscription.items.data.map(item => ({
            id: item.id,
            price: {
              id: item.price.id,
              unit_amount: item.price.unit_amount,
              currency: item.price.currency,
              recurring: item.price.recurring
            }
          }))
        } : null
      }
    })
  } catch (error) {
    console.error('[Get Subscription Status Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get subscription status'
    }, 500)
  }
})

/**
 * POST /api/subscription/change-plan
 * プラン変更（オーナーのみ）
 */
subscription.post('/change-plan', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const { plan } = await c.req.json<{ plan: 'free' | 'starter' | 'pro' }>()
  const db = c.env.DB

  // プランの検証
  if (!['free', 'starter', 'pro'].includes(plan)) {
    return c.json({ success: false, error: '無効なプランです' }, 400)
  }

  try {
    // テナント情報を取得
    const tenant = await db
      .prepare('SELECT * FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<any>()

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    // Freeプランへのダウングレード
    if (plan === 'free') {
      if (!tenant.stripe_subscription_id) {
        return c.json({ success: false, error: 'アクティブなサブスクリプションがありません' }, 400)
      }

      const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-12-18.acacia'
      })

      // Stripeサブスクリプションをキャンセル（期間終了時）
      await stripe.subscriptions.update(tenant.stripe_subscription_id, {
        cancel_at_period_end: true
      })

      // データベースを更新
      await db.prepare(`
        UPDATE tenants
        SET subscription_cancel_at = datetime(?, 'unixepoch'),
            subscription_updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        Math.floor(Date.now() / 1000),
        tenantId
      ).run()

      return c.json({
        success: true,
        message: '現在の請求期間終了時にFreeプランへダウングレードされます'
      })
    }

    // 有料プランへのアップグレード/変更
    const priceId = plan === 'starter' 
      ? c.env.STRIPE_PRICE_STARTER 
      : c.env.STRIPE_PRICE_PRO

    if (!priceId) {
      return c.json({ success: false, error: 'プラン設定が見つかりません' }, 500)
    }

    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia'
    })

    // 既存のサブスクリプションがある場合は更新
    if (tenant.stripe_subscription_id) {
      const currentSubscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)
      
      await stripe.subscriptions.update(tenant.stripe_subscription_id, {
        cancel_at_period_end: false,
        items: [{
          id: currentSubscription.items.data[0].id,
          price: priceId
        }],
        proration_behavior: 'always_invoice'
      })

      // データベースを更新
      await db.prepare(`
        UPDATE tenants
        SET plan = ?,
            subscription_cancel_at = NULL,
            subscription_updated_at = datetime('now')
        WHERE id = ?
      `).bind(plan, tenantId).run()

      return c.json({
        success: true,
        message: `プランを${plan}に変更しました`
      })
    }

    // 新規サブスクリプションの場合はCheckoutセッションを作成
    const baseUrl = c.env.PLATFORM_DOMAIN === 'commons.com'
      ? `https://${c.req.header('host')}`
      : `http://${c.req.header('host')}`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: tenant.stripe_customer_id || undefined,
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      success_url: `${baseUrl}/tenant/subscription/success?session_id={CHECKOUT_SESSION_ID}&subdomain=${tenant.subdomain}`,
      cancel_url: `${baseUrl}/tenant/subscription?subdomain=${tenant.subdomain}`,
      allow_promotion_codes: true,
      metadata: {
        plan: plan,
        tenant_id: tenantId.toString()
      },
      billing_address_collection: 'auto',
      locale: 'ja'
    })

    return c.json({
      success: true,
      checkout_url: session.url
    })
  } catch (error) {
    console.error('[Change Plan Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change plan'
    }, 500)
  }
})

/**
 * POST /api/subscription/cancel
 * サブスクリプションキャンセル（オーナーのみ）
 */
subscription.post('/cancel', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const { immediate } = await c.req.json<{ immediate?: boolean }>()
  const db = c.env.DB

  try {
    // テナント情報を取得
    const tenant = await db
      .prepare('SELECT * FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<any>()

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    if (!tenant.stripe_subscription_id) {
      return c.json({ success: false, error: 'アクティブなサブスクリプションがありません' }, 400)
    }

    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia'
    })

    if (immediate) {
      // 即座にキャンセル
      await stripe.subscriptions.cancel(tenant.stripe_subscription_id)

      // データベースを更新
      await db.prepare(`
        UPDATE tenants
        SET plan = 'free',
            subscription_status = 'canceled',
            subscription_cancel_at = datetime('now'),
            subscription_updated_at = datetime('now')
        WHERE id = ?
      `).bind(tenantId).run()

      return c.json({
        success: true,
        message: 'サブスクリプションを即座にキャンセルしました'
      })
    } else {
      // 期間終了時にキャンセル
      await stripe.subscriptions.update(tenant.stripe_subscription_id, {
        cancel_at_period_end: true
      })

      const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)

      // データベースを更新
      await db.prepare(`
        UPDATE tenants
        SET subscription_cancel_at = datetime(?, 'unixepoch'),
            subscription_updated_at = datetime('now')
        WHERE id = ?
      `).bind(subscription.current_period_end, tenantId).run()

      return c.json({
        success: true,
        message: '現在の請求期間終了時にキャンセルされます',
        cancel_at: new Date(subscription.current_period_end * 1000).toISOString()
      })
    }
  } catch (error) {
    console.error('[Cancel Subscription Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel subscription'
    }, 500)
  }
})

/**
 * POST /api/subscription/reactivate
 * キャンセル予定のサブスクリプションを再開（オーナーのみ）
 */
subscription.post('/reactivate', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // テナント情報を取得
    const tenant = await db
      .prepare('SELECT * FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<any>()

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    if (!tenant.stripe_subscription_id) {
      return c.json({ success: false, error: 'アクティブなサブスクリプションがありません' }, 400)
    }

    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia'
    })

    // キャンセル予定を取り消し
    await stripe.subscriptions.update(tenant.stripe_subscription_id, {
      cancel_at_period_end: false
    })

    // データベースを更新
    await db.prepare(`
      UPDATE tenants
      SET subscription_cancel_at = NULL,
          subscription_updated_at = datetime('now')
      WHERE id = ?
    `).bind(tenantId).run()

    return c.json({
      success: true,
      message: 'サブスクリプションのキャンセルを取り消しました'
    })
  } catch (error) {
    console.error('[Reactivate Subscription Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reactivate subscription'
    }, 500)
  }
})

/**
 * GET /api/subscription/invoices
 * 請求履歴取得（オーナーのみ）
 */
subscription.get('/invoices', authMiddleware, requireRole('owner'), async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // テナント情報を取得
    const tenant = await db
      .prepare('SELECT stripe_customer_id FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<{ stripe_customer_id: string | null }>()

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    if (!tenant.stripe_customer_id) {
      return c.json({
        success: true,
        invoices: []
      })
    }

    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia'
    })

    // Stripeから請求履歴を取得
    const invoices = await stripe.invoices.list({
      customer: tenant.stripe_customer_id,
      limit: 100
    })

    return c.json({
      success: true,
      invoices: invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        paid: invoice.paid,
        lines: invoice.lines.data.map(line => ({
          description: line.description,
          amount: line.amount,
          currency: line.currency,
          period: {
            start: line.period?.start,
            end: line.period?.end
          }
        }))
      }))
    })
  } catch (error) {
    console.error('[Get Invoices Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get invoices'
    }, 500)
  }
})

export default subscription
