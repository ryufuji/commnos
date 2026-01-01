# ステージング環境のセットアップ

## 問題

ステージング環境でログイン時に以下のエラーが発生：
```
Imported HMAC key length (0) must be a non-zero value up to 7 bits less than, and no greater than, the bit length of the raw key data (0).
```

**原因**: ステージング環境（Preview環境）に環境変数が設定されていない

## 解決方法

### Option 1: Cloudflare Dashboard で設定（推奨）

1. **Cloudflare Dashboard にアクセス**
   - https://dash.cloudflare.com
   - Pages → `commons-webapp` を選択

2. **Settings タブ → Environment variables**
   - `Preview` セクションを探す

3. **環境変数を追加**
   - `JWT_SECRET`: （Production と同じ値、またはテスト用の値）
   - `PLATFORM_DOMAIN`: `commons.com`
   - `STRIPE_SECRET_KEY`: （Stripe テストキー）
   - `RESEND_API_KEY`: （Resend API キー）

4. **保存後、再デプロイ**
   ```bash
   npm run deploy:staging
   ```

### Option 2: wrangler CLI で設定（コマンドライン）

**注意**: `wrangler pages secret put` は Production 環境のみ対応。Preview環境の環境変数はDashboardから設定する必要があります。

### Option 3: 全環境で同じ環境変数を使用

Cloudflare Dashboard で設定時に：
- Production と Preview の**両方**に同じ環境変数を追加
- または、「Inherit from Production」オプションを有効化（もしあれば）

## 環境変数一覧

| 変数名 | 説明 | Production | Staging/Preview |
|--------|------|------------|-----------------|
| `JWT_SECRET` | JWT署名用シークレットキー | 必須 | 必須 |
| `PLATFORM_DOMAIN` | プラットフォームドメイン | `commons.com` | `commons.com` |
| `STRIPE_SECRET_KEY` | Stripe シークレットキー | 本番キー | テストキー |
| `RESEND_API_KEY` | Resend APIキー | 本番キー | 同じでOK |

## 確認方法

1. ステージング環境にアクセス: https://staging.commons-webapp.pages.dev
2. ログイン画面でテストログイン
3. エラーが出なければ成功 ✅

## 参考

- Cloudflare Pages Environment Variables: https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables
- Cloudflare Dashboard: https://dash.cloudflare.com
