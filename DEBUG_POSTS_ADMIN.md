# 投稿管理ページ デバッグ手順

シークレットモードで投稿管理ページが無限読み込み状態になる問題を解決します。

## 🔍 Step 1: Console ログを確認

### 手順
1. シークレットモードで開く: https://commons-webapp.pages.dev/posts-admin
2. **F12** でデベロッパーツールを開く
3. **Console** タブを開く
4. すべてのログをコピーして共有

### 確認すべきログ

#### ✅ 正常な場合
```
Posts admin script loaded
Document ready state: complete
DOM already loaded, initializing immediately
Initializing posts admin...
Token check: true
Member data: {role: "admin", ...}
Is admin: true
Starting to load posts...
Loading posts... page: 1 status: all
Token exists: true
API Response: {...}
Posts loaded: X
```

#### ❌ エラーがある場合
以下のようなエラーが表示される：
- `Uncaught ReferenceError: XXX is not defined`
- `Uncaught SyntaxError: ...`
- `Uncaught TypeError: ...`
- `Content Security Policy: ...`
- `Failed to load resource: ...`

---

## 🔍 Step 2: Network タブを確認

### 手順
1. **F12** でデベロッパーツールを開く
2. **Network** タブを開く
3. ページをリロード（Ctrl+R）
4. 以下を確認：

### 確認すべきリクエスト

#### JavaScript ファイル
- ✅ `https://cdn.tailwindcss.com` → **200 OK**
- ✅ `https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js` → **200 OK**
- ✅ `/static/app.js` → **200 OK**

#### API リクエスト
- ✅ `/api/admin/posts?page=1&limit=20&status=all` → **200 OK**

もし以下のような状態なら問題：
- ❌ `(pending)` → リクエストが送信されていない
- ❌ `404 Not Found` → ファイルが見つからない
- ❌ `500 Internal Server Error` → サーバーエラー
- ❌ `401 Unauthorized` → 認証エラー
- ❌ `403 Forbidden` → 権限エラー

---

## 🔍 Step 3: 手動デバッグ

### Console で以下を1つずつ実行

```javascript
// 1. axios が読み込まれているか
typeof axios
// 期待: "function"

// 2. getToken が定義されているか
typeof getToken
// 期待: "function"

// 3. トークンが存在するか
localStorage.getItem('token')
// 期待: "eyJhbGciOiJIUzI1NiIs..." (JWT文字列)

// 4. membership が存在するか
localStorage.getItem('membership')
// 期待: "{\"role\":\"admin\",..." (JSON文字列)

// 5. initPostsAdmin が定義されているか
typeof window.initPostsAdmin
// 期待: "function"

// 6. 手動で初期化を実行
window.initPostsAdmin()
// 期待: ログが出力され、投稿一覧が読み込まれる

// 7. 手動で投稿を取得
window.loadPosts()
// 期待: API リクエストが送信され、投稿一覧が表示される
```

---

## 🔍 Step 4: 認証状態を確認

### localStorage の内容を確認

Console で以下を実行：

```javascript
// 1. すべての localStorage を確認
Object.keys(localStorage).forEach(key => {
  console.log(key, localStorage.getItem(key))
})

// 2. token を確認
console.log('Token:', localStorage.getItem('token'))

// 3. user を確認
console.log('User:', localStorage.getItem('user'))

// 4. membership を確認
console.log('Membership:', localStorage.getItem('membership'))
```

### 期待される結果
```
token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
user: {"id":2,"email":"rfujimoto0616@gmail.com",...}
membership: {"role":"admin","tenant_id":"fe398b67",...}
```

### もし token が null の場合
```javascript
// ログインページへ移動
window.location.href = '/login'
```

---

## 🔍 Step 5: API リクエストを手動で実行

Console で以下を実行：

```javascript
// 1. トークンを取得
const token = localStorage.getItem('token')
console.log('Token:', token)

// 2. API リクエストを送信
axios.get('/api/admin/posts?page=1&limit=20&status=all', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(response => {
  console.log('API Success:', response.data)
})
.catch(error => {
  console.error('API Error:', error.response ? error.response.data : error.message)
})
```

### 期待される結果
```
API Success: {
  success: true,
  posts: [...],
  pagination: {
    page: 1,
    totalPages: 5,
    total: 100
  }
}
```

### もしエラーが返る場合
```
API Error: {
  success: false,
  error: "Invalid token" または "Unauthorized"
}
```

→ トークンが無効なので、再ログインが必要

---

## 🚨 よくある問題と解決方法

### 問題1: トークンが存在しない
**症状:** `localStorage.getItem('token')` が `null`

**解決方法:**
1. ログインページへ移動: https://commons-webapp.pages.dev/login
2. ログインする
3. ダッシュボードへ移動
4. 投稿管理へ移動

---

### 問題2: membership.role が "admin" でも "owner" でもない
**症状:** `JSON.parse(localStorage.getItem('membership')).role` が `"member"`

**解決方法:**
1. 管理者アカウントでログインする
2. または、データベースで role を変更する

---

### 問題3: API リクエストが 401 エラー
**症状:** `/api/admin/posts` が `401 Unauthorized`

**解決方法:**
1. トークンが無効なので再ログイン
2. localStorage をクリア: `localStorage.clear()`
3. ログインページへ移動

---

### 問題4: API リクエストが 500 エラー
**症状:** `/api/admin/posts` が `500 Internal Server Error`

**解決方法:**
1. サーバー側のエラー
2. データベースの問題の可能性
3. サーバーログを確認

---

### 問題5: JavaScript が読み込まれない
**症状:** `typeof axios` が `"undefined"`

**解決方法:**
1. Network タブで `/static/app.js` が 200 OK か確認
2. CDN が blocked されていないか確認
3. CSP エラーがないか確認

---

## 📋 問題報告テンプレート

以下の情報を共有してください：

### 1. Console ログ（全文）
```
[ここに Console の全ログを貼り付け]
```

### 2. Network タブの状態
- `/api/admin/posts` のリクエスト: ✅存在する / ❌存在しない
- ステータスコード: 200 / 401 / 403 / 500 / その他
- レスポンス内容:
  ```json
  [ここに Response の Preview を貼り付け]
  ```

### 3. localStorage の内容
```javascript
token: [あり / なし]
user: [あり / なし]
membership: [あり / なし]
```

### 4. 手動実行の結果
```javascript
typeof axios: [結果]
typeof getToken: [結果]
typeof window.initPostsAdmin: [結果]
window.initPostsAdmin() を実行した結果: [結果]
```

---

この情報があれば、正確に問題を特定できます！
