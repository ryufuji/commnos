// ============================================
// テナントページルート（Week 3-4）
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { tenantMiddleware, authMiddleware } from '../middleware/auth'
import { globalQuery } from '../lib/db'

const tenant = new Hono<AppContext>()

/**
 * GET /
 * テナントトップページ
 * 
 * サブドメインからテナント情報を取得して表示
 * 例: https://golf-club.commons.com/
 */
tenant.get('/', tenantMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  // テナント情報取得
  const tenantResult = await globalQuery<any>(
    db,
    `SELECT t.*, tc.theme_preset 
     FROM tenants t
     LEFT JOIN tenant_customization tc ON t.id = tc.tenant_id
     WHERE t.id = ?`,
    [tenantId]
  )

  if (!tenantResult.success || !tenantResult.results || tenantResult.results.length === 0) {
    return c.html('<h1>Tenant not found</h1>', 404)
  }

  const tenantData = tenantResult.results[0]

  // 最新の投稿を取得（公開済みのみ、最大5件）
  const postsResult = await globalQuery<any>(
    db,
    `SELECT p.*, u.nickname as author_name
     FROM posts p
     JOIN users u ON p.author_id = u.id
     WHERE p.tenant_id = ? AND p.status = 'published'
     ORDER BY p.published_at DESC
     LIMIT 5`,
    [tenantId]
  )

  const posts = postsResult.results || []

  // テーマカラーの設定
  const themeColors = {
    'modern-business': { primary: '#1e3a8a', secondary: '#3b82f6' },
    'wellness-nature': { primary: '#065f46', secondary: '#10b981' },
    'creative-studio': { primary: '#7c2d12', secondary: '#f97316' },
    'tech-innovation': { primary: '#0c4a6e', secondary: '#06b6d4' }
  }

  const theme = themeColors[tenantData.theme_preset as keyof typeof themeColors] || themeColors['modern-business']

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${tenantData.name} - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
        <style>
            :root {
                --primary-color: ${theme.primary};
                --secondary-color: ${theme.secondary};
            }
            .theme-bg-primary { background-color: var(--primary-color); }
            .theme-bg-secondary { background-color: var(--secondary-color); }
            .theme-text-primary { color: var(--primary-color); }
            .theme-border-primary { border-color: var(--primary-color); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- ヘッダー -->
        <header class="theme-bg-primary text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold">${tenantData.name}</h1>
                        ${tenantData.subtitle ? `<p class="text-gray-200 mt-1">${tenantData.subtitle}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-4">
                        <a href="/join" class="bg-white text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
                            <i class="fas fa-user-plus mr-2"></i>
                            会員登録
                        </a>
                        <a href="/member/login" class="text-white hover:text-gray-200 transition">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            ログイン
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <!-- ナビゲーション -->
        <nav class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex space-x-8 py-4">
                    <a href="/" class="theme-text-primary font-semibold border-b-2 theme-border-primary pb-1">
                        ホーム
                    </a>
                    <a href="/about" class="text-gray-600 hover:text-gray-900 transition">
                        このコミュニティについて
                    </a>
                    <a href="/members" class="text-gray-600 hover:text-gray-900 transition">
                        メンバー
                    </a>
                </div>
            </div>
        </nav>

        <!-- メインコンテンツ -->
        <main class="max-w-7xl mx-auto px-4 py-8">
            ${posts.length > 0 ? `
            <!-- 最新の投稿 -->
            <section class="mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">
                    <i class="fas fa-newspaper mr-2 theme-text-primary"></i>
                    最新の投稿
                </h2>
                <div class="space-y-6">
                    ${posts.map(post => `
                    <article class="card hover:shadow-lg transition">
                        ${post.thumbnail_url ? `
                        <img src="${post.thumbnail_url}" alt="${post.title}" class="w-full h-48 object-cover rounded-lg mb-4">
                        ` : ''}
                        <h3 class="text-xl font-bold text-gray-900 mb-2">
                            <a href="/posts/${post.id}" class="hover:theme-text-primary transition">
                                ${post.title}
                            </a>
                        </h3>
                        <p class="text-gray-600 mb-4">${post.excerpt || post.content.substring(0, 150) + '...'}</p>
                        <div class="flex items-center justify-between text-sm text-gray-500">
                            <div>
                                <i class="fas fa-user mr-1"></i>
                                ${post.author_name}
                            </div>
                            <div>
                                <i class="fas fa-clock mr-1"></i>
                                ${new Date(post.published_at).toLocaleDateString('ja-JP')}
                            </div>
                        </div>
                    </article>
                    `).join('')}
                </div>
            </section>
            ` : `
            <!-- 投稿がない場合 -->
            <div class="text-center py-12">
                <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-600">まだ投稿がありません</p>
            </div>
            `}

            <!-- コミュニティ情報 -->
            <section class="card mt-8">
                <h2 class="text-xl font-bold text-gray-900 mb-4">
                    <i class="fas fa-info-circle mr-2 theme-text-primary"></i>
                    コミュニティ情報
                </h2>
                <div class="grid md:grid-cols-3 gap-4 text-center">
                    <div>
                        <div class="text-3xl font-bold theme-text-primary">${tenantData.member_count}</div>
                        <div class="text-gray-600 mt-1">メンバー</div>
                    </div>
                    <div>
                        <div class="text-3xl font-bold theme-text-primary">${posts.length}</div>
                        <div class="text-gray-600 mt-1">投稿</div>
                    </div>
                    <div>
                        <div class="text-3xl font-bold theme-text-primary">${tenantData.plan.toUpperCase()}</div>
                        <div class="text-gray-600 mt-1">プラン</div>
                    </div>
                </div>
            </section>
        </main>

        <!-- フッター -->
        <footer class="bg-gray-800 text-white py-8 mt-12">
            <div class="max-w-7xl mx-auto px-4 text-center">
                <p>&copy; 2025 ${tenantData.name}. All rights reserved.</p>
                <p class="mt-2 text-gray-400 text-sm">
                    Powered by <a href="https://commons.com" class="hover:text-white transition">Commons</a>
                </p>
            </div>
        </footer>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

/**
 * GET /join
 * 会員申請ページ
 */
tenant.get('/join', tenantMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  // テナント情報取得
  const tenantResult = await globalQuery<any>(
    db,
    'SELECT * FROM tenants WHERE id = ?',
    [tenantId]
  )

  if (!tenantResult.success || !tenantResult.results || tenantResult.results.length === 0) {
    return c.html('<h1>Tenant not found</h1>', 404)
  }

  const tenantData = tenantResult.results[0]

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>会員登録 - ${tenantData.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <div class="min-h-screen flex items-center justify-center px-4">
            <div class="max-w-md w-full">
                <!-- ロゴ -->
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-900">${tenantData.name}</h1>
                    <p class="text-gray-600 mt-2">会員登録申請</p>
                </div>

                <!-- 申請フォーム -->
                <div class="card fade-in">
                    <form id="joinForm" class="space-y-4">
                        <!-- メールアドレス -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                メールアドレス
                            </label>
                            <input type="email" name="email" required
                                   class="input-field"
                                   placeholder="your@example.com">
                        </div>

                        <!-- パスワード -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                パスワード（8文字以上）
                            </label>
                            <input type="password" name="password" required minlength="8"
                                   class="input-field"
                                   placeholder="••••••••">
                        </div>

                        <!-- ニックネーム -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                ニックネーム
                            </label>
                            <input type="text" name="nickname" required
                                   class="input-field"
                                   placeholder="田中 太郎">
                        </div>

                        <!-- 送信ボタン -->
                        <button type="submit" id="submitBtn" class="btn-primary w-full">
                            <i class="fas fa-paper-plane mr-2"></i>
                            申請を送信
                        </button>
                    </form>

                    <div class="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p class="text-sm text-blue-800">
                            <i class="fas fa-info-circle mr-2"></i>
                            申請後、管理者の承認をお待ちください。
                        </p>
                    </div>

                    <!-- 戻るリンク -->
                    <div class="mt-6 text-center text-sm text-gray-600">
                        <a href="/" class="text-blue-600 hover:underline">
                            <i class="fas fa-arrow-left mr-1"></i>
                            トップページに戻る
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
        <script>
            document.getElementById('joinForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const submitBtn = document.getElementById('submitBtn')
                showLoading(submitBtn)
                
                const formData = new FormData(e.target)
                
                try {
                    const response = await apiRequest('/api/members/apply', {
                        method: 'POST',
                        body: JSON.stringify({
                            email: formData.get('email'),
                            password: formData.get('password'),
                            nickname: formData.get('nickname')
                        })
                    })
                    
                    showToast('申請を受け付けました。承認をお待ちください。', 'success')
                    
                    setTimeout(() => {
                        window.location.href = '/'
                    }, 2000)
                } catch (error) {
                    hideLoading(submitBtn)
                }
            })
        </script>
    </body>
    </html>
  `)
})

export default tenant
