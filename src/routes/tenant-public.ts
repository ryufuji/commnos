// ============================================
// テナント公開ページルート（Phase 3）
// 会員がアクセスするコミュニティページ
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'

const tenantPublic = new Hono<AppContext>()

// テスト用シンプルルート
tenantPublic.get('/test', (c) => {
  return c.text('Test route works!')
})

// --------------------------------------------
// テナントホームページ
// --------------------------------------------
tenantPublic.get('/home', async (c) => {
  const { DB } = c.env
  
  // 開発環境：クエリパラメータからsubdomainを取得
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">開発環境</h1>
        <p class="text-xl text-gray-600 mb-4">URLに?subdomain=your-subdomainを追加してください</p>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  // テナント情報を取得
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first()
  
  if (!tenant) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p class="text-xl text-gray-600 mb-4">コミュニティが見つかりません: ${subdomain}</p>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  // テーマ情報を取得
  const customization = await DB.prepare(
    'SELECT * FROM tenant_customization WHERE tenant_id = ?'
  ).bind(tenant.id).first()
  
  const theme = customization?.theme_preset || 'modern-business'
  
  // 最新投稿を取得
  const postsResult = await DB.prepare(`
    SELECT p.*, u.nickname as author_name
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.tenant_id = ? AND p.status = ?
    ORDER BY p.created_at DESC
    LIMIT 6
  `).bind(tenant.id, 'published').all()
  
  const posts = postsResult.results || []
  
  // 会員数を取得
  const memberResult = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM tenant_memberships
    WHERE tenant_id = ? AND status = ?
  `).bind(tenant.id, 'active').first()
  
  const memberCount = memberResult?.count || 0
  
  // 投稿数を取得
  const postCountResult = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM posts
    WHERE tenant_id = ? AND status = ?
  `).bind(tenant.id, 'published').first()
  
  const postCount = postCountResult?.count || 0
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  const createdYear = new Date(String(tenant.created_at)).getFullYear()
  
  // 投稿カードのHTML生成
  let postsHTML = ''
  if (posts.length === 0) {
    postsHTML = '<p class="text-center text-gray-600 py-12 col-span-full">まだ投稿がありません</p>'
  } else {
    postsHTML = posts.map((post: any) => {
      const postTitle = String(post.title || '')
      const postContent = String(post.content || '')
      const postExcerpt = String(post.excerpt || postContent.substring(0, 100))
      const authorName = String(post.author_name || '不明')
      const createdDate = new Date(String(post.created_at)).toLocaleDateString('ja-JP')
      
      return `
        <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            <div class="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 rounded-t-lg flex items-center justify-center">
                <i class="fas fa-file-alt text-6xl text-white opacity-50"></i>
            </div>
            <div class="p-6">
                <h4 class="text-xl font-bold text-gray-900 mb-2 line-clamp-2">${postTitle}</h4>
                <p class="text-gray-600 mb-4 line-clamp-3">${postExcerpt}...</p>
                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span><i class="fas fa-user mr-1"></i>${authorName}</span>
                    <span><i class="fas fa-calendar mr-1"></i>${createdDate}</span>
                </div>
                <a href="/tenant/posts/${post.id}?subdomain=${subdomain}" 
                   class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-center transition-colors">
                    続きを読む <i class="fas fa-arrow-right ml-2"></i>
                </a>
            </div>
        </div>
      `
    }).join('')
  }
  
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tenantName} - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- ヘッダー -->
    <header class="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        <i class="fas fa-users mr-2"></i>${tenantName}
                    </h1>
                    ${tenantSubtitle ? `<p class="text-gray-600 mt-1">${tenantSubtitle}</p>` : ''}
                </div>
                <!-- デスクトップナビ -->
                <nav class="hidden md:flex gap-4">
                    <a href="/tenant/home?subdomain=${subdomain}" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <i class="fas fa-home mr-2"></i>ホーム
                    </a>
                    <a href="/tenant/posts?subdomain=${subdomain}" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <i class="fas fa-file-alt mr-2"></i>投稿
                    </a>
                    <a href="/tenant/posts/new?subdomain=${subdomain}" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold">
                        <i class="fas fa-plus-circle mr-2"></i>投稿作成
                    </a>
                    <a href="/tenant/members-list?subdomain=${subdomain}" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <i class="fas fa-users mr-2"></i>メンバー
                    </a>
                    <a href="/login" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                        <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                    </a>
                </nav>
                <!-- モバイルメニューボタン -->
                <button id="mobileMenuBtn" class="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            <!-- モバイルメニュー -->
            <div id="mobileMenu" class="hidden md:hidden mt-4 space-y-2">
                <a href="/tenant/home?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-center">
                    <i class="fas fa-home mr-2"></i>ホーム
                </a>
                <a href="/tenant/posts?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-center">
                    <i class="fas fa-file-alt mr-2"></i>投稿
                </a>
                <a href="/tenant/posts/new?subdomain=${subdomain}" class="block px-4 py-2 bg-green-600 text-white rounded-lg text-center font-semibold">
                    <i class="fas fa-plus-circle mr-2"></i>投稿作成
                </a>
                <a href="/tenant/members-list?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-center">
                    <i class="fas fa-users mr-2"></i>メンバー
                </a>
                <a href="/login" class="block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center">
                    <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                </a>
            </div>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="max-w-7xl mx-auto px-4 py-8">
        <!-- ヒーローセクション -->
        <div class="text-center mb-12">
            <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                ${tenantName}へようこそ
            </h2>
            ${tenantSubtitle ? `<p class="text-xl text-gray-600 mb-6">${tenantSubtitle}</p>` : ''}
            <div class="flex gap-4 justify-center flex-wrap">
                <a href="/join?subdomain=${subdomain}" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-lg transition-colors">
                    <i class="fas fa-user-plus mr-2"></i>メンバー申請
                </a>
                <a href="/login" class="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg text-lg transition-colors">
                    <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                </a>
            </div>
        </div>

        <!-- 統計 -->
        <div class="grid md:grid-cols-3 gap-6 mb-12">
            <div class="bg-white rounded-lg shadow-md p-6 text-center">
                <div class="text-4xl text-blue-600 mb-2">
                    <i class="fas fa-users"></i>
                </div>
                <h3 class="text-3xl font-bold text-gray-900 mb-1">${memberCount}</h3>
                <p class="text-gray-600">メンバー</p>
            </div>
            <div class="bg-white rounded-lg shadow-md p-6 text-center">
                <div class="text-4xl text-green-600 mb-2">
                    <i class="fas fa-file-alt"></i>
                </div>
                <h3 class="text-3xl font-bold text-gray-900 mb-1">${postCount}</h3>
                <p class="text-gray-600">投稿</p>
            </div>
            <div class="bg-white rounded-lg shadow-md p-6 text-center">
                <div class="text-4xl text-purple-600 mb-2">
                    <i class="fas fa-calendar"></i>
                </div>
                <h3 class="text-3xl font-bold text-gray-900 mb-1">${createdYear}</h3>
                <p class="text-gray-600">設立年</p>
            </div>
        </div>

        <!-- 最新投稿 -->
        <div class="mb-12">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-900">
                    <i class="fas fa-fire mr-2 text-orange-500"></i>最新投稿
                </h3>
                <a href="/tenant/posts?subdomain=${subdomain}" class="text-blue-600 hover:text-blue-800 font-semibold">
                    すべて見る <i class="fas fa-arrow-right ml-1"></i>
                </a>
            </div>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${postsHTML}
            </div>
        </div>
    </main>

    <!-- フッター -->
    <footer class="bg-gray-900 text-white py-12 mt-20">
        <div class="max-w-7xl mx-auto px-4 text-center">
            <h2 class="text-2xl font-bold mb-2">${tenantName}</h2>
            ${tenantSubtitle ? `<p class="text-gray-400 mb-4">${tenantSubtitle}</p>` : ''}
            <p class="text-gray-400">&copy; ${new Date().getFullYear()} ${tenantName}. All rights reserved.</p>
            <p class="text-gray-500 mt-2 text-sm">Powered by Commons</p>
        </div>
    </footer>

    <script src="/static/app.js"></script>
    <script>
        // モバイルメニュー切り替え
        const mobileMenuBtn = document.getElementById('mobileMenuBtn')
        const mobileMenu = document.getElementById('mobileMenu')
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden')
            })
        }
    </script>
