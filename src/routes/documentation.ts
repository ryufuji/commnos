import { Hono } from 'hono'
import type { AppContext } from '../index'

const documentation = new Hono<AppContext>()

// ドキュメント生成API
documentation.post('/generate', async (c) => {
  try {
    const { type } = await c.req.json()
    
    if (type === 'requirements') {
      const requirements = await generateRequirementsDocument()
      return c.json({
        success: true,
        document: requirements,
        filename: `requirements_specification_${new Date().toISOString().split('T')[0]}.md`
      })
    } else if (type === 'design') {
      const design = await generateDesignDocument()
      return c.json({
        success: true,
        document: design,
        filename: `design_specification_${new Date().toISOString().split('T')[0]}.md`
      })
    } else if (type === 'all') {
      const requirements = await generateRequirementsDocument()
      const design = await generateDesignDocument()
      return c.json({
        success: true,
        documents: {
          requirements,
          design
        },
        filenames: {
          requirements: `requirements_specification_${new Date().toISOString().split('T')[0]}.md`,
          design: `design_specification_${new Date().toISOString().split('T')[0]}.md`
        }
      })
    }
    
    return c.json({ success: false, error: 'Invalid document type' }, 400)
  } catch (error) {
    console.error('[Documentation] Error:', error)
    return c.json({ success: false, error: 'Failed to generate document' }, 500)
  }
})

