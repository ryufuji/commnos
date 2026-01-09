import { Hono } from 'hono'
import Stripe from 'stripe'

const app = new Hono()

// --------------------------------------------
// Stripe Checkout セッション作成
// --------------------------------------------
app.post('/checkout', async (c) => {
  try {
    const { plan, tenantId, interval } = await c.req.json()

    // プランの検証
    if (!['starter', 'pro'].includes(plan)) {
      return c.json({ error: '無効なプランです' }, 400)
    }

    // 期間の検証
    if (!['month', 'year'].includes(interval)) {
      return c.json({ error: '無効な期間です' }, 400)
    }

    // テナントIDの検証
    if (!tenantId) {
      return c.json({ error: 'テナントIDが必要です' }, 400)
    }

    // Stripe インスタンスの初期化（環境変数から）
    const { env } = c
    const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia'
    })

    // テナント情報を取得
    const tenant = await env.DB
      .prepare('SELECT * FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<any>()

    if (!tenant) {
      return c.json({ error: 'テナントが見つかりません' }, 404)
    }

    // 価格IDの取得（月払い/年払いに応じて）
    let priceId: string | undefined
    
    if (interval === 'month') {
      priceId = plan === 'starter' 
        ? env.STRIPE_PRICE_STARTER 
        : env.STRIPE_PRICE_PRO
    } else {
      priceId = plan === 'starter' 
        ? env.STRIPE_PRICE_STARTER_YEARLY 
        : env.STRIPE_PRICE_PRO_YEARLY
    }

    if (!priceId) {
      return c.json({ error: 'プラン設定が見つかりません' }, 500)
    }

    // ベースURLの取得（開発環境 vs 本番環境）
    const baseUrl = env.PLATFORM_DOMAIN === 'commons.com'
      ? `https://${c.req.header('host')}`
      : `http://${c.req.header('host')}`

    // Stripe Checkout セッションの作成
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: tenant.stripe_customer_id || undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${baseUrl}/tenant/subscription/success?session_id={CHECKOUT_SESSION_ID}&subdomain=${tenant.subdomain}`,
      cancel_url: `${baseUrl}/tenant/subscription?subdomain=${tenant.subdomain}`,
      // プロモーションコード入力を許可
      allow_promotion_codes: true,
      metadata: {
        plan: plan,
        interval: interval,
        tenant_id: tenantId.toString()
      },
      // 請求情報の収集
      billing_address_collection: 'auto',
      // 日本語のロケール設定
      locale: 'ja'
    })

    return c.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout session error:', error)
    return c.json({ error: error.message || 'チェックアウトセッションの作成に失敗しました' }, 500)
  }
})

// --------------------------------------------
// Stripe Webhook
// --------------------------------------------
app.post('/webhook', async (c) => {
  try {
    const { env } = c
    const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia'
    })

    const body = await c.req.text()
    const sig = c.req.header('stripe-signature')

    if (!sig) {
      return c.json({ error: 'Stripe signature missing' }, 400)
    }

    const webhookSecret = env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      return c.json({ error: 'Webhook secret not configured' }, 500)
    }

    // Stripe イベントの検証
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)

    console.log('[Stripe Webhook]', event.type)

    // イベントタイプに応じた処理
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        console.log('Checkout session completed:', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          plan: session.metadata?.plan,
          tenantId: session.metadata?.tenant_id
        })

        const tenantId = parseInt(session.metadata?.tenant_id || '0')
        if (!tenantId) {
          console.error('Tenant ID not found in session metadata')
          break
        }

        // サブスクリプション情報を取得
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

        // データベースを更新してテナントのプランをアップグレード
        await env.DB.prepare(`
          UPDATE tenants 
          SET plan = ?,
              stripe_customer_id = ?,
              stripe_subscription_id = ?,
              subscription_status = 'active',
              subscription_current_period_start = datetime(?, 'unixepoch'),
              subscription_current_period_end = datetime(?, 'unixepoch'),
              subscription_updated_at = datetime('now')
          WHERE id = ?
        `).bind(
          session.metadata?.plan || 'starter',
          session.customer as string,
          session.subscription as string,
          subscription.current_period_start,
          subscription.current_period_end,
          tenantId
        ).run()

        console.log(`Tenant ${tenantId} upgraded to ${session.metadata?.plan}`)

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        console.log('Subscription updated:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status
        })

        // サブスクリプションIDからテナントを検索
        const tenant = await env.DB
          .prepare('SELECT id FROM tenants WHERE stripe_subscription_id = ?')
          .bind(subscription.id)
          .first<{ id: number }>()

        if (!tenant) {
          console.error('Tenant not found for subscription:', subscription.id)
          break
        }

        // サブスクリプション情報を更新
        await env.DB.prepare(`
          UPDATE tenants
          SET subscription_status = ?,
              subscription_current_period_start = datetime(?, 'unixepoch'),
              subscription_current_period_end = datetime(?, 'unixepoch'),
              subscription_cancel_at = ?,
              subscription_updated_at = datetime('now')
          WHERE id = ?
        `).bind(
          subscription.status,
          subscription.current_period_start,
          subscription.current_period_end,
          subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
          tenant.id
        ).run()

        console.log(`Tenant ${tenant.id} subscription updated to status: ${subscription.status}`)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        console.log('Subscription canceled:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer
        })

        // サブスクリプションIDからテナントを検索
        const tenant = await env.DB
          .prepare('SELECT id FROM tenants WHERE stripe_subscription_id = ?')
          .bind(subscription.id)
          .first<{ id: number }>()

        if (!tenant) {
          console.error('Tenant not found for subscription:', subscription.id)
          break
        }

        // プランをFreeにダウングレード
        await env.DB.prepare(`
          UPDATE tenants
          SET plan = 'free',
              subscription_status = 'canceled',
              subscription_cancel_at = datetime('now'),
              subscription_updated_at = datetime('now')
          WHERE id = ?
        `).bind(tenant.id).run()

        console.log(`Tenant ${tenant.id} downgraded to free plan`)

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        console.log('Payment failed:', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription
        })

        // サブスクリプションIDからテナントを検索
        const tenant = await env.DB
          .prepare('SELECT id FROM tenants WHERE stripe_subscription_id = ?')
          .bind(invoice.subscription as string)
          .first<{ id: number }>()

        if (!tenant) {
          console.error('Tenant not found for subscription:', invoice.subscription)
          break
        }

        // ステータスを past_due に更新
        await env.DB.prepare(`
          UPDATE tenants
          SET subscription_status = 'past_due',
              subscription_updated_at = datetime('now')
          WHERE id = ?
        `).bind(tenant.id).run()

        console.log(`Tenant ${tenant.id} payment failed - status set to past_due`)

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        console.log('Payment succeeded:', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription
        })

        // サブスクリプションIDからテナントを検索
        const tenant = await env.DB
          .prepare('SELECT id FROM tenants WHERE stripe_subscription_id = ?')
          .bind(invoice.subscription as string)
          .first<{ id: number }>()

        if (!tenant) {
          console.error('Tenant not found for subscription:', invoice.subscription)
          break
        }

        // ステータスを active に更新
        await env.DB.prepare(`
          UPDATE tenants
          SET subscription_status = 'active',
              subscription_updated_at = datetime('now')
          WHERE id = ?
        `).bind(tenant.id).run()

        console.log(`Tenant ${tenant.id} payment succeeded - status set to active`)

        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return c.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return c.json({ error: error.message }, 400)
  }
})

export default app
