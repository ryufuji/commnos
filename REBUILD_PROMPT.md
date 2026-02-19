# Commons プラットフォーム 再構築プロンプト

このプロンプトをClaude Codeに渡すことで、Commonsプラットフォーム全体を再構築できます。

---

## 🎯 プロジェクト概要

**プロジェクト名**: Commons - マルチテナント型コミュニティプラットフォーム

**目的**: 誰でも5分で自分色のコミュニティを持てるSaaSプラットフォームを構築する

**ターゲットユーザー**:
1. プラットフォームオーナー（バリューアーキテクツ社）
2. テナントオーナー（コミュニティ管理者）
3. テナント会員（一般ユーザー）

---

## 🏗️ 技術スタック

### フロントエンド
- **HTML/CSS/JavaScript**: Vanilla JS（フレームワークなし）
- **Tailwind CSS**: CDN経由（https://cdn.tailwindcss.com）
- **Font Awesome**: アイコンライブラリ（CDN）
- **Axios**: HTTPクライアント（CDN）

### バックエンド
- **Hono**: 軽量Webフレームワーク（Cloudflare Workers用）
- **TypeScript**: 型安全な開発
- **Cloudflare Workers**: サーバーレス実行環境

### データベース・ストレージ
- **Cloudflare D1**: SQLiteベースの分散データベース
- **Cloudflare R2**: 画像ストレージ（S3互換）

### 外部サービス
- **Stripe**: 決済処理（サブスクリプション・単発決済）
- **Resend API**: メール送信サービス

### デプロイ
- **Cloudflare Pages**: ホスティング
- **Wrangler**: CLIデプロイツール

---

## 📁 プロジェクト構成

```
/home/user/webapp/
├── src/
│   ├── index.tsx                 # メインアプリケーション
│   ├── types.ts                  # TypeScript型定義
│   └── routes/                   # APIルート
│       ├── auth.ts              # 認証（登録・ログイン）
│       ├── tenant-auth.ts       # テナント会員認証
│       ├── profile.ts           # プロフィール管理
│       ├── posts.ts             # 投稿機能
│       ├── admin-posts.ts       # 投稿管理（管理者用）
│       ├── members.ts           # 会員管理
│       ├── admin.ts             # 管理者機能
│       ├── likes.ts             # いいね機能
│       ├── notifications.ts     # 通知システム
│       ├── events.ts            # イベント管理
│       ├── points.ts            # ポイントシステム
│       ├── shop.ts              # ショップ機能
│       ├── surveys.ts           # アンケート機能
│       ├── analytics.ts         # 統計ダッシュボード
│       ├── tags.ts              # ユーザータグ
│       ├── tenant-customization.ts  # テナントカスタマイズ
│       ├── tenant-public.ts     # テナント公開ページ
│       ├── upload.ts            # 画像アップロード
│       ├── images.ts            # 画像取得
│       ├── stripe.ts            # Stripe決済
│       ├── stripe-webhook.ts    # Stripe Webhook
│       ├── subscription.ts      # サブスクリプション管理
│       ├── tenant-plans.ts      # テナント独自プラン
│       ├── member-plans.ts      # 一般会員向けプラン
│       ├── platform.ts          # プラットフォーム管理
│       ├── platform-coupons.ts  # プラットフォームクーポン
│       ├── coupons.ts           # クーポン管理
│       ├── password-reset.ts    # パスワードリセットAPI
│       ├── password-reset-pages.ts  # パスワードリセットページ
│       ├── post-access.ts       # 投稿アクセス制御
│       ├── birthday-email.ts    # 誕生日メール
│       ├── chat.ts              # チャット機能
│       ├── backup.ts            # データバックアップ
│       ├── debug.ts             # デバッグ用
│       └── documentation.ts     # ドキュメント生成（運営者専用）
├── public/
│   ├── static/
│   │   ├── tailwind-config.js   # Tailwindカスタム設定
│   │   ├── commons-theme.css    # テーマシステムCSS
│   │   ├── commons-components.css  # コンポーネントCSS
│   │   ├── app.js               # フロントエンドJavaScript
│   │   ├── walkthrough.js       # ウォークスルー機能
│   │   ├── member-modal.js      # メンバーモーダル
│   │   └── illustrations/       # イラスト素材
│   └── _headers                 # HTTP ヘッダー設定
├── migrations/                   # データベースマイグレーション
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_bio_column.sql
│   ├── ...
│   └── 0036_rename_hero_columns.sql
├── wrangler.jsonc               # Cloudflare Workers設定
├── vite.config.ts               # Viteビルド設定
├── package.json                 # 依存関係とスクリプト
├── tsconfig.json                # TypeScript設定
├── ecosystem.config.cjs         # PM2設定（開発用）
└── README.md                    # プロジェクトドキュメント
```

