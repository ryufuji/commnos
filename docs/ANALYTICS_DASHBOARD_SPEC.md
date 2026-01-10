# 統計ダッシュボード - 設計書

## 📊 概要
コミュニティオーナー/管理者が、テナント全体の活動状況を可視化し、データドリブンな運営判断をサポートするダッシュボード機能です。

---

## 🎯 目的
1. **コミュニティの健全性を把握**: 会員数、活動状況、エンゲージメント
2. **収益状況の可視化**: サブスクリプション、課金状況
3. **コンテンツパフォーマンス**: 投稿の閲覧数、人気コンテンツ
4. **アンケート結果の分析**: 入会時・退会時の傾向分析
5. **会員の行動分析**: ログイン頻度、アクティブ率

---

## 📋 統計カテゴリ

### 1. **会員統計（Membership Analytics）**

#### 📈 基本指標（KPIs）
| 指標名 | データソース | 計算方法 | 表示形式 |
|--------|-------------|---------|---------|
| **総会員数** | `tenant_memberships` | `COUNT(*) WHERE status='active'` | 数値カード |
| **承認待ち数** | `tenant_memberships` | `COUNT(*) WHERE status='pending'` | 数値カード（警告色） |
| **今月の新規会員数** | `tenant_memberships` | `COUNT(*) WHERE joined_at >= START_OF_MONTH` | 数値カード（成長率） |
| **退会者数（累計）** | `tenant_memberships` | `COUNT(*) WHERE status='inactive'` | 数値カード |
| **会員定着率** | 計算 | `(active_members / (active_members + inactive_members)) * 100` | パーセンテージ |

#### 📊 時系列グラフ
- **会員数推移（月次）**: 折れ線グラフ（新規、退会、純増）
  ```sql
  SELECT 
    DATE(joined_at, 'start of month') as month,
    COUNT(*) as new_members
  FROM tenant_memberships
  WHERE tenant_id = ? AND status IN ('active', 'inactive')
  GROUP BY month
  ORDER BY month DESC
  LIMIT 12
  ```

- **承認までの日数分布**: ヒストグラム
  ```sql
  SELECT 
    ROUND(JULIANDAY(approved_at) - JULIANDAY(joined_at)) as days,
    COUNT(*) as count
  FROM tenant_memberships
  WHERE tenant_id = ? AND approved_at IS NOT NULL
  GROUP BY days
  ```

#### 👥 会員セグメント分析
- **ロール別内訳**: 円グラフ（owner, admin, member）
- **プラン別分布**: 棒グラフ（free, starter, pro）
- **会員番号分布**: 範囲別（00001-10000, 10001-20000...）

#### 🗓️ アクティビティ
- **最終ログイン日時の分布**: 
  - 今日ログイン: X人
  - 7日以内: X人
  - 30日以内: X人
  - 30日以上未ログイン: X人（アラート）

---

### 2. **投稿・コンテンツ統計（Content Analytics）**

#### 📈 基本指標
| 指標名 | データソース | 計算方法 | 表示形式 |
|--------|-------------|---------|---------|
| **総投稿数** | `posts` | `COUNT(*) WHERE status='published'` | 数値カード |
| **下書き数** | `posts` | `COUNT(*) WHERE status='draft'` | 数値カード |
| **予約投稿数** | `posts` | `COUNT(*) WHERE status='scheduled'` | 数値カード（時計アイコン） |
| **総閲覧数** | `posts` | `SUM(view_count)` | 数値カード（目アイコン） |
| **平均閲覧数** | `posts` | `AVG(view_count)` | 数値カード |
| **総コメント数** | `comments` | `COUNT(*)` | 数値カード |
| **総いいね数** | `post_likes` | `COUNT(*)` | 数値カード（ハートアイコン） |

#### 📊 時系列グラフ
- **投稿数推移（月次）**: 折れ線グラフ
  ```sql
  SELECT 
    DATE(published_at, 'start of month') as month,
    COUNT(*) as post_count
  FROM posts
  WHERE tenant_id = ? AND status = 'published'
  GROUP BY month
  ORDER BY month DESC
  LIMIT 12
  ```

