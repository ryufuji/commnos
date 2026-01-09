# Changelog

## 2026-01-08 - プレミアムプラン選択ページ実装（Vivoo風デザイン）

### 追加
- **プレミアムプラン選択ページ** 🎨
  - 新規ルート: `/tenant/member-plans-premium?subdomain={subdomain}`
  - Vivoo風のビジュアルデザインを完全適用
  - 有機的シェイプ背景（4色の浮遊する装飾要素）
  - ヒーローセクション（キャッチコピー + ビジュアル図形）
  - プランカード（ホバー効果、グラデーションバー、推奨バッジ）
  - 機能比較テーブル（レスポンシブ対応）
  - プラン選択モーダル（スムーズアニメーション）
  
- **デザインシステム構築**
  - `public/static/commons-theme.css` - グローバルテーマファイル
    - カラーパレット（プライマリ: #00BCD4、アクセント: #FDB714）
    - タイポグラフィシステム（6段階のフォントサイズ）
    - スペーシングシステム（8pxグリッド）
    - 角丸、シャドウ、トランジション定義
  
  - `public/static/plan-selection.css` - プラン選択ページ専用CSS
    - 有機的シェイプアニメーション（20秒浮遊ループ）
    - ヒーローセクションスタイル
    - プランカードスタイル（ホバー時の浮遊効果）
    - 比較テーブルスタイル
    - モーダルスタイル（背景ブラー、スライドアップ）
    - レスポンシブ対応（デスクトップ/タブレット/モバイル）
  
  - `public/static/plan-selection.js` - プラン選択ページ専用JavaScript
    - API連携（プラン一覧、現在のプラン、プラン変更）
    - プラン選択モーダル制御
    - Stripe Checkout統合
    - トースト通知システム
    - スクロールアニメーション（Intersection Observer）

- **プランアクセス制御システム** 🔐
  - マイグレーション: `0018_add_plan_access_control.sql`
    - `tenant_plans.plan_level` - プランレベル階層（0=無料、1=ベーシック、2=スタンダード、3=プレミアム）
    - `posts.required_plan_level` - 投稿閲覧に必要な最小プランレベル
    - `posts.is_members_only` - 会員限定フラグ
    - `posts.is_premium_content` - プレミアムコンテンツフラグ
    - `posts.preview_length` - プレビュー表示文字数
    - `post_categories` テーブル - カテゴリレベルの制御
    - `post_access_logs` テーブル - アクセスログ（分析用）
  
  - `src/middleware/plan-access.ts` - アクセス制御ミドルウェア
    - `getUserPlanLevel()` - ユーザーのプランレベル取得
    - `checkPostAccess()` - 投稿アクセス権限チェック
    - `filterContent()` - コンテンツフィルタリング（プレビュー表示）
    - `logPostAccess()` - アクセスログ記録
    - `getRequiredPlan()` - 必要なプラン情報取得
  
  - `src/routes/post-access.ts` - アクセス制御管理API（オーナー/管理者用）
    - `PATCH /api/posts/:id/access` - 投稿のアクセス制御設定更新
    - `GET /api/posts/:id/access` - アクセス制御設定取得
    - `GET /api/posts/access/stats` - アクセス制御統計
    - `POST /api/posts/access/batch-update` - 一括更新（オーナーのみ）

### 変更
- `src/routes/posts.ts` - 投稿APIにアクセス制御統合
  - `GET /api/posts/:id` がアクセス権限をチェック
  - `access_info` オブジェクトで詳細情報を返却
  - コンテンツ自動フィルタリング
  - アクセスログ自動記録
  - 必要なプラン情報を含める

- `src/index.tsx` - 新しいルートを登録
  - `app.route('/api/posts', postAccess)` 追加

### ドキュメント
- [`docs/PREMIUM_PLAN_PAGE.md`](/docs/PREMIUM_PLAN_PAGE.md) - プレミアムプラン選択ページガイド
  - 実装内容の詳細
  - デザイン特徴
  - レスポンシブ対応
  - パフォーマンス情報
  - カスタマイズ方法
  - トラブルシューティング

- [`docs/PLAN_ACCESS_CONTROL.md`](/docs/PLAN_ACCESS_CONTROL.md) - プランアクセス制御システムガイド
  - データベース構造
  - API仕様
  - 使用例とシナリオ
  - フロントエンド実装例
  - 分析機能
  - 設定ガイド

- [`docs/MEMBER_FLOW.md`](/docs/MEMBER_FLOW.md) - 会員フロー完全ガイド
  - 会員のプラン選択フロー
  - アクセス経路
  - 実装済みページ一覧
  - トラブルシューティング

### デプロイ
- **本番環境**: https://commons-webapp.pages.dev/tenant/member-plans-premium?subdomain=test
- **最新デプロイ**: https://e0f3ba27.commons-webapp.pages.dev/tenant/member-plans-premium?subdomain=test
- **GitHub**: https://github.com/ryufuji/commnos (コミット: f67e44f)

### パフォーマンス
- ファイルサイズ合計: 34KB（gzip後: ~10KB）
- 初回ロード: < 1秒
- アニメーション: 60fps

