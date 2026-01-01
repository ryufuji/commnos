# 緊急対応: インラインスクリプトが実行されない問題

## 🔥 問題の特定

**現象:**
- `console.log('Posts admin script loaded')` が実行されていない
- インラインスクリプトが実行される前にエラーで止まっている可能性

## 🔍 Console で以下を実行してください

### 1. エラーログを確認

Console タブで以下を確認：
- **Errors** フィルターをクリック（Console の上部にあるフィルター）
- 赤色のエラーメッセージを全て確認
- 特に以下のようなエラーを探す：
  - `SyntaxError`
  - `ReferenceError`
  - `TypeError`

### 2. ページのソースを表示

1. ページで右クリック → **ページのソースを表示**
2. `Ctrl+F` で `Posts admin script loaded` を検索
3. その前後のコードに構文エラーがないか確認

### 3. 手動でスクリプトを実行

Console で以下を実行：

```javascript
// 1. 強制的にログを出力
console.log('MANUAL TEST: Posts admin script loaded')

// 2. currentPage などの変数を定義
let currentPage = 1
let currentStatus = 'all'
let currentPost = null
let allPosts = []

console.log('MANUAL TEST: Variables defined')

// 3. initPostsAdmin を定義
function initPostsAdmin() {
    console.log('MANUAL TEST: Initializing posts admin...')
    
    const token = getToken()
    console.log('MANUAL TEST: Token:', token ? 'exists' : 'missing')
    
    if (!token) {
        console.log('MANUAL TEST: No token, redirecting')
        window.location.href = '/login'
        return
    }
    
    const memberData = JSON.parse(localStorage.getItem('membership') || '{}')
    console.log('MANUAL TEST: Member data:', memberData)
    
    const isAdmin = memberData.role === 'admin' || memberData.role === 'owner'
    console.log('MANUAL TEST: Is admin:', isAdmin)
    
    if (!isAdmin) {
        showToast('管理者権限が必要です', 'error')
        setTimeout(() => window.location.href = '/dashboard', 2000)
        return
    }
    
    console.log('MANUAL TEST: Calling loadPosts')
    loadPosts()
}

console.log('MANUAL TEST: initPostsAdmin defined')

// 4. window に公開
window.initPostsAdmin = initPostsAdmin
console.log('MANUAL TEST: initPostsAdmin exposed to window')

// 5. 実行
initPostsAdmin()
```

もし `loadPosts is not defined` エラーが出たら：

```javascript
// loadPosts を定義
async function loadPosts() {
    console.log('MANUAL TEST: Loading posts... page:', currentPage, 'status:', currentStatus)
    try {
        const token = getToken()
        console.log('MANUAL TEST: Token exists:', !!token)
        
        const response = await axios.get(`/api/admin/posts?page=${currentPage}&limit=20&status=${currentStatus}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        
        console.log('MANUAL TEST: API Response:', response.data)
        
        if (response.data.success) {
            allPosts = response.data.posts
            console.log('MANUAL TEST: Posts loaded:', allPosts.length)
            
            // 投稿一覧を表示
            const postsContainer = document.getElementById('postsList')
            if (postsContainer) {
                postsContainer.innerHTML = '<div class="p-8 text-center"><p class="text-green-600 font-semibold text-lg">投稿を読み込みました: ' + allPosts.length + '件</p></div>'
            }
            
            // 総件数を更新
            const totalCount = document.getElementById('totalCount')
            if (totalCount) {
                totalCount.textContent = response.data.pagination.total
            }
            
            alert('成功: 投稿を ' + allPosts.length + ' 件読み込みました')
        }
    } catch (error) {
        console.error('MANUAL TEST: Error loading posts:', error)
        alert('エラー: ' + (error.response ? JSON.stringify(error.response.data) : error.message))
    }
}

window.loadPosts = loadPosts
console.log('MANUAL TEST: loadPosts defined')

// 実行
loadPosts()
```

---

## 📋 予想される原因

### 原因1: HTML内の構文エラー

インラインスクリプトの前の部分（HTML）に構文エラーがある。

**例:**
```html
<!-- 閉じタグが不足 -->
<div class="...">
    <p>テキスト
<!-- </p> と </div> が欠けている -->
<script>
    console.log('Posts admin script loaded') // ここが実行されない
</script>
```

**確認方法:**
ページのソースを表示して、`<script>` タグの前のHTMLを確認

---

### 原因2: JavaScript の構文エラー

インラインスクリプトの最初の部分に構文エラーがある。

**例:**
```javascript
// エラー例
let currentPage = 1;
let currentStatus = 'all'
let currentPost = null
let allPosts = [] // ここまでは OK

// この下に構文エラーがあると、console.log が実行されない
function initPostsAdmin() {
    // 何かエラー
}
```

**確認方法:**
Console の Errors タブで赤色のエラーを確認

---

### 原因3: CSP がインラインスクリプトをブロック

`<meta>` タグの CSP が `unsafe-inline` を含んでいるはずだが、何らかの理由でブロックされている。

**確認方法:**
Console で "Content Security Policy" というエラーを探す

---

## 🎯 次のステップ

1. **上記の手動スクリプトを Console で実行**
2. **結果を教えてください：**
   - 成功したか？
   - エラーが出たか？（全文をコピー）
   - `alert('成功: 投稿を X 件読み込みました')` が表示されたか？

---

これで問題が解決するはずです！