- **閲覧数推移（日次/週次/月次）**: エリアチャート

#### 🏆 人気コンテンツ
- **閲覧数トップ10**: テーブル（タイトル、閲覧数、いいね数、コメント数）
  ```sql
  SELECT 
    id, title, view_count, 
    (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
  FROM posts p
  WHERE tenant_id = ? AND status = 'published'
  ORDER BY view_count DESC
  LIMIT 10
  ```

- **いいね数トップ10**: テーブル
- **コメント数トップ10**: テーブル

#### 🎭 エンゲージメント率
- **投稿あたりの平均エンゲージメント**: 
  - 平均いいね数: `AVG(like_count)`
  - 平均コメント数: `AVG(comment_count)`
  - エンゲージメント率: `((likes + comments) / views) * 100`

#### 👤 投稿者別統計
- **投稿数ランキング**: 棒グラフ（ニックネーム、投稿数）
- **投稿者あたりの平均閲覧数**: テーブル

---

### 3. **サブスクリプション・収益統計（Revenue Analytics）**

#### 💰 基本指標
| 指標名 | データソース | 計算方法 | 表示形式 |
|--------|-------------|---------|---------|
| **アクティブサブスク数** | `subscriptions` | `COUNT(*) WHERE status='active'` | 数値カード |
| **今月の新規サブスク** | `subscriptions` | `COUNT(*) WHERE created_at >= START_OF_MONTH` | 数値カード |
| **解約数（今月）** | `subscriptions` | `COUNT(*) WHERE canceled_at >= START_OF_MONTH` | 数値カード（警告） |
| **月次経常収益（MRR）** | 計算 | `SUM(plan_price) WHERE billing_interval='month'` | 金額カード |
| **年間経常収益（ARR）** | 計算 | `MRR * 12 + yearly_revenue` | 金額カード |
| **解約率（Churn Rate）** | 計算 | `(cancellations / active_subscriptions) * 100` | パーセンテージ（アラート） |
| **平均顧客単価（ARPU）** | 計算 | `total_revenue / active_subscriptions` | 金額カード |
| **顧客生涯価値（LTV）** | 計算 | `ARPU / churn_rate` | 金額カード |

#### 📊 収益グラフ
- **収益推移（月次）**: 折れ線グラフ（MRR推移）
  ```sql
  SELECT 
    DATE(created_at, 'start of month') as month,
    SUM(amount) as revenue
  FROM payment_history
  WHERE tenant_id = ? AND status = 'succeeded'
  GROUP BY month
  ORDER BY month DESC
  LIMIT 12
  ```

- **プラン別収益内訳**: 円グラフ（Free, Starter, Pro）
- **月払い vs 年払い**: 棒グラフ（billing_interval別）

#### 📈 サブスクリプション分析
- **新規サブスク vs 解約**: 折れ線グラフ（月次）
- **プラン別契約数**: 棒グラフ
- **契約期間分布**: ヒストグラム（1ヶ月未満、1-3ヶ月、3-6ヶ月、6-12ヶ月、1年以上）

#### 💳 決済統計
- **決済成功率**: `(succeeded / total) * 100`
- **決済失敗数**: 数値カード（アラート）
- **平均決済金額**: `AVG(amount)`
- **総決済額（累計）**: `SUM(amount WHERE status='succeeded')`

---

### 4. **アンケート統計（Survey Analytics）**

#### 📋 入会時アンケート

##### 基本指標
| 指標名 | データソース | 計算方法 | 表示形式 |
|--------|-------------|---------|---------|
| **総回答数** | `survey_responses` | `COUNT(DISTINCT user_id) WHERE response_type='join'` | 数値カード |
| **回答率** | 計算 | `(responses / new_members) * 100` | パーセンテージ |
| **平均回答時間** | 計算（将来実装） | `AVG(submitted_at - form_opened_at)` | 時間 |

##### 質問別分析
1. **テキスト質問（text/textarea）**
   - 回答一覧: テーブル（ユーザー名、回答、日時）
   - ワードクラウド: 頻出キーワード可視化（将来実装）
   - 回答文字数分布: ヒストグラム