---

## 🗄️ データベース設計

### 主要テーブル（40以上）

#### ユーザー・テナント関連
1. **users** - ユーザー情報
   ```sql
   CREATE TABLE users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT UNIQUE NOT NULL,
     nickname TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     avatar_url TEXT,
     bio TEXT,
     birthday DATE,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **tenants** - テナント（コミュニティ）情報
   ```sql
   CREATE TABLE tenants (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     subdomain TEXT UNIQUE NOT NULL,
     name TEXT NOT NULL,
     subtitle TEXT,
     is_public BOOLEAN DEFAULT 1,
     status TEXT DEFAULT 'active',
     owner_id INTEGER NOT NULL,
     member_count INTEGER DEFAULT 0,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (owner_id) REFERENCES users(id)
   );
   ```

3. **tenant_memberships** - テナントとユーザーの関連
   ```sql
   CREATE TABLE tenant_memberships (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     tenant_id INTEGER NOT NULL,
     user_id INTEGER NOT NULL,
     role TEXT DEFAULT 'member',
     status TEXT DEFAULT 'pending',
     member_number TEXT,
     points_balance INTEGER DEFAULT 0,
     joined_at DATETIME,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (tenant_id) REFERENCES tenants(id),
     FOREIGN KEY (user_id) REFERENCES users(id),
     UNIQUE(tenant_id, user_id)
   );
   ```

#### コンテンツ関連
4. **posts** - 投稿
5. **comments** - コメント
6. **post_likes** - 投稿へのいいね
7. **comment_likes** - コメントへのいいね
8. **events** - イベント
9. **event_participants** - イベント参加者
10. **announcements** - お知らせ

#### アンケート関連
11. **surveys** - アンケート定義
12. **survey_questions** - アンケート質問
13. **survey_responses** - アンケート回答

#### ポイントシステム
14. **point_rules** - ポイントルール
15. **point_transactions** - ポイント取引履歴
16. **point_rewards** - ポイント報酬
17. **point_reward_requests** - 報酬交換申請

#### ショップ機能
18. **shop_legal_info** - 特定商取引法情報
19. **shop_categories** - 商品カテゴリ
20. **shop_products** - 商品
21. **shop_orders** - 注文
22. **shop_order_items** - 注文明細

#### プラン・決済
23. **platform_plans** - プラットフォームプラン
24. **tenant_plans** - テナント独自プラン
25. **member_plans** - メンバープラン
26. **platform_coupons** - プラットフォームクーポン
27. **tenant_coupons** - テナントクーポン

#### 通知・メール
28. **notifications** - 通知
29. **birthday_email_templates** - 誕生日メールテンプレート
30. **birthday_email_logs** - 誕生日メール送信履歴

#### その他
31. **user_tags** - ユーザータグ
32. **tenant_customization** - テナントカスタマイズ設定
33. **chat_rooms** - チャットルーム
34. **chat_messages** - チャットメッセージ
35. **chat_read_receipts** - 既読管理

*その他のテーブルは `migrations/` ディレクトリ参照*

---

## 🎨 主要機能一覧

### Phase 1: プラットフォーム基盤
- [x] マルチテナント基盤（サブドメインベース）
- [x] ユーザー認証・認可（JWT + bcrypt）
- [x] テナント作成・管理
- [x] プロフィール管理
- [x] 4種類のテーマシステム + ダークモード

### Phase 2: コミュニティ機能
- [x] 会員管理フロー（申請・承認・拒否）
- [x] 投稿・コメント機能
- [x] 画像アップロード（R2統合）
- [x] メール通知システム（Resend API）
- [x] レスポンシブデザイン

### Phase 3: エンゲージメント
- [x] いいね機能（投稿・コメント）
- [x] 通知センター
- [x] マイページ
- [x] アクティビティ履歴

### Phase 4: イベント・アンケート
- [x] イベント管理（作成・編集・参加申込）
- [x] アンケート機能（入会時・退会時）
- [x] 質問タイプ（テキスト・ラジオ・チェックボックス・スケール）

### Phase 5: ポイントシステム
- [x] 30種類以上のポイント付与アクション
- [x] 柔軟なルール設定（管理者）
- [x] 報酬管理・交換申請システム
- [x] 自動付与（デイリーログイン、記事閲覧など）
- [x] ランキング表示

### Phase 6: チャット
- [x] チャットルーム作成
- [x] メッセージ送受信
- [x] 既読管理

### Phase 7: ショップ・物販
- [x] 特定商取引法対応
- [x] 商品管理（カテゴリ・在庫・販売期間）
- [x] 注文管理
- [x] Stripe決済統合（商品決済）
- [x] チケットコード発行

### 追加機能
- [x] 誕生日メール自動送信
- [x] 予約投稿機能（Cron Triggers）
- [x] タグ管理
- [x] 統計ダッシュボード
- [x] データバックアップ
- [x] テナントカスタマイズ（カバー画像・ロゴ・カラー）
- [x] ウォークスルー機能（初回ガイド）
- [x] ドキュメント生成API（運営者専用）

---

## 🔐 セキュリティ設計

### 認証・認可
- **JWT**: jose ライブラリでトークン生成・検証
- **パスワード**: bcrypt でハッシュ化
- **有効期限**: 7日間
- **ペイロード**: ユーザーID、メールアドレス、役割

### XSS対策
- HTMLエスケープ処理
- Content Security Policy (CSP)
- サニタイズ処理

### CSRF対策
- トークン検証
- SameSite Cookie属性

### SQL Injection対策
- プリペアドステートメント
- バインドパラメータ

---

## 🎨 デザインシステム

### テーマ（4種類）
1. **Modern Business**: プロフェッショナル（Indigo/Blue）
2. **Wellness Nature**: 自然・健康（Emerald Green）
3. **Creative Studio**: クリエイティブ（Orange）
4. **Tech Innovation**: 技術革新（Cyan）

### ダークモード
- CSS変数でテーマ切り替え
- localStorage で設定保存
- 月アイコン（🌙）でトグル

### レスポンシブ
- モバイル（〜768px）
- タブレット（768px〜1024px）
- デスクトップ（1024px〜）

---

## 📡 主要APIエンドポイント

### 認証
- `POST /api/auth/register` - プラットフォームオーナー登録
- `POST /api/auth/login` - ログイン
- `POST /api/tenant/register` - テナント会員登録
- `POST /api/tenant/login` - テナント会員ログイン

### 会員管理
- `GET /api/admin/members/pending` - 承認待ち会員
- `POST /api/admin/members/:id/approve` - 承認
- `POST /api/admin/members/:id/reject` - 却下
- `GET /api/admin/members/active` - 承認済み会員

### 投稿
- `POST /api/posts` - 投稿作成
- `GET /api/posts` - 投稿一覧
- `GET /api/posts/:id` - 投稿詳細
- `PUT /api/posts/:id` - 投稿編集
- `DELETE /api/posts/:id` - 投稿削除
- `POST /api/posts/:id/comments` - コメント投稿

### イベント
- `POST /api/events` - イベント作成
- `GET /api/events` - イベント一覧
- `POST /api/events/:id/join` - イベント参加

### ポイント
- `GET /api/points/balance` - ポイント残高
- `GET /api/points/history` - ポイント履歴
- `POST /api/points/award` - ポイント付与（管理者）

### ショップ
- `GET /api/shop/products` - 商品一覧
- `POST /api/shop/products` - 商品作成
- `POST /api/shop/orders` - 注文作成
- `GET /api/shop/orders` - 注文一覧

### 通知
- `GET /api/notifications` - 通知一覧
- `PUT /api/notifications/:id/read` - 既読化
- `DELETE /api/notifications/:id` - 削除

### 画像
- `POST /api/upload/avatar` - アバター画像アップロード
- `POST /api/upload/post-thumbnail` - 投稿サムネイル
- `GET /api/images/:path` - 画像取得

### Stripe
- `POST /api/stripe/checkout` - Checkoutセッション作成
- `POST /api/stripe/webhook` - Webhook受信

*詳細はREADME.md参照*

---

## 🚀 実装手順

### Step 1: プロジェクト初期化

```bash
# プロジェクトディレクトリ作成
mkdir -p /home/user/webapp
cd /home/user/webapp

