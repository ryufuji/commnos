# Changelog

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