2. **単一選択質問（radio）**
   - 選択肢別集計: 棒グラフ
     ```sql
     SELECT 
       answer, 
       COUNT(*) as count,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM survey_responses WHERE question_id = ?), 1) as percentage
     FROM survey_responses
     WHERE question_id = ?
     GROUP BY answer
     ORDER BY count DESC
     ```
   - 円グラフ: 選択肢比率

3. **複数選択質問（checkbox）**
   - 各選択肢の選択数: 棒グラフ
   - 組み合わせパターン: テーブル（A+B: X人, B+C: Y人）

4. **評価スケール質問（scale）**
   - 平均スコア: 数値カード（星表示）
     ```sql
     SELECT 
       AVG(CAST(answer AS INTEGER)) as avg_score,
       COUNT(*) as response_count
     FROM survey_responses
     WHERE question_id = ?
     ```
   - スコア分布: ヒストグラム（1-5点の分布）
   - 時系列推移: 折れ線グラフ（月次平均）

##### 回答者属性別分析
- **プラン別回答傾向**: クロス集計
- **入会時期別満足度**: 折れ線グラフ
- **性別・年齢別（カスタム質問がある場合）**: グループ別集計

#### 🚪 退会時アンケート

##### 基本指標
| 指標名 | データソース | 計算方法 | 表示形式 |
|--------|-------------|---------|---------|
| **総回答数** | `survey_responses` | `COUNT(DISTINCT user_id) WHERE response_type='leave'` | 数値カード |
| **回答率** | 計算 | `(responses / total_exits) * 100` | パーセンテージ |

##### 退会理由分析
- **退会理由トップ5**: 棒グラフ（単一選択質問の集計）
- **退会理由の時系列推移**: 積み上げ棒グラフ（月次）
- **会員期間別退会理由**: クロス集計（1ヶ月未満、1-3ヶ月、3-6ヶ月...）

##### 改善ヒント
- **フリーコメント一覧**: テーブル（優先度順）
- **要望・改善提案の頻出キーワード**: タグクラウド
- **NPS（Net Promoter Score）計算**: 数値カード（0-10スケール質問がある場合）
  - Promoters (9-10点): X%
  - Passives (7-8点): Y%
  - Detractors (0-6点): Z%
  - NPS = Promoters% - Detractors%

---

### 5. **エンゲージメント統計（Engagement Analytics）**

#### 🔥 アクティビティ指標
| 指標名 | データソース | 計算方法 | 表示形式 |
|--------|-------------|---------|---------|
| **DAU (Daily Active Users)** | `users.last_login_at` | `COUNT(DISTINCT user_id) WHERE last_login_at >= TODAY` | 数値カード |
| **WAU (Weekly Active Users)** | `users.last_login_at` | `COUNT(DISTINCT user_id) WHERE last_login_at >= LAST_7_DAYS` | 数値カード |
| **MAU (Monthly Active Users)** | `users.last_login_at` | `COUNT(DISTINCT user_id) WHERE last_login_at >= LAST_30_DAYS` | 数値カード |
| **DAU/MAU比率（スティッキネス）** | 計算 | `(DAU / MAU) * 100` | パーセンテージ |

#### 📊 エンゲージメントグラフ
- **アクティブユーザー推移**: 折れ線グラフ（DAU/WAU/MAU）
- **投稿頻度分布**: ヒストグラム（ユーザーあたりの投稿数）
- **コメント頻度分布**: ヒストグラム

#### 👥 ユーザーセグメント
- **スーパーユーザー（Top 10%）**: 投稿・コメント・いいねが多い
- **アクティブユーザー（Top 50%）**: 週1回以上ログイン
- **休眠ユーザー**: 30日以上未ログイン（リエンゲージメント対象）
- **新規ユーザー**: 30日以内の入会

#### 📱 行動パターン
- **曜日別アクティビティ**: 棒グラフ（投稿数、コメント数）
- **時間帯別アクティビティ**: ヒートマップ（24時間 x 7曜日）
- **ユーザーあたりの平均セッション時間**: 数値カード（将来実装）

---

### 6. **通知・チャット統計（Communication Analytics）**

