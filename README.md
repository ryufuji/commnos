# Commons - Phase 1 MVP

## プロジェクト概要

**Commons**は、誰でも5分で自分色のコミュニティを持てるマルチテナントプラットフォームです。

### 主要機能（Phase 1完成）

✅ **完成した機能:**
- マルチテナント基盤（サブドメインベース）
- ユーザー認証・認可（JWT + bcrypt）
- テナント作成フロー（新規登録）
- プロフィール管理
- 投稿機能（作成・編集・削除）
- 4種類のテーマシステム（Modern Business, Wellness Nature, Creative Studio, Tech Innovation）
- ダークモード対応（洗練されたUI）
- Stripe決済連携（基盤実装済み）

⚠️ **Phase 2で実装予定:**
- 会員管理（申請・承認フロー）
- コメント機能
- メール通知
- コミュニティ参加者向けページの完全なデザイン

## URLs

### 本番環境（Cloudflare Pages）
- **ホーム**: https://e9412add.commons-webapp.pages.dev
- **新規登録**: https://e9412add.commons-webapp.pages.dev/register
- **ログイン**: https://e9412add.commons-webapp.pages.dev/login
- **ダッシュボード**: https://e9412add.commons-webapp.pages.dev/dashboard

### サンドボックス環境
- **ホーム**: https://3000-imu7i4bdyc519gbijlo4z-5185f4aa.sandbox.novita.ai
- **新規登録**: https://3000-imu7i4bdyc519gbijlo4z-5185f4aa.sandbox.novita.ai/register
- **ログイン**: https://3000-imu7i4bdyc519gbijlo4z-5185f4aa.sandbox.novita.ai/login
- **ダッシュボード**: https://3000-imu7i4bdyc519gbijlo4z-5185f4aa.sandbox.novita.ai/dashboard

### GitHub
- **リポジトリ**: https://github.com/ryufuji/commnos

## データアーキテクチャ

### データモデル

**主要テーブル:**
1. **users** - ユーザー情報（ID、メール、パスワード、ニックネーム、アバター、ステータス）
2. **tenants** - テナント情報（ID、サブドメイン、名前、オーナー、プラン、ストレージ、Stripe情報、テーマ）
3. **tenant_memberships** - テナント-ユーザー関連（役割、会員番号、ステータス、期限）
4. **posts** - 投稿（タイトル、コンテンツ、ステータス、公開日時）
5. **tenant_customization** - テナントカスタマイズ設定（テーマプリセット）

**補助テーブル:**
- **comments** - コメント（Phase 2）
- **plans** - プラン情報
- **subscriptions** - サブスクリプション
- **payment_history** - 決済履歴

### ストレージサービス

- **データベース**: Cloudflare D1（SQLite）
- **認証**: JWT（jose ライブラリ）
- **決済**: Stripe（テストモード）

### データフロー

1. **認証フロー**: 
   - ユーザー登録 → パスワードハッシュ化（bcrypt） → ユーザー&テナント作成 → JWT発行
   - ログイン → パスワード検証 → JWT発行

2. **マルチテナント分離**:
   - サブドメインからテナント特定
   - JWTにtenantId含む
   - 全クエリにtenantId自動付与

3. **Stripe連携**:
   - Checkout Session作成 → 決済ページへリダイレクト
   - Webhook受信 → データベース更新（Phase 2で完全実装）

## ユーザーガイド

### 新規登録（コミュニティオーナー向け）

1. **ホームページ**にアクセス
2. 「**無料で始める**」をクリック
3. 以下の情報を入力：
   - メールアドレス
   - パスワード（8文字以上、大文字・小文字・数字を含む）
   - サブドメイン（3-20文字、英数字とハイフン）
   - コミュニティ名
   - サブタイトル（任意）
4. 「**コミュニティを作成**」をクリック
5. 自動的にダッシュボードにリダイレクト

### ログイン

1. 「**ログイン**」ページにアクセス
2. メールアドレスとパスワードを入力
3. 「**ログイン**」をクリック

### テーマ変更

1. ダッシュボードにログイン
2. 「**テーマ設定**」ボタンをクリック
3. 4種類のテーマから選択：
   - **Modern Business**: プロフェッショナル・信頼感（Indigo/Blue）
   - **Wellness Nature**: 自然・健康・リラックス（Emerald Green）
   - **Creative Studio**: クリエイティブ・芸術性（Purple）
   - **Tech Innovation**: 技術革新・先進性（Cyan）
4. 「**保存**」をクリック

### ダークモード

- 右上の月アイコン（🌙）をクリックしてダークモードを切り替え

## 技術スタック

### フロントエンド
- **HTML/CSS/JavaScript** - ピュアJS実装
- **Tailwind CSS** - ユーティリティファーストCSS（CDN）
- **Font Awesome** - アイコンライブラリ（CDN）
- **Axios** - HTTPクライアント（CDN）

### バックエンド
- **Hono** - 軽量Webフレームワーク
- **TypeScript** - 型安全な開発
- **Cloudflare Workers** - エッジランタイム
- **Cloudflare D1** - グローバル分散SQLiteデータベース

### 認証・決済
- **jose** - JWT実装
- **bcrypt** - パスワードハッシュ化
- **Stripe** - 決済処理（テストモード）

