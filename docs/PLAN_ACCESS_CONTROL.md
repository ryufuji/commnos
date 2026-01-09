# プランベースのアクセス制御システム

## 📋 概要

このドキュメントでは、プラン（サブスクリプション）によってコンテンツの閲覧を制御する仕組みについて説明します。

## 🎯 主な機能

### 1. プランレベル階層
- **レベル0**: 無料（全員が閲覧可能）
- **レベル1**: ベーシックプラン会員
- **レベル2**: スタンダードプラン会員
- **レベル3**: プレミアムプラン会員

### 2. 投稿レベルの制御
各投稿に以下の設定が可能：
- `required_plan_level`: 閲覧に必要な最小プランレベル
- `is_members_only`: 会員限定フラグ（ログイン必須）
- `is_premium_content`: プレミアムコンテンツフラグ
- `preview_length`: プレビュー表示可能な文字数（0=全文表示）

### 3. カテゴリレベルの制御（オプション）
カテゴリ単位でプランレベルを設定可能。

---

## 🗄️ データベース構造

### tenant_plans テーブル拡張
```sql
ALTER TABLE tenant_plans ADD COLUMN plan_level INTEGER DEFAULT 0;
```

### posts テーブル拡張
```sql
ALTER TABLE posts ADD COLUMN required_plan_level INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN is_members_only INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN is_premium_content INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN preview_length INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN category_id INTEGER;
```

### post_categories テーブル（新規）
```sql
CREATE TABLE post_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  required_plan_level INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, slug)
);
```

