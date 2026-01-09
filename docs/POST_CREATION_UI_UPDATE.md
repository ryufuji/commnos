# 投稿作成ボタンの表示制御 - 実装レポート

## 📋 概要
投稿作成ボタンを一般会員には表示せず、管理者（owner/admin）のみに表示するよう実装しました。

---

## ✅ 実装内容

### 1. 投稿管理ページ (`/posts-admin`) の認証強化

**ファイル**: `public/static/posts-admin.js`

```javascript
// 管理者権限チェック（ページ読み込み時）
function checkAdminAccess() {
    const token = getToken()
    if (!token) {
        window.location.href = '/'
        return false
    }
    
    const userStr = localStorage.getItem('user')
    if (!userStr) {
        window.location.href = '/'
        return false
    }
    
    const user = JSON.parse(userStr)
    const role = user.role
    
    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
        alert('このページは管理者のみアクセスできます')
        window.location.href = '/'
        return false
    }
    
    return true
}

// ページ読み込み時に認証チェック
if (!checkAdminAccess()) {
    throw new Error('Access denied')
}
```

**動作**:
- 一般会員が `/posts-admin` にアクセスすると
- アラートが表示され、ホームページへリダイレクト
- スクリプトの実行が停止される

---

### 2. 投稿一覧ページ (`/tenant/posts`) に管理者専用ボタン追加

**ファイル**: `src/routes/tenant-public.ts`

#### 2.1 HTMLに投稿作成ボタンを追加（デフォルトで非表示）

```html
<!-- ページタイトルと投稿作成ボタン -->
<div class="mb-8 flex justify-between items-center">
    <div>
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            <i class="fas fa-file-alt mr-2 text-blue-600"></i>投稿一覧
        </h2>
        <p class="text-gray-600">全 ${totalPosts} 件の投稿</p>
    </div>
    <!-- 投稿作成ボタン（管理者のみ表示） -->
    <a href="/tenant/posts/new?subdomain=${subdomain}" 
       id="createPostBtn" 
       class="hidden px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition shadow-md">
        <i class="fas fa-plus mr-2"></i>投稿作成
    </a>
</div>
```

**ポイント**:
- `class="hidden"` でデフォルトは非表示
- 管理者の場合のみJavaScriptで表示

#### 2.2 JavaScriptで管理者チェックとボタン表示

```javascript
// 管理者チェック：投稿作成ボタンの表示制御
function checkAdminAndShowCreateButton() {
    const userStr = localStorage.getItem('user')
    if (!userStr) return
    
    try {
        const user = JSON.parse(userStr)
        const role = user.role
        
        // 管理者（owner または admin）の場合のみボタンを表示
        if (role === 'owner' || role === 'admin') {
            const createBtn = document.getElementById('createPostBtn')
            if (createBtn) {
                createBtn.classList.remove('hidden')
            }
        }
    } catch (error) {
        console.error('Error checking admin role:', error)
    }
}

// ページ読み込み時に実行
checkAdminAndShowCreateButton()
```

**動作**:
- ページ読み込み時に `user.role` をチェック
- `owner` または `admin` の場合のみボタンを表示
- 一般会員や未ログインユーザーには非表示

---

## 📊 表示制御マトリクス

| ページ | オーナー | 管理者 | 一般会員 | 未ログイン |
|--------|---------|-------|---------|-----------|
| `/posts-admin` (投稿管理) | ✅ アクセス可 | ✅ アクセス可 | ❌ リダイレクト | ❌ リダイレクト |
| `/tenant/posts` (投稿一覧) - 投稿作成ボタン | ✅ 表示 | ✅ 表示 | ❌ 非表示 | ❌ 非表示 |
| `/tenant/posts/new` (投稿作成ページ) | ✅ アクセス可 | ✅ アクセス可 | ❌ リダイレクト | ❌ リダイレクト |

---

## 🧪 テストシナリオ

### シナリオ1: 一般会員のテスト

1. **投稿一覧ページ**にアクセス: https://commons-webapp.pages.dev/tenant/posts?subdomain=test
   - **期待**: 投稿作成ボタンが**表示されない**
   
2. **投稿管理ページ**に直接アクセス: https://commons-webapp.pages.dev/posts-admin
   - **期待**: アラート表示 → ホームへリダイレクト
   
