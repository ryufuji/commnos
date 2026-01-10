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
  
  // billing_intervalを取得（デフォルトはmonth）
  const billingInterval = subscription.items.data[0]?.price?.recurring?.interval || 'month'

  try {
    await DB.prepare(`
      UPDATE tenant_memberships
      SET 
        expires_at = ?,
        billing_interval = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(currentPeriodEnd, billingInterval, metadata.user_id, metadata.tenant_id).run()

    console.log(`[Stripe Webhook] Set expiration for user ${metadata.user_id} to ${currentPeriodEnd}, interval: ${billingInterval}`)
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
  const billingInterval = subscription.items.data[0]?.price?.recurring?.interval || 'month'

  try {
    await DB.prepare(`
      UPDATE tenant_memberships
      SET 
        expires_at = ?,
        status = ?,
        billing_interval = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(currentPeriodEnd, status, billingInterval, metadata.user_id, metadata.tenant_id).run()

    console.log(`[Stripe Webhook] Updated subscription for user ${metadata.user_id}, status: ${status}, interval: ${billingInterval}`)
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

    // 関連する支払いリマインダーを解決
    await resolvePaymentReminder(DB, subscriptionId, invoice.id)
  } catch (error) {
    console.error('[Stripe Webhook] Error recording payment:', error)
  }
}

/**
 * 支払いリマインダーを解決
 */
async function resolvePaymentReminder(
  DB: D1Database,
  subscriptionId: string,
  invoiceId: string
) {
  try {
    await DB.prepare(`
      UPDATE payment_reminders
      SET status = 'resolved', resolved_at = datetime('now'), updated_at = datetime('now')
      WHERE subscription_id = ? AND invoice_id = ? AND status IN ('pending', 'sent')
    `).bind(subscriptionId, invoiceId).run()

    console.log(`[Stripe Webhook] Resolved payment reminder for invoice ${invoiceId}`)
  } catch (error) {
    console.error('[Stripe Webhook] Error resolving payment reminder:', error)
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

    // オーナーと管理者に通知を送信
    await notifyAdminsPaymentFailed(
      DB,
      (membership as any).tenant_id,
      (membership as any).user_id,
      invoice.amount_due,
      invoice.currency
    )

    // 支払いリマインダーを作成
    await createPaymentReminder(
      DB,
      (membership as any).tenant_id,
      (membership as any).user_id,
      subscriptionId,
      invoice.id,
      invoice.amount_due,
      invoice.currency
    )
  } catch (error) {
    console.error('[Stripe Webhook] Error recording failed payment:', error)
  }
}

/**
 * 支払い失敗時にオーナーと管理者に通知
 */
async function notifyAdminsPaymentFailed(
  DB: D1Database,
  tenantId: number,
  userId: number,
  amount: number,
  currency: string
) {
  try {
    // 失敗したユーザーの情報を取得
    const user = await DB.prepare(`
      SELECT nickname, email FROM users WHERE id = ?
    `).bind(userId).first() as any

    if (!user) return

    // オーナーと管理者を取得
    const admins = await DB.prepare(`
      SELECT user_id FROM tenant_memberships
      WHERE tenant_id = ? AND role IN ('owner', 'admin') AND status = 'active'
    `).bind(tenantId).all()

    if (!admins.results || admins.results.length === 0) return

    // 金額をフォーマット
    const formattedAmount = (amount / 100).toLocaleString('ja-JP')
    const currencySymbol = currency.toUpperCase() === 'JPY' ? '¥' : '$'

    // 各管理者に通知を作成
    for (const admin of admins.results) {
      await DB.prepare(`
        INSERT INTO notifications (
          tenant_id,
          user_id,
          actor_id,
          type,
          target_type,
          target_id,
          message
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        tenantId,
        (admin as any).user_id,
        userId,
        'payment_failed',
        'subscription',
        userId,
        `【支払い失敗】${user.nickname}さんのサブスクリプション決済（${currencySymbol}${formattedAmount}）が失敗しました。`
      ).run()
    }

    console.log(`[Stripe Webhook] Notified admins about payment failure for user ${userId}`)
  } catch (error) {
    console.error('[Stripe Webhook] Error notifying admins:', error)
  }
}

/**
 * 支払いリマインダーを作成
 */
async function createPaymentReminder(
  DB: D1Database,
  tenantId: number,
  userId: number,
  subscriptionId: string,
  invoiceId: string,
  amount: number,
  currency: string
) {
  try {
    // 既存のリマインダーを確認
    const existingReminder = await DB.prepare(`
      SELECT id FROM payment_reminders
      WHERE subscription_id = ? AND invoice_id = ? AND status IN ('pending', 'sent')
    `).bind(subscriptionId, invoiceId).first()

    if (existingReminder) {
      console.log(`[Stripe Webhook] Payment reminder already exists for invoice ${invoiceId}`)
      return
    }

    // 次回リマインダー送信日時を設定（3日後）
    const nextReminderDate = new Date()
    nextReminderDate.setDate(nextReminderDate.getDate() + 3)

    // リマインダーを作成
    await DB.prepare(`
      INSERT INTO payment_reminders (
        tenant_id,
        user_id,
        subscription_id,
        invoice_id,
        amount,
        currency,
        status,
        reminder_count,
        next_reminder_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      userId,
      subscriptionId,
      invoiceId,
      amount,
      currency,
      'pending',
      0,
      nextReminderDate.toISOString()
    ).run()

    console.log(`[Stripe Webhook] Created payment reminder for user ${userId}, invoice ${invoiceId}`)
  } catch (error) {
    console.error('[Stripe Webhook] Error creating payment reminder:', error)
  }
}

export default stripeWebhook