### post_access_logs テーブル（新規・分析用）
```sql
CREATE TABLE post_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER,
  tenant_id INTEGER NOT NULL,
  access_granted INTEGER DEFAULT 1,
  user_plan_level INTEGER DEFAULT 0,
  required_plan_level INTEGER DEFAULT 0,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

---

## 🔌 API エンドポイント

### 1. 投稿詳細取得（アクセス制御対応）
```
GET /api/posts/:id
```

**レスポンス例**（アクセス許可あり）:
```json
{
  "success": true,
  "post": {
    "id": 1,
    "title": "プレミアム記事",
    "content": "全文が表示されます...",
    "content_html": "<p>全文が表示されます...</p>",
    "access_info": {
      "can_access": true,
      "is_filtered": false,
      "is_members_only": true,
      "is_premium_content": true,
      "user_plan_level": 3,
      "required_plan_level": 2
    }
  }
}
```

**レスポンス例**（アクセス拒否）:
```json
{
  "success": true,
  "post": {
    "id": 1,
    "title": "プレミアム記事",
    "content": "これはプレミアム記事の...[続きを読むには上位プランが必要です]",
    "content_html": "<p>これはプレミアム記事の...[続きを読むには上位プランが必要です]</p>",
    "access_info": {
      "can_access": false,
      "is_filtered": true,
      "is_members_only": true,
      "is_premium_content": true,
      "user_plan_level": 1,
      "required_plan_level": 2,
      "message": "この投稿を閲覧するには上位プランへのアップグレードが必要です",
      "required_plan": {
        "id": 3,
        "name": "スタンダードプラン",
        "price": 2000,
        "plan_level": 2
      }
    }
  }
}
```

### 2. 投稿のアクセス制御設定を更新（オーナー/管理者のみ）
```
PATCH /api/posts/:id/access
```

**リクエストボディ**:
```json
{
  "required_plan_level": 2,
  "is_members_only": true,
  "is_premium_content": true,
  "preview_length": 200
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "アクセス制御設定を更新しました",
  "data": {
    "post_id": 1,
    "required_plan_level": 2,
    "is_members_only": true,
    "is_premium_content": true,
    "preview_length": 200
  }
}
```

### 3. 投稿のアクセス制御設定を取得（オーナー/管理者のみ）
```
GET /api/posts/:id/access
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "プレミアム記事",
    "required_plan_level": 2,
    "is_members_only": true,
    "is_premium_content": true,
    "preview_length": 200
  }
}
```

### 4. アクセス制御統計（オーナー/管理者のみ）
```
GET /api/posts/access/stats
```

**レスポンス**:
```json
{
  "success": true,
  "stats": {
    "by_plan_level": [
      { "required_plan_level": 0, "count": 50, "total_views": 1500 },
      { "required_plan_level": 1, "count": 20, "total_views": 400 },
      { "required_plan_level": 2, "count": 10, "total_views": 150 }
    ],
    "members_only_count": 30,
    "premium_count": 15,
    "access_logs": {
      "granted": 2500,
      "denied": 150
    }
  }
}
```

### 5. 複数投稿のアクセス制御を一括更新（オーナーのみ）
```
POST /api/posts/access/batch-update
```

**リクエストボディ**:
```json
{
  "post_ids": [1, 2, 3, 4, 5],
  "required_plan_level": 2,
  "is_premium_content": true
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "5件の投稿のアクセス制御設定を更新しました",
  "updated_count": 5
}
```

---

## 💻 使用例

### シナリオ1: 無料会員が有料記事を閲覧
1. ユーザーが記事ページにアクセス
2. バックエンドでプランレベルをチェック
   - ユーザー: レベル0（無料）
   - 記事: required_plan_level=2（スタンダード以上必要）
3. プレビューのみ表示（preview_length=200文字）
4. 「続きを読むにはスタンダードプランが必要です」メッセージ表示
5. 必要なプラン情報を表示（名前、価格、アップグレードリンク）

### シナリオ2: ベーシック会員がプレミアム記事を閲覧
1. ユーザーが記事ページにアクセス
2. バックエンドでプランレベルをチェック
   - ユーザー: レベル1（ベーシック）
   - 記事: required_plan_level=3（プレミアム必要）
3. プレビューのみ表示
4. 「プレミアムプランにアップグレード」を促す

### シナリオ3: プレミアム会員がすべての記事を閲覧
1. ユーザーが記事ページにアクセス
2. バックエンドでプランレベルをチェック
   - ユーザー: レベル3（プレミアム）
   - 記事: required_plan_level=2（スタンダード以上必要）
3. レベル3 >= レベル2 のため、全文表示
4. 閲覧数をカウント

### シナリオ4: 運営者が記事を会員限定に設定
1. 運営者が管理画面で記事を選択
2. 「アクセス制御」セクションで設定
   - 会員限定: ON
   - 必要プランレベル: 1（ベーシック以上）
   - プレビュー文字数: 150
3. `PATCH /api/posts/:id/access` で更新
4. 即座に反映

---

## 🎨 フロントエンド実装例

### 記事詳細ページでの表示制御

```javascript
async function loadPost(postId) {
  const response = await axios.get(`/api/posts/${postId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId
    }
  })

  const { post } = response.data
  const { access_info } = post

  // タイトルと基本情報は常に表示
  document.getElementById('post-title').textContent = post.title

  // アクセス制御による表示分岐
  if (access_info.can_access) {
    // 全文表示
    document.getElementById('post-content').innerHTML = post.content_html
    document.getElementById('upgrade-notice').style.display = 'none'
  } else {
    // プレビューのみ表示
    document.getElementById('post-content').innerHTML = post.content_html
    
    // アップグレード促進メッセージ
    const notice = document.getElementById('upgrade-notice')
    notice.style.display = 'block'
    notice.innerHTML = `
      <div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 my-4">
        <p class="font-bold">${access_info.message}</p>
        ${access_info.required_plan ? `
          <p class="mt-2">必要なプラン: ${access_info.required_plan.name} (¥${access_info.required_plan.price}/月)</p>
          <a href="/tenant/member-plans?subdomain=${subdomain}" class="btn-primary mt-2 inline-block">
            プランをアップグレード
          </a>
        ` : ''}
      </div>
    `
  }
}
```

### 管理画面での設定UI

```javascript
async function updatePostAccess(postId) {
  const data = {
    required_plan_level: parseInt(document.getElementById('plan-level').value),
    is_members_only: document.getElementById('members-only').checked,
    is_premium_content: document.getElementById('premium-content').checked,
    preview_length: parseInt(document.getElementById('preview-length').value)
  }

  const response = await axios.patch(`/api/posts/${postId}/access`, data, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId
    }
  })

  if (response.data.success) {
    showToast('アクセス制御設定を更新しました', 'success')
  }
}
```

---

## 📊 分析機能

### アクセスログ分析
`post_access_logs` テーブルを使用して以下の分析が可能：

1. **コンバージョン率**
   - プレミアム記事へのアクセス拒否回数
   - その後のプランアップグレード率

2. **人気コンテンツ分析**
   - 有料記事の閲覧数
   - プランレベル別の閲覧傾向

3. **収益最適化**
   - どのプランレベルの記事が最も効果的か
   - プレビュー長の最適化

---

## 🔧 設定ガイド

### ステップ1: プランにレベルを設定
```sql
-- プランレベルを手動で設定
UPDATE tenant_plans SET plan_level = 1 WHERE name = 'ベーシックプラン';
UPDATE tenant_plans SET plan_level = 2 WHERE name = 'スタンダードプラン';
UPDATE tenant_plans SET plan_level = 3 WHERE name = 'プレミアムプラン';
```

または管理画面から設定。

### ステップ2: 記事に制限を設定
```bash
# 管理画面でAPI経由で設定
curl -X PATCH https://commons-webapp.pages.dev/api/posts/123/access \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "required_plan_level": 2,
    "is_members_only": true,
    "is_premium_content": true,
    "preview_length": 150
  }'
```

### ステップ3: フロントエンドで表示制御
記事詳細ページで `access_info` を確認し、適切な表示を行う。

---

## 🚀 今後の拡張

### Phase 1（現在）
- ✅ プランレベルによる記事アクセス制御
- ✅ プレビュー表示機能
- ✅ アクセスログ記録
- ✅ 管理API

### Phase 2（予定）
- カテゴリレベルでの制御UI
- 一括設定UI（管理画面）
- アクセス統計ダッシュボード
- A/Bテスト機能（プレビュー長の最適化）

### Phase 3（予定）
- 期間限定アクセス（タイムセール）
- クーポンとの連携（特定記事の一時的な無料化）
- 招待リンク（友達招待でプレミアム記事が読める）

---

## 📞 トラブルシューティング

### Q: 記事が表示されない
A: 以下を確認：
1. ユーザーがログインしているか（会員限定記事の場合）
2. ユーザーのプランレベルが足りているか
3. 記事の `status` が `published` か

### Q: プレビューが表示されない
A: `preview_length` が0の場合、プレビューは表示されません。150-300文字程度を推奨。

### Q: アクセスログが記録されない
A: `logPostAccess` 関数がエラーをキャッチするため、ユーザーには影響しません。DBログを確認してください。

---

## 📚 関連ドキュメント
- [会員フロー](./MEMBER_FLOW.md)
- [Stripe統合](./STRIPE_INTEGRATION.md)
- [クーポンシステム](./COUPON_UI_GUIDE.md)