# Honoプロジェクト作成（Cloudflare Pagesテンプレート）
npm create -y hono@latest . -- --template cloudflare-pages --install --pm npm

# Gitリポジトリ初期化
git init
git add .
git commit -m "Initial commit"
```

### Step 2: 必要な依存関係をインストール

```json
{
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "4.20250705.0",
    "@hono/vite-cloudflare-pages": "^0.4.2",
    "vite": "^5.0.0",
    "wrangler": "^3.78.0",
    "typescript": "^5.0.0"
  }
}
```

### Step 3: wrangler.jsonc設定

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "commons-webapp",
  "main": "src/index.tsx",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "commons-webapp-production",
      "database_id": "your-database-id"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "commons-images"
    }
  ]
}
```

### Step 4: データベースマイグレーション

```bash
# D1データベース作成
npx wrangler d1 create commons-webapp-production

# マイグレーション適用（ローカル）
npx wrangler d1 migrations apply commons-webapp-production --local

# マイグレーション適用（本番）
npx wrangler d1 migrations apply commons-webapp-production
```

### Step 5: R2バケット作成

```bash
# R2バケット作成（画像ストレージ）
npx wrangler r2 bucket create commons-images
```

### Step 6: 環境変数設定

**ローカル（.dev.vars）:**
```
JWT_SECRET=your_jwt_secret_key
PLATFORM_DOMAIN=commons.com
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
```

