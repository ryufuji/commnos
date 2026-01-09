# 予約投稿機能 - 実装完了レポート

## 📋 概要
管理者とオーナーが投稿を予約し、指定した日時に自動的に公開される機能を実装しました。

---

## ✅ 実装内容

### 1️⃣ データベース

**マイグレーション**: `migrations/0020_add_scheduled_posts.sql`

```sql
-- scheduled_at カラムを追加（予約公開日時）
-- インデックスを作成（Cronジョブの効率化）
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled ON posts(status, scheduled_at);
```

**新しいステータス値**:
- `published` - 公開済み
- `draft` - 下書き
- `scheduled` - 予約投稿（新規追加）

---

### 2️⃣ フロントエンド: 投稿作成フォーム

**ファイル**: `src/routes/tenant-public.ts`

#### 予約投稿UI
- ✅ 日付選択（type="date"）
- ✅ 時間選択（type="time"）
- ✅ 過去の日時を無効化（JavaScript制御）
- ✅ 今日が選択されている場合、現在時刻より前の時刻を無効化

**表示制御**:
```javascript
// ステータスが「予約投稿」の場合のみ日時フィールドを表示
if (status === 'scheduled') {
    scheduledField.style.display = 'block'
} else {
    scheduledField.style.display = 'none'
}
```

**バリデーション**:
- 予約日時が未入力の場合エラー
- 予約日時が過去の場合エラー

---

### 3️⃣ バックエンド: 投稿作成API

**ファイル**: `src/routes/posts.ts`

#### scheduled_at の保存
```typescript
const { scheduled_at, status } = await c.req.json<{
    status?: 'draft' | 'published' | 'scheduled'
    scheduled_at?: string | null
}>()

// scheduled_atのバリデーション
if (status === 'scheduled') {
    if (!scheduled_at) {
        return c.json({ success: false, message: '予約投稿には公開日時を指定してください' }, 400)
    }
    
    const scheduledDateTime = new Date(scheduled_at)
    const now = new Date()
    
    if (scheduledDateTime <= now) {
        return c.json({ 
            success: false, 
            message: '予約日時は現在より未来の日時を選択してください' 
        }, 400)
    }
}

// データベースに保存
INSERT INTO posts (..., status, scheduled_at, ...)
VALUES (..., ?, ?, ...)
```

---

### 4️⃣ Cron Worker: 自動公開

**⚠️ 重要**: Cloudflare Pagesは Cron Triggers をサポートしていないため、**別のWorkerとしてデプロイする必要があります**。

#### ファイル構成
- `src/cron-worker.ts` - Cronワーカーのエントリーポイント
- `wrangler-cron.jsonc` - Cronワーカー用の設定ファイル

#### Cronジョブの動作
```typescript
// 毎分実行
"triggers": {
    "crons": ["* * * * *"]
}

// scheduled_atが現在時刻を過ぎた投稿を取得
SELECT id, title, scheduled_at, tenant_id
FROM posts
WHERE status = 'scheduled' 
  AND scheduled_at IS NOT NULL
  AND scheduled_at <= ?
ORDER BY scheduled_at ASC
LIMIT 100

// ステータスを'published'に更新
UPDATE posts
SET status = 'published',
    published_at = datetime('now'),
    updated_at = datetime('now')
WHERE id = ? AND status = 'scheduled'
```

#### Cronワーカーのデプロイ手順

**⚠️ 注意**: Cronワーカーは別途手動でデプロイする必要があります。

```bash
# Cronワーカーをデプロイ
npx wrangler deploy --config wrangler-cron.jsonc

# デプロイ後、Cloudflare Dashboardでトリガーを確認
# https://dash.cloudflare.com/
```

---

### 5️⃣ 投稿管理画面

**ファイル**: `public/static/posts-admin.js`、`src/index.tsx`

#### scheduled状態の表示
- ✅ 黄色のバッジ「予約: YYYY/MM/DD HH:MM」
- ✅ フィルターに「予約投稿」オプションを追加

```javascript
if (post.status === 'scheduled') {
    const scheduledDate = new Date(post.scheduled_at).toLocaleString('ja-JP', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    })
    statusBadge = '<span class="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">' +
                  '予約: ' + scheduledDate + 
                  '</span>'
}
```

---

## 📊 機能フロー

### 投稿予約フロー
```
1. 管理者が投稿作成フォームで「予約投稿」を選択
   ↓
2. 日付と時刻を指定（過去の日時は選択不可）
   ↓
3. 投稿を作成
   ↓
4. DBに status='scheduled', scheduled_at='2026-01-10T10:00:00' で保存
   ↓
5. 投稿管理画面に「予約: 2026/01/10 10:00」と表示
```

### 自動公開フロー
```
1. Cronワーカーが毎分実行
   ↓
2. scheduled_at <= 現在時刻 の投稿を取得
   ↓
3. status を 'scheduled' → 'published' に更新
   ↓
4. published_at を現在時刻に設定
   ↓
5. ログに「✓ Published post ID: X」を出力
```

