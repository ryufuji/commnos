# 年間一括払い機能（Yearly Billing）

## 📋 概要
サブスクリプションの12ヶ月分を一括で支払い、2ヶ月分お得になる年間プランを追加しました。

---

## 🌟 主な機能

### 1. **月払い/年払いの切り替え**
- プラン選択ページにトグルスイッチを追加
- 切り替えると価格表示が動的に変更

### 2. **価格設定**
- **Starter プラン**:
  - 月払い: ¥980/月
  - 年払い: ¥9,800/年（通常 ¥11,760 → 2ヶ月分お得）
- **Pro プラン**:
  - 月払い: ¥4,980/月
  - 年払い: ¥49,800/年（通常 ¥59,760 → 2ヶ月分お得）

### 3. **Stripe Checkout**
- 選択した期間（monthly/yearly）に応じた価格IDを使用
- metadataにintervalを保存

### 4. **Webhook処理**
- サブスクリプション作成/更新時にbilling_intervalを保存
- Stripeのinterval（month/year）を取得してDBに保存

---

## 🔧 技術仕様

### データベース
```sql
-- migrations/0021_add_yearly_billing.sql

-- tenant_plansテーブルに年間価格カラムを追加
ALTER TABLE tenant_plans ADD COLUMN yearly_price INTEGER;
ALTER TABLE tenant_plans ADD COLUMN stripe_yearly_price_id TEXT;

-- tenant_membershipsテーブルに期間タイプを追加
ALTER TABLE tenant_memberships ADD COLUMN billing_interval TEXT DEFAULT 'month';
```

### Stripe価格ID設定（環境変数）
Cloudflareの環境変数に以下を追加する必要があります：

```bash
# Starterプラン（月払い）
STRIPE_PRICE_STARTER=price_1234567890abcdef

# Starterプラン（年払い）
STRIPE_PRICE_STARTER_YEARLY=price_yearly_1234567890abcdef

# Proプラン（月払い）
STRIPE_PRICE_PRO=price_0987654321fedcba

# Proプラン（年払い）
STRIPE_PRICE_PRO_YEARLY=price_yearly_0987654321fedcba
```

### Stripe価格の作成手順

**1. Stripe Dashboardにログイン**
   - https://dashboard.stripe.com/

**2. Productsページで製品を選択**
   - Starter / Pro それぞれの製品を選択

**3. 年間プランの価格を追加**
   - 「Add pricing model」をクリック
   - Recurring を選択
   - Billing period: Yearly を選択
   - Price: 年間価格を入力（例: ¥9,800）
   - 保存すると価格IDが生成される（例: `price_yearly_xxxxx`）

**4. Cloudflare環境変数に追加**
```bash
# Cloudflareダッシュボードで設定
# Workers & Pages > commons-webapp > Settings > Environment Variables

STRIPE_PRICE_STARTER_YEARLY = price_yearly_xxxxx
STRIPE_PRICE_PRO_YEARLY = price_yearly_yyyyy
```

---

## 🎨 フロントエンド実装

### プラン選択画面（/plans）

#### トグルスイッチ
```html
<div class="flex items-center justify-center gap-3 mt-6">
    <span id="monthlyLabel" class="text-lg font-semibold text-primary-600">月払い</span>
    <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id="billingToggle" class="sr-only peer">
        <div class="w-14 h-7 bg-gray-300 peer-checked:bg-primary-600 ..."></div>
    </label>
    <span id="yearlyLabel" class="text-lg font-semibold text-gray-500">
        年払い<span class="ml-2 text-sm text-success-600 font-bold">2ヶ月分お得</span>
    </span>
</div>
```

#### 価格表示
```html
<span class="text-5xl font-bold text-primary-600 plan-price" 
      data-monthly="980" 
      data-yearly="9800">
    ¥980
</span>
<span class="text-secondary-600 ml-2 plan-interval">/月</span>
```

#### JavaScript切り替え処理
```javascript
let currentInterval = 'month'; // デフォルトは月払い

toggle.addEventListener('change', function() {
    currentInterval = this.checked ? 'year' : 'month';
    
    // 価格表示の切り替え
    priceElements.forEach(el => {
        const price = this.checked ? el.getAttribute('data-yearly') : el.getAttribute('data-monthly');
        el.textContent = '¥' + parseInt(price).toLocaleString();
    });
    
    // 期間表示の切り替え
    intervalElements.forEach(el => {
        el.textContent = this.checked ? '/年' : '/月';
    });
});

// Checkout時に選択された期間を送信
async function handleCheckout(plan) {
    const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ 
            plan: plan,
            interval: currentInterval  // month または year
        })
    });
}
```