**本番（Cloudflare Pages Secrets）:**
```bash
npx wrangler pages secret put JWT_SECRET --project-name commons-webapp
npx wrangler pages secret put PLATFORM_DOMAIN --project-name commons-webapp
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name commons-webapp
npx wrangler pages secret put RESEND_API_KEY --project-name commons-webapp
```

### Step 7: メインアプリケーション実装

`src/index.tsx` にメインアプリケーションを実装：
- Honoアプリケーション初期化
- 全APIルートのマウント
- 静的ファイル配信設定
- プラットフォーム/テナントページのルーティング

### Step 8: APIルート実装

`src/routes/` に各機能のAPIルートを実装：
- 認証（auth.ts, tenant-auth.ts）
- プロフィール（profile.ts）
- 投稿（posts.ts, admin-posts.ts）
- 会員管理（members.ts, admin.ts）
- いいね（likes.ts）
- 通知（notifications.ts）
- イベント（events.ts）
- ポイント（points.ts）
- ショップ（shop.ts）
- その他

### Step 9: フロントエンド実装

`public/static/` にフロントエンドファイルを配置：
- Tailwindカスタム設定（tailwind-config.js）
- テーマCSS（commons-theme.css）
- コンポーネントCSS（commons-components.css）
- JavaScript（app.js, walkthrough.js）