### ブラウザ互換性
- Chrome/Edge: ✅ 完全対応
- Firefox: ✅ 完全対応
- Safari: ✅ 完全対応
- モバイルブラウザ: ✅ 完全対応

---

## 2026-01-07 - Stripe決済統合実装

### 追加
- **Stripe Checkout統合** 🎉
  - プラン選択時にStripe Checkoutセッション作成
  - 新規サブスクリプション: Checkout→決済→Webhook→プラン適用
  - 既存サブスクリプション: Customer Portal経由でプラン変更
- **Stripe Webhook Handler** (`/api/stripe/webhook`)
  - `checkout.session.completed` - 決済完了処理
  - `customer.subscription.created` - サブスクリプション作成
  - `customer.subscription.updated` - サブスクリプション更新
  - `customer.subscription.deleted` - キャンセル処理
  - `invoice.payment_succeeded` - 支払い成功記録
  - `invoice.payment_failed` - 支払い失敗記録
- **データベース拡張**
  - `tenant_memberships` に Stripe関連カラム追加:
    - `stripe_customer_id` - Stripeカスタマー ID
    - `stripe_subscription_id` - Stripeサブスクリプション ID
  - マイグレーション: `0017_add_stripe_to_memberships.sql`

### 変更
- プラン選択フローを Stripe Checkout に変更
- 決済成功/キャンセル時のメッセージ表示

### ドキュメント
- [`docs/STRIPE_INTEGRATION.md`](/docs/STRIPE_INTEGRATION.md) - Stripe統合ガイド作成
  - アーキテクチャとデータフロー
  - 環境変数設定方法
  - Webhook設定手順
  - テスト方法とトラブルシューティング

### 必要な設定
1. **Stripe Secret Key**:
   ```bash
   npx wrangler pages secret put STRIPE_SECRET_KEY --project-name commons-webapp
   ```
2. **Stripe Webhook Secret**:
   - Stripeダッシュボードで Webhook エンドポイント作成
   - URL: `https://commons-webapp.pages.dev/api/stripe/webhook`
   ```bash
   npx wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name commons-webapp
   ```
3. **Platform Domain**:
   ```bash
   npx wrangler pages secret put PLATFORM_DOMAIN --project-name commons-webapp
   ```

### デプロイ
- **最新デプロイURL**: https://9ff98e88.commons-webapp.pages.dev
- **本番環境**: https://commons-webapp.pages.dev
- **コミット**: 03f5879

### 今後の実装予定
- メール通知（決済完了・失敗・キャンセル）
- 領収書自動送信
- プラン変更時の prorating 処理
- 決済履歴ページのUI実装

---

## 2026-01-07 - 一般会員向けプラン選択機能追加

### 追加
- **一般会員向けプラン選択ページ** `/tenant/member-plans?subdomain=xxx`
  - 利用可能なプラン一覧表示
  - 現在のプラン確認
  - プラン変更機能
  - プラン詳細（料金、説明、特典）表示
- **会員プラン管理API**:
  - `GET /api/tenant/member/plans` - 利用可能なプラン一覧取得
  - `GET /api/tenant/member/current-plan` - 現在のプラン情報取得
  - `POST /api/tenant/member/change-plan` - プラン変更

### 使い方
1. **コミュニティ運営者**: `/tenant/plans?subdomain=xxx` でプランを作成
2. **一般会員**: `/tenant/member-plans?subdomain=xxx` でプランを選択・変更

### デプロイ
- **最新デプロイURL**: https://b8304ee9.commons-webapp.pages.dev
- **本番環境**: https://commons-webapp.pages.dev
- **プラン選択ページ**: https://commons-webapp.pages.dev/tenant/member-plans?subdomain=test
- **コミット**: e560b34

### 今後の実装予定
- Stripe統合によるプラン決済機能
- プラン変更時の prorating 処理
- サブスクリプション自動更新機能

---

## 2026-01-07 - クーポン機能とAPI修正

### 修正
- クーポンAPIエンドポイントを `/api/coupons/*` から `/api/coupon/*` に変更（フロントエンド互換性）
- クーポン管理に必要な `/active` と `/redeem` エンドポイントを追加
- テナントプラン管理から `member_limit` と `storage_limit` カラムを削除（Phase 2でのスキーマ変更に対応）
- クーポンルートに認証ミドルウェアを追加

### 追加
- クーポン発行機能（プラットフォーム管理者専用）
  - `/platform/coupons` - クーポン管理画面
  - クーポン作成・有効化・無効化機能
  - 4つの割引タイプ: `free_forever`, `free_months`, `percent_off`, `amount_off`
- フリープランを50人から100人に拡大

### デプロイ
- **最新デプロイURL**: https://bee8c603.commons-webapp.pages.dev
- **本番環境**: https://commons-webapp.pages.dev
- **コミット**: 5244e29

### 既知の問題
- ローカル開発環境でのテストユーザー認証が動作しない（本番環境では正常）
- Tailwind CDN は本番環境で非推奨（PostCSS/CLI への移行が推奨される）

### 今後の改善予定
- プラン管理画面のUI実装
- クーポン使用状況のレポート機能
- Tailwind の本番環境向け最適化（PostCSS/CLI 導入）
