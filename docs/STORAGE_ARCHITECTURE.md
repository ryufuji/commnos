# ストレージ・課金アーキテクチャ整理（2フェーズモデル）

## 📋 エグゼクティブサマリー

このドキュメントは、Commonsプラットフォームにおける「**2フェーズの課金・ストレージモデル**」を整理し、現状把握と実装方針を明確にします。

---

## 🎯 2フェーズモデルの全体像

### フェーズ1: プラットフォームレイヤー（B2B）
**VALUE ARCHITECTS（サービス運営者） ⇄ コミュニティ運営者（オーナー）**

- **提供するもの**: プラットフォームの利用権、インフラリソース
- **課金対象**: コミュニティ運営者
- **課金基準**: ストレージ容量、メンバー数上限、プラットフォーム利用料
- **収益モデル**: 月額固定料金 + メンバー収益の手数料（20%）

### フェーズ2: コミュニティレイヤー（B2C）
**コミュニティ運営者（オーナー） ⇄ 一般会員（メンバー）**

- **提供するもの**: コンテンツ、コミュニティ体験、特典
- **課金対象**: 一般会員
- **課金基準**: プランごとの機能・コンテンツアクセス権
- **収益モデル**: 月額サブスクリプション（コミュニティ運営者が80%を受け取る）

---

## 📊 現状の実装状況

### ✅ 既に実装済みの機能

#### 1. テナント（コミュニティ）基本情報
**テーブル**: `tenants`

```sql
CREATE TABLE tenants (
  id INTEGER PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',        -- プラットフォームプラン
  storage_used INTEGER DEFAULT 0,           -- 使用中のストレージ（バイト）
  storage_limit INTEGER DEFAULT 1073741824, -- ストレージ上限（1GB）
  member_count INTEGER DEFAULT 0,           -- 現在のメンバー数
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  subscription_current_period_start DATETIME,
  subscription_cancel_at DATETIME,
  ...
);
```

#### 2. 収益管理
**テーブル**: `tenant_earnings`

```sql
CREATE TABLE tenant_earnings (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  balance INTEGER DEFAULT 0,                 -- 現在の残高（円）
  total_earned INTEGER DEFAULT 0,            -- 累計収益（円）
  total_paid_out INTEGER DEFAULT 0,          -- 累計支払額（円）
  platform_fee_rate INTEGER DEFAULT 20,      -- プラットフォーム手数料率（%）
  minimum_payout INTEGER DEFAULT 10000,      -- 最小出金額（円）
  stripe_connect_account_id TEXT,            -- Stripe Connect アカウントID
  ...
);
```

#### 3. メンバー向けプラン
**テーブル**: `tenant_plans`（修正予定）

```sql
CREATE TABLE tenant_plans (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,                    -- 例: 「ベーシック」「プレミアム」
  description TEXT,
  price INTEGER NOT NULL,                -- 月額料金（円）
  features TEXT,                         -- 機能リスト（JSON）
  stripe_price_id TEXT,
  is_active INTEGER DEFAULT 1,
  ...
);
```

#### 4. プラットフォーム管理者
**テーブル**: `platform_admins`

```sql
CREATE TABLE platform_admins (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  ...
);
```

### ⚠️ 問題点

1. **プラットフォームプランが定義されていない**
   - 現在、`tenants.plan` には `'free'`, `'starter'`, `'pro'` といった文字列が入っているが、プラン定義テーブルが存在しない
   - ストレージ上限、メンバー数上限、手数料率などが固定値で、柔軟に管理できない

2. **tenant_plans テーブルの設計が誤り**
   - `storage_limit` と `member_limit` が含まれているが、これらは**テナント全体**の制限であり、個々のメンバープランには関係ない
   - 混乱を招く設計になっている

3. **手数料率の管理が不明確**
   - `tenant_earnings.platform_fee_rate` はテナントごとに設定できるが、プラットフォームプランとの連携がない

---

## 🎯 あるべき実装

### 1. プラットフォームプラン（フェーズ1）の定義

#### 新規テーブル: `platform_plans`

