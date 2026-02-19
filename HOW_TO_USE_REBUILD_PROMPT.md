# Claude Codeで Commons を再構築する方法

このガイドでは、`CLAUDE_CODE_REBUILD_FULL_PROMPT.md` を使用してClaude CodeでCommonsプラットフォームを完全に再構築する方法を説明します。

---

## 🎯 前提条件

### 必要なもの

1. **Claude Code へのアクセス**
   - Claude Code（AI開発アシスタント）にアクセスできる環境

2. **Cloudflare アカウント**
   - https://dash.cloudflare.com/ でアカウント作成
   - Cloudflare Pages, D1, R2 を利用可能にする（無料プラン可）

3. **外部サービスのAPIキー（オプション）**
   - **Stripe**: https://stripe.com/ （決済機能を使う場合）
   - **Resend**: https://resend.com/ （メール送信機能を使う場合）

4. **GitHub アカウント（オプション）**
   - コードをGitHubで管理する場合

---

## 📝 再構築手順

### Step 1: プロンプトを準備

1. **CLAUDE_CODE_REBUILD_FULL_PROMPT.md を開く**
   ```bash
   # ローカルマシンで
   cat /home/user/webapp/CLAUDE_CODE_REBUILD_FULL_PROMPT.md
   ```

2. **全文をコピー**
   - ファイル全体（約27,000文字）をコピーする

---

### Step 2: Claude Code に指示を送る

1. **Claude Code を開く**
   - Claude Code のチャットインターフェースを開く

2. **プロンプトを貼り付け**
   - コピーしたプロンプトを貼り付ける

3. **追加の指示を添える**（オプション）
   ```
   以下のプロンプトに従って、Commonsプラットフォームを完全に構築してください。
   
   実装の優先順位:
   1. 最優先（MVP）: プロジェクト初期化、認証、テナント管理
   2. 高優先度: 会員管理、投稿・コメント、画像アップロード
   3. 中優先度: いいね、通知、イベント、アンケート
   4. 低優先度: ポイント、ショップ、チャット、統計
   
   実装中に不明な点があれば質問してください。
   
   [ここに CLAUDE_CODE_REBUILD_FULL_PROMPT.md の内容を貼り付け]
   ```

---

### Step 3: Claude Code の実装を監視

Claude Code は以下の順序で実装を進めます：

1. **プロジェクト初期化** (5-10分)
   - ディレクトリ作成
   - Hono プロジェクト作成
   - Git 初期化
   - .gitignore 作成

2. **依存関係インストール** (3-5分)
   - package.json 設定
   - npm install 実行

3. **設定ファイル作成** (2-3分)
   - wrangler.jsonc
   - vite.config.ts
   - ecosystem.config.cjs
   - tsconfig.json

4. **データベース設計** (10-15分)
   - 36個のマイグレーションファイル作成
   - D1 データベース作成