</body>
</html>`)
})

// --------------------------------------------
// 投稿作成ページ（認証必須）
// --------------------------------------------
tenantPublic.get('/posts/new', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">開発環境</h1>
        <p class="text-xl text-gray-600 mb-4">URLに?subdomain=your-subdomainを追加してください</p>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  // テナント情報を取得
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first()
  
  if (!tenant) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">コミュニティが見つかりません</h1>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  // テーマ設定を取得
  const customization = await DB.prepare(
    'SELECT theme_preset FROM tenant_customization WHERE tenant_id = ?'
  ).bind(tenant.id).first()
  const theme = customization?.theme_preset || 'modern-business'
  
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投稿作成 - ${tenant.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- ヘッダー -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-2xl font-bold text-primary">
                        ${tenant.name}
                    </a>
                    ${tenant.subtitle ? `<span class="text-gray-500 hidden md:inline">- ${tenant.subtitle}</span>` : ''}
                </div>
                
                <!-- デスクトップナビ -->
                <nav class="hidden md:flex items-center space-x-6">
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-home mr-2"></i>ホーム
                    </a>
                    <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-newspaper mr-2"></i>投稿
                    </a>
                    <a href="/tenant/posts/new?subdomain=${subdomain}" class="text-primary font-semibold">
                        <i class="fas fa-plus-circle mr-2"></i>投稿作成
                    </a>
                    <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-users mr-2"></i>メンバー
                    </a>
                    <a href="/login" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                    </a>
                </nav>
                
                <!-- モバイルメニューボタン -->
                <button id="mobileMenuToggle" class="md:hidden text-gray-600 hover:text-primary">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            
            <!-- モバイルナビ -->
            <nav id="mobileMenu" class="md:hidden mt-4 pb-4 space-y-2 hidden">
                <a href="/tenant/home?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
                    <i class="fas fa-home mr-2"></i>ホーム
                </a>
                <a href="/tenant/posts?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
                    <i class="fas fa-newspaper mr-2"></i>投稿
                </a>
                <a href="/tenant/posts/new?subdomain=${subdomain}" class="block py-2 text-primary font-semibold">
                    <i class="fas fa-plus-circle mr-2"></i>投稿作成
                </a>
                <a href="/tenant/members?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
                    <i class="fas fa-users mr-2"></i>メンバー
                </a>
                <a href="/login" class="block py-2 text-gray-600 hover:text-primary transition">
                    <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                </a>
            </nav>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="container mx-auto px-4 py-8 max-w-4xl">
        <!-- ページタイトル -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">
                <i class="fas fa-plus-circle text-primary mr-2"></i>
                投稿作成
            </h1>
            <p class="text-gray-600">新しい投稿を作成して、コミュニティと共有しましょう</p>
        </div>

        <!-- 投稿作成フォーム -->
        <div class="bg-white rounded-lg shadow-sm p-6">
            <form id="createPostForm" class="space-y-6">
                <!-- タイトル -->
                <div>
                    <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                        タイトル <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        id="title" 
                        name="title" 
                        required
                        maxlength="200"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="投稿のタイトルを入力してください"
                    >
                    <p class="text-sm text-gray-500 mt-1">最大200文字</p>
                </div>

                <!-- サムネイル画像 -->
                <div>
                    <label for="thumbnail" class="block text-sm font-medium text-gray-700 mb-2">
                        サムネイル画像
                    </label>
                    <div class="flex items-center space-x-4">
                        <div id="thumbnailPreview" class="hidden">
                            <img id="thumbnailImg" src="" alt="サムネイルプレビュー" class="w-32 h-32 object-cover rounded-lg">
                        </div>
                        <div class="flex-1">
                            <input 
                                type="file" 
                                id="thumbnail" 
                                name="thumbnail" 
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                class="hidden"
                            >
                            <button 
                                type="button" 
                                id="selectThumbnailBtn"
                                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                                <i class="fas fa-image mr-2"></i>画像を選択
                            </button>
                            <p class="text-sm text-gray-500 mt-2">JPEG, PNG, GIF, WebP形式（最大5MB）</p>
                        </div>
                    </div>
                </div>

                <!-- カテゴリー -->
                <div>
                    <label for="category" class="block text-sm font-medium text-gray-700 mb-2">
                        カテゴリー
                    </label>
                    <select 
                        id="category" 
                        name="category"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="">カテゴリーを選択（任意）</option>
                        <option value="お知らせ">お知らせ</option>
                        <option value="イベント">イベント</option>
                        <option value="雑談">雑談</option>
                        <option value="質問">質問</option>
                        <option value="その他">その他</option>
                    </select>
                </div>

                <!-- 本文 -->
                <div>
                    <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
                        本文 <span class="text-red-500">*</span>
                    </label>
                    <textarea 
                        id="content" 
                        name="content" 
                        required
                        rows="12"
                        maxlength="10000"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="投稿の内容を入力してください"
                    ></textarea>
                    <p class="text-sm text-gray-500 mt-1">最大10,000文字</p>
                </div>

                <!-- 公開設定 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        公開設定
                    </label>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input 
                                type="radio" 
                                name="status" 
                                value="published" 
                                checked
                                class="mr-2"
                            >
                            <span class="text-gray-700">すぐに公開する</span>
                        </label>
                        <label class="flex items-center">
                            <input 
                                type="radio" 
                                name="status" 
                                value="draft"
                                class="mr-2"
                            >
                            <span class="text-gray-700">下書きとして保存</span>
                        </label>
                    </div>
                </div>

                <!-- ボタン -->
                <div class="flex items-center justify-between pt-6 border-t">
                    <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-gray-800 transition">
                        <i class="fas fa-arrow-left mr-2"></i>投稿一覧に戻る
                    </a>
                    <div class="space-x-4">
                        <button 
                            type="button" 
                            id="previewBtn"
                            class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                        >
                            <i class="fas fa-eye mr-2"></i>プレビュー
                        </button>
                        <button 
                            type="submit" 
                            id="submitBtn"
                            class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                        >
                            <i class="fas fa-paper-plane mr-2"></i>投稿する
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </main>

    <!-- フッター -->
    <footer class="bg-white border-t mt-16">
        <div class="container mx-auto px-4 py-6 text-center text-gray-600">
            <p>© 2025 ${tenant.name}. All rights reserved.</p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        // モバイルメニュー切替
        document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
            const menu = document.getElementById('mobileMenu')
            menu.classList.toggle('hidden')
        })
        
        // サムネイル画像選択
        const thumbnailInput = document.getElementById('thumbnail')
        const selectThumbnailBtn = document.getElementById('selectThumbnailBtn')
        const thumbnailPreview = document.getElementById('thumbnailPreview')
        const thumbnailImg = document.getElementById('thumbnailImg')
        
        selectThumbnailBtn?.addEventListener('click', () => {
            thumbnailInput.click()
        })
        
        thumbnailInput?.addEventListener('change', (e) => {
            const file = e.target.files[0]
            if (file) {
                // ファイルサイズチェック（5MB）
                if (file.size > 5 * 1024 * 1024) {
                    alert('ファイルサイズは5MB以下にしてください')
                    thumbnailInput.value = ''
                    return
                }
                
                // プレビュー表示
                const reader = new FileReader()
                reader.onload = (e) => {
                    thumbnailImg.src = e.target.result
                    thumbnailPreview.classList.remove('hidden')
                }
                reader.readAsDataURL(file)
            }
        })
        
        // フォーム送信
        const createPostForm = document.getElementById('createPostForm')
        const submitBtn = document.getElementById('submitBtn')
        
        createPostForm?.addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const formData = new FormData(createPostForm)
            const title = formData.get('title')
            const content = formData.get('content')
            const category = formData.get('category')
            const status = formData.get('status')
            const thumbnail = formData.get('thumbnail')
            
            // バリデーション
            if (!title || title.trim() === '') {
                showToast('タイトルを入力してください', 'error')
                return
            }
            
            if (!content || content.trim() === '') {
                showToast('本文を入力してください', 'error')
                return
            }
            
            try {
                submitBtn.disabled = true
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>投稿中...'
                
                // 画像アップロード処理
                let thumbnailUrl = null
                if (thumbnail && thumbnail.size > 0) {
                    try {
                        const uploadFormData = new FormData()
                        uploadFormData.append('image', thumbnail)
                        
                        // FormDataの場合はContent-Typeヘッダーを設定しない
                        const token = AppState.token || ''
                        const uploadResponse = await fetch('/api/upload/image', {
                            method: 'POST',
                            headers: token ? {
                                'Authorization': 'Bearer ' + token
                            } : {},
                            body: uploadFormData
                        })
                        
                        const uploadData = await uploadResponse.json()
                        
                        if (uploadData.success) {
                            thumbnailUrl = uploadData.url
                        } else {
                            console.warn('画像アップロード失敗:', uploadData.message)
                        }
                    } catch (uploadError) {
                        console.error('画像アップロードエラー:', uploadError)
                        // 画像アップロードに失敗しても投稿自体は継続
                    }
                }
                
                // 投稿作成APIリクエスト
                const postData = {
                    title: title.trim(),
                    content: content.trim(),
                    category: category || null,
                    status: status,
                    thumbnail_url: thumbnailUrl
                }
                
                const response = await apiRequest('/api/posts', {
                    method: 'POST',
                    body: JSON.stringify(postData)
                })
                
                if (response.success) {
                    showToast(response.message || (status === 'draft' ? '下書きを保存しました' : '投稿を公開しました'), 'success')
                    setTimeout(() => {
                        window.location.href = '/tenant/posts?subdomain=${subdomain}'
                    }, 1500)
                } else {
                    throw new Error(response.message || '投稿の作成に失敗しました')
                }
            } catch (error) {
                console.error('投稿作成エラー:', error)
                showToast(error.message || '投稿の作成に失敗しました', 'error')
                submitBtn.disabled = false
                submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>投稿する'
            }
        })
        
        // プレビュー機能
        const previewBtn = document.getElementById('previewBtn')
        previewBtn?.addEventListener('click', () => {
            const title = document.getElementById('title').value
            const content = document.getElementById('content').value
            
            if (!title || !content) {
                showToast('タイトルと本文を入力してください', 'error')
                return
            }
            
            // プレビューモーダルを表示（簡易版）
            alert('プレビュー機能は今後実装予定です')
        })
    </script>
</body>
</html>`)
})