### Step 10: テナント公開ページ実装

`src/routes/tenant-public.ts` に公開ページを実装：
- テナントホーム
- 会員登録・ログイン
- 投稿一覧・詳細
- イベント一覧・詳細
- メンバー一覧
- マイページ
- ショップ

### Step 11: ビルド・デプロイ

```bash
# ビルド
npm run build

# ローカルテスト（PM2）
pm2 start ecosystem.config.cjs

# 本番デプロイ
npx wrangler pages deploy dist --project-name commons-webapp
```

---

## 📋 重要な実装ポイント

### 1. マルチテナント分離

```typescript
// サブドメインからテナントを特定
const host = c.req.header('Host') || ''
const subdomain = host.split('.')[0]

// クエリパラメータからテナントを特定
const subdomain = c.req.query('subdomain')

// テナント情報を取得
const tenant = await DB.prepare(`
  SELECT * FROM tenants 
  WHERE subdomain = ? AND status = 'active'
`).bind(subdomain).first()

// 全クエリにtenant_idを付与
const posts = await DB.prepare(`
  SELECT * FROM posts WHERE tenant_id = ?
`).bind(tenant.id).all()
```

### 2. JWT認証

```typescript
import { sign, verify } from 'jose'

// トークン生成
const secret = new TextEncoder().encode(c.env.JWT_SECRET)
const token = await new SignJWT({
  userId: user.id,
  email: user.email
})
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('7d')
  .sign(secret)

// トークン検証
const { payload } = await jwtVerify(token, secret)
```

### 3. パスワードハッシュ化

```typescript
import bcrypt from 'bcryptjs'

// ハッシュ化
const hashedPassword = await bcrypt.hash(password, 10)

// 検証
const isValid = await bcrypt.compare(password, hashedPassword)
```

### 4. 画像アップロード（R2）

```typescript
// アップロード
const key = `avatars/${userId}-${Date.now()}.${ext}`
await c.env.R2.put(key, file)

// 取得
const object = await c.env.R2.get(key)
return new Response(object.body, {
  headers: {
    'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
    'Cache-Control': 'public, max-age=31536000'
  }
})
```

### 5. メール送信（Resend API）

```typescript
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'Commons <noreply@commons.com>',
    to: email,
    subject: 'タイトル',
    html: '<p>本文</p>'
  })
})
```

### 6. Stripe決済

```typescript
import Stripe from 'stripe'

const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)

// Checkoutセッション作成
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: priceId,
    quantity: 1
  }],
  success_url: `${baseUrl}/success`,
  cancel_url: `${baseUrl}/cancel`
})
```

### 7. Cloudflare Workers の制約

**❌ 使用できないもの:**
- Node.js APIモジュール（fs, path, process など）
- ファイルシステムアクセス
- 長時間実行（10ms CPU時間制限）
- WebSocketサーバー

**✅ 使用できるもの:**
- Fetch API
- Web Crypto API
- Cloudflare D1（SQLite）
- Cloudflare R2（S3互換）
- 外部API呼び出し

### 8. 静的ファイル配信

```typescript
import { serveStatic } from 'hono/cloudflare-workers'

// ❌ Node.js用（使用不可）
import { serveStatic } from '@hono/node-server/serve-static'

// ✅ Cloudflare Workers用（正しい）
import { serveStatic } from 'hono/cloudflare-workers'

app.use('/static/*', serveStatic({ root: './public' }))
```

---

## 🎯 実装の優先順位

### 最優先（MVP）
1. プロジェクト初期化・設定
2. データベースマイグレーション
3. 認証システム（JWT + bcrypt）
4. テナント作成・管理
5. 基本的なUIテンプレート