```sql
CREATE TABLE IF NOT EXISTS platform_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                       -- 例: 'Starter', 'Growth', 'Enterprise'
  display_name TEXT NOT NULL,               -- 例: 'スターター', '成長', 'エンタープライズ'
  price INTEGER NOT NULL,                   -- 月額料金（円）
  member_limit INTEGER NOT NULL,            -- メンバー数上限（例: 100, 500, -1=無制限）
  storage_limit_gb INTEGER NOT NULL,        -- ストレージ上限（GB）
  platform_fee_rate INTEGER NOT NULL DEFAULT 20,  -- プラットフォーム手数料率（%）
  features TEXT,                            -- 機能リスト（JSON）
  description TEXT,                         -- プラン説明
  is_active INTEGER DEFAULT 1,              -- 有効/無効
  sort_order INTEGER DEFAULT 0,             -- 表示順序
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ挿入
INSERT INTO platform_plans (name, display_name, price, member_limit, storage_limit_gb, platform_fee_rate, features) VALUES
  ('free', 'フリー', 0, 50, 1, 20, '{"posts": 10, "storage": "1GB", "support": "コミュニティ"}'),
  ('starter', 'スターター', 3000, 100, 5, 20, '{"posts": "無制限", "storage": "5GB", "support": "メール"}'),
  ('growth', '成長', 10000, 500, 50, 20, '{"posts": "無制限", "storage": "50GB", "support": "優先対応"}'),
  ('enterprise', 'エンタープライズ', 30000, -1, 500, 15, '{"posts": "無制限", "storage": "500GB", "support": "専任担当"}');
```

#### `tenants` テーブルの修正

```sql
-- plan カラムを platform_plan_id に変更
ALTER TABLE tenants ADD COLUMN platform_plan_id INTEGER REFERENCES platform_plans(id);

-- 既存の plan データを platform_plan_id に移行
UPDATE tenants SET platform_plan_id = 1 WHERE plan = 'free';
UPDATE tenants SET platform_plan_id = 2 WHERE plan = 'starter';
UPDATE tenants SET platform_plan_id = 3 WHERE plan = 'pro';

-- 古い plan カラムを削除（SQLiteはALTER TABLE DROP COLUMNが非対応なので、テーブル再作成が必要）
```

### 2. メンバー向けプラン（フェーズ2）の修正

#### `tenant_plans` テーブルからストレージ・メンバー上限を削除

すでに作成した `0014_fix_tenant_plans_schema.sql` を適用：

```sql
CREATE TABLE IF NOT EXISTS tenant_plans_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,                    -- プラン名（例: 「ベーシック」、「プレミアム」）
  description TEXT,                      -- プラン説明
  price INTEGER NOT NULL,                -- 月額料金（円）
  features TEXT,                         -- 機能リスト（JSON）- メンバー向け特典
  is_active INTEGER DEFAULT 1,           -- 有効/無効
  stripe_price_id TEXT,                  -- Stripe Price ID
  stripe_product_id TEXT,                -- Stripe Product ID
  sort_order INTEGER DEFAULT 0,          -- 表示順序
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

### 3. 権限とUI/UXの整理

#### プラットフォーム管理者（VALUE ARCHITECTS）

**アクセス可能な画面:**
- プラットフォームプラン管理（`/platform/plans`）
- 全テナント一覧（`/platform/tenants`）
- 収益ダッシュボード（`/platform/revenue`）
- システム設定（`/platform/settings`）

**機能:**
- プラットフォームプランの作成・編集・削除
- テナントの課金状況確認
- 全体の収益分析

#### コミュニティ運営者（オーナー）

**アクセス可能な画面:**
- ダッシュボード（`/dashboard`）
- プラン管理（`/tenant/plans`）- **メンバー向けプラン**
- サブスク管理（現在のプラットフォームプラン確認・変更）
- 収益ダッシュボード（メンバーからの収益確認）

**機能:**
- メンバー向けプランの作成・編集・削除
- プラットフォームプランのアップグレード・ダウングレード
- 自分のテナントの収益確認

#### 一般会員（メンバー）

**アクセス可能な画面:**
- テナントホーム（`/tenant/home?subdomain=xxx`）
- サブスクリプション管理（`/tenant/subscription?subdomain=xxx`）

**機能:**
- メンバー向けプランの選択・変更
- 支払い履歴の確認

---

## 💳 クーポンシステム

### クーポン機能の概要

コミュニティ管理者が特別なクーポンコードを入力することで、月額費用を免除または割引できる機能です。

#### クーポンの種類

1. **free_forever**: 永久無料（月額費用が永久に0円）
   - 例: パートナー企業向け特別クーポン
   
2. **free_months**: N ヶ月間無料
   - 例: 6ヶ月間無料キャンペーン
   
3. **percent_off**: N% 割引
   - 例: 50% 割引クーポン
   
4. **amount_off**: N円 割引
   - 例: 1,000円 割引クーポン

#### クーポンの適用方法

1. **新規登録時**: 登録フォームでクーポンコードを入力
2. **既存テナント**: ダッシュボードの「クーポン管理」セクションから適用

#### クーポン管理

- **プラットフォーム管理者**: `/platform/coupons` で全クーポンの作成・管理
- **コミュニティ管理者**: ダッシュボードでクーポンの適用・削除

詳細は [`docs/COUPON_UI_GUIDE.md`](/docs/COUPON_UI_GUIDE.md) を参照してください。

---

## 🛠️ 実装手順

### ステップ1: プラットフォームプランテーブルの作成

```bash
# 新規マイグレーションファイル作成
cd /home/user/webapp
cat > migrations/0015_add_platform_plans.sql << 'EOF'
-- プラットフォームプラン定義テーブル
CREATE TABLE IF NOT EXISTS platform_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  member_limit INTEGER NOT NULL,
  storage_limit_gb INTEGER NOT NULL,
  platform_fee_rate INTEGER NOT NULL DEFAULT 20,
  features TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platform_plans_active ON platform_plans(is_active);
