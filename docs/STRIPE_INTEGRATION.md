# Stripe決済統合ガイド

## 概要

Commonsプラットフォームでは、一般会員がコミュニティのプランを選択する際にStripe決済を統合しています。

## アーキテクチャ

### フロー

```
1. 一般会員がプランを選択
   ↓
2. POST /api/tenant/member/change-plan
   ↓
3. Stripe Checkout Session作成
   ↓
4. 会員をStripe Checkoutページにリダイレクト
   ↓
5. 会員が決済情報を入力して支払い
   ↓
6. Stripe Webhook (checkout.session.completed)
   ↓
7. tenant_memberships テーブルを更新
   - plan_id
   - stripe_customer_id
   - stripe_subscription_id
   - status = 'active'
   ↓
8. 成功ページにリダイレクト
```

### データフロー

```sql
-- 決済前
tenant_memberships:
  user_id: 1
  tenant_id: 1
  plan_id: NULL
  status: 'active'
  stripe_customer_id: NULL
  stripe_subscription_id: NULL

-- 決済後（Webhook処理）
tenant_memberships:
  user_id: 1
  tenant_id: 1
  plan_id: 2                          -- 選択したプランID
  status: 'active'
  stripe_customer_id: 'cus_xxx'       -- Stripeカスタマー ID
  stripe_subscription_id: 'sub_xxx'   -- Stripeサブスクリプション ID
  expires_at: '2025-02-07'            -- 次回更新日
```

## エンドポイント

### 1. プラン変更 (Stripe Checkout)

**エンドポイント**: `POST /api/tenant/member/change-plan`

**リクエスト**:
```json
{
  "subdomain": "test",
  "plan_id": 2
}
```

**レスポンス（新規サブスクリプション）**:
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/c/pay/...",
  "session_id": "cs_test_...",
  "message": "Stripe Checkoutにリダイレクトします"
}
```

**レスポンス（既存サブスクリプション変更）**:
```json
{
  "success": true,
  "redirect_url": "https://billing.stripe.com/p/...",
  "is_portal": true,
  "message": "サブスクリプション管理ポータルにリダイレクトします"
}
```

### 2. Stripe Webhook

**エンドポイント**: `POST /api/stripe/webhook`

**対応イベント**:
- `checkout.session.completed` - 決済完了
- `customer.subscription.created` - サブスクリプション作成
- `customer.subscription.updated` - サブスクリプション更新
- `customer.subscription.deleted` - サブスクリプションキャンセル
- `invoice.payment_succeeded` - 支払い成功
- `invoice.payment_failed` - 支払い失敗

## 環境変数

### 必須

```bash
# Stripe Secret Key
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_...

# Platform Domain
PLATFORM_DOMAIN=https://commons-webapp.pages.dev
```

### Cloudflare Pages Secrets設定

```bash
# ローカル開発用（.dev.vars）
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PLATFORM_DOMAIN=http://localhost:3000

# 本番環境用
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name commons-webapp
npx wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name commons-webapp
npx wrangler pages secret put PLATFORM_DOMAIN --project-name commons-webapp
```

## Webhook設定

### Stripe ダッシュボードでの設定

1. https://dashboard.stripe.com/webhooks にアクセス
2. 「エンドポイントを追加」をクリック
3. エンドポイントURL: `https://commons-webapp.pages.dev/api/stripe/webhook`
4. 以下のイベントを選択:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. 署名シークレットをコピーして `STRIPE_WEBHOOK_SECRET` に設定

## テスト

### ローカル環境でのテスト

1. Stripe CLIをインストール:
```bash
brew install stripe/stripe-cli/stripe
```

2. Stripe CLIでログイン:
```bash
stripe login
```

3. Webhookをローカルにフォワード:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

4. テスト決済を実行:
```bash
stripe trigger checkout.session.completed
```

### 本番環境でのテスト

1. Stripeダッシュボードでテストモードに切り替え
2. テストカード情報を使用:
   - カード番号: `4242 4242 4242 4242`
   - 有効期限: 任意の未来の日付
   - CVC: 任意の3桁
   - 郵便番号: 任意

## トラブルシューティング

### Webhook署名検証エラー

```
Error: No signatures found matching the expected signature for payload
```

**解決方法**:
- `STRIPE_WEBHOOK_SECRET` が正しく設定されているか確認
- Stripeダッシュボードで署名シークレットを確認
- Webhook URLが正しいか確認

### メタデータが見つからないエラー

```
[Stripe Webhook] Missing required metadata
```

**解決方法**:
- Checkout Session作成時に `metadata` が正しく設定されているか確認
- `user_id`, `tenant_id`, `plan_id` がすべて含まれているか確認

## プラン変更の流れ（実際のユースケース）

### シナリオ1: 無料会員から有料プランへ

1. 会員が `/tenant/member-plans?subdomain=test` にアクセス
2. 「プレミアム」プラン（¥2,980/月）を選択
3. 確認モーダルで「確定」をクリック
4. Stripe Checkoutページにリダイレクト
5. カード情報を入力して支払い
6. Webhook処理でプラン適用
7. 成功ページにリダイレクト
8. 「決済が完了しました！」メッセージ表示

### シナリオ2: 既存プランから別プランへの変更

1. 会員が `/tenant/member-plans?subdomain=test` にアクセス
2. 現在のプラン「ベーシック」が表示される
3. 「プレミアム」プランを選択
4. Stripe Customer Portalにリダイレクト
5. プラン変更を確認
6. Webhook処理でプラン更新
7. 元のページにリダイレクト

## 決済履歴の記録

すべての決済は `payment_history` テーブルに記録されます：

```sql
CREATE TABLE payment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  stripe_invoice_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'paid', 'failed'
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 今後の実装予定

- [ ] メール通知（決済完了、失敗、キャンセル）
- [ ] 領収書自動送信
- [ ] プラン変更時のprorating処理
- [ ] サブスクリプション一時停止機能
- [ ] 決済履歴ページのUI実装