// 要件定義書生成
async function generateRequirementsDocument(): Promise<string> {
  const document = `# Commons - コミュニティプラットフォーム要件定義書

## 1. プロジェクト概要

### 1.1 プロジェクト名
Commons - マルチテナント型コミュニティプラットフォーム

### 1.2 プロジェクトの目的
複数のコミュニティを一つのプラットフォーム上で管理・運営できるSaaSサービスを提供する。各コミュニティは独自のサブドメインを持ち、会員管理、投稿、イベント、ポイントシステム、ショップ機能などを利用できる。

### 1.3 ターゲットユーザー
- **プラットフォームオーナー**: Commonsプラットフォーム全体の管理者
- **テナントオーナー**: 各コミュニティの管理者
- **テナント会員**: コミュニティに参加する一般ユーザー

### 1.4 システム構成
- **フロントエンド**: HTML/CSS/JavaScript (Tailwind CSS)
- **バックエンド**: Hono (Cloudflare Workers)
- **データベース**: Cloudflare D1 (SQLite)
- **ホスティング**: Cloudflare Pages
- **決済**: Stripe

---

## 2. 機能要件

### 2.1 プラットフォーム機能

#### 2.1.1 プラットフォーム管理
- **プラットフォームオーナー登録**: オーナーアカウントの作成
- **ダッシュボード**: プラットフォーム全体の統計情報表示
- **テナント一覧**: 登録されている全コミュニティの管理
- **プラン管理**: サブスクリプションプランの作成・編集
- **クーポン管理**: 割引クーポンの発行・管理

#### 2.1.2 認証機能
- **ログイン/ログアウト**: メールアドレスとパスワードによる認証
- **パスワードリセット**: メールによるパスワード再設定
- **セッション管理**: JWT形式のトークン管理

### 2.2 テナント（コミュニティ）機能

#### 2.2.1 テナント管理
- **テナント作成**: サブドメイン、コミュニティ名、説明文の登録
- **テナント設定**: 
  - 基本情報編集（名前、説明、ロゴ）
  - カスタマイズ（カバー画像、カラーテーマ）
  - 公開/非公開設定
- **会員承認**: 新規会員申請の承認/拒否
- **会員管理**: 会員一覧、役割変更、メモ機能

#### 2.2.2 会員機能
- **会員登録**: ニックネーム、メールアドレス、自己紹介の登録
- **プロフィール管理**: アバター、自己紹介、誕生日の編集
- **ログイン**: テナント固有のログインページ
- **マイページ**: 
  - 会員証カード表示
  - ポイント残高表示
  - いいねした投稿一覧
  - ポイント履歴
  - ランキング表示

#### 2.2.3 投稿機能
- **投稿作成**: テキスト、画像、動画の投稿
- **投稿編集/削除**: 自分の投稿の編集・削除
- **コメント**: 投稿へのコメント機能
- **いいね**: 投稿・コメントへのいいね
- **ピン留め**: 重要な投稿の固定表示（管理者のみ）
- **公開範囲設定**: 
  - 全体公開
  - メンバー限定
  - プラン限定
- **投稿予約**: 指定日時での自動公開

#### 2.2.4 イベント機能
- **イベント作成**: タイトル、説明、日時、場所の登録
- **イベント一覧**: 開催予定・開催中・過去のイベント表示
- **参加申込**: イベントへの参加登録
- **参加者管理**: 参加者リストの表示（管理者のみ）

#### 2.2.5 アンケート機能
- **アンケート作成**: 
  - 入会時アンケート
  - 退会時アンケート
- **質問タイプ**: 
  - 短文テキスト
  - 長文テキスト
  - 単一選択（ラジオボタン）
  - 複数選択（チェックボックス）
  - スケール（1-5段階評価）
- **回答管理**: アンケート結果の閲覧・分析

#### 2.2.6 ポイントシステム
- **ポイント付与ルール**:
  - 投稿作成
  - コメント投稿
  - いいね（送信/受信）
  - イベント参加
  - ショップ購入
- **ポイント履歴**: 獲得/使用履歴の表示
- **ランキング**: ポイント上位者の表示

#### 2.2.7 ショップ機能
- **商品管理**: 
  - 商品追加（名前、説明、価格、在庫、画像）
  - 商品編集/削除
  - カテゴリー管理
- **注文管理**: 
  - 注文一覧
  - ステータス管理（pending/processing/completed/cancelled）
  - 配送先情報
- **購入フロー**: 
  - カートに追加
  - 注文確定
  - 決済（Stripe）

#### 2.2.8 お知らせ機能
- **お知らせ作成**: タイトル、本文、重要度の設定
- **ピン留め**: 重要なお知らせの固定表示
- **有効期限**: 表示期間の設定
- **お知らせ一覧**: ホームページと専用ページでの表示

#### 2.2.9 通知機能
- **通知タイプ**:
  - 投稿へのコメント
  - コメントへの返信
  - いいね通知
  - フォロー通知
  - イベント開催通知
  - ショップ注文通知
  - ポイント付与通知
- **通知管理**: 既読/未読、削除

#### 2.2.10 メンバープラン機能
- **プラン作成**: 名前、価格、特典の設定
- **月額/年額**: 支払いサイクルの選択
- **限定コンテンツ**: プラン会員のみアクセス可能な投稿
- **支払い管理**: Stripe Checkoutによる決済

#### 2.2.11 タグ機能
- **タグ作成**: ユーザーにカスタムタグを付与
- **タグ管理**: タグの追加・削除
- **タグフィルター**: タグによる会員絞り込み

#### 2.2.12 誕生日機能
- **誕生日登録**: プロフィールに誕生日を設定
- **誕生日通知**: 誕生日当日の自動通知
- **誕生日リスト**: 今月の誕生日メンバー表示

#### 2.2.13 ウォークスルー機能
- **初回ガイド**: テナントホームページ初回訪問時のガイド
- **機能説明**: 7ステップで主要機能を説明
- **スキップ機能**: ウォークスルーのスキップ・再表示

### 2.3 デザイン・カスタマイズ

#### 2.3.1 テーマシステム
- **カラーテーマ**: CSS変数によるカスタマイズ
- **ダークモード**: ライト/ダークテーマの切り替え
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応

#### 2.3.2 テナントカスタマイズ
- **カバー画像**: ヒーローセクションの背景画像
- **ロゴ**: コミュニティロゴの設定
- **カラー設定**: プライマリカラーのカスタマイズ
- **ウェルカムメッセージ**: ホームページのカスタムメッセージ

---

## 3. 非機能要件

### 3.1 パフォーマンス
- **ページ読み込み時間**: 3秒以内
- **API応答時間**: 1秒以内
- **画像最適化**: 遅延読み込み（Lazy Loading）

### 3.2 セキュリティ
- **認証**: JWT形式のトークン認証
- **パスワード**: ハッシュ化して保存
- **XSS対策**: HTMLエスケープ処理
- **CSRF対策**: トークン検証
- **CORS設定**: 適切なオリジン制限

### 3.3 可用性
- **稼働率**: 99.9%
- **エラーハンドリング**: 適切なエラーメッセージ表示
- **ログ記録**: エラーログの記録

### 3.4 拡張性
- **マルチテナント**: 複数コミュニティの同時運用
- **スケーラビリティ**: Cloudflare Workersによる自動スケーリング
- **データベース**: D1による分散データベース

### 3.5 保守性
- **コード管理**: Git/GitHubによるバージョン管理
- **デプロイ**: Wranglerによる自動デプロイ
- **バックアップ**: データベースの定期バックアップ

---

## 4. 画面一覧

### 4.1 プラットフォーム側

| 画面名 | URL | 説明 |
|--------|-----|------|
| トップページ | / | プラットフォームの紹介 |
| コミュニティ一覧 | /communities | 登録コミュニティの一覧 |
| オーナー登録 | /register | プラットフォームオーナー登録 |
| ダッシュボード | /dashboard | 管理ダッシュボード |

### 4.2 テナント側

| 画面名 | URL | 説明 |
|--------|-----|------|
| ホーム | /tenant/home?subdomain=xxx | コミュニティホーム |
| 会員登録 | /tenant/register?subdomain=xxx | 会員登録フォーム |
| ログイン | /tenant/login?subdomain=xxx | ログインフォーム |
| 投稿一覧 | /tenant/posts?subdomain=xxx | 投稿一覧ページ |
| 投稿詳細 | /tenant/posts/:id?subdomain=xxx | 投稿詳細ページ |
| イベント一覧 | /tenant/events?subdomain=xxx | イベント一覧 |
| イベント詳細 | /tenant/events/:id?subdomain=xxx | イベント詳細 |
| メンバー一覧 | /tenant/members?subdomain=xxx | メンバー一覧 |
| マイページ | /tenant/mypage?subdomain=xxx | マイページ |
| プロフィール編集 | /tenant/profile/edit?subdomain=xxx | プロフィール編集 |
| ショップ | /tenant/shop?subdomain=xxx | ショップトップ |
| 商品詳細 | /tenant/shop/products/:id?subdomain=xxx | 商品詳細 |
| カート | /tenant/shop/cart?subdomain=xxx | ショッピングカート |

---

## 5. データ要件

### 5.1 主要テーブル

#### テナント関連
- **tenants**: テナント（コミュニティ）情報
- **tenant_customization**: テナントのカスタマイズ設定

#### ユーザー関連
- **users**: ユーザー情報
- **tenant_memberships**: テナントとユーザーの関連
- **user_tags**: ユーザータグ

#### コンテンツ関連
- **posts**: 投稿
- **comments**: コメント
- **post_likes**: 投稿へのいいね
- **comment_likes**: コメントへのいいね
- **events**: イベント
- **event_participants**: イベント参加者

#### アンケート関連
- **surveys**: アンケート
- **survey_questions**: アンケート質問
- **survey_responses**: アンケート回答

#### ポイント関連
- **point_rules**: ポイントルール
- **point_transactions**: ポイント取引履歴

#### ショップ関連
- **shop_products**: 商品
- **shop_orders**: 注文
- **shop_order_items**: 注文明細

#### その他
- **announcements**: お知らせ
- **notifications**: 通知
- **member_plans**: メンバープラン
- **platform_plans**: プラットフォームプラン

---

## 6. 外部システム連携

### 6.1 Stripe
- **用途**: 決済処理
- **機能**: 
  - サブスクリプション決済
  - 単発決済
  - Webhook受信

### 6.2 Cloudflare Services
- **D1**: データベース
- **Pages**: ホスティング
- **Workers**: サーバーレス実行環境

---

## 7. 制約事項

### 7.1 技術的制約
- **CPU時間制限**: 10ms/リクエスト（無料プラン）、30ms（有料プラン）
- **メモリ制限**: 128MB
- **データベースサイズ**: D1の制限に準拠
- **ファイルアップロード**: 画像・動画のみ、最大サイズ制限あり

### 7.2 ビジネス的制約
- **決済手数料**: Stripeの手数料が適用される
- **プラン制限**: 各プランで利用可能な機能が異なる

---

## 8. 今後の拡張予定

### 8.1 機能拡張
- チャット機能の強化
- ビデオ通話機能
- AIアシスタント機能
- モバイルアプリ開発

### 8.2 改善予定
- 検索機能の強化
- アナリティクス機能の追加
- レコメンデーション機能
- 多言語対応

---

生成日時: ${new Date().toISOString()}
`
  return document
}

