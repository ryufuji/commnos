// ============================================
// Stripe Webhook Handler
// 決済完了・サブスクリプション更新時の処理
// ============================================

import { Hono } from 'hono'
import Stripe from 'stripe'
import type { AppContext } from '../types'

const stripeWebhook = new Hono<AppContext>()

/**
 * POST /api/stripe/webhook
 * Stripe Webhook エンドポイント
 */
stripeWebhook.post('/webhook', async (c) => {
  const { DB } = c.env
  const signature = c.req.header('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] Missing signature')
    return c.json({ error: 'Missing signature' }, 400)
  }

  try {
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia'
    })

    // リクエストボディを取得
    const body = await c.req.text()

    // Webhook署名検証
    const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured')
      return c.json({ error: 'Webhook secret not configured' }, 500)
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    console.log(`[Stripe Webhook] Received event: ${event.type}`)

    // イベントタイプごとの処理
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(DB, session, stripe)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(DB, subscription)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(DB, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(DB, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(DB, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(DB, invoice)
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return c.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook Error]', error)
    return c.json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 400)
  }
})

/**
 * Checkoutセッション完了時の処理
 */
async function handleCheckoutCompleted(
  DB: D1Database,
  session: Stripe.Checkout.Session,
  stripe: Stripe
) {
  console.log('[Stripe Webhook] Processing checkout.session.completed')

  const metadata = session.metadata
  if (!metadata) {
    console.error('[Stripe Webhook] No metadata in session')
    return
  }

  const { user_id, tenant_id, plan_id } = metadata

  if (!user_id || !tenant_id || !plan_id) {
    console.error('[Stripe Webhook] Missing required metadata', metadata)
    return
  }

  try {
    // サブスクリプションID取得
    const subscriptionId = session.subscription as string

    // カスタマーID取得
    const customerId = session.customer as string

    // メンバーシップ情報を更新
    await DB.prepare(`
      UPDATE tenant_memberships
      SET 
        plan_id = ?,
        stripe_customer_id = ?,
        stripe_subscription_id = ?,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(plan_id, customerId, subscriptionId, user_id, tenant_id).run()

    console.log(`[Stripe Webhook] Updated membership for user ${user_id}, plan ${plan_id}`)

    // TODO: メール通知を送信
    // - プラン適用完了メール
    // - 領収書メール
  } catch (error) {
    console.error('[Stripe Webhook] Error updating membership:', error)
    throw error
  }
}

/**
 * サブスクリプション作成時の処理
 */
async function handleSubscriptionCreated(
  DB: D1Database,
  subscription: Stripe.Subscription
) {
  console.log('[Stripe Webhook] Processing customer.subscription.created')
  
  const metadata = subscription.metadata
  if (!metadata || !metadata.user_id || !metadata.tenant_id) {
    console.error('[Stripe Webhook] No metadata in subscription')
    return
  }

  // 有効期限を設定
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

  try {
    await DB.prepare(`
      UPDATE tenant_memberships
      SET expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(currentPeriodEnd, metadata.user_id, metadata.tenant_id).run()

    console.log(`[Stripe Webhook] Set expiration for user ${metadata.user_id} to ${currentPeriodEnd}`)
  } catch (error) {
    console.error('[Stripe Webhook] Error setting expiration:', error)
  }
}

/**
 * サブスクリプション更新時の処理
 */
async function handleSubscriptionUpdated(
  DB: D1Database,
  subscription: Stripe.Subscription
) {
  console.log('[Stripe Webhook] Processing customer.subscription.updated')
  
  const metadata = subscription.metadata
  if (!metadata || !metadata.user_id || !metadata.tenant_id) {
    console.log('[Stripe Webhook] No metadata in subscription, skipping')
    return
  }

  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
  const status = subscription.status === 'active' ? 'active' : 'inactive'

  try {
    await DB.prepare(`
      UPDATE tenant_memberships
      SET 
        expires_at = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(currentPeriodEnd, status, metadata.user_id, metadata.tenant_id).run()

    console.log(`[Stripe Webhook] Updated subscription for user ${metadata.user_id}, status: ${status}`)
  } catch (error) {
    console.error('[Stripe Webhook] Error updating subscription:', error)
  }
}

/**
 * サブスクリプション削除（キャンセル）時の処理
 */
async function handleSubscriptionDeleted(
  DB: D1Database,
  subscription: Stripe.Subscription
) {
  console.log('[Stripe Webhook] Processing customer.subscription.deleted')
  
  const metadata = subscription.metadata
  if (!metadata || !metadata.user_id || !metadata.tenant_id) {
    console.log('[Stripe Webhook] No metadata in subscription, skipping')
    return
  }

  try {
    await DB.prepare(`
      UPDATE tenant_memberships
      SET 
        status = 'inactive',
        stripe_subscription_id = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(metadata.user_id, metadata.tenant_id).run()

    console.log(`[Stripe Webhook] Deactivated subscription for user ${metadata.user_id}`)

    // TODO: メール通知を送信
    // - サブスクリプションキャンセル通知
  } catch (error) {
    console.error('[Stripe Webhook] Error deactivating subscription:', error)
  }
}

/**
 * 支払い成功時の処理
 */
async function handlePaymentSucceeded(
  DB: D1Database,
  invoice: Stripe.Invoice
) {
  console.log('[Stripe Webhook] Processing invoice.payment_succeeded')
  
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) {
    console.log('[Stripe Webhook] No subscription ID in invoice')
    return
  }

  // 支払い履歴を記録
  try {
    // メンバーシップを取得
    const membership = await DB.prepare(`
      SELECT user_id, tenant_id FROM tenant_memberships
      WHERE stripe_subscription_id = ?
    `).bind(subscriptionId).first()

    if (!membership) {
      console.log('[Stripe Webhook] Membership not found for subscription:', subscriptionId)
      return
    }

    // 支払い履歴を記録
    await DB.prepare(`
      INSERT INTO payment_history (
        user_id,
        tenant_id,
        stripe_invoice_id,
        stripe_subscription_id,
        amount,
        currency,
        status,
        paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      (membership as any).user_id,
      (membership as any).tenant_id,
      invoice.id,
      subscriptionId,
      invoice.amount_paid,
      invoice.currency,
      'paid'
    ).run()

    console.log(`[Stripe Webhook] Recorded payment for subscription ${subscriptionId}`)

    // TODO: メール通知を送信
    // - 支払い完了・領収書メール
  } catch (error) {
    console.error('[Stripe Webhook] Error recording payment:', error)
  }
}

/**
 * 支払い失敗時の処理
 */
async function handlePaymentFailed(
  DB: D1Database,
  invoice: Stripe.Invoice
) {
  console.log('[Stripe Webhook] Processing invoice.payment_failed')
  
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) {
    console.log('[Stripe Webhook] No subscription ID in invoice')
    return
  }

  try {
    // メンバーシップを取得
    const membership = await DB.prepare(`
      SELECT user_id, tenant_id FROM tenant_memberships
      WHERE stripe_subscription_id = ?
    `).bind(subscriptionId).first()

    if (!membership) {
      console.log('[Stripe Webhook] Membership not found for subscription:', subscriptionId)
      return
    }

    // 支払い失敗を記録
    await DB.prepare(`
      INSERT INTO payment_history (
        user_id,
        tenant_id,
        stripe_invoice_id,
        stripe_subscription_id,
        amount,
        currency,
        status,
        paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      (membership as any).user_id,
      (membership as any).tenant_id,
      invoice.id,
      subscriptionId,
      invoice.amount_due,
      invoice.currency,
      'failed'
    ).run()

    console.log(`[Stripe Webhook] Recorded failed payment for subscription ${subscriptionId}`)

    // TODO: メール通知を送信
    // - 支払い失敗通知
    // - 再試行のお願い
  } catch (error) {
    console.error('[Stripe Webhook] Error recording failed payment:', error)
  }
}

export default stripeWebhook