5. **バックエンド実装** (60-90分)
   - src/types.ts
   - src/index.tsx（メインアプリケーション）
   - src/routes/*.ts（全36個のAPIルート）

6. **フロントエンド実装** (30-45分)
   - public/static/*.js
   - public/static/*.css

7. **HTMLページ実装** (45-60分)
   - プラットフォームページ（12個）
   - テナント公開ページ（12個）

8. **ビジュアル素材統合** (5-10分)
   - イラスト8枚のダウンロード
   - 配置

9. **ビルド・テスト** (5-10分)
   - npm run build
   - PM2 起動
   - 動作確認

**合計所要時間: 約3-4時間**

---

### Step 4: Cloudflare デプロイの準備

Claude Code が実装を完了したら、以下を実行してください：

#### 1. Cloudflare API トークン設定

```bash
# Claude Code で実行
# setup_cloudflare_api_key ツールを使用
# 
# もしツールが使えない場合は、Cloudflare Dashboard で API トークンを発行:
# https://dash.cloudflare.com/profile/api-tokens
# 
# 必要な権限:
# - Account.Cloudflare Pages: Edit
# - Account.D1: Edit
# - Account.Workers R2 Storage: Edit
```

#### 2. D1 データベース作成

```bash
# Claude Code のターミナルで実行
cd /home/user/webapp
npx wrangler d1 create commons-webapp-production

# 出力例:
# ✅ Successfully created DB 'commons-webapp-production'
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "commons-webapp-production"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# database_id をコピーして wrangler.jsonc に貼り付け
```

#### 3. R2 バケット作成

```bash
cd /home/user/webapp
npx wrangler r2 bucket create commons-images

# 出力例:
# ✅ Created bucket 'commons-images' with default storage class set to Standard.
```

#### 4. マイグレーション適用

```bash
# ローカルテスト用
cd /home/user/webapp
npx wrangler d1 migrations apply commons-webapp-production --local

# 本番環境用（デプロイ後）
npx wrangler d1 migrations apply commons-webapp-production
```

---

### Step 5: ローカルでテスト

```bash
# ビルド
cd /home/user/webapp && npm run build

# PM2 で起動
pm2 start ecosystem.config.cjs

# 動作確認
curl http://localhost:3000

# ブラウザで確認（Claude Code の GetServiceUrl ツールを使用）
# URL: https://3000-[your-sandbox-id].sandbox.novita.ai
```

#### 確認項目

- [ ] トップページが表示される
- [ ] 新規登録フォームが表示される
- [ ] ログインフォームが表示される
- [ ] 画像が正しく読み込まれる
- [ ] Tailwind CSS が適用されている
- [ ] エラーがコンソールに出ていない

---

### Step 6: 本番環境にデプロイ

```bash
# 1. ビルド
cd /home/user/webapp && npm run build

# 2. Cloudflare Pages プロジェクト作成
npx wrangler pages project create commons-webapp \
  --production-branch main \
  --compatibility-date 2024-01-01

# 3. デプロイ（プロダクション）
npx wrangler pages deploy dist --branch main --project-name commons-webapp

# 出力例:
# ✨ Success! Uploaded 17 files (0.34 seconds)
# ✨ Deployment complete! Take a peek over at https://commons-webapp.pages.dev

# 4. 環境変数設定
npx wrangler pages secret put JWT_SECRET --project-name commons-webapp
# プロンプト: Enter a secret value: [your-jwt-secret-here]

npx wrangler pages secret put PLATFORM_DOMAIN --project-name commons-webapp
# プロンプト: Enter a secret value: commons.com

npx wrangler pages secret put STRIPE_SECRET_KEY --project-name commons-webapp
# プロンプト: Enter a secret value: sk_test_...

npx wrangler pages secret put RESEND_API_KEY --project-name commons-webapp
# プロンプト: Enter a secret value: re_...

# 5. マイグレーション適用（本番）
npx wrangler d1 migrations apply commons-webapp-production

# 6. 動作確認
curl https://commons-webapp.pages.dev
```

---

### Step 7: 動作確認

#### プラットフォームページ

1. **トップページ**: https://commons-webapp.pages.dev/
2. **新規登録**: https://commons-webapp.pages.dev/register
3. **ログイン**: https://commons-webapp.pages.dev/login

#### テナント作成テスト

1. `/register` でテナントを作成
   - メールアドレス: `test@example.com`
   - パスワード: `Test1234!`
   - サブドメイン: `test-community`
   - コミュニティ名: `テストコミュニティ`

2. ログイン後、ダッシュボードが表示される
   - URL: https://commons-webapp.pages.dev/dashboard

3. テナント公開ページにアクセス
   - URL: https://commons-webapp.pages.dev/tenant/home?subdomain=test-community

---

## 🔧 トラブルシューティング

### 問題1: ビルドエラー

```bash
# エラーメッセージを確認
cd /home/user/webapp && npm run build

# よくある原因:
# - TypeScript型エラー → src/types.ts を確認
# - インポートエラー → パスが正しいか確認
# - 依存関係不足 → npm install 再実行
```

**解決方法:**
```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# ビルド再実行
npm run build
```

---

### 問題2: デプロイエラー

```bash
# エラーメッセージ例:
# Error: Authentication error

# 原因: Cloudflare API トークンが設定されていない
```

**解決方法:**
```bash
# Cloudflare API トークンを再設定
# Claude Code で setup_cloudflare_api_key ツールを実行

# または、Cloudflare Dashboard で手動設定:
# https://dash.cloudflare.com/profile/api-tokens
```

---

### 問題3: データベースエラー

```bash
# エラーメッセージ例:
# Error: D1_ERROR: no such table: users

# 原因: マイグレーションが適用されていない
```

**解決方法:**
```bash
# ローカル環境
npx wrangler d1 migrations apply commons-webapp-production --local

# 本番環境
npx wrangler d1 migrations apply commons-webapp-production

# マイグレーション状態を確認
npx wrangler d1 migrations list commons-webapp-production --local
npx wrangler d1 migrations list commons-webapp-production
```

---

### 問題4: 画像が表示されない

```bash
# 原因: R2 バケットが作成されていない、または画像がアップロードされていない
```

**解決方法:**
```bash
# R2 バケットが存在するか確認
npx wrangler r2 bucket list

# バケットが無い場合は作成
npx wrangler r2 bucket create commons-images

# イラストをダウンロード（Step 10参照）
mkdir -p /home/user/webapp/public/static/illustrations
# ... curl コマンドで8枚の画像をダウンロード
```

---

### 問題5: メールが送信されない

```bash
# 原因: Resend API キーが設定されていない、または無効
```

**解決方法:**
```bash
# Resend API キーを再設定
npx wrangler pages secret put RESEND_API_KEY --project-name commons-webapp

# Resend Dashboard で送信ログを確認:
# https://resend.com/emails
```

---

## 📚 補足資料

### プロジェクト内ドキュメント

1. **REBUILD_PROMPT.md** - 詳細な再構築プロンプト（技術仕様）
2. **REBUILD_GUIDE_SUPPLEMENT.md** - 実装時の具体的なコード例
3. **VISUAL_ASSETS_GUIDE.md** - ビジュアル素材の統合ガイド
4. **README.md** - プロジェクト概要・機能一覧・API仕様

### 既存コードの参照

Claude Code が実装に迷った場合、以下のファイルを参照するよう指示してください：

- `src/index.tsx` - メインアプリケーションの実装例（2700行）
- `src/routes/*.ts` - 各APIルートの実装例（36ファイル）
- `migrations/*.sql` - データベーススキーマ（36ファイル）
- `public/static/*.js` - フロントエンドJavaScript
- `public/static/*.css` - CSS（テーマシステム）

---

## 🎯 実装の優先順位

Claude Code に段階的に実装させたい場合は、以下の順序で指示してください：

### フェーズ1: MVP（1-2時間）

```
まず、以下の機能を実装してください：
1. プロジェクト初期化・設定
2. データベース設計（基本テーブルのみ）
3. 認証システム（JWT + bcrypt）
4. テナント作成・管理
5. 基本的なUIテンプレート（トップページ、登録、ログイン、ダッシュボード）
```

### フェーズ2: コミュニティ機能（1-1.5時間）

```
次に、以下の機能を追加してください：
1. 会員管理フロー
2. 投稿・コメント機能
3. プロフィール管理
4. 画像アップロード（R2統合）
5. メール通知（Resend統合）
```

### フェーズ3: エンゲージメント（30-45分）

```
さらに、以下の機能を追加してください：
1. いいね機能（投稿・コメント）
2. 通知センター
3. マイページ
4. アクティビティ履歴
```

### フェーズ4: 高度な機能（1-1.5時間）

```
最後に、以下の機能を追加してください：
1. イベント管理
2. アンケート機能
3. ポイントシステム
4. ショップ機能
5. チャット機能
6. 統計ダッシュボード
```

---

## 💡 ヒント・ベストプラクティス

### Claude Code とのコミュニケーション

1. **段階的に指示する**
   - 一度にすべてを実装させるのではなく、段階的に指示する
   - 各フェーズが完了したら動作確認する

2. **具体的な要求を出す**
   ```
   ✅ 良い例:
   「src/routes/auth.ts を実装してください。
   POST /api/auth/register エンドポイントで、
   bcrypt でパスワードをハッシュ化し、
   JWT トークンを返すようにしてください。」
   
   ❌ 悪い例:
   「認証を実装してください。」
   ```

3. **既存コードを参照させる**
   ```
   「既存プロジェクトの src/routes/posts.ts を参考に、
   コメント機能を実装してください。」
   ```

4. **エラーが出たら即座に修正を依頼**
   ```
   「ビルドエラーが出ました。エラーメッセージは以下の通りです：
   [エラーメッセージを貼り付け]
   修正してください。」
   ```

---

### デバッグのコツ

1. **ログを活用する**
   ```bash
   # PM2 ログ
   pm2 logs --nostream
   
   # Cloudflare Pages ログ
   npx wrangler pages deployment tail --project-name commons-webapp
   
   # D1 データベースログ
   npx wrangler d1 execute commons-webapp-production --local --command="SELECT * FROM users LIMIT 10"
   ```

2. **ステップバイステップでテスト**
   - 機能を追加したら必ず動作確認
   - エラーが出たら、その場で修正

3. **Claude Code に質問する**
   ```
   「このエラーの原因は何ですか？
   [エラーメッセージ]
   
   どのように修正すればよいですか？」
   ```

---

## 🚀 次のステップ

プロジェクトが正常に動作したら：

1. **カスタマイズ**
   - テーマカラーを変更
   - 機能を追加
   - UIを改善

2. **本番環境の設定**
   - カスタムドメインを設定
   - SSL証明書を設定
   - パフォーマンス最適化

3. **ユーザーテスト**
   - 実際のユーザーでテスト
   - フィードバックを収集
   - 改善を実施

4. **GitHub へプッシュ**
   ```bash
   cd /home/user/webapp
   git add .
   git commit -m "Complete Commons platform implementation"
   
   # setup_github_environment ツールを実行
   # その後
   git remote add origin https://github.com/USERNAME/commons-webapp.git
   git branch -M main
   git push -u origin main
   ```

---

## 📞 サポート

問題が発生した場合：

1. **ドキュメントを確認**
   - REBUILD_PROMPT.md
   - REBUILD_GUIDE_SUPPLEMENT.md
   - VISUAL_ASSETS_GUIDE.md
   - README.md

2. **既存コードを参照**
   - src/index.tsx
   - src/routes/*.ts
   - migrations/*.sql

3. **Claude Code に質問**
   - 具体的なエラーメッセージを提供
   - 実行したコマンドを共有
   - 期待する動作を説明

---

生成日時: 2026-02-19  
バージョン: 1.0.0  
対象: Commons プロジェクト再構築  
言語: 日本語

---

**このガイドに従うことで、Claude Code を使って Commons プラットフォームを完全に再構築できます。不明な点があれば、いつでも Claude Code に質問してください。**
