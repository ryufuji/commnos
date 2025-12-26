# Commons - Phase 2 実装完了

## プロジェクト概要

**Commons**は、誰でも5分で自分色のコミュニティを持てるマルチテナントプラットフォームです。

### 主要機能

✅ **Phase 1 完成機能:**
- マルチテナント基盤（サブドメインベース）
- ユーザー認証・認可（JWT + bcrypt）
- テナント作成フロー（新規登録）
- プロフィール管理
- 投稿機能（作成・編集・削除）
- 4種類のテーマシステム（Modern Business, Wellness Nature, Creative Studio, Tech Innovation）
- ダークモード対応（洗練されたUI）
- Stripe決済連携（基盤実装済み）

✅ **Phase 2 完成機能:**
- **会員管理フロー** - 会員申請・承認・拒否・会員一覧
- **コメント機能** - 投稿へのコメント・返信（ネスト対応）

⚠️ **今後実装予定:**
- メール通知システム
- コミュニティ参加者向けページのデザイン洗練
- レスポンシブ対応強化
- R2バケット（画像アップロード）

## URLs

### 本番環境（Cloudflare Pages）
- **最新デプロイ**: https://31d620e7.commons-webapp.pages.dev
- **新規登録**: https://31d620e7.commons-webapp.pages.dev/register
- **ログイン**: https://31d620e7.commons-webapp.pages.dev/login
- **ダッシュボード**: https://31d620e7.commons-webapp.pages.dev/dashboard
- **会員管理**: https://31d620e7.commons-webapp.pages.dev/members
- **投稿詳細例**: https://31d620e7.commons-webapp.pages.dev/posts/1

### サンドボックス環境
- **ホーム**: https://3000-imu7i4bdyc519gbijlo4z-5185f4aa.sandbox.novita.ai

### GitHub
- **リポジトリ**: https://github.com/ryufuji/commnos

## データアーキテクチャ

### データモデル

**主要テーブル（10テーブル）:**
1. **users** - ユーザー情報（ID、メール、パスワード、ニックネーム、アバター、bio、ステータス）
2. **tenants** - テナント情報（ID、サブドメイン、名前、オーナー、プラン、ストレージ、Stripe情報、テーマ）
3. **tenant_memberships** - テナント-ユーザー関連（役割、会員番号、ステータス、期限）
4. **posts** - 投稿（タイトル、コンテンツ、ステータス、公開日時、閲覧数）
5. **comments** - コメント（内容、親コメントID、作成日時）✨ Phase 2
6. **tenant_customization** - テナントカスタマイズ設定（テーマプリセット）
7. **tenant_features** - テナント機能設定
8. **plans** - プラン情報
9. **subscriptions** - サブスクリプション
10. **payment_history** - 決済履歴

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

3. **会員管理フロー** ✨ Phase 2:
   - 会員申請 → 承認待ち → 管理者承認 → 会員番号発行 → active状態

4. **コメントフロー** ✨ Phase 2:
   - コメント投稿 → parent_comment_id指定で返信 → ネスト表示

## ユーザーガイド

### コミュニティオーナー向け

#### 1. 新規登録（コミュニティ作成）

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

#### 2. 会員管理 ✨ Phase 2

1. ダッシュボードから「**会員管理**」をクリック
2. **承認待ちタブ**:
   - 新規申請を確認
   - 「承認」または「却下」ボタンをクリック
3. **承認済み会員タブ**:
   - 現在の会員一覧を確認
   - 会員番号、役割を表示

#### 3. テーマ変更

1. ダッシュボードにログイン
2. 「**テーマ設定**」ボタンをクリック
3. 4種類のテーマから選択：
   - **Modern Business**: プロフェッショナル・信頼感（Indigo/Blue）
   - **Wellness Nature**: 自然・健康・リラックス（Emerald Green）
   - **Creative Studio**: クリエイティブ・芸術性（Purple）
   - **Tech Innovation**: 技術革新・先進性（Cyan）
4. 「**保存**」をクリック

#### 4. ダークモード

- 右上の月アイコン（🌙）をクリックしてダークモードを切り替え

### コミュニティ参加者向け ✨ Phase 2

#### 1. 会員申請

1. コミュニティのホームページにアクセス
2. 「**会員登録**」ボタンをクリック
3. 以下の情報を入力：
   - ニックネーム
   - メールアドレス
   - パスワード（8文字以上）
   - 利用規約に同意
4. 「**申請を送信**」をクリック
5. 承認待ち状態になり、メールで通知（今後実装）

#### 2. コメント投稿 ✨ Phase 2

1. 投稿詳細ページにアクセス
2. コメント投稿フォームに入力（ログイン必須）
3. 「**コメントを投稿**」をクリック
4. **返信する場合**:
   - コメントの「返信」ボタンをクリック
   - 返信フォームに入力して投稿
   - ネスト表示で返信が表示される

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

