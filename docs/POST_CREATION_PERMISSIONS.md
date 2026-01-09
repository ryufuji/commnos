# 投稿作成権限とUIの仕様

## 📋 現在の仕様

### 投稿作成権限
**管理者のみが投稿を作成できます**
- ✅ オーナー (owner)
- ✅ 管理者 (admin)
- ❌ 一般メンバー (member)

### 一般メンバーができること
- ✅ 投稿へのコメント
- ✅ チャット機能の利用
- ❌ 投稿の作成（管理者のみ）

## 🔒 実装の詳細

### 1. ページアクセス制限
**ファイル**: `src/routes/tenant-public.ts` (lines 2244-2250)

```javascript
// 管理者権限チェック（投稿作成は管理者のみ）
const isAdmin = membership.role === 'owner' || membership.role === 'admin'
if (!isAdmin) {
    alert('投稿作成は管理者のみ可能です')
    window.location.href = '/tenant/home?subdomain=${subdomain}'
    return
}
```

**動作**:
- 一般メンバーが `/tenant/create-post` にアクセスすると
- 「投稿作成は管理者のみ可能です」というアラートが表示される
- 自動的にテナントホームへリダイレクトされる

### 2. 公開範囲UIの表示制御
**ファイル**: `src/routes/tenant-public.ts` (lines 2010, 2271-2274)

```html
<!-- デフォルトで非表示 -->
<div id="visibilityField" style="display: none;">
    <label>公開範囲</label>
    <div>
        <label>
            <input type="radio" name="visibility" value="public" checked>
            パブリック - 誰でも閲覧できます（非会員も閲覧可能）
        </label>
        <label>
            <input type="radio" name="visibility" value="members_only">
            会員限定 - コミュニティの会員のみ閲覧できます
        </label>
    </div>
</div>
```

```javascript
// 管理者の場合は公開範囲フィールドを表示
if (isAdmin) {
    document.getElementById('visibilityField').style.display = 'block'
}
```

**動作**:
- 公開範囲選択UIはデフォルトで非表示 (`display: none`)
- 管理者としてログインした場合のみ表示される (`display: block`)
- 一般メンバーには表示されない（そもそもページにアクセスできない）

## 📊 権限マトリクス

| 機能 | オーナー | 管理者 | 一般メンバー |
|------|---------|--------|-------------|
| 投稿作成 | ✅ | ✅ | ❌ |
| 公開範囲選択 | ✅ | ✅ | - |
| 投稿へのコメント | ✅ | ✅ | ✅ |
| チャット | ✅ | ✅ | ✅ |
| 投稿編集 | ✅ | ✅ | ❌ |
| 投稿削除 | ✅ | ✅ | ❌ |

## 🧪 テストシナリオ

### シナリオ1: 一般メンバーのアクセス
1. 一般メンバーとしてログイン
2. `/tenant/create-post?subdomain=test` にアクセス
3. **期待される動作**: 
   - アラート「投稿作成は管理者のみ可能です」が表示
   - `/tenant/home?subdomain=test` へリダイレクト

### シナリオ2: 管理者のアクセス
1. オーナーまたは管理者としてログイン
2. `/tenant/create-post?subdomain=test` にアクセス
3. **期待される動作**:
   - 投稿作成フォームが表示される
   - 公開範囲選択UI（パブリック/会員限定）が表示される
   - 投稿を作成できる

## 🔗 関連URL

### 本番環境
- **投稿作成ページ**: https://commons-webapp.pages.dev/tenant/create-post?subdomain=test
- **投稿一覧**: https://commons-webapp.pages.dev/tenant/posts?subdomain=test
- **テナントホーム**: https://commons-webapp.pages.dev/tenant/home?subdomain=test

### 最新デプロイ
- **投稿作成ページ**: https://cfb86cbf.commons-webapp.pages.dev/tenant/create-post?subdomain=test

## 📝 データベース

### posts テーブル
- `visibility` カラム: 
  - `'public'` - 誰でも閲覧可能
  - `'members_only'` - 会員のみ閲覧可能
  - デフォルト: `'public'`

## ✅ 現在の状態

**すべての要件が正しく実装されています**:
1. ✅ 投稿作成は管理者のみに制限
2. ✅ 公開範囲UIは管理者のみに表示
3. ✅ 一般メンバーはアクセス不可
4. ✅ 一般メンバーはコメントとチャットが可能

---

**最終更新**: 2026-01-09  
**コミット**: f63a9d5  
**デプロイURL**: https://cfb86cbf.commons-webapp.pages.dev