CREATE INDEX idx_platform_plans_name ON platform_plans(name);

-- 初期プランデータ
INSERT INTO platform_plans (name, display_name, price, member_limit, storage_limit_gb, platform_fee_rate, features, description, sort_order) VALUES
  ('free', 'フリー', 0, 50, 1, 20, '{"posts": 10, "storage": "1GB", "support": "コミュニティ", "analytics": false}', '個人・小規模コミュニティ向けの無料プラン', 1),
  ('starter', 'スターター', 3000, 100, 5, 20, '{"posts": "無制限", "storage": "5GB", "support": "メール", "analytics": true}', '成長中のコミュニティ向けプラン', 2),
  ('growth', '成長', 10000, 500, 50, 20, '{"posts": "無制限", "storage": "50GB", "support": "優先対応", "analytics": true, "custom_domain": true}', '中規模コミュニティ向けプラン', 3),
  ('enterprise', 'エンタープライズ', 30000, -1, 500, 15, '{"posts": "無制限", "storage": "500GB", "support": "専任担当", "analytics": true, "custom_domain": true, "sla": true}', '大規模コミュニティ・企業向けプラン', 4);

-- tenants テーブルに platform_plan_id カラムを追加
ALTER TABLE tenants ADD COLUMN platform_plan_id INTEGER REFERENCES platform_plans(id);

-- 既存データの移行
UPDATE tenants SET platform_plan_id = (SELECT id FROM platform_plans WHERE name = 'free') WHERE plan = 'free';
UPDATE tenants SET platform_plan_id = (SELECT id FROM platform_plans WHERE name = 'starter') WHERE plan = 'starter';
UPDATE tenants SET platform_plan_id = (SELECT id FROM platform_plans WHERE name = 'growth') WHERE plan = 'pro';

-- デフォルト値設定（nullの場合はfreeに）
UPDATE tenants SET platform_plan_id = (SELECT id FROM platform_plans WHERE name = 'free') WHERE platform_plan_id IS NULL;

CREATE INDEX idx_tenants_platform_plan ON tenants(platform_plan_id);
EOF