---

## 📡 バックエンド実装

### Stripe Checkout API（`src/routes/stripe.ts`）

```typescript
app.post('/checkout', async (c) => {
  const { plan, tenantId, interval } = await c.req.json()

  // 期間の検証
  if (!['month', 'year'].includes(interval)) {
    return c.json({ error: '無効な期間です' }, 400)
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

  // Stripe Checkout セッションの作成
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      plan: plan,
      interval: interval,  // metadataに保存
      tenant_id: tenantId.toString()
    },
    // ...
  })

  return c.json({ url: session.url })
})
```

### Webhook処理（`src/routes/stripe-webhook.ts`）

```typescript
async function handleSubscriptionCreated(
  DB: D1Database,
  subscription: Stripe.Subscription
) {
  // billing_intervalを取得
  const billingInterval = subscription.items.data[0]?.price?.recurring?.interval || 'month'

  await DB.prepare(`
    UPDATE tenant_memberships
    SET 
      expires_at = ?,
      billing_interval = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND tenant_id = ?
  `).bind(currentPeriodEnd, billingInterval, metadata.user_id, metadata.tenant_id).run()
}
```

---

## 🧪 テストシナリオ

### テスト1: 月払いの選択
1. `/plans` にアクセス
2. トグルが「月払い」になっていることを確認
3. Starter: ¥980/月、Pro: ¥4,980/月 を確認
4. 「このプランを選択」をクリック
5. Stripe Checkoutで月額が表示されることを確認

### テスト2: 年払いの選択
1. `/plans` にアクセス
2. トグルを「年払い」に切り替え
3. Starter: ¥9,800/年、Pro: ¥49,800/年 を確認
4. 説明文が「年間¥11,760 → ¥9,800（2ヶ月分お得）」になることを確認
5. 「このプランを選択」をクリック
6. Stripe Checkoutで年額が表示されることを確認

### テスト3: 決済完了後の確認
1. テストカードで決済を完了
2. Webhook経由で `billing_interval` が `year` または `month` で保存されることを確認
3. サブスクリプション管理画面で期間が正しく表示されることを確認

---

## 📁 関連ファイル

### フロントエンド
- `src/index.tsx` - プラン選択画面、トグルUI、JavaScript処理

### バックエンド
- `src/routes/stripe.ts` - Stripe Checkout API（interval対応）
- `src/routes/stripe-webhook.ts` - Webhook処理（billing_interval保存）

### データベース
- `migrations/0021_add_yearly_billing.sql` - DBマイグレーション

---

## 🔗 デプロイ情報

- **本番環境**: https://commons-webapp.pages.dev/
- **最新デプロイ**: https://2897a78e.commons-webapp.pages.dev
- **GitHub**: https://github.com/ryufuji/commnos
- **コミット**: `d036e39`
- **バンドルサイズ**: 994.61 kB

---

## ⚠️ 重要：Stripe価格IDの設定

年間プランを使用するには、Stripe Dashboardで年間価格を作成し、  
Cloudflare環境変数に以下を設定する必要があります：

```
STRIPE_PRICE_STARTER_YEARLY
STRIPE_PRICE_PRO_YEARLY
```

**設定が完了するまで、年払いオプションは動作しません。**

---

## 🎯 今後の改善案

1. **プラン管理画面での表示**  
   サブスクリプション管理画面に「月払い」「年払い」のバッジを表示

2. **年払いから月払いへの変更**  
   プラン変更時に月払い ⇄ 年払いの切り替えをサポート

3. **割引率のカスタマイズ**  
   管理者が割引率を設定できる機能

4. **年払いユーザーへの特典**  
   年払いユーザーに追加機能やストレージを提供

---

## ✅ 完了
- ✅ データベースマイグレーション（tenant_plans, tenant_memberships）
- ✅ フロントエンド: 月払い/年払いトグルUI実装
- ✅ Stripe Checkout: interval対応
- ✅ Webhook: billing_interval保存
- ✅ 価格設定: 年間10ヶ月分（2ヶ月分お得）
- ✅ 本番環境デプロイ

---

**最終更新**: 2026-01-09  
**バージョン**: Phase 4（年間一括払い機能）
