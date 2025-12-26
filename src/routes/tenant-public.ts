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

export default tenantPublic