3. **投稿作成ページ**に直接アクセス: https://commons-webapp.pages.dev/tenant/posts/new?subdomain=test
   - **期待**: アラート「投稿作成は管理者のみ可能です」 → テナントホームへリダイレクト

### シナリオ2: 管理者のテスト

1. **投稿一覧ページ**にアクセス: https://commons-webapp.pages.dev/tenant/posts?subdomain=test
   - **期待**: 投稿作成ボタンが**表示される**（緑色のボタン）
   
2. **投稿作成ボタン**をクリック
   - **期待**: `/tenant/posts/new?subdomain=test` へ遷移し、投稿作成フォームが表示される
   
3. **投稿管理ページ**にアクセス: https://commons-webapp.pages.dev/posts-admin
   - **期待**: 投稿管理画面が表示され、投稿一覧と編集機能が利用できる

### シナリオ3: 未ログインユーザーのテスト

1. **投稿一覧ページ**にアクセス: https://commons-webapp.pages.dev/tenant/posts?subdomain=test
   - **期待**: 投稿作成ボタンが**表示されない**
   - **期待**: 公開投稿は閲覧可能
   
2. **投稿管理ページ**に直接アクセス: https://commons-webapp.pages.dev/posts-admin
   - **期待**: ホームへリダイレクト

---

## 🎨 デザイン詳細

### 投稿作成ボタンのスタイル

```html
<a href="/tenant/posts/new?subdomain=${subdomain}" 
   id="createPostBtn" 
   class="hidden px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition shadow-md">
    <i class="fas fa-plus mr-2"></i>投稿作成
</a>
```

- **背景色**: グリーン (`bg-green-600`)
- **ホバー**: ダークグリーン (`hover:bg-green-700`)
- **アイコン**: プラスアイコン (`fa-plus`)
- **位置**: ページタイトルの右側（デスクトップ）

---

## 🔐 セキュリティ考慮事項

### フロントエンド
- ✅ ボタンは管理者のみに表示（ロールベース）
- ✅ 投稿作成ページは管理者チェック後にアラート + リダイレクト
- ✅ 投稿管理ページも管理者チェック後にアラート + リダイレクト

### バックエンド
- ✅ `/api/admin/posts` エンドポイントは JWT トークンで認証
- ✅ ロールが `owner` または `admin` でない場合は 403 エラー
- ✅ `/api/posts` エンドポイントは認証ミドルウェアで保護

**結論**: フロントエンドとバックエンドの両方で多層防御を実装済み

---

## 📦 変更ファイル

### 変更されたファイル
1. `public/static/posts-admin.js`
   - 管理者権限チェック関数を追加
   - ページ読み込み時に認証チェック実行

2. `src/routes/tenant-public.ts`
   - 投稿一覧ページに投稿作成ボタンを追加
   - JavaScriptで管理者チェックとボタン表示制御を実装

---

## 🔗 関連URL

### 本番環境
- **投稿一覧**: https://commons-webapp.pages.dev/tenant/posts?subdomain=test
- **投稿管理**: https://commons-webapp.pages.dev/posts-admin
- **投稿作成**: https://commons-webapp.pages.dev/tenant/posts/new?subdomain=test

### 最新デプロイ
- **デプロイURL**: https://b6b6b612.commons-webapp.pages.dev

### GitHub
- **リポジトリ**: https://github.com/ryufuji/commnos
- **コミット**: c7167af
- **ブランチ**: main

---

## 📈 統計

- **変更ファイル数**: 2 ファイル
- **追加行数**: 85 行
- **削除行数**: 8 行
- **バンドルサイズ**: 979.68 kB
- **ビルド時間**: 3.18s

---

## ✅ 実装完了チェックリスト

- [x] 投稿管理ページに管理者権限チェックを追加
- [x] 一般会員は投稿管理ページにアクセス不可
- [x] 投稿一覧ページに投稿作成ボタンを追加
- [x] ボタンは管理者のみに表示（デフォルトで非表示）
- [x] 管理者チェックロジックを実装
- [x] ビルド・デプロイ完了
- [x] ドキュメント作成

---

**最終更新**: 2026-01-09  
**デプロイ日時**: 2026-01-09  
**担当**: AI Assistant
