# Commons - Phase 2 完了

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
- **メール通知システム** - Resend API統合、会員管理通知
- **デザイン洗練** - ヒーローセクション、カードグリッド、タイポグラフィ改善
- **完全レスポンシブ対応** - モバイル/タブレット/デスクトップ最適化
- **画像アップロード** - R2バケット統合、プロフィール画像、投稿サムネイル ✨ 新機能

⚠️ **今後実装予定:**
- コメント返信通知メール
- 高度な分析機能

## URLs

### 本番環境（Cloudflare Pages）
- **最新デプロイ**: https://268125e1.commons-webapp.pages.dev
- **新規登録**: https://268125e1.commons-webapp.pages.dev/register
- **ログイン**: https://268125e1.commons-webapp.pages.dev/login
- **ダッシュボード**: https://268125e1.commons-webapp.pages.dev/dashboard
- **会員管理**: https://268125e1.commons-webapp.pages.dev/members
- **プロフィール**: https://268125e1.commons-webapp.pages.dev/profile
- **投稿詳細例**: https://2835f2a0.commons-webapp.pages.dev/posts/1
- **画像アップロードテスト**: https://2835f2a0.commons-webapp.pages.dev/test-avatar.html

### サンドボックス環境
- **ホーム**: https://3000-imu7i4bdyc519gbijlo4z-5185f4aa.sandbox.novita.ai

### GitHub
- **リポジトリ**: https://github.com/ryufuji/commnos
- **最新コミット**: d7d8f28

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
- **メール**: Resend API ✨ Phase 2
- **画像ストレージ**: Cloudflare R2 Bucket ✨ Phase 2
  - アバター画像（最大5MB、JPEG/PNG/GIF/WebP）
  - 投稿サムネイル（最大10MB、JPEG/PNG/GIF/WebP）

### データフロー

1. **認証フロー**: 
   - ユーザー登録 → パスワードハッシュ化（bcrypt） → ユーザー&テナント作成 → JWT発行
   - ログイン → パスワード検証 → JWT発行

2. **マルチテナント分離**:
   - サブドメインからテナント特定
   - JWTにtenantId含む
   - 全クエリにtenantId自動付与

3. **会員管理フロー** ✨ Phase 2:
   - 会員申請 → 受付確認メール → 管理者に通知メール → 管理者承認 → 承認メール + 会員番号発行 → active状態

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
   - テーマ（4種類から選択）
4. 「**コミュニティを作成**」をクリック
5. 自動的にダッシュボードにリダイレクト

#### 2. 会員管理 ✨ Phase 2

1. ダッシュボードから「**会員管理**」をクリック
2. **承認待ちタブ**:
   - 新規申請を確認（新規申請時にメールで通知）
   - 「承認」または「却下」ボタンをクリック
   - 承認時: 会員番号が自動発行され、申請者にメール送信
   - 却下時: 申請者に丁寧な拒否メール送信
3. **承認済み会員タブ**:
   - 現在の会員一覧を確認
   - 会員番号、役割、登録日を表示

#### 3. テーマ変更

1. ダッシュボードにログイン
2. 「**テーマ設定**」ボタンをクリック
3. 4種類のテーマから選択：
   - **Modern Business**: プロフェッショナル・信頼感（Indigo/Blue）
   - **Wellness Nature**: 自然・健康・リラックス（Emerald Green）
   - **Creative Studio**: クリエイティブ・芸術性（Orange）
   - **Tech Innovation**: 技術革新・先進性（Cyan）
4. 「**保存**」をクリック

#### 4. ダークモード

- 右上の月アイコン（🌙）をクリックしてダークモードを切り替え

### コミュニティ参加者向け ✨ Phase 2

#### 1. 会員申請

1. コミュニティのホームページにアクセス
2. 「**会員登録**」または「**今すぐ参加する**」ボタンをクリック
3. 以下の情報を入力：
   - ニックネーム
   - メールアドレス
   - パスワード（8文字以上）
   - 利用規約に同意
4. 「**申請を送信**」をクリック
5. **受付確認メール**が届く（即時）
6. 管理者の承認を待つ
7. **承認メール**が届いたらログイン可能

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

### 認証・決済・通知
- **jose** - JWT実装
- **bcrypt** - パスワードハッシュ化
- **Stripe** - 決済処理（テストモード）
- **Resend API** - メール送信サービス ✨ Phase 2

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
会員申請（メール通知付き）

