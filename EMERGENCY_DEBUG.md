# 緊急デバッグ: Console で実行してください

## 🔍 以下を Console で実行して、結果を教えてください

```javascript
// 1. Posts admin script loaded が表示されているか確認
console.log('Check: Posts admin script loaded')

// 2. document.readyState を確認
document.readyState

// 3. ページのすべてのスクリプトタグを確認
Array.from(document.scripts).map(s => s.src || 'inline')

// 4. エラーがないか確認（Console の Errors タブを見る）
// 赤色のエラーメッセージがあれば、全文をコピーしてください
```

## ⚠️ 重要な質問

### Console に以下のログは表示されていますか？

- ✅ `Posts admin script loaded` 
- ✅ `Document ready state: ...`
- ✅ `DOM already loaded, initializing immediately` または `Waiting for DOMContentLoaded...`
- ✅ `DOMContentLoaded fired!`
- ✅ `Initializing posts admin...`

### もし表示されていない場合

**原因:** スクリプトの途中でエラーが発生して、実行が止まっている

**確認方法:**
1. Console タブで **赤色のエラーメッセージ** を探す
2. エラーメッセージの **全文** をコピー
3. エラーが発生している **行番号** を確認

---

## 🔥 手動でスクリプトを実行する方法

Console で以下を実行してください（長いですが、全文をコピー＆ペーストしてください）：

```javascript
// initPostsAdmin を手動で定義
window.initPostsAdmin = function() {
    console.log('Manual: Initializing posts admin...')
    
    // 認証チェック
    const token = getToken()
    console.log('Manual: Token check:', !!token)
    if (!token) {
        console.log('Manual: No token, redirecting to login')
        window.location.href = '/login'
        return
    }

    // 管理者権限チェック
    const memberData = JSON.parse(localStorage.getItem('membership') || '{}')
    console.log('Manual: Member data:', memberData)
    const isAdmin = memberData.role === 'admin' || memberData.role === 'owner'
    console.log('Manual: Is admin:', isAdmin)
    if (!isAdmin) {
        showToast('管理者権限が必要です', 'error')
        setTimeout(() => window.location.href = '/dashboard', 2000)
        return
    }

    console.log('Manual: Starting to load posts...')
    loadPosts()
}

// 実行
window.initPostsAdmin()
```

もし `loadPosts is not defined` というエラーが出たら、以下も実行してください：

```javascript
// loadPosts を手動で定義
window.loadPosts = async function() {
    console.log('Manual: Loading posts...')
    try {
        const token = getToken()
        const response = await axios.get('/api/admin/posts?page=1&limit=20&status=all', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        console.log('Manual: API Response:', response.data)
        
        if (response.data.success) {
            console.log('Manual: Posts loaded:', response.data.posts.length)
            alert('投稿を取得しました: ' + response.data.posts.length + '件')
        }
    } catch (error) {
        console.error('Manual: Error loading posts:', error)
        alert('エラー: ' + (error.response ? error.response.data.error : error.message))
    }
}

// 実行
window.loadPosts()
```

---

## 📋 必要な情報

以下を教えてください：

### 1. Console に表示されているログ（全文）
特に以下のログがあるか確認：
- `Posts admin script loaded`
- `Document ready state: ...`
- `Initializing posts admin...`

### 2. Console に赤色のエラーメッセージがあるか
あれば全文をコピーしてください。

### 3. 上記の手動スクリプトを実行した結果
成功したか、エラーが出たか。

---

これで問題が特定できるはずです！
