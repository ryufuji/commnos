# 段階的デバッグ: 1行ずつ実行

以下を **1つずつ** Console で実行してください。
各コマンドの結果を教えてください。

## ステップ1: 変数を定義

```javascript
let currentPage = 1
```

結果: `undefined` と表示されるはず

---

```javascript
let currentStatus = 'all'
```

結果: `undefined` と表示されるはず

---

```javascript
let currentPost = null
```

結果: `undefined` と表示されるはず

---

```javascript
let allPosts = []
```

結果: `undefined` と表示されるはず

---

```javascript
console.log('Variables defined:', currentPage, currentStatus, allPosts)
```

結果: `Variables defined: 1 all []` と表示されるはず

---

## ステップ2: loadPosts 関数を定義

**以下を全文コピーして、一度に貼り付けて Enter:**

```javascript
async function loadPosts() {
    console.log('Loading posts... page:', currentPage, 'status:', currentStatus)
    try {
        const token = getToken()
        console.log('Token exists:', !!token)
        
        const response = await axios.get(`/api/admin/posts?page=${currentPage}&limit=20&status=${currentStatus}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        
        console.log('API Response:', response.data)
        
        if (response.data.success) {
            allPosts = response.data.posts
            console.log('Posts loaded:', allPosts.length)
            
            const postsContainer = document.getElementById('postsList')
            console.log('postsContainer found:', !!postsContainer)
            
            if (postsContainer) {
                postsContainer.innerHTML = '<div class="p-8 text-center"><p class="text-green-600 font-semibold text-xl">✅ 投稿を読み込みました: ' + allPosts.length + '件</p></div>'
                console.log('postsContainer updated')
            } else {
                console.error('postsContainer NOT FOUND')
            }
            
            const totalCount = document.getElementById('totalCount')
            console.log('totalCount found:', !!totalCount)
            
            if (totalCount) {
                totalCount.textContent = response.data.pagination.total
                console.log('totalCount updated to:', response.data.pagination.total)
            } else {
                console.error('totalCount NOT FOUND')
            }
        } else {
            console.error('API response success=false:', response.data)
        }
    } catch (error) {
        console.error('Error loading posts:', error)
        console.error('Error details:', error.response ? error.response.data : error.message)
    }
}
```

結果: `undefined` と表示されるはず

---

```javascript
console.log('loadPosts function defined:', typeof loadPosts)
```

結果: `loadPosts function defined: function` と表示されるはず

---

## ステップ3: loadPosts を実行

```javascript
loadPosts()
```

結果: `Promise {<pending>}` と表示され、その後に以下のログが表示されるはず:
```
Loading posts... page: 1 status: all
Token exists: true
API Response: {...}
Posts loaded: X
postsContainer found: true/false
totalCount found: true/false
```

**すべてのログをコピーして教えてください。**

---

## ステップ4: 結果を確認

```javascript
console.log('allPosts after loading:', allPosts)
console.log('allPosts length:', allPosts.length)
```

結果: 投稿データが表示されるはず

---

```javascript
console.log('Page content changed?')
document.getElementById('postsList').innerHTML.substring(0, 100)
```

結果: ページのHTMLが表示されるはず

---

## 📋 各ステップの結果を教えてください

特に重要なのは：

1. **ステップ3 の `loadPosts()` を実行した後のログ**
   - `Token exists: true` と表示されるか？
   - `API Response: {...}` にどんなデータが含まれるか？
   - `Posts loaded: X` の X は何件か？
   - `postsContainer found: true` か `false` か？
   - エラーメッセージは表示されるか？

2. **ページの表示は変わったか？**
   - 「読み込み中...」が消えたか？
   - 「✅ 投稿を読み込みました: X件」と表示されたか？

---

このステップバイステップで実行してください！