// --------------------------------------------
// 投稿一覧ページ
// --------------------------------------------
tenantPublic.get('/posts', async (c) => {
  const { DB } = c.env
  
  // 開発環境：クエリパラメータからsubdomainを取得
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">開発環境</h1>
        <p class="text-xl text-gray-600 mb-4">URLに?subdomain=your-subdomainを追加してください</p>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  // テナント情報を取得
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first()
  
  if (!tenant) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p class="text-xl text-gray-600 mb-4">コミュニティが見つかりません</p>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  // ページネーション
  const page = parseInt(c.req.query('page') || '1')
  const perPage = 12
  const offset = (page - 1) * perPage
  
  // 投稿総数を取得
  const countResult = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM posts
    WHERE tenant_id = ? AND status = ?
  `).bind(tenant.id, 'published').first()
  
  const totalPosts = countResult?.count || 0
  const totalPages = Math.ceil(totalPosts / perPage)
  
  // 投稿を取得
  const postsResult = await DB.prepare(`
    SELECT p.*, u.nickname as author_name
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.tenant_id = ? AND p.status = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(tenant.id, 'published', perPage, offset).all()
  
  const posts = postsResult.results || []
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  
  // 投稿カードのHTML生成
  let postsHTML = ''
  if (posts.length === 0) {
    postsHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-600 text-lg">まだ投稿がありません</p></div>'
  } else {
    postsHTML = posts.map((post: any) => {
      const postTitle = String(post.title || '')
      const postContent = String(post.content || '')
      const postExcerpt = String(post.excerpt || postContent.substring(0, 150))
      const authorName = String(post.author_name || '不明')
      const createdDate = new Date(String(post.created_at)).toLocaleDateString('ja-JP')
      
      return `
        <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            <div class="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 rounded-t-lg flex items-center justify-center">
                <i class="fas fa-file-alt text-6xl text-white opacity-50"></i>
            </div>
            <div class="p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-2 line-clamp-2">${postTitle}</h3>
                <p class="text-gray-600 mb-4 line-clamp-3">${postExcerpt}...</p>
                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span><i class="fas fa-user mr-1"></i>${authorName}</span>
                    <span><i class="fas fa-calendar mr-1"></i>${createdDate}</span>
                </div>
                <a href="/tenant/posts/${post.id}?subdomain=${subdomain}" 
                   class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-center transition-colors">
                    続きを読む <i class="fas fa-arrow-right ml-2"></i>
                </a>
            </div>
        </div>
      `
    }).join('')
  }
  
  // ページネーションHTML生成
  let paginationHTML = ''
  if (totalPages > 1) {
    const pages = []
    
    // 前へボタン
    if (page > 1) {
      pages.push(`<a href="/tenant/posts?subdomain=${subdomain}&page=${page - 1}" 
                    class="px-4 py-2 bg-white text-blue-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    <i class="fas fa-chevron-left"></i> 前へ
                 </a>`)
    } else {
      pages.push(`<span class="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-300 rounded-lg cursor-not-allowed">
                    <i class="fas fa-chevron-left"></i> 前へ
                 </span>`)
    }
    
    // ページ番号
    for (let i = 1; i <= totalPages; i++) {
      if (i === page) {
        pages.push(`<span class="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">${i}</span>`)
      } else if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
        pages.push(`<a href="/tenant/posts?subdomain=${subdomain}&page=${i}" 
                      class="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                      ${i}
                   </a>`)
      } else if (i === page - 3 || i === page + 3) {
        pages.push(`<span class="px-4 py-2 text-gray-500">...</span>`)
      }
    }
    
    // 次へボタン
    if (page < totalPages) {
      pages.push(`<a href="/tenant/posts?subdomain=${subdomain}&page=${page + 1}" 
                    class="px-4 py-2 bg-white text-blue-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    次へ <i class="fas fa-chevron-right"></i>
                 </a>`)
    } else {
      pages.push(`<span class="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-300 rounded-lg cursor-not-allowed">
                    次へ <i class="fas fa-chevron-right"></i>
                 </span>`)
    }
    
    paginationHTML = `
      <div class="flex justify-center items-center gap-2 flex-wrap">
        ${pages.join('')}
      </div>
    `
  }
  
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投稿一覧 - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- ヘッダー -->
    <header class="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        <i class="fas fa-users mr-2"></i>${tenantName}
                    </h1>
                    ${tenantSubtitle ? `<p class="text-gray-600 mt-1">${tenantSubtitle}</p>` : ''}
                </div>
                <!-- デスクトップナビ -->
                <nav class="hidden md:flex gap-4 items-center">
                    <a href="/tenant/home?subdomain=${subdomain}" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <i class="fas fa-home mr-2"></i>ホーム
                    </a>
                    <a href="/tenant/posts?subdomain=${subdomain}" class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold">
                        <i class="fas fa-file-alt mr-2"></i>投稿
                    </a>
                    <a href="/tenant/posts/new?subdomain=${subdomain}" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold">
                        <i class="fas fa-plus-circle mr-2"></i>投稿作成
                    </a>
                    <a href="/tenant/members-list?subdomain=${subdomain}" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <i class="fas fa-users mr-2"></i>メンバー
                    </a>
                    <a href="/login" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                        <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                    </a>
                </nav>
                <!-- モバイルメニューボタン -->
                <button id="mobileMenuBtn" class="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            <!-- モバイルメニュー -->
            <div id="mobileMenu" class="hidden md:hidden mt-4 space-y-2">
                <a href="/tenant/home?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-center">
                    <i class="fas fa-home mr-2"></i>ホーム
                </a>
                <a href="/tenant/posts?subdomain=${subdomain}" class="block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-center font-semibold">
                    <i class="fas fa-file-alt mr-2"></i>投稿
                </a>
                <a href="/tenant/posts/new?subdomain=${subdomain}" class="block px-4 py-2 bg-green-600 text-white rounded-lg text-center font-semibold">
                    <i class="fas fa-plus-circle mr-2"></i>投稿作成
                </a>
                <a href="/tenant/members-list?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-center">
                    <i class="fas fa-users mr-2"></i>メンバー
                </a>
                <a href="/login" class="block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center">
                    <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                </a>
            </div>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="max-w-7xl mx-auto px-4 py-8">
        <!-- ページタイトル -->
        <div class="mb-8">
            <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                <i class="fas fa-file-alt mr-2 text-blue-600"></i>投稿一覧
            </h2>
            <p class="text-gray-600">全 ${totalPosts} 件の投稿</p>
        </div>

        <!-- 投稿グリッド -->
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            ${postsHTML}
        </div>

        <!-- ページネーション -->
        ${paginationHTML}
    </main>

    <!-- フッター -->
    <footer class="bg-gray-900 text-white py-12 mt-20">
        <div class="max-w-7xl mx-auto px-4 text-center">
            <h2 class="text-2xl font-bold mb-2">${tenantName}</h2>
            ${tenantSubtitle ? `<p class="text-gray-400 mb-4">${tenantSubtitle}</p>` : ''}
            <p class="text-gray-400">&copy; ${new Date().getFullYear()} ${tenantName}. All rights reserved.</p>
            <p class="text-gray-500 mt-2 text-sm">Powered by Commons</p>
        </div>
    </footer>

    <script src="/static/app.js"></script>
    <script>
        // モバイルメニュー切り替え
        const mobileMenuBtn = document.getElementById('mobileMenuBtn')
        const mobileMenu = document.getElementById('mobileMenu')
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden')
            })
        }
    </script>