#### 📬 通知統計
| 指標名 | データソース | 計算方法 | 表示形式 |
|--------|-------------|---------|---------|
| **送信通知数（今月）** | `notifications` | `COUNT(*) WHERE created_at >= START_OF_MONTH` | 数値カード |
| **未読通知数** | `notifications` | `COUNT(*) WHERE is_read = 0` | 数値カード |
| **通知タイプ別内訳** | `notifications` | `GROUP BY type` | 円グラフ |

#### 💬 チャット統計
| 指標名 | データソース | 計算方法 | 表示形式 |
|--------|-------------|---------|---------|
| **アクティブチャットルーム数** | `chat_rooms` | `COUNT(*) WHERE last_message_at >= LAST_7_DAYS` | 数値カード |
| **総メッセージ数** | `chat_messages` | `COUNT(*)` | 数値カード |
| **今月のメッセージ数** | `chat_messages` | `COUNT(*) WHERE sent_at >= START_OF_MONTH` | 数値カード |
| **平均返信時間** | 計算 | `AVG(reply_at - sent_at)` | 時間 |

#### 📊 チャットグラフ
- **メッセージ数推移**: 折れ線グラフ（日次/週次）
- **ルーム別メッセージ数ランキング**: 棒グラフ
- **ユーザー別メッセージ数ランキング**: 棒グラフ

---

### 7. **ストレージ・リソース統計（Resource Analytics）**

#### 💾 ストレージ使用状況
| 指標名 | データソース | 計算方法 | 表示形式 |
|--------|-------------|---------|---------|
| **使用中ストレージ** | `tenants.storage_used` | 現在値 | 数値カード（GB） |
| **ストレージ上限** | `tenants.storage_limit` | 現在値 | 数値カード（GB） |
| **使用率** | 計算 | `(storage_used / storage_limit) * 100` | プログレスバー |
| **画像ファイル数** | `media_attachments` | `COUNT(*) WHERE file_type LIKE 'image%'` | 数値カード |
| **動画ファイル数** | `media_attachments` | `COUNT(*) WHERE file_type LIKE 'video%'` | 数値カード |

#### 📊 リソースグラフ
- **ストレージ使用量推移**: エリアチャート（月次）
- **ファイルタイプ別内訳**: 円グラフ（画像、動画、その他）
- **投稿別ストレージ使用量トップ10**: 棒グラフ

---

### 8. **クーポン・キャンペーン統計（Marketing Analytics）**

#### 🎟️ クーポン統計
| 指標名 | データソース | 計算方法 | 表示形式 |
|--------|-------------|---------|---------|
| **発行クーポン数** | `coupons` | `COUNT(*)` | 数値カード |
| **使用済みクーポン数** | `tenant_coupon_redemptions` | `COUNT(*)` | 数値カード |
| **使用率** | 計算 | `(redeemed / issued) * 100` | パーセンテージ |
| **クーポン経由の収益** | 計算 | `SUM(discount_amount)` | 金額カード |

#### 📊 クーポングラフ
- **クーポン別使用数ランキング**: 棒グラフ
- **使用数推移**: 折れ線グラフ（月次）
- **割引額推移**: エリアチャート

---

## 🎨 ダッシュボードUI設計

### ページ構成

#### 1. **概要ダッシュボード（/dashboard）**
- 全カテゴリの主要KPIを表示
- カード形式で重要指標を一覧
- 各カテゴリへのリンク

#### 2. **会員分析（/dashboard/members）**
- 会員統計の詳細表示
- フィルター機能（期間、ステータス、プラン）

#### 3. **コンテンツ分析（/dashboard/content）**
- 投稿・コメント・いいねの詳細分析
- 人気コンテンツランキング

#### 4. **収益分析（/dashboard/revenue）**
- サブスクリプション・決済の詳細
- 収益予測グラフ

#### 5. **アンケート分析（/dashboard/surveys）**
- 入会時・退会時アンケートの詳細分析
- 質問別の回答集計

#### 6. **エンゲージメント分析（/dashboard/engagement）**
- アクティブユーザー分析
- 行動パターン可視化

---

## 🛠️ 実装技術スタック

### フロントエンド
- **Chart.js**: グラフ描画（折れ線、棒、円、エリアチャート）
- **TailwindCSS**: レイアウト・スタイリング
- **FontAwesome**: アイコン
- **Axios**: API通信