### 高優先度
6. 会員管理フロー
7. 投稿・コメント機能
8. プロフィール管理
9. 画像アップロード
10. メール通知

### 中優先度
11. いいね機能
12. 通知センター
13. イベント管理
14. アンケート機能
15. テーマシステム

### 低優先度
16. ポイントシステム
17. ショップ機能
18. チャット機能
19. 統計ダッシュボード
20. ウォークスルー

---

## 🧪 テスト手順

### ローカル開発

```bash
# サービス起動
cd /home/user/webapp
npm run build
pm2 start ecosystem.config.cjs

# 動作確認
curl http://localhost:3000/health

# ログ確認
pm2 logs --nostream
```

### 本番デプロイ

```bash
# ビルド
npm run build

# デプロイ
npx wrangler pages deploy dist --project-name commons-webapp

# 動作確認
curl https://commons-webapp.pages.dev/health
```

### 機能テスト

1. **ユーザー登録**: `/register` でテナント作成
2. **ログイン**: `/login` でログイン
3. **ダッシュボード**: `/dashboard` でダッシュボード表示
4. **会員管理**: `/members` で会員承認
5. **投稿作成**: `/posts-admin` で投稿作成
6. **テナントページ**: `/tenant/home?subdomain=test` で公開ページ表示

---

## 📚 参考ドキュメント

### 既存の実装
- `README.md` - プロジェクト概要・機能一覧
- `VISUAL_ASSETS_GUIDE.md` - ビジュアル素材統合ガイド
- `migrations/` - データベーススキーマ
- `src/routes/` - 各機能の実装例

### 外部ドキュメント
- **Hono**: https://hono.dev/
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Cloudflare D1**: https://developers.cloudflare.com/d1/
- **Cloudflare R2**: https://developers.cloudflare.com/r2/
- **Stripe**: https://stripe.com/docs
- **Resend**: https://resend.com/docs

---

## ⚠️ 注意事項

1. **環境変数**: JWT_SECRET, STRIPE_SECRET_KEY, RESEND_API_KEY は必須
2. **D1データベースID**: wrangler.jsonc に実際のIDを設定
3. **R2バケット**: 事前に作成が必要
4. **Git管理**: 機密情報（.dev.vars, .env）は .gitignore に追加
5. **PM2設定**: 開発環境のみ、本番は Cloudflare Workers
6. **マイグレーション**: ローカル（--local）と本番（--remote）を分けて実行
7. **CORS設定**: API ルート（/api/*）のみ有効化
8. **静的ファイル**: public/static/ に配置し /static/* で配信

---

## 🎉 完成後の確認事項

### 機能チェックリスト

- [ ] ユーザー登録・ログインが動作する
- [ ] テナント作成が動作する
- [ ] ダッシュボードが表示される
- [ ] 会員管理（申請・承認・拒否）が動作する
- [ ] 投稿・コメントが動作する
- [ ] 画像アップロードが動作する
- [ ] メール送信が動作する
- [ ] いいね機能が動作する
- [ ] 通知が表示される
- [ ] イベント管理が動作する
- [ ] ポイントシステムが動作する
- [ ] ショップ機能が動作する
- [ ] Stripe決済が動作する
- [ ] テーマ切り替えが動作する
- [ ] ダークモードが動作する
- [ ] レスポンシブデザインが動作する

### パフォーマンスチェック

- [ ] ページ読み込み時間 < 3秒
- [ ] API応答時間 < 1秒
- [ ] 画像遅延読み込み動作
- [ ] キャッシュヘッダー設定済み

### セキュリティチェック

- [ ] JWT署名検証動作
- [ ] パスワードハッシュ化動作
- [ ] XSS対策実装済み
- [ ] CSRF対策実装済み
- [ ] SQL Injection対策実装済み

---

生成日時: 2026-02-06
バージョン: 1.0.0