</body>
</html>`)
})

// --------------------------------------------
// 投稿作成ページ
// --------------------------------------------
tenantPublic.get('/create-post', async (c) => {
  const { DB } = c.env
  
  // 開発環境：クエリパラメータからsubdomainを取得
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">開発環境</h1>
        <p class="text-xl text-gray-600 mb-4">URLに?subdomain=your-subdomainを追加してください</p>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  // テナント情報を取得
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first()
  
  if (!tenant) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p class="text-xl text-gray-600 mb-4">コミュニティが見つかりません</p>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投稿作成 - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- ヘッダー -->
    <header class="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        <i class="fas fa-users mr-2"></i>${tenantName}
                    </h1>
                    ${tenantSubtitle ? `<p class="text-gray-600 mt-1">${tenantSubtitle}</p>` : ''}
                </div>
                <!-- デスクトップナビ -->
                <nav class="hidden md:flex gap-4">
                    <a href="/tenant/home?subdomain=${subdomain}" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <i class="fas fa-home mr-2"></i>ホーム
                    </a>
                    <a href="/tenant/posts?subdomain=${subdomain}" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <i class="fas fa-file-alt mr-2"></i>投稿
                    </a>
                    <button id="logoutBtn" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">
                        <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                    </button>
                </nav>
                <!-- モバイルメニューボタン -->
                <button id="mobileMenuBtn" class="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            <!-- モバイルメニュー -->
            <div id="mobileMenu" class="hidden md:hidden mt-4 space-y-2">
                <a href="/tenant/home?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-center">
                    <i class="fas fa-home mr-2"></i>ホーム
                </a>
                <a href="/tenant/posts?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-center">
                    <i class="fas fa-file-alt mr-2"></i>投稿
                </a>
                <button id="logoutBtnMobile" class="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
                    <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                </button>
            </div>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="max-w-4xl mx-auto px-4 py-8">
        <div class="bg-white rounded-lg shadow-md p-6 md:p-8">
            <h2 class="text-3xl font-bold text-gray-900 mb-6">
                <i class="fas fa-pen mr-2 text-blue-600"></i>新規投稿
            </h2>
            
            <form id="createPostForm" class="space-y-6">
                <!-- タイトル -->
                <div>
                    <label for="title" class="block text-sm font-semibold text-gray-700 mb-2">
                        タイトル <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="title" name="title" required
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="投稿のタイトルを入力してください">
                </div>

                <!-- 抜粋 -->
                <div>
                    <label for="excerpt" class="block text-sm font-semibold text-gray-700 mb-2">
                        抜粋
                    </label>
                    <input type="text" id="excerpt" name="excerpt"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="投稿の概要（省略可）">
                    <p class="text-xs text-gray-500 mt-1">投稿一覧で表示される短い説明文</p>
                </div>

                <!-- 本文 -->
                <div>
                    <label for="content" class="block text-sm font-semibold text-gray-700 mb-2">
                        本文 <span class="text-red-500">*</span>
                    </label>
                    <textarea id="content" name="content" required rows="12"
                              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="投稿の本文を入力してください"></textarea>
                    <p class="text-xs text-gray-500 mt-1">
                        <span id="contentCount">0</span> 文字
                    </p>
                </div>

                <!-- ステータス -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        公開設定 <span class="text-red-500">*</span>
                    </label>
                    <div class="flex gap-4">
                        <label class="flex items-center">
                            <input type="radio" name="status" value="published" checked
                                   class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                            <span class="ml-2 text-gray-700">公開</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="status" value="draft"
                                   class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                            <span class="ml-2 text-gray-700">下書き</span>
                        </label>
                    </div>
                </div>

                <!-- ボタン -->
                <div class="flex gap-4 pt-4">
                    <button type="submit" id="submitBtn" 
                            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                        <i class="fas fa-check mr-2"></i>投稿する
                    </button>
                    <a href="/tenant/posts?subdomain=${subdomain}" 
                       class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors">
                        <i class="fas fa-times mr-2"></i>キャンセル
                    </a>
                </div>
            </form>
        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        // 認証チェック
        const token = getToken()
        if (!token) {
            showToast('ログインが必要です', 'error')
            setTimeout(() => {
                window.location.href = '/login'
            }, 1500)
        }

        // 文字数カウント
        const contentTextarea = document.getElementById('content')
        const contentCount = document.getElementById('contentCount')
        contentTextarea.addEventListener('input', () => {
            contentCount.textContent = contentTextarea.value.length
        })

        // モバイルメニュー切り替え
        const mobileMenuBtn = document.getElementById('mobileMenuBtn')
        const mobileMenu = document.getElementById('mobileMenu')
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden')
            })
        }

        // ログアウト
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await handleLogout()
        })
        
        const logoutBtnMobile = document.getElementById('logoutBtnMobile')
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', async () => {
                await handleLogout()
            })
        }

        // フォーム送信
        document.getElementById('createPostForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const submitBtn = document.getElementById('submitBtn')
            const originalText = submitBtn.innerHTML
            
            try {
                submitBtn.disabled = true
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>投稿中...'
                
                const formData = new FormData(e.target)
                const data = {
                    title: formData.get('title'),
                    excerpt: formData.get('excerpt') || undefined,
                    content: formData.get('content'),
                    status: formData.get('status')
                }
                
                const response = await axios.post('/api/posts', data, {
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                })
                
                if (response.data.success) {
                    showToast('投稿を作成しました', 'success')
                    setTimeout(() => {
                        window.location.href = '/tenant/posts?subdomain=${subdomain}'
                    }, 1500)
                } else {
                    throw new Error(response.data.error || '投稿の作成に失敗しました')
                }
            } catch (error) {
                console.error('Create post error:', error)
                showToast(error.response?.data?.error || error.message || '投稿の作成に失敗しました', 'error')
                submitBtn.disabled = false
                submitBtn.innerHTML = originalText
            }
        })
    </script>
</body>
</html>`)
})

export default tenantPublic
