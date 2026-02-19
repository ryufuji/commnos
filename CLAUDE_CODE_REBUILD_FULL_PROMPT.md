# Commons マルチテナントプラットフォーム - 完全再構築プロンプト

このプロンプトをClaude Codeに渡すことで、Commonsプラットフォームを完全に再構築できます。

---

## 🎯 プロジェクトミッション

**プロジェクト名**: Commons - マルチテナント型コミュニティプラットフォーム  
**目的**: 誰でも5分で自分色のコミュニティを持てるSaaSプラットフォームを構築する  
**コードネーム**: commons-webapp  
**開発言語**: 日本語

---

## 📝 実装指示

以下の手順で、Commonsプラットフォームをゼロから構築してください：

### Step 1: プロジェクト初期化

```bash
# プロジェクトディレクトリ作成
mkdir -p /home/user/webapp
cd /home/user/webapp

# Honoプロジェクト作成（Cloudflare Pagesテンプレート、300秒タイムアウト）
npm create -y hono@latest . -- --template cloudflare-pages --install --pm npm

# Gitリポジトリ初期化
git init

# .gitignore作成
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Compiled binary addons
build

# Environment files
.env
.dev.vars

# PM2
.pm2/
pids/
logs/
*.log

# Backup files
*.backup
*.bak
*.tar.gz
*.zip

# Cloudflare
.wrangler/
dist/

# Editor directories
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db
EOF

# 初回コミット
git add .
git commit -m "Initial commit with Hono and Cloudflare Pages template"
```

---

### Step 2: 依存関係のインストール

`package.json` に以下を追加してください：

```json
{
  "name": "commons-webapp",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:sandbox": "wrangler pages dev dist --ip 0.0.0.0 --port 3000",
    "dev:d1": "wrangler pages dev dist --d1=commons-webapp-production --local --ip 0.0.0.0 --port 3000",
    "build": "vite build",
    "preview": "wrangler pages dev dist",
    "deploy": "npm run build && wrangler pages deploy dist --branch main --project-name commons-webapp",
    "deploy:staging": "npm run build && wrangler pages deploy dist --branch staging --project-name commons-webapp",
    "deploy:preview": "npm run build && wrangler pages deploy dist --project-name commons-webapp",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings",
    "clean-port": "fuser -k 3000/tcp 2>/dev/null || true",
    "test": "curl http://localhost:3000",
    "db:create": "wrangler d1 create commons-webapp-production",
    "db:migrate:local": "wrangler d1 migrations apply commons-webapp-production --local",
    "db:migrate:prod": "wrangler d1 migrations apply commons-webapp-production",
    "db:console:local": "wrangler d1 execute commons-webapp-production --local",
    "db:console:prod": "wrangler d1 execute commons-webapp-production",
    "git:init": "git init && git add . && git commit -m 'Initial commit'",
    "git:commit": "git add . && git commit -m",
    "git:status": "git status",
    "git:log": "git log --oneline"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "jose": "^5.9.6",
    "bcryptjs": "^2.4.3",
    "stripe": "^17.5.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "4.20250705.0",
    "@hono/vite-cloudflare-pages": "^0.4.2",
    "vite": "^5.0.0",
    "wrangler": "^3.78.0",
    "typescript": "^5.0.0",
    "@types/bcryptjs": "^2.4.6"
  }
}
```

```bash
# 依存関係インストール（300秒タイムアウト）
cd /home/user/webapp && npm install
```

---

### Step 3: Cloudflare設定

#### wrangler.jsonc

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
      "database_id": "YOUR_DATABASE_ID_HERE"
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

#### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig({
  plugins: [pages()],
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    sourcemap: false
  }
})
```

#### ecosystem.config.cjs（PM2設定）

```javascript
module.exports = {
  apps: [
    {
      name: 'commons-webapp',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=commons-webapp-production --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '1G',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}
```

---

### Step 4: データベースマイグレーション

以下のマイグレーションファイルを `migrations/` ディレクトリに作成してください：

#### 0001_initial_schema.sql

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  birthday DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subdomain TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  owner_id INTEGER NOT NULL,
  is_public BOOLEAN DEFAULT 1,
  status TEXT DEFAULT 'active',
  theme TEXT DEFAULT 'modern-business',
  member_count INTEGER DEFAULT 0,
  storage_used INTEGER DEFAULT 0,
  storage_limit INTEGER DEFAULT 1073741824,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  platform_plan_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Tenant memberships
CREATE TABLE IF NOT EXISTS tenant_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'pending',
  member_number TEXT,
  points_balance INTEGER DEFAULT 0,
  plan_id INTEGER,
  joined_at DATETIME,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(tenant_id, user_id)
);

-- Platform plans
CREATE TABLE IF NOT EXISTS platform_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  price_yearly INTEGER NOT NULL,
  member_limit INTEGER,
  storage_limit INTEGER,
  commission_rate REAL DEFAULT 0.15,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  features TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  visibility TEXT DEFAULT 'members',
  thumbnail_url TEXT,
  scheduled_at DATETIME,
  published_at DATETIME,
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  parent_comment_id INTEGER,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_tenant ON posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
```

**その他のマイグレーションファイル（いいね、通知、イベント、ポイント、ショップ等）は既存プロジェクトの `migrations/` ディレクトリを参照してください。合計36個のマイグレーションファイルがあります。**

---

### Step 5: TypeScript型定義

#### src/types.ts

```typescript
export interface AppContext {
  Bindings: {
    DB: D1Database
    R2: R2Bucket
    JWT_SECRET: string
    PLATFORM_DOMAIN: string
    STRIPE_SECRET_KEY: string
    STRIPE_PUBLISHABLE_KEY: string
    RESEND_API_KEY: string
  }
  Variables: {
    user?: {
      userId: number
      email: string
      tenantId?: number
      role?: string
    }
  }
}

export interface User {
  id: number
  email: string
  nickname: string
  password_hash: string
  avatar_url: string | null
  bio: string | null
  birthday: string | null
  created_at: string
}

export interface Tenant {
  id: number
  subdomain: string
  name: string
  subtitle: string | null
  owner_id: number
  is_public: boolean
  status: string
  theme: string
  member_count: number
  platform_plan_id: number | null
  created_at: string
}

export interface TenantMembership {
  id: number
  tenant_id: number
  user_id: number
  role: string
  status: string
  member_number: string | null
  points_balance: number
  plan_id: number | null
  joined_at: string | null
  expires_at: string | null
  created_at: string
}

export interface Post {
  id: number
  tenant_id: number
  user_id: number
  title: string
  content: string
  status: string
  visibility: string
  thumbnail_url: string | null
  scheduled_at: string | null
  published_at: string | null
  view_count: number
  created_at: string
  updated_at: string
}
```

---

### Step 6: メインアプリケーション実装

#### src/index.tsx

このファイルには以下を含めてください：

1. **Honoアプリケーション初期化**
2. **CORSミドルウェア設定** - `/api/*` のみ有効
3. **静的ファイル配信** - `serveStatic` from `'hono/cloudflare-workers'`（重要！）
4. **全APIルートのマウント**:
   - `/api/auth` - 認証
   - `/api/tenant` - テナント会員認証
   - `/api/profile` - プロフィール
   - `/api/posts` - 投稿
   - `/api/admin` - 管理者機能
   - `/api/members` - 会員管理
   - `/api/likes` - いいね
   - `/api/notifications` - 通知
   - `/api/events` - イベント
   - `/api/points` - ポイント
   - `/api/shop` - ショップ
   - `/api/stripe` - Stripe決済
   - `/api/upload` - 画像アップロード
   - `/api/images` - 画像取得
   - `/api/documentation` - ドキュメント生成（運営者専用）
   - その他すべてのAPIルート
5. **HTMLページルーティング**:
   - プラットフォームページ（`/`, `/register`, `/login`, `/dashboard` 等）
   - テナント公開ページ（`/tenant/home`, `/tenant/posts` 等）
6. **サブドメイン/クエリパラメータからのテナント特定ロジック**

**実装参考**: 既存プロジェクトの `src/index.tsx` を参照（約2700行）

---

### Step 7: APIルート実装

`src/routes/` ディレクトリに以下のファイルを作成してください：

#### 必須APIルート

1. **auth.ts** - 認証（登録・ログイン）
   - `POST /api/auth/register` - テナント作成
   - `POST /api/auth/login` - ログイン
   - JWT生成・検証ミドルウェア

2. **tenant-auth.ts** - テナント会員認証
   - `POST /api/tenant/register` - 会員申請（メール送信付き）
   - `POST /api/tenant/login` - 会員ログイン

3. **profile.ts** - プロフィール管理
   - `GET /api/profile` - プロフィール取得
   - `PUT /api/profile` - プロフィール更新

4. **posts.ts** - 投稿機能
   - `POST /api/posts` - 投稿作成
   - `GET /api/posts` - 投稿一覧
   - `GET /api/posts/:id` - 投稿詳細
   - `PUT /api/posts/:id` - 投稿編集
   - `DELETE /api/posts/:id` - 投稿削除
   - `POST /api/posts/:id/comments` - コメント投稿
   - `GET /api/posts/:id/comments` - コメント一覧
   - `DELETE /api/posts/:postId/comments/:commentId` - コメント削除

5. **admin.ts** - 管理者機能
   - `GET /api/admin/stats` - 統計情報
   - `GET /api/admin/members/pending` - 承認待ち会員
   - `POST /api/admin/members/:id/approve` - 承認（メール送信付き）
   - `POST /api/admin/members/:id/reject` - 却下（メール送信付き）
   - `GET /api/admin/members/active` - 承認済み会員

6. **likes.ts** - いいね機能
   - `POST /api/likes/posts/:id` - 投稿にいいね
   - `DELETE /api/likes/posts/:id` - いいね削除
   - `POST /api/likes/comments/:id` - コメントにいいね
   - `DELETE /api/likes/comments/:id` - いいね削除

7. **notifications.ts** - 通知システム
   - `GET /api/notifications` - 通知一覧
   - `PUT /api/notifications/:id/read` - 既読化
   - `DELETE /api/notifications/:id` - 削除

8. **events.ts** - イベント管理
   - `POST /api/events` - イベント作成
   - `GET /api/events` - イベント一覧
   - `POST /api/events/:id/join` - イベント参加

9. **points.ts** - ポイントシステム
   - `GET /api/points/balance` - ポイント残高
   - `GET /api/points/history` - ポイント履歴
   - `POST /api/points/award` - ポイント付与（管理者）

10. **shop.ts** - ショップ機能
    - `GET /api/shop/products` - 商品一覧
    - `POST /api/shop/products` - 商品作成
    - `POST /api/shop/orders` - 注文作成
    - `GET /api/shop/orders` - 注文一覧

11. **stripe.ts** - Stripe決済
    - `POST /api/stripe/checkout` - Checkoutセッション作成

12. **stripe-webhook.ts** - Stripe Webhook
    - `POST /api/stripe/webhook` - Webhook受信

13. **upload.ts** - 画像アップロード
    - `POST /api/upload/avatar` - アバター画像
    - `POST /api/upload/post-thumbnail` - 投稿サムネイル

14. **images.ts** - 画像取得
    - `GET /api/images/:path` - R2から画像取得

15. **documentation.ts** - ドキュメント生成（運営者専用）
    - `POST /api/documentation/generate` - ドキュメント生成API

**その他のAPIルート**:
- surveys.ts, birthday-email.ts, analytics.ts, chat.ts, tags.ts, tenant-customization.ts, backup.ts 等

**実装参考**: 既存プロジェクトの `src/routes/` ディレクトリを参照（36個のファイル）

---

### Step 8: フロントエンド実装

#### public/static/ ディレクトリ構成

1. **tailwind-config.js** - Tailwindカスタム設定
2. **commons-theme.css** - テーマシステムCSS（4種類 + ダークモード）
3. **commons-components.css** - コンポーネントCSS
4. **app.js** - フロントエンドJavaScript（認証、API呼び出し、モーダル等）
5. **walkthrough.js** - ウォークスルー機能
6. **member-modal.js** - メンバーモーダル
7. **illustrations/** - イラスト素材（8枚）

#### テーマシステム

4種類のテーマを実装してください：

1. **Modern Business** - プロフェッショナル（Indigo/Blue）
2. **Wellness Nature** - 自然・健康（Emerald Green）
3. **Creative Studio** - クリエイティブ（Orange）
4. **Tech Innovation** - 技術革新（Cyan）

**ダークモード**: 月アイコン（🌙）でトグル、CSS変数で切り替え

#### レスポンシブデザイン

- モバイル: 〜768px
- タブレット: 768px〜1024px
- デスクトップ: 1024px〜

**実装参考**: 既存プロジェクトの `public/static/` ディレクトリを参照

---

### Step 9: HTMLページ実装

#### プラットフォームページ（src/index.tsx内）

以下のページを実装してください：

1. **トップページ** (`/`) - ヒーローセクション、機能紹介
2. **新規登録** (`/register`) - テナント作成フォーム
3. **ログイン** (`/login`) - ログインフォーム
4. **ダッシュボード** (`/dashboard`) - 統計カード、クイックアクション
5. **会員管理** (`/members`) - 承認待ち・承認済み会員一覧
6. **投稿管理** (`/posts-admin`) - 投稿一覧・作成・編集
7. **プロフィール** (`/profile`) - プロフィール編集
8. **イベント管理** (`/events`) - イベント一覧・作成
9. **ポイント管理** (`/points-management`) - ポイントルール設定
10. **ショップ設定** (`/shop-settings`) - 商品管理
11. **統計ダッシュボード** (`/analytics`) - アンケート・統計分析
12. **誕生日メール設定** (`/birthday-email-settings`) - テンプレート編集

#### テナント公開ページ（src/routes/tenant-public.ts）

以下のページを実装してください：

1. **テナントホーム** (`/tenant/home`) - ヒーローセクション、投稿一覧
2. **会員登録** (`/register?subdomain=xxx`) - 会員申請フォーム
3. **会員ログイン** (`/login?subdomain=xxx`) - ログインフォーム
4. **投稿一覧** (`/tenant/posts`) - 投稿カードグリッド
5. **投稿詳細** (`/tenant/posts/:id`) - 投稿本文、コメント
6. **投稿作成** (`/tenant/posts/new`) - 投稿フォーム
7. **イベント一覧** (`/tenant/events`) - イベントカード
8. **イベント詳細** (`/tenant/events/:id`) - イベント詳細・参加申込
9. **会員一覧** (`/tenant/members`) - メンバーグリッド
10. **会員プロフィール** (`/tenant/members/:id`) - メンバー詳細
11. **マイページ** (`/tenant/my-page`) - 自分の投稿・ポイント
12. **ショップ** (`/tenant/shop`) - 商品一覧・購入

**実装参考**: 既存プロジェクトの `src/index.tsx` と `src/routes/tenant-public.ts` を参照

---

### Step 10: ビジュアル素材の統合

以下の8枚のイラストをダウンロードして配置してください：

#### イラスト一覧

1. **hero-community.png** (16:9) - ヒーローセクション
   - URL: https://www.genspark.ai/api/files/s/DLVl6pdn
   - 配置先: `public/static/illustrations/hero-community.png`

2. **icon-membership.png** (1:1) - 会員機能アイコン
   - URL: https://www.genspark.ai/api/files/s/lFgYhVgo
   - 配置先: `public/static/illustrations/icon-membership.png`

3. **icon-posts.png** (1:1) - 投稿機能アイコン
   - URL: https://www.genspark.ai/api/files/s/mxczDzNF
   - 配置先: `public/static/illustrations/icon-posts.png`

4. **icon-events.png** (1:1) - イベント機能アイコン
   - URL: https://www.genspark.ai/api/files/s/5vzZu0Tv
   - 配置先: `public/static/illustrations/icon-events.png`

5. **icon-points.png** (1:1) - ポイントシステムアイコン
   - URL: https://www.genspark.ai/api/files/s/V5Mb3SSY
   - 配置先: `public/static/illustrations/icon-points.png`

6. **icon-shop.png** (1:1) - ショップ機能アイコン
   - URL: https://www.genspark.ai/api/files/s/6zDEI0A9
   - 配置先: `public/static/illustrations/icon-shop.png`

7. **walkthrough-welcome.png** (4:3) - ウォークスルー用
   - URL: https://www.genspark.ai/api/files/s/wsFllQkd
   - 配置先: `public/static/illustrations/walkthrough-welcome.png`

8. **icon-analytics.png** (1:1) - 分析・統計アイコン
   - URL: https://www.genspark.ai/api/files/s/labH9LxR
   - 配置先: `public/static/illustrations/icon-analytics.png`

#### ダウンロードコマンド

```bash
mkdir -p /home/user/webapp/public/static/illustrations

# curlでダウンロード
curl -o /home/user/webapp/public/static/illustrations/hero-community.png "https://www.genspark.ai/api/files/s/DLVl6pdn"
curl -o /home/user/webapp/public/static/illustrations/icon-membership.png "https://www.genspark.ai/api/files/s/lFgYhVgo"
curl -o /home/user/webapp/public/static/illustrations/icon-posts.png "https://www.genspark.ai/api/files/s/mxczDzNF"
curl -o /home/user/webapp/public/static/illustrations/icon-events.png "https://www.genspark.ai/api/files/s/5vzZu0Tv"
curl -o /home/user/webapp/public/static/illustrations/icon-points.png "https://www.genspark.ai/api/files/s/V5Mb3SSY"
curl -o /home/user/webapp/public/static/illustrations/icon-shop.png "https://www.genspark.ai/api/files/s/6zDEI0A9"
curl -o /home/user/webapp/public/static/illustrations/walkthrough-welcome.png "https://www.genspark.ai/api/files/s/wsFllQkd"
curl -o /home/user/webapp/public/static/illustrations/icon-analytics.png "https://www.genspark.ai/api/files/s/labH9LxR"

# ダウンロード確認
ls -lh /home/user/webapp/public/static/illustrations/
```

---

### Step 11: 環境変数設定

#### ローカル開発（.dev.vars）

```bash
cat > /home/user/webapp/.dev.vars << 'EOF'
JWT_SECRET=your_super_secret_jwt_key_here
PLATFORM_DOMAIN=commons.com
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
RESEND_API_KEY=re_your_resend_api_key
EOF

# .gitignoreに追加済みか確認
grep -q ".dev.vars" /home/user/webapp/.gitignore || echo ".dev.vars" >> /home/user/webapp/.gitignore
```

#### 本番環境（Cloudflare Pages Secrets）

```bash
# デプロイ後に実行
npx wrangler pages secret put JWT_SECRET --project-name commons-webapp
npx wrangler pages secret put PLATFORM_DOMAIN --project-name commons-webapp
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name commons-webapp
npx wrangler pages secret put RESEND_API_KEY --project-name commons-webapp
```

---

### Step 12: データベースセットアップ

```bash
# D1データベース作成
npx wrangler d1 create commons-webapp-production

# 出力されたdatabase_idをwrangler.jsonc に設定
# database_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# R2バケット作成
npx wrangler r2 bucket create commons-images

# マイグレーション適用（ローカル）
npx wrangler d1 migrations apply commons-webapp-production --local

# マイグレーション適用（本番）- デプロイ後に実行
npx wrangler d1 migrations apply commons-webapp-production
```

---

### Step 13: ビルド・テスト・デプロイ

#### ローカル開発

```bash
# ビルド（300秒タイムアウト）
cd /home/user/webapp && npm run build

# PM2でサービス起動
pm2 start ecosystem.config.cjs

# サービス確認
curl http://localhost:3000

# ログ確認
pm2 logs --nostream
```

#### 本番デプロイ（Cloudflare Pages）

```bash
# 1. Cloudflare認証設定
# setup_cloudflare_api_key ツールを実行

# 2. ビルド
cd /home/user/webapp && npm run build

# 3. Cloudflare Pages プロジェクト作成
npx wrangler pages project create commons-webapp \
  --production-branch main \
  --compatibility-date 2024-01-01

# 4. デプロイ（プロダクション）
npx wrangler pages deploy dist --branch main --project-name commons-webapp

# 5. デプロイ（ステージング）
npx wrangler pages deploy dist --branch staging --project-name commons-webapp

# 6. 環境変数設定（上記「Step 11」参照）

# 7. マイグレーション適用（本番）
npx wrangler d1 migrations apply commons-webapp-production

# 8. 動作確認
curl https://commons-webapp.pages.dev/health
```

---

### Step 14: Git & GitHub

```bash
# Gitコミット
cd /home/user/webapp
git add .
git commit -m "Complete Commons platform implementation"

# GitHub環境設定（ツール実行）
# setup_github_environment ツールを実行

# GitHubリポジトリへプッシュ
git remote add origin https://github.com/USERNAME/commons-webapp.git
git branch -M main
git push -u origin main
```

---

## 📋 実装チェックリスト

### プロジェクト構成
- [ ] `/home/user/webapp/` ディレクトリ作成
- [ ] Honoプロジェクト初期化
- [ ] Gitリポジトリ初期化
- [ ] .gitignore作成
- [ ] package.json設定
- [ ] wrangler.jsonc設定
- [ ] vite.config.ts設定
- [ ] ecosystem.config.cjs設定（PM2）

### データベース
- [ ] migrations/ ディレクトリ作成
- [ ] 0001_initial_schema.sql 作成
- [ ] その他36個のマイグレーションファイル作成
- [ ] D1データベース作成
- [ ] マイグレーション適用（ローカル）
- [ ] R2バケット作成

### バックエンド実装
- [ ] src/types.ts 作成
- [ ] src/index.tsx 作成（メインアプリケーション）
- [ ] src/routes/auth.ts 作成
- [ ] src/routes/tenant-auth.ts 作成
- [ ] src/routes/profile.ts 作成
- [ ] src/routes/posts.ts 作成
- [ ] src/routes/admin.ts 作成
- [ ] src/routes/members.ts 作成
- [ ] src/routes/likes.ts 作成
- [ ] src/routes/notifications.ts 作成
- [ ] src/routes/events.ts 作成
- [ ] src/routes/points.ts 作成
- [ ] src/routes/shop.ts 作成
- [ ] src/routes/stripe.ts 作成
- [ ] src/routes/stripe-webhook.ts 作成
- [ ] src/routes/upload.ts 作成
- [ ] src/routes/images.ts 作成
- [ ] src/routes/documentation.ts 作成
- [ ] src/routes/tenant-public.ts 作成
- [ ] その他のAPIルート作成

### フロントエンド実装
- [ ] public/static/tailwind-config.js 作成
- [ ] public/static/commons-theme.css 作成
- [ ] public/static/commons-components.css 作成
- [ ] public/static/app.js 作成
- [ ] public/static/walkthrough.js 作成
- [ ] public/static/member-modal.js 作成

### ビジュアル素材
- [ ] public/static/illustrations/ ディレクトリ作成
- [ ] hero-community.png ダウンロード
- [ ] icon-membership.png ダウンロード
- [ ] icon-posts.png ダウンロード
- [ ] icon-events.png ダウンロード
- [ ] icon-points.png ダウンロード
- [ ] icon-shop.png ダウンロード
- [ ] walkthrough-welcome.png ダウンロード
- [ ] icon-analytics.png ダウンロード

### HTMLページ（プラットフォーム）
- [ ] トップページ (`/`)
- [ ] 新規登録 (`/register`)
- [ ] ログイン (`/login`)
- [ ] ダッシュボード (`/dashboard`)
- [ ] 会員管理 (`/members`)
- [ ] 投稿管理 (`/posts-admin`)
- [ ] プロフィール (`/profile`)
- [ ] イベント管理 (`/events`)
- [ ] ポイント管理 (`/points-management`)
- [ ] ショップ設定 (`/shop-settings`)
- [ ] 統計ダッシュボード (`/analytics`)
- [ ] 誕生日メール設定 (`/birthday-email-settings`)

### HTMLページ（テナント公開）
- [ ] テナントホーム (`/tenant/home`)
- [ ] 会員登録 (`/register?subdomain=xxx`)
- [ ] 会員ログイン (`/login?subdomain=xxx`)
- [ ] 投稿一覧 (`/tenant/posts`)
- [ ] 投稿詳細 (`/tenant/posts/:id`)
- [ ] 投稿作成 (`/tenant/posts/new`)
- [ ] イベント一覧 (`/tenant/events`)
- [ ] イベント詳細 (`/tenant/events/:id`)
- [ ] 会員一覧 (`/tenant/members`)
- [ ] 会員プロフィール (`/tenant/members/:id`)
- [ ] マイページ (`/tenant/my-page`)
- [ ] ショップ (`/tenant/shop`)

### 環境変数・設定
- [ ] .dev.vars作成（ローカル）
- [ ] JWT_SECRET設定
- [ ] PLATFORM_DOMAIN設定
- [ ] STRIPE_SECRET_KEY設定
- [ ] RESEND_API_KEY設定
- [ ] Cloudflare Pages Secrets設定（本番）

### ビルド・デプロイ
- [ ] npm run build 成功
- [ ] PM2起動成功（ローカル）
- [ ] ローカルテスト成功（curl http://localhost:3000）
- [ ] Cloudflare Pages デプロイ成功
- [ ] 本番環境テスト成功（curl https://commons-webapp.pages.dev）
- [ ] マイグレーション適用成功（本番）

### 機能テスト
- [ ] ユーザー登録・ログインが動作
- [ ] テナント作成が動作
- [ ] ダッシュボードが表示される
- [ ] 会員管理（申請・承認・拒否）が動作
- [ ] 投稿・コメントが動作
- [ ] 画像アップロードが動作
- [ ] メール送信が動作（Resend）
- [ ] いいね機能が動作
- [ ] 通知が表示される
- [ ] イベント管理が動作
- [ ] ポイントシステムが動作
- [ ] ショップ機能が動作
- [ ] Stripe決済が動作
- [ ] テーマ切り替えが動作
- [ ] ダークモードが動作
- [ ] レスポンシブデザインが動作

---

## 🔧 重要な実装ポイント

### 1. マルチテナント分離

```typescript
// サブドメインからテナント特定
const host = c.req.header('Host') || ''
const subdomain = host.split('.')[0]

// クエリパラメータからテナント特定
const subdomain = c.req.query('subdomain')

// テナント情報取得
const tenant = await c.env.DB.prepare(`
  SELECT * FROM tenants 
  WHERE subdomain = ? AND status = 'active'
`).bind(subdomain).first()

// 全クエリにtenant_idを付与
const posts = await c.env.DB.prepare(`
  SELECT * FROM posts WHERE tenant_id = ?
`).bind(tenant.id).all()
```

### 2. JWT認証

```typescript
import { SignJWT, jwtVerify } from 'jose'

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

### 7. 静的ファイル配信（重要！）

```typescript
// ❌ 間違い: Node.js用（Cloudflare Workersで動作しない）
import { serveStatic } from '@hono/node-server/serve-static'

// ✅ 正しい: Cloudflare Workers用
import { serveStatic } from 'hono/cloudflare-workers'

app.use('/static/*', serveStatic({ root: './public' }))
```

---

## ⚠️ 注意事項

### Cloudflare Workers の制約

**使用できないもの:**
- Node.js APIモジュール（fs, path, process など）
- ファイルシステムアクセス
- 長時間実行（10ms CPU時間制限）
- WebSocketサーバー

**使用できるもの:**
- Fetch API
- Web Crypto API
- Cloudflare D1（SQLite）
- Cloudflare R2（S3互換）
- 外部API呼び出し

### 開発時の注意

1. **Bash tool のカレントディレクトリ**: 常に `/home/user` から開始されるため、コマンドに `cd /home/user/webapp &&` を付ける
2. **npm コマンドのタイムアウト**: 300秒以上に設定する
3. **PM2の使用**: サービス起動は必ずPM2を使う
4. **ポート管理**: 起動前に `fuser -k 3000/tcp` でポート3000をクリーンアップ
5. **マイグレーション**: ローカル（`--local`）と本番（フラグなし）を分けて実行
6. **Git管理**: .dev.vars、.env を .gitignore に追加

---

## 📚 参考ドキュメント

### プロジェクト内ドキュメント
- `README.md` - プロジェクト概要・機能一覧・API仕様
- `REBUILD_PROMPT.md` - 再構築用詳細プロンプト
- `VISUAL_ASSETS_GUIDE.md` - ビジュアル素材統合ガイド
- `migrations/` - 全36個のマイグレーションファイル
- `src/routes/` - 全36個のAPIルートファイル

### 外部ドキュメント
- **Hono**: https://hono.dev/
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Cloudflare D1**: https://developers.cloudflare.com/d1/
- **Cloudflare R2**: https://developers.cloudflare.com/r2/
- **Stripe**: https://stripe.com/docs
- **Resend**: https://resend.com/docs

---

## 🎉 実装完了後の確認

### 動作確認

1. **ローカル環境**:
   ```bash
   curl http://localhost:3000
   ```

2. **本番環境**:
   ```bash
   curl https://commons-webapp.pages.dev
   ```

3. **機能テスト**:
   - `/register` でテナント作成
   - `/login` でログイン
   - `/dashboard` でダッシュボード表示
   - `/tenant/home?subdomain=test` でテナントページ表示

### パフォーマンステスト
- [ ] ページ読み込み時間 < 3秒
- [ ] API応答時間 < 1秒

### セキュリティテスト
- [ ] JWT署名検証が動作
- [ ] パスワードハッシュ化が動作
- [ ] XSS対策が実装済み
- [ ] CSRF対策が実装済み
- [ ] SQL Injection対策が実装済み

---

## 📊 プロジェクト規模

- **総コード行数**: 約15,000行
- **TypeScriptファイル**: 38個
- **マイグレーションファイル**: 36個
- **静的ファイル**: 6個（CSS/JS）
- **HTMLページ**: 30以上
- **APIエンドポイント**: 100以上
- **データベーステーブル**: 40以上

---

生成日時: 2026-02-19  
バージョン: 1.0.0  
対象: Claude Code AI  
言語: 日本語

---

**このプロンプトを使用することで、Commonsプラットフォーム全体をゼロから完全に再構築できます。実装の詳細は既存プロジェクトのコードを参照してください。**
