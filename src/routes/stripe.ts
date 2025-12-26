import { Hono } from 'hono'
import Stripe from 'stripe'

const app = new Hono()

// --------------------------------------------
// Stripe Checkout セッション作成
// --------------------------------------------
app.post('/checkout', async (c) => {
  try {
    const { plan } = await c.req.json()

    // プランの検証
    if (!['starter', 'pro'].includes(plan)) {
      return c.json({ error: '無効なプランです' }, 400)
    }

    // Stripe インスタンスの初期化（環境変数から）
    const { env } = c
    const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia'
    })

    // 価格IDの取得
    const priceId = plan === 'starter' 
      ? env.STRIPE_PRICE_STARTER 
      : env.STRIPE_PRICE_PRO

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
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
      // プロモーションコード入力を許可
      allow_promotion_codes: true,
      metadata: {
        plan: plan
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

    // イベントタイプに応じた処理
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        console.log('Checkout session completed:', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          plan: session.metadata?.plan
        })

        // TODO: データベースを更新してテナントのプランをアップグレード
        // const { DB } = c.env
        // await DB.prepare(`
        //   UPDATE tenants 
        //   SET plan = ?,
        //       stripe_customer_id = ?,
        //       stripe_subscription_id = ?,
        //       subscription_status = 'active',
        //       subscription_current_period_end = datetime(?, 'unixepoch')
        //   WHERE id = ?
        // `).bind(
        //   session.metadata?.plan,
        //   session.customer,
        //   session.subscription,
        //   session.subscription?.current_period_end,
        //   tenantId
        // ).run()

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        console.log('Subscription updated:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status
        })

        // TODO: サブスクリプション情報を更新

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        console.log('Subscription canceled:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer
        })

        // TODO: プランをFreeにダウングレード

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