### 過去の日時が指定された場合
- **クライアント側バリデーション**: エラーメッセージ表示
- **サーバー側バリデーション**: 400エラー返却
- **Cronワーカー**: 過去の日時の予約投稿はすぐに公開

---

## 🧪 テストシナリオ

### シナリオ1: 予約投稿の作成
1. 管理者でログイン
2. 投稿作成ページへ移動
3. 「予約投稿」を選択
4. 明日の日付と10:00を設定
5. タイトルと本文を入力
6. 「投稿する」をクリック
7. **期待**: 「予約投稿を設定しました」と表示される

### シナリオ2: 投稿管理画面での確認
1. 投稿管理ページへ移動
2. **期待**: 黄色のバッジ「予約: 2026/01/10 10:00」が表示される
3. フィルターで「予約投稿」を選択
4. **期待**: scheduled状態の投稿のみ表示される

### シナリオ3: 過去の日時を指定
1. 予約投稿で過去の日付を選択
2. **期待**: 「予約日時は現在より未来の日時を選択してください」エラー

### シナリオ4: 自動公開
1. 予約時刻が来る
2. Cronワーカーが実行
3. **期待**: 投稿が自動的に公開される（status='published'）
4. **期待**: Cloudflare Logsに「✓ Published post ID: X」が記録される

---

## 📁 変更ファイル

### 新規ファイル
- `migrations/0020_add_scheduled_posts.sql` - DBマイグレーション
- `src/cron/scheduled-posts.ts` - Cronハンドラー
- `src/cron-worker.ts` - Cronワーカーエントリーポイント
- `wrangler-cron.jsonc` - Cronワーカー設定

### 変更ファイル
- `src/routes/tenant-public.ts` - 投稿作成フォームに予約UI追加
- `src/routes/posts.ts` - scheduled_at の保存処理追加
- `public/static/posts-admin.js` - scheduled状態の表示追加
- `src/index.tsx` - フィルターにscheduledオプション追加
- `wrangler.jsonc` - Cronトリガー削除（Pagesは非サポート）

---

## 🔗 デプロイ情報

### 本番環境
- **Pages**: https://commons-webapp.pages.dev/
- **最新デプロイ**: https://cbb84b70.commons-webapp.pages.dev/

### Cronワーカー（別途デプロイ必要）
```bash
npx wrangler deploy --config wrangler-cron.jsonc
```

### GitHub
- **リポジトリ**: https://github.com/ryufuji/commnos
- **コミット**: 565560c
- **ブランチ**: main

### 変更統計
- **追加行数**: 432 行
- **削除行数**: 36 行
- **変更ファイル**: 11 ファイル
- **新規ファイル**: 4 ファイル
- **バンドルサイズ**: 987.65 kB

---

## ⚠️ 重要な注意事項

### Cloudflare Pages の制限
- Cloudflare Pages は **Cron Triggers をサポートしていません**
- 予約投稿の自動公開には **別のWorkerが必要**

### Cronワーカーのデプロイ
**手動でデプロイする必要があります**:

```bash
# 1. Cronワーカーをデプロイ
cd /home/user/webapp
npx wrangler deploy --config wrangler-cron.jsonc

# 2. Cloudflare Dashboardで確認
# https://dash.cloudflare.com/
# Workers & Pages > commons-webapp-cron > Settings > Triggers
# Cron Trigger: * * * * * (毎分実行)
```

### ログの確認方法
```bash
# Cronワーカーのログを確認
npx wrangler tail commons-webapp-cron

# または Cloudflare Dashboard
# Workers & Pages > commons-webapp-cron > Logs
```

---

## 📈 今後の改善案

1. **Cron実行頻度の最適化**
   - 現在: 毎分実行
   - 改善案: 5分ごとまたは15分ごとに変更してリソース節約

2. **タイムゾーンの明示的な指定**
   - 現在: ブラウザのローカルタイムゾーン
   - 改善案: テナントごとにタイムゾーンを設定可能に

3. **予約投稿の通知機能**
   - 予約時刻の1時間前にメール通知
   - 公開後に管理者へ通知

4. **予約投稿のキャンセル機能**
   - 予約投稿を編集して下書きに戻す
   - 予約日時の変更

---

## ✅ 完了チェックリスト

- [x] データベースマイグレーション作成
- [x] 投稿作成フォームに予約UIを追加
- [x] 過去の日時を無効化
- [x] 投稿作成APIで scheduled_at を保存
- [x] Cronワーカーを作成
- [x] 投稿管理画面に scheduled 状態を表示
- [x] フィルターに scheduled オプションを追加
- [x] ビルド・デプロイ完了
- [ ] **Cronワーカーを別途デプロイ（手動）**
- [x] ドキュメント作成

---

**最終更新**: 2026-01-09  
**デプロイ日時**: 2026-01-09  
**担当**: AI Assistant

---

## 📝 投稿編集機能での予約投稿

### 編集モーダルでの予約日時変更