# ローカル適用
npx wrangler d1 migrations apply commons-webapp-production --local
```

### ステップ2: tenant_plans テーブルの修正

```bash
# すでに作成済みのマイグレーションを適用
npx wrangler d1 migrations apply commons-webapp-production --local
```

### ステップ3: API実装

#### プラットフォーム管理者向けAPI（`/api/platform/*`）

```typescript
// src/routes/platform.ts

import { Hono } from 'hono';
import type { CloudflareBindings } from '../types';

const platform = new Hono<{ Bindings: CloudflareBindings }>();

// プラットフォームプラン一覧
platform.get('/plans', async (c) => {
  const { DB } = c.env;
  
  const plans = await DB.prepare(`
    SELECT * FROM platform_plans
    WHERE is_active = 1
    ORDER BY sort_order ASC
  `).all();
  
  return c.json({ success: true, plans: plans.results });
});

// プラットフォームプラン作成（管理者のみ）
platform.post('/plans', async (c) => {
  const { DB } = c.env;
  const { name, display_name, price, member_limit, storage_limit_gb, platform_fee_rate, features, description } = await c.req.json();
  
  // 認証チェック（platform_admins）
  // TODO: JWT検証
  
  const result = await DB.prepare(`
    INSERT INTO platform_plans (name, display_name, price, member_limit, storage_limit_gb, platform_fee_rate, features, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(name, display_name, price, member_limit, storage_limit_gb, platform_fee_rate, JSON.stringify(features), description).run();
  
  return c.json({ success: true, id: result.meta.last_row_id });
});

// 全テナント一覧（管理者のみ）
platform.get('/tenants', async (c) => {
  const { DB } = c.env;
  
  const tenants = await DB.prepare(`
    SELECT 
      t.*,
      p.display_name as plan_name,
      p.price as plan_price,
      e.balance as current_balance,
      e.total_earned
    FROM tenants t
    LEFT JOIN platform_plans p ON t.platform_plan_id = p.id
    LEFT JOIN tenant_earnings e ON t.id = e.tenant_id
    ORDER BY t.created_at DESC
  `).all();
  
  return c.json({ success: true, tenants: tenants.results });
});

export { platform };
```

#### コミュニティ運営者向けAPI（`/api/subscription/*`）

```typescript
// src/routes/subscription.ts

// プラットフォームプラン変更
app.post('/change-platform-plan', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const { plan_name } = await c.req.json();
  
  // オーナーかどうか確認
  const user = await DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(userId).first();
  const tenant = await DB.prepare(`SELECT * FROM tenants WHERE owner_user_id = ?`).bind(userId).first();
  
  if (!tenant) {
    return c.json({ success: false, message: 'テナントが見つかりません' }, 404);
  }
  
  // プラットフォームプラン取得
  const plan = await DB.prepare(`SELECT * FROM platform_plans WHERE name = ? AND is_active = 1`).bind(plan_name).first();
  
  if (!plan) {
    return c.json({ success: false, message: 'プランが見つかりません' }, 404);
  }
  
  // Stripe Checkout Session作成
  // TODO: Stripe API統合
  
  return c.json({ success: true, checkout_url: 'https://checkout.stripe.com/...' });
});
```

### ステップ4: UI実装

#### プラットフォーム管理者ダッシュボード（`/platform/dashboard`）

- 全テナント数
- 総収益（プラットフォーム手数料）
- アクティブユーザー数
- プラン別テナント数のグラフ

#### コミュニティ運営者のサブスク管理画面（修正）

現在の `/tenant/subscription` を2つに分割：

1. **プラットフォームプラン管理** (`/subscription/platform`)
   - 現在のプラン表示
   - プランアップグレード・ダウングレード
   - 使用状況（ストレージ、メンバー数）

2. **メンバー向けプラン管理** (`/tenant/plans`)
   - すでに実装済み

---

## 💰 収益フロー

### フェーズ1: VALUE ARCHITECTS の収益

```
コミュニティ運営者の支払い（月額）
  ├─ プラットフォーム利用料（固定）: ¥3,000 - ¥30,000
  └─ メンバー収益の手数料（変動）: メンバー収益 × 20%

例:
  スタータープラン: ¥3,000/月
  + メンバー10人 × ¥980 = ¥9,800
  + 手数料: ¥9,800 × 20% = ¥1,960
  = 合計: ¥4,960
```

### フェーズ2: コミュニティ運営者の収益

```
メンバーの支払い（月額）
  └─ プラン料金: ¥980 - ¥2,980

手数料控除後の収益:
  メンバー10人 × ¥980 × 80% = ¥7,840/月
```

---

## 📈 実装優先度

### 🔴 High Priority（今すぐ実施）

1. ✅ `tenant_plans` テーブルからストレージ・メンバー上限を削除（マイグレーション作成済み）
2. ⏳ `platform_plans` テーブルの作成とマイグレーション
3. ⏳ `tenants.platform_plan_id` の追加
4. ⏳ `/tenant/plans` の権限チェック（オーナーのみアクセス可能）

### 🟡 Medium Priority（次のフェーズ）

5. ⏳ プラットフォーム管理者ダッシュボード（`/platform/dashboard`）
6. ⏳ プラットフォームプラン管理画面（`/platform/plans`）
7. ⏳ コミュニティ運営者のプラットフォームプラン変更画面

### 🟢 Low Priority（将来的に）

8. ⏳ Stripe Connect統合（収益の自動振込）
9. ⏳ 詳細な分析ダッシュボード
10. ⏳ 使用量アラート（ストレージ・メンバー数上限に近づいたら通知）

---

## 🎯 まとめ

### 現状の問題点

1. **プラットフォームプランが未定義**
2. **tenant_plansにストレージ・メンバー上限が誤って含まれている**
3. **2つのレイヤーが混在していて区別が曖昧**

### あるべき姿

1. **プラットフォームプラン（フェーズ1）を明確に定義**
   - `platform_plans` テーブル
   - ストレージ上限、メンバー数上限、手数料率を管理

2. **メンバー向けプラン（フェーズ2）をシンプルに**
   - `tenant_plans` テーブルからストレージ・メンバー上限を削除
   - コンテンツアクセス権限のみを管理

3. **UIを2つのレイヤーで明確に分離**
   - プラットフォーム管理者: `/platform/*`
   - コミュニティ運営者: `/dashboard`, `/tenant/plans`
   - 一般会員: `/tenant/home`, `/tenant/subscription`

---

## 次のアクション

1. **マイグレーション実行**
   ```bash
   npx wrangler d1 migrations apply commons-webapp-production --local
   npx wrangler d1 migrations apply commons-webapp-production --remote
   ```

2. **API実装**
   - `/api/platform/*` の実装
   - `/api/subscription/*` の修正

3. **UI実装**
   - プラットフォーム管理者ダッシュボード
   - コミュニティ運営者のプラン変更画面

---

**最終更新**: 2025-01-07  
**ドキュメント作成者**: AI Assistant  
**対象プロジェクト**: Commons（commons-webapp）