// 設計書生成
async function generateDesignDocument(): Promise<string> {
  const document = `# Commons - システム設計書

## 1. システムアーキテクチャ

### 1.1 全体構成

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Static Assets (HTML/CSS/JS)             │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Cloudflare Workers (Hono Framework)       │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  API Routes (auth, posts, events, etc.)     │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Cloudflare D1 (SQLite)                  │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  Tables (tenants, users, posts, etc.)       │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
              ┌─────────────────────┐
              │   Stripe API        │
              │  (Payment Gateway)  │
              └─────────────────────┘
\`\`\`

### 1.2 技術スタック

#### フロントエンド
- **HTML5**: セマンティックマークアップ
- **CSS3**: Tailwind CSS（CDN経由）
- **JavaScript (ES6+)**: Vanilla JS、Axios

#### バックエンド
- **Hono**: 軽量高速なWeb Framework
- **TypeScript**: 型安全な開発
- **Cloudflare Workers**: エッジコンピューティング

#### データベース
- **Cloudflare D1**: SQLiteベースの分散データベース

#### インフラ
- **Cloudflare Pages**: 静的サイトホスティング
- **Wrangler**: CLIデプロイツール

---

## 2. データベース設計

### 2.1 ER図（主要テーブル）

\`\`\`
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│   tenants    │1    * │tenant_memberships│*    1 │    users     │
├──────────────┤───────├──────────────────┤───────├──────────────┤
│ id (PK)      │       │ id (PK)          │       │ id (PK)      │
│ subdomain    │       │ tenant_id (FK)   │       │ email        │
│ name         │       │ user_id (FK)     │       │ nickname     │
│ is_public    │       │ role             │       │ password_hash│
│ status       │       │ status           │       │ created_at   │
└──────────────┘       └──────────────────┘       └──────────────┘
       │                                                  │
       │1                                                 │1
       │                                                  │
       │*                                                 │*
┌──────────────┐                                  ┌──────────────┐
│    posts     │                                  │  comments    │
├──────────────┤                                  ├──────────────┤
│ id (PK)      │1                               * │ id (PK)      │
│ tenant_id(FK)│──────────────────────────────────│ post_id (FK) │
│ author_id(FK)│                                  │ user_id (FK) │
│ title        │                                  │ content      │
│ content      │                                  │ created_at   │
│ is_pinned    │                                  └──────────────┘
└──────────────┘
\`\`\`

### 2.2 テーブル定義

#### 2.2.1 tenants（テナント）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | INTEGER | PRIMARY KEY | テナントID |
| subdomain | TEXT | UNIQUE, NOT NULL | サブドメイン |
| name | TEXT | NOT NULL | コミュニティ名 |
| subtitle | TEXT | | サブタイトル |
| is_public | BOOLEAN | DEFAULT 1 | 公開設定 |
| status | TEXT | DEFAULT 'active' | ステータス |
| owner_id | INTEGER | FOREIGN KEY | オーナーID |
| member_count | INTEGER | DEFAULT 0 | 会員数 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 作成日時 |

#### 2.2.2 users（ユーザー）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | INTEGER | PRIMARY KEY | ユーザーID |
| email | TEXT | UNIQUE, NOT NULL | メールアドレス |
| nickname | TEXT | NOT NULL | ニックネーム |
| password_hash | TEXT | NOT NULL | パスワードハッシュ |
| avatar_url | TEXT | | アバター画像URL |
| bio | TEXT | | 自己紹介 |
| birthday | DATE | | 誕生日 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 作成日時 |

#### 2.2.3 tenant_memberships（テナント会員）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | INTEGER | PRIMARY KEY | ID |
| tenant_id | INTEGER | FOREIGN KEY, NOT NULL | テナントID |
| user_id | INTEGER | FOREIGN KEY, NOT NULL | ユーザーID |
| role | TEXT | DEFAULT 'member' | 役割（owner/admin/member） |
| status | TEXT | DEFAULT 'pending' | ステータス（pending/active/suspended） |
| member_number | TEXT | | 会員番号 |
| points_balance | INTEGER | DEFAULT 0 | ポイント残高 |
| joined_at | DATETIME | | 承認日時 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 申請日時 |

#### 2.2.4 posts（投稿）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | INTEGER | PRIMARY KEY | 投稿ID |
| tenant_id | INTEGER | FOREIGN KEY, NOT NULL | テナントID |
| author_id | INTEGER | FOREIGN KEY, NOT NULL | 投稿者ID |
| title | TEXT | NOT NULL | タイトル |
| content | TEXT | NOT NULL | 本文 |
| is_pinned | BOOLEAN | DEFAULT 0 | ピン留め |
| visibility | TEXT | DEFAULT 'public' | 公開範囲 |
| status | TEXT | DEFAULT 'published' | ステータス |
| published_at | DATETIME | | 公開日時 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 作成日時 |

#### 2.2.5 events（イベント）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | INTEGER | PRIMARY KEY | イベントID |
| tenant_id | INTEGER | FOREIGN KEY, NOT NULL | テナントID |
| title | TEXT | NOT NULL | タイトル |
| description | TEXT | | 説明 |
| location | TEXT | | 場所 |
| start_time | DATETIME | NOT NULL | 開始時刻 |
| end_time | DATETIME | | 終了時刻 |
| max_participants | INTEGER | | 最大参加人数 |
| status | TEXT | DEFAULT 'upcoming' | ステータス |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 作成日時 |

#### 2.2.6 point_transactions（ポイント取引）

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | INTEGER | PRIMARY KEY | 取引ID |
| tenant_id | INTEGER | FOREIGN KEY, NOT NULL | テナントID |
| user_id | INTEGER | FOREIGN KEY, NOT NULL | ユーザーID |
| action | TEXT | NOT NULL | アクション種別 |
| points | INTEGER | NOT NULL | ポイント数 |
| balance_after | INTEGER | | 取引後残高 |
| description | TEXT | | 説明 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 取引日時 |

---

## 3. API設計

### 3.1 認証API

#### POST /api/auth/register
**説明**: ユーザー登録

**リクエスト**:
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "ユーザー名"
}
\`\`\`

**レスポンス**:
\`\`\`json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "ユーザー名"
  },
  "token": "jwt_token_here"
}
\`\`\`

#### POST /api/auth/login
**説明**: ログイン

**リクエスト**:
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**レスポンス**:
\`\`\`json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "ユーザー名"
  }
}
\`\`\`

### 3.2 投稿API

#### GET /api/posts
**説明**: 投稿一覧取得

**クエリパラメータ**:
- tenant_id: テナントID（必須）
- page: ページ番号（デフォルト: 1）
- limit: 取得件数（デフォルト: 20）

**レスポンス**:
\`\`\`json
{
  "success": true,
  "posts": [
    {
      "id": 1,
      "title": "投稿タイトル",
      "content": "投稿本文",
      "author_name": "投稿者名",
      "like_count": 10,
      "comment_count": 5,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
\`\`\`

#### POST /api/posts
**説明**: 投稿作成

**リクエスト**:
\`\`\`json
{
  "tenant_id": 1,
  "title": "投稿タイトル",
  "content": "投稿本文",
  "visibility": "public"
}
\`\`\`

**レスポンス**:
\`\`\`json
{
  "success": true,
  "post": {
    "id": 1,
    "title": "投稿タイトル",
    "content": "投稿本文",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
\`\`\`

### 3.3 イベントAPI

#### GET /api/events
**説明**: イベント一覧取得

**クエリパラメータ**:
- tenant_id: テナントID（必須）
- status: ステータスフィルター（upcoming/ongoing/past）

**レスポンス**:
\`\`\`json
{
  "success": true,
  "events": [
    {
      "id": 1,
      "title": "イベント名",
      "start_time": "2024-12-31T18:00:00Z",
      "location": "東京",
      "participant_count": 10,
      "max_participants": 50
    }
  ]
}
\`\`\`

#### POST /api/events/:id/join
**説明**: イベント参加

**レスポンス**:
\`\`\`json
{
  "success": true,
  "message": "イベントに参加しました"
}
\`\`\`

### 3.4 ポイントAPI

#### GET /api/points/balance
**説明**: ポイント残高取得

**クエリパラメータ**:
- tenant_id: テナントID（必須）

**レスポンス**:
\`\`\`json
{
  "success": true,
  "balance": 1000,
  "tenant_id": 1
}
\`\`\`

#### GET /api/points/history
**説明**: ポイント履歴取得

**クエリパラメータ**:
- tenant_id: テナントID（必須）
- page: ページ番号
- limit: 取得件数

**レスポンス**:
\`\`\`json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "action": "post_create",
      "points": 10,
      "balance_after": 1000,
      "description": "投稿を作成しました",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
\`\`\`

---

## 4. 画面設計

### 4.1 レイアウト構成

#### 共通レイアウト
\`\`\`
┌─────────────────────────────────────────────────┐
│                  Header                         │
│  [Logo] [Nav Menu]           [Login] [Sign Up] │
├─────────────────────────────────────────────────┤
│                                                 │
│                Main Content                     │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│                  Footer                         │
│  [Links] [Copyright] [Powered by Commons]      │
└─────────────────────────────────────────────────┘
\`\`\`

### 4.2 主要画面のワイヤーフレーム

#### テナントホームページ
\`\`\`
┌─────────────────────────────────────────────────┐
│               Hero Section                      │
│  [Community Name]                               │
│  [Description]                                  │
│  [CTA Button: Join Now]                         │
├─────────────────────────────────────────────────┤
│  Announcements (Pinned)                         │
│  📌 [Important Announcement 1]                  │
│  📌 [Important Announcement 2]                  │
├─────────────────────────────────────────────────┤
│  Latest Posts                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Post 1   │  │ Post 2   │  │ Post 3   │      │
│  │ [Image]  │  │ [Image]  │  │ [Image]  │      │
│  │ Title    │  │ Title    │  │ Title    │      │
│  └──────────┘  └──────────┘  └──────────┘      │
├─────────────────────────────────────────────────┤
│  Upcoming Events                                │
│  📅 [Event Name] - [Date]                       │
│  📅 [Event Name] - [Date]                       │
├─────────────────────────────────────────────────┤
│  Active Members                                 │
│  👤👤👤👤👤 (Avatars)                            │
└─────────────────────────────────────────────────┘
\`\`\`

#### マイページ
\`\`\`
┌─────────────────────────────────────────────────┐
│  Member Card                                    │
│  ┌──────────────────────────────────────────┐   │
│  │ [Avatar] [Name]                          │   │
│  │ Member #: 12345                          │   │
│  │ Role: メンバー                           │   │
│  │ Joined: 2024/01/01                       │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Points Balance                                 │
│  🎁 1,000 pts                                   │
├─────────────────────────────────────────────────┤
│  Tabs: [Likes] [Points] [Ranking]              │
│  ┌──────────────────────────────────────────┐   │
│  │ Tab Content                              │   │
│  │ (Liked Posts / Point History / Ranking)  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
\`\`\`

---

## 5. セキュリティ設計

### 5.1 認証・認可

#### JWT トークン
- **発行**: ログイン時にJWTトークンを発行
- **有効期限**: 7日間
- **ペイロード**: ユーザーID、メールアドレス
- **署名**: HS256アルゴリズム

#### パスワード管理
- **ハッシュ化**: bcryptを使用
- **ソルト**: ランダム生成
- **強度要件**: 最低8文字

### 5.2 XSS対策
- HTMLエスケープ処理
- Content Security Policy (CSP)の設定
- サニタイズ処理

### 5.3 CSRF対策
- トークン検証
- SameSite Cookie属性

### 5.4 SQL Injection対策
- プリペアドステートメントの使用
- バインドパラメータの利用

---

## 6. エラーハンドリング

### 6.1 HTTPステータスコード

| コード | 説明 | 使用例 |
|--------|------|--------|
| 200 | OK | 正常なレスポンス |
| 201 | Created | リソース作成成功 |
| 400 | Bad Request | 不正なリクエスト |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | 権限エラー |
| 404 | Not Found | リソースが見つからない |
| 500 | Internal Server Error | サーバーエラー |

### 6.2 エラーレスポンス形式

\`\`\`json
{
  "success": false,
  "error": "エラーメッセージ",
  "code": "ERROR_CODE"
}
\`\`\`

---

## 7. パフォーマンス最適化

### 7.1 フロントエンド
- **画像最適化**: Lazy Loading、WebP形式
- **CSS最適化**: Tailwind CDN使用
- **JavaScript最適化**: 必要最小限のライブラリ

### 7.2 バックエンド
- **クエリ最適化**: インデックス活用
- **キャッシング**: Cloudflare CDNキャッシュ
- **コネクションプーリング**: D1の自動管理

---

## 8. デプロイ設計

### 8.1 デプロイフロー

\`\`\`
[開発] → [ビルド] → [デプロイ] → [本番環境]
   ↓         ↓          ↓            ↓
  Git    npm build   wrangler   Cloudflare Pages
\`\`\`

### 8.2 環境変数

| 変数名 | 説明 | 設定場所 |
|--------|------|----------|
| JWT_SECRET | JWT署名キー | Cloudflare Secret |
| STRIPE_SECRET_KEY | Stripe秘密鍵 | Cloudflare Secret |
| PLATFORM_DOMAIN | プラットフォームドメイン | wrangler.jsonc |

### 8.3 CI/CD
- **Git**: バージョン管理
- **GitHub**: リポジトリホスティング
- **Wrangler**: 自動デプロイ

---

## 9. 監視・ログ

### 9.1 ログ記録
- **エラーログ**: console.error()
- **アクセスログ**: Cloudflare Analytics
- **デバッグログ**: console.log()

### 9.2 監視項目
- **稼働率**: Cloudflare Status
- **レスポンス時間**: Workers Analytics
- **エラー率**: Workers Analytics

---

## 10. バックアップ・リカバリ

### 10.1 データベースバックアップ
- **頻度**: 毎日
- **保存期間**: 30日間
- **リストア**: Wrangler CLIから実行

### 10.2 コードバックアップ
- **Git**: バージョン管理
- **GitHub**: リモートリポジトリ

---

生成日時: ${new Date().toISOString()}
`
  return document
}

export default documentation