### デプロイ
- **Cloudflare Pages** - 静的サイトホスティング
- **Wrangler** - Cloudflare開発ツール
- **GitHub** - バージョン管理

## API仕様

### 認証API

#### POST /api/auth/register
テナント作成（新規登録）

**Request:**
```json
{
  "email": "owner@example.com",
  "password": "SecurePass123!",
  "subdomain": "my-community",
  "communityName": "マイコミュニティ",
  "subtitle": "素晴らしいコミュニティ",
  "theme": "modern-business"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { "id": 1, "email": "...", "nickname": "..." },
  "tenant": { "id": 1, "subdomain": "my-community", "theme": "modern-business", ... }
}
```

#### POST /api/auth/login
ログイン

**Request:**
```json
{
  "email": "owner@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { ... },
  "membership": { "role": "owner", "member_number": "M-001", ... }
}
```

### プロフィールAPI

#### GET /api/profile
プロフィール取得（要認証）

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "owner@example.com",
    "nickname": "マイコミュニティ",
    "avatar_url": null,
    "bio": null,
    "status": "active"
  }
}
```

#### PUT /api/profile
プロフィール更新（要認証）

**Request:**
```json
{
  "nickname": "新しいニックネーム",
  "bio": "自己紹介文"
}
```

### 投稿API

#### POST /api/posts
投稿作成（要認証）

**Request:**
```json
{
  "title": "記事タイトル",
  "content": "マークダウン対応のコンテンツ\n\n## 見出し\n\n- リスト",
  "status": "published"
}
```

**Response:**
```json
{
  "success": true,
  "post": {
    "id": 1,
    "title": "記事タイトル",
    "content": "...",
    "excerpt": "...",
    "status": "published",
    "published_at": "2025-12-26T10:00:00.000Z"
  }
}
```

### Stripe API

#### POST /api/stripe/checkout
Checkoutセッション作成（要認証）

**Request:**
```json
{
  "plan": "starter"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

## テストアカウント

### オーナーアカウント
- **Email**: phase1-test@example.com
- **Password**: SecurePass123!
- **Subdomain**: phase1-final
- **Theme**: wellness-nature

## デプロイ

### 本番環境（Cloudflare Pages）
- **プラットフォーム**: Cloudflare Pages
- **プロジェクト名**: commons-webapp
- **ステータス**: ✅ デプロイ完了
- **URL**: https://e9412add.commons-webapp.pages.dev
- **データベース**: Cloudflare D1（commons-webapp-production）
- **環境変数**: JWT_SECRET, PLATFORM_DOMAIN, STRIPE_SECRET_KEY 設定済み
- **最終デプロイ**: 2025-12-26

### ローカル開発

```bash
# 依存関係インストール
npm install

# ビルド
npm run build

# 開発サーバー起動（PM2）
pm2 start ecosystem.config.cjs

# サービス確認
curl http://localhost:3000/health
```

### Cloudflare Pages デプロイ

```bash
# ビルド
npm run build

# デプロイ
npm run deploy:prod

# または直接
npx wrangler pages deploy dist --project-name webapp
```

### 環境変数

以下の環境変数が必要です：

**開発環境（.dev.vars）:**
```
JWT_SECRET=your_jwt_secret_key
PLATFORM_DOMAIN=commons.com
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
```

**本番環境（Cloudflare Pages）:**
```bash
npx wrangler pages secret put JWT_SECRET --project-name webapp
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name webapp
# ...その他の環境変数
```

## トラブルシューティング

### JWT署名エラー
- `.dev.vars`に`JWT_SECRET`が設定されているか確認
- サービスを再起動: `pm2 restart webapp`

### Stripe決済エラー
- Stripe APIキーがテストモードか確認
- 環境変数が正しく設定されているか確認

### データベースエラー
- マイグレーションが適用されているか確認:
  ```bash
  npx wrangler d1 migrations apply webapp-production --local
  ```

## 開発ステータス

### Phase 1（MVP）完成状況

| 機能 | ステータス | 週 |
|------|----------|-----|
| 環境構築 | ✅ 完了 | Week 1-2 |
| 認証・認可 | ✅ 完了 | Week 3-4 |
| テナント作成 | ✅ 完了 | Week 3-4 |
| プロフィール管理 | ✅ 完了 | Week 5-6 |
| 投稿機能 | ✅ 完了（作成） | Week 7-8 |
| Stripe連携 | ✅ 基盤実装 | Week 9-10 |
| テーマシステム | ✅ 完了 | Week 11-12 |
| ダークモード | ✅ 完了 | Week 11-12 |
| 総合テスト | ✅ 完了 | Week 13 |
| デプロイ | ✅ 完了 | Week 13 |

**全体進捗: 100% (Phase 1 MVP完成)**

### Phase 2 で実装予定

- 会員管理フロー（申請・承認）
- コメント機能完全実装
- メール通知システム
- コミュニティ参加者向けページの洗練
- レスポンシブ対応の強化
- パフォーマンス最適化

## ライセンス

© 2025 Commons - Phase 1 MVP

---

**最終更新**: 2025-12-26  
**バージョン**: Phase 1 MVP  
**次のステップ**: Cloudflare Pages へのデプロイ