### バックエンド
- **Hono**: APIルート実装
- **Cloudflare D1**: データベースクエリ
- **SQL集計関数**: COUNT, SUM, AVG, GROUP BY, DATE関数

### グラフライブラリ
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

---

## 📊 SQL クエリ例

### 会員数推移（月次）
```sql
SELECT 
  strftime('%Y-%m', joined_at) as month,
  COUNT(*) as member_count
FROM tenant_memberships
WHERE tenant_id = ? AND status = 'active'
GROUP BY month
ORDER BY month DESC
LIMIT 12
```

### 投稿エンゲージメント率
```sql
SELECT 
  p.id,
  p.title,
  p.view_count,
  COUNT(DISTINCT pl.user_id) as like_count,
  COUNT(DISTINCT c.id) as comment_count,
  ROUND(
    (COUNT(DISTINCT pl.user_id) + COUNT(DISTINCT c.id)) * 100.0 / NULLIF(p.view_count, 0),
    2
  ) as engagement_rate
FROM posts p
LEFT JOIN post_likes pl ON p.id = pl.post_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.tenant_id = ? AND p.status = 'published'
GROUP BY p.id
ORDER BY engagement_rate DESC
LIMIT 10
```

### アンケート回答集計（単一選択）
```sql
SELECT 
  answer,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (
    SELECT COUNT(DISTINCT user_id) 
    FROM survey_responses 
    WHERE question_id = ?
  ), 1) as percentage
FROM survey_responses
WHERE question_id = ?
GROUP BY answer
ORDER BY count DESC
```

### 収益推移（MRR）
```sql
SELECT 
  strftime('%Y-%m', current_period_start) as month,
  SUM(
    CASE 
      WHEN tm.billing_interval = 'month' THEN pp.monthly_price
      WHEN tm.billing_interval = 'year' THEN pp.yearly_price / 12
    END
  ) as mrr
FROM subscriptions s
JOIN tenant_memberships tm ON s.user_id = tm.user_id AND s.tenant_id = tm.tenant_id
JOIN platform_plans pp ON tm.plan_id = pp.id
WHERE s.tenant_id = ? AND s.status = 'active'
GROUP BY month
ORDER BY month DESC
LIMIT 12
```

---

## 🎯 優先順位

### Phase 1: 必須統計（MVP）
1. ✅ 会員統計（総数、承認待ち、新規）
2. ✅ 投稿統計（総数、閲覧数、いいね）
3. ✅ サブスクリプション統計（MRR、アクティブ数）
4. ✅ アンケート回答集計（選択肢別）

### Phase 2: 詳細分析
1. ⏳ 時系列グラフ（推移）
2. ⏳ ランキング表示（人気コンテンツ）
3. ⏳ セグメント別分析（プラン別、期間別）

### Phase 3: 高度な分析
1. ⏳ エンゲージメント分析（DAU/MAU）
2. ⏳ 予測分析（収益予測、解約予測）
3. ⏳ ヒートマップ（行動パターン）
4. ⏳ ワードクラウド（テキスト分析）

---

## 🔒 セキュリティ・権限

### アクセス権限
- **Owner**: 全統計閲覧可能
- **Admin**: 全統計閲覧可能
- **Member**: アクセス不可

### データプライバシー
- 個人情報は匿名化して表示
- アンケート自由記述回答は管理者のみ閲覧可
- 収益データは Owner のみ閲覧可（Admin は非表示オプション）

---

## 📝 まとめ

この統計ダッシュボードにより、コミュニティオーナーは：

1. **会員の成長と健全性を把握** → 入会・退会のトレンド
2. **コンテンツの質を向上** → 人気コンテンツから学ぶ
3. **収益を最適化** → プラン別収益、解約率の改善
4. **アンケート結果を活用** → 会員の声を運営に反映
5. **エンゲージメントを高める** → アクティブ率、休眠ユーザー把握

データドリブンな意思決定で、コミュニティの持続的成長をサポートします。

---

**次のステップ**: Phase 1（必須統計）の実装から開始し、段階的に機能を拡張していきます。