#### POST /api/auth/login
ログイン

### 会員管理API ✨ Phase 2

#### POST /api/members/apply
会員申請

**Request:**
```json
{
  "nickname": "山田太郎",
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### GET /api/admin/members/pending
承認待ち会員一覧（管理者のみ）

#### POST /api/admin/members/:id/approve
会員承認（管理者のみ）

#### POST /api/admin/members/:id/reject
会員却下（管理者のみ）

#### GET /api/admin/members/active
承認済み会員一覧（管理者のみ）

### コメントAPI ✨ Phase 2

#### POST /api/posts/:id/comments
コメント投稿

**Request:**
```json
{
  "content": "素晴らしい投稿ですね！",
  "parent_comment_id": null
}
```

**返信の場合:**
```json
{
  "content": "ありがとうございます！",
  "parent_comment_id": 1
}
```

#### GET /api/posts/:id/comments
コメント一覧取得

**Response:**
```json
{
  "success": true,
  "comments": [
    {
      "id": 1,
      "content": "素晴らしい投稿ですね！",
      "parent_comment_id": null,
      "user_id": 2,
      "user_name": "山田太郎",
      "created_at": "2025-12-26T10:00:00.000Z"
    }
  ]
}
```

#### DELETE /api/posts/:postId/comments/:commentId
コメント削除（投稿者または管理者のみ）

### プロフィールAPI

#### GET /api/profile
プロフィール取得（要認証）

#### PUT /api/profile
プロフィール更新（要認証）

### 投稿API

#### POST /api/posts
投稿作成（要認証）

#### GET /api/posts
投稿一覧取得

### Stripe API

#### POST /api/stripe/checkout
Checkoutセッション作成（要認証）

## デプロイ

### 本番環境（Cloudflare Pages）
- **プラットフォーム**: Cloudflare Pages
- **プロジェクト名**: commons-webapp
- **ステータス**: ✅ デプロイ完了
- **URL**: https://31d620e7.commons-webapp.pages.dev
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
# マイグレーション適用（本番）
npx wrangler d1 migrations apply commons-webapp-production --remote

# ビルド
npm run build

# デプロイ
npm run deploy:prod

# または直接
npx wrangler pages deploy dist --project-name commons-webapp
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
npx wrangler pages secret put JWT_SECRET --project-name commons-webapp
npx wrangler pages secret put PLATFORM_DOMAIN --project-name commons-webapp
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name commons-webapp
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
  npx wrangler d1 migrations apply commons-webapp-production --local
  npx wrangler d1 migrations apply commons-webapp-production --remote
  ```

## 開発ステータス

### Phase 1（MVP）完成状況

| 機能 | ステータス | 週 |
|------|----------|-----|
| 環境構築 | ✅ 完了 | Week 1-2 |
| 認証・認可 | ✅ 完了 | Week 3-4 |
| テナント作成 | ✅ 完了 | Week 3-4 |
| プロフィール管理 | ✅ 完了 | Week 5-6 |
| 投稿機能 | ✅ 完了 | Week 7-8 |
| Stripe連携 | ✅ 基盤実装 | Week 9-10 |
| テーマシステム | ✅ 完了 | Week 11-12 |
| ダークモード | ✅ 完了 | Week 11-12 |
| 総合テスト | ✅ 完了 | Week 13 |
| デプロイ | ✅ 完了 | Week 13 |

**Phase 1 進捗: 100%**

### Phase 2 完成状況

| 機能 | ステータス | 実装日 |
|------|----------|--------|
| 会員管理フロー | ✅ 完了 | 2025-12-26 |
| - 会員申請フォーム | ✅ 完了 | 2025-12-26 |
| - 承認待ち一覧 | ✅ 完了 | 2025-12-26 |
| - 承認・却下機能 | ✅ 完了 | 2025-12-26 |
| - 承認済み会員一覧 | ✅ 完了 | 2025-12-26 |
| コメント機能 | ✅ 完了 | 2025-12-26 |
| - コメント投稿 | ✅ 完了 | 2025-12-26 |
| - コメント一覧 | ✅ 完了 | 2025-12-26 |
| - 返信機能（ネスト） | ✅ 完了 | 2025-12-26 |
| - コメント削除 | ✅ 完了 | 2025-12-26 |

**Phase 2 進捗: 約50%（2/4機能完成）**

### 今後の実装予定

- メール通知システム
- コミュニティ参加者向けページのデザイン洗練
- レスポンシブ対応強化
- R2バケット（画像アップロード）

## ライセンス

© 2025 Commons - Phase 2

---

**最終更新**: 2025-12-26  
**バージョン**: Phase 2 - 会員管理＆コメント機能実装  
**次のステップ**: メール通知システム / デザイン洗練