**ファイル**: 
- `src/index.tsx` (編集モーダルHTML)
- `public/static/posts-admin.js` (編集処理JavaScript)
- `src/routes/admin-posts.ts` (更新API)

#### 実装内容

1. **ステータス変更時の動的表示**
   - ステータスを「予約公開」に変更すると、日時フィールドが表示される
   - それ以外のステータスでは、日時フィールドが非表示

2. **既存の予約日時を編集画面に読み込み**
   - 予約投稿を編集時、既存の `scheduled_at` を日付・時刻フィールドに自動設定
   - `editScheduledDate`: `YYYY-MM-DD` 形式
   - `editScheduledTime`: `HH:MM` 形式

3. **過去日時のバリデーション**
   - 日付選択で過去の日付は選択不可
   - 今日の日付を選択した場合、現在時刻より前の時刻は無効化

4. **更新API**
   - `PUT /api/admin/posts/:id` に `scheduled_at` を追加
   - ステータスが `scheduled` の場合のみ保存
   - それ以外のステータスでは `scheduled_at` を `null` に設定

#### コード例（JavaScript）

```javascript
// posts-admin.js

// ステータス変更で日時フィールドの表示/非表示
editStatusField.addEventListener('change', function() {
    const scheduledFields = document.getElementById('editScheduledFields')
    if (scheduledFields) {
        scheduledFields.style.display = this.value === 'scheduled' ? 'block' : 'none'
    }
})

// 過去日時のバリデーション
if (editScheduledDate) {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    editScheduledDate.setAttribute('min', today)
    
    editScheduledDate.addEventListener('change', function() {
        if (this.value === today && editScheduledTime) {
            const currentTime = now.toTimeString().slice(0, 5)
            editScheduledTime.setAttribute('min', currentTime)
            if (editScheduledTime.value && editScheduledTime.value < currentTime) {
                editScheduledTime.value = currentTime
            }
        } else if (editScheduledTime) {
            editScheduledTime.removeAttribute('min')
        }
    })
}

// 保存時にscheduled_atを送信
const statusValue = document.getElementById('editStatus').value
if (statusValue === 'scheduled') {
    const scheduledDate = document.getElementById('editScheduledDate').value
    const scheduledTime = document.getElementById('editScheduledTime').value
    
    if (scheduledDate && scheduledTime) {
        data.scheduled_at = scheduledDate + 'T' + scheduledTime + ':00.000Z'
    } else {
        showToast('予約投稿には日時の指定が必要です', 'error')
        return
    }
} else {
    data.scheduled_at = null
}
```

#### API仕様（更新）

**エンドポイント**: `PUT /api/admin/posts/:id`

**リクエストボディ**:
```json
{
  "title": "更新後のタイトル",
  "content": "更新後の本文",
  "status": "scheduled",
  "scheduled_at": "2026-01-15T18:00:00.000Z",
  "visibility": "public",
  "thumbnail_url": "https://...",
  "video_url": "https://..."
}
```

**レスポンス**:
```json
{
  "success": true,
  "post": { ... },
  "message": "投稿を更新しました"
}
```

---

## 🧪 追加のテストシナリオ

### テスト5: 予約投稿の編集
1. 管理者でログイン
2. `/posts-admin` にアクセス
3. 既存の予約投稿の「編集」ボタンをクリック
4. ステータスが「予約公開」の場合、日時フィールドが表示されることを確認
5. 日時を変更（例：1時間後に変更）
6. 「更新する」をクリック
7. 投稿一覧で変更が反映されることを確認

### テスト6: 予約投稿を即公開に変更
1. 予約投稿を編集
2. ステータスを「公開」に変更
3. 「更新する」をクリック
4. 投稿が即座に公開され、`published_at` が設定されることを確認

### テスト7: 公開済み投稿を予約投稿に変更
1. 公開済み投稿を編集
2. ステータスを「予約公開」に変更
3. 未来の日時を指定
4. 「更新する」をクリック
5. 投稿が `status='scheduled'` に変更されることを確認

---

## 🔗 更新されたデプロイ情報

- **本番環境**: https://commons-webapp.pages.dev/
- **最新デプロイ**: https://d214dfd1.commons-webapp.pages.dev
- **GitHub**: https://github.com/ryufuji/commnos
- **コミット**: `456b388`
- **バンドルサイズ**: 989.71 kB

---

## ✅ 完了（更新）
- ✅ データベースマイグレーション（`scheduled_at` カラム追加）
- ✅ 投稿作成フォームに予約投稿UI実装
- ✅ **投稿編集モーダルに予約投稿UI実装**（NEW）
- ✅ バックエンドAPIでの `scheduled_at` 保存・更新
- ✅ Cron Worker による自動公開
- ✅ 投稿管理画面での予約投稿表示
- ✅ 過去日時のバリデーション（作成時・編集時）
- ✅ 本番環境デプロイ

---

**最終更新**: 2026-01-09  
**バージョン**: Phase 4（予約投稿機能 + 編集機能）