**Request:**
```json
{
  "nickname": "山田太郎",
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**メール送信:**
- 申請者へ: 受付確認メール
- 管理者（オーナー）へ: 新規申請通知メール

#### GET /api/admin/members/pending
承認待ち会員一覧（管理者のみ）

#### POST /api/admin/members/:id/approve
会員承認（管理者のみ、メール通知付き）

**メール送信:**
- 申請者へ: 承認通知メール（会員番号含む）

#### POST /api/admin/members/:id/reject
会員却下（管理者のみ、メール通知付き）

**メール送信:**
- 申請者へ: 拒否通知メール

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

### 画像アップロードAPI ✨ Phase 2

#### POST /api/upload/avatar
プロフィール画像アップロード（要認証）

**Request:**
```multipart/form-data
avatar: File (JPEG/PNG/GIF/WebP, 最大5MB)
```

**Response:**
```json
{
  "success": true,
  "avatar_url": "/api/images/avatars/123-1234567890.jpg"
}
```

#### POST /api/upload/post-thumbnail
投稿サムネイル画像アップロード（要認証）

**Request:**
```multipart/form-data
thumbnail: File (JPEG/PNG/GIF/WebP, 最大10MB)
```

**Response:**
```json
{
  "success": true,
  "thumbnail_url": "/api/images/thumbnails/1234567890-abc123.jpg"
}
```

#### GET /api/images/:path
画像取得（公開アクセス）

**パス例:**
- `/api/images/avatars/123-1234567890.jpg`
- `/api/images/thumbnails/1234567890-abc123.jpg`

**機能:**
- R2バケットから画像を取得
- 1年間のキャッシュヘッダー付与
- ETag対応

## デプロイ

### 本番環境（Cloudflare Pages）
- **プラットフォーム**: Cloudflare Pages
- **プロジェクト名**: commons-webapp
- **ステータス**: ✅ デプロイ完了
- **URL**: https://2835f2a0.commons-webapp.pages.dev
- **データベース**: Cloudflare D1（commons-webapp-production）
- **R2バケット**: commons-images ✨ Phase 2
- **環境変数**: JWT_SECRET, PLATFORM_DOMAIN, STRIPE_SECRET_KEY, RESEND_API_KEY 設定済み
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
# R2バケット作成（初回のみ）✨ Phase 2
npx wrangler r2 bucket create commons-images

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
RESEND_API_KEY=re_...
```

**本番環境（Cloudflare Pages）:**
```bash
npx wrangler pages secret put JWT_SECRET --project-name commons-webapp
npx wrangler pages secret put PLATFORM_DOMAIN --project-name commons-webapp
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name commons-webapp
npx wrangler pages secret put RESEND_API_KEY --project-name commons-webapp
```

### メール通知設定（Resend API）

#### 1. Resendアカウント作成
1. https://resend.com にアクセス
2. 無料アカウント登録（GitHub/Google OAuth対応）
3. ダッシュボードでAPI Keyを発行

#### 2. Cloudflare Pages Secretsに設定
```bash
echo "YOUR_RESEND_API_KEY" | npx wrangler pages secret put RESEND_API_KEY --project-name commons-webapp
```

#### 3. テスト
1. 本番環境で会員申請を実行
2. メールボックスを確認（申請者）
3. 管理者のメールボックスを確認（オーナー）

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

### メール送信エラー
- `RESEND_API_KEY`が設定されているか確認
- Resendダッシュボードで送信ログを確認
- ドメイン認証が完了しているか確認（本番環境）

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
| **会員管理フロー** | ✅ 完了 | 2025-12-26 |
| - 会員申請フォーム | ✅ 完了 | 2025-12-26 |
| - 承認待ち一覧 | ✅ 完了 | 2025-12-26 |
| - 承認・却下機能 | ✅ 完了 | 2025-12-26 |
| - 承認済み会員一覧 | ✅ 完了 | 2025-12-26 |
| **コメント機能** | ✅ 完了 | 2025-12-26 |
| - コメント投稿 | ✅ 完了 | 2025-12-26 |
| - コメント一覧 | ✅ 完了 | 2025-12-26 |
| - 返信機能（ネスト） | ✅ 完了 | 2025-12-26 |
| - コメント削除 | ✅ 完了 | 2025-12-26 |
| **メール通知システム** | ✅ 完了 | 2025-12-26 |
| - Resend API統合 | ✅ 完了 | 2025-12-26 |
| - 申請受付メール | ✅ 完了 | 2025-12-26 |
| - 承認通知メール | ✅ 完了 | 2025-12-26 |
| - 拒否通知メール | ✅ 完了 | 2025-12-26 |
| - 管理者通知メール | ✅ 完了 | 2025-12-26 |
| **デザイン洗練** | ✅ 完了 | 2025-12-26 |
| - ヒーローセクション | ✅ 完了 | 2025-12-26 |
| - 投稿カードグリッド | ✅ 完了 | 2025-12-26 |
| - コミュニティ情報カード | ✅ 完了 | 2025-12-26 |
| - 投稿詳細タイポグラフィ | ✅ 完了 | 2025-12-26 |
| **レスポンシブ対応** | ✅ 完了 | 2025-12-26 |
| - ハンバーガーメニュー | ✅ 完了 | 2025-12-26 |
| - グリッドレイアウト | ✅ 完了 | 2025-12-26 |
| - モバイル最適化 | ✅ 完了 | 2025-12-26 |
| - タブレット最適化 | ✅ 完了 | 2025-12-26 |
| **画像アップロード** | ✅ 完了 | 2025-12-26 |
| - R2バケット統合 | ✅ 完了 | 2025-12-26 |
| - プロフィール画像 | ✅ 完了 | 2025-12-26 |
| - 投稿サムネイル | ✅ 完了 | 2025-12-26 |
| - 画像取得API | ✅ 完了 | 2025-12-26 |

**Phase 2 進捗: 100%（6/6機能グループ完成）** ✨

### 今後の実装予定（Phase 3）

- R2バケット（画像アップロード）
- コメント返信通知メール
- 高度な分析機能
- 全文検索機能
- タグ・カテゴリ管理

## ライセンス

© 2025 Commons - Phase 2

---

**最終更新**: 2025-12-26  
**バージョン**: Phase 2 完了（会員管理・コメント・メール通知・デザイン洗練・レスポンシブ対応）  
**次のステップ**: Phase 3（R2バケット・高度な機能）
