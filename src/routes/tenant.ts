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
    `SELECT t.* 
     FROM tenants t
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
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
        <style>
            .theme-bg-primary { background-color: var(--commons-primary); }
            .theme-bg-secondary { background-color: var(--commons-accent-yellow); }
            .theme-text-primary { color: var(--commons-primary); }
            .theme-border-primary { border-color: var(--commons-primary); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- ヘッダー -->
        <header class="theme-bg-primary text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4 md:py-6">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h1 class="text-xl md:text-3xl font-bold truncate">${tenantData.name}</h1>
                        ${tenantData.subtitle ? `<p class="text-gray-200 mt-1 text-sm md:text-base truncate">${tenantData.subtitle}</p>` : ''}
                    </div>
                    <!-- デスクトップナビ -->
                    <div class="hidden md:flex items-center gap-4 ml-4">
                        <a href="/tenant/register?subdomain=${tenantData.subdomain}" class="bg-white text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition whitespace-nowrap">
                            <i class="fas fa-user-plus mr-2"></i>
                            会員登録
                        </a>
                        <a href="/login?subdomain=${tenantData.subdomain}" class="text-white hover:text-gray-200 transition whitespace-nowrap">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            ログイン
                        </a>
                    </div>
                    <!-- モバイルメニューボタン -->
                    <button id="mobileMenuBtn" class="md:hidden ml-4 p-2">
                        <i class="fas fa-bars text-2xl"></i>
                    </button>
                </div>
                <!-- モバイルメニュー -->
                <div id="mobileMenu" class="hidden md:hidden mt-4 space-y-2">
                    <a href="/tenant/register?subdomain=${tenantData.subdomain}" class="block bg-white text-gray-800 px-4 py-2 rounded-lg font-semibold text-center">
                        <i class="fas fa-user-plus mr-2"></i>
                        会員登録
                    </a>
                    <a href="/login?subdomain=${tenantData.subdomain}" class="block text-white hover:bg-white/10 px-4 py-2 rounded-lg text-center">
                        <i class="fas fa-sign-in-alt mr-2"></i>
                        ログイン
                    </a>
                </div>
            </div>
        </header>

        <!-- ナビゲーション -->
        <nav class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex space-x-4 md:space-x-8 py-3 md:py-4 overflow-x-auto">
                    <a href="/" class="theme-text-primary font-semibold border-b-2 theme-border-primary pb-1 whitespace-nowrap text-sm md:text-base">
                        ホーム
                    </a>
                    <a href="/about" class="text-gray-600 hover:text-gray-900 transition whitespace-nowrap text-sm md:text-base">
                        <span class="hidden sm:inline">このコミュニティについて</span>
                        <span class="sm:hidden">About</span>
                    </a>
                    <a href="/members" class="text-gray-600 hover:text-gray-900 transition whitespace-nowrap text-sm md:text-base">
                        <span class="hidden sm:inline">メンバー</span>
                        <span class="sm:hidden">Members</span>
                    </a>
                </div>
            </div>
        </nav>

        <!-- ヒーローセクション -->
        <section class="theme-bg-primary text-white py-12 md:py-20">
            <div class="max-w-7xl mx-auto px-4">
                <div class="max-w-3xl mx-auto text-center">
                    <h2 class="text-3xl md:text-5xl font-bold mb-4 md:mb-6">
                        ${tenantData.name}へようこそ
                    </h2>
                    ${tenantData.subtitle ? `
                    <p class="text-lg md:text-xl text-gray-100 mb-6 md:mb-8">
                        ${tenantData.subtitle}
                    </p>
                    ` : ''}
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="/tenant/register?subdomain=${tenantData.subdomain}" class="bg-white theme-text-primary px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold text-base md:text-lg hover:bg-gray-100 transition shadow-lg">
                            <i class="fas fa-user-plus mr-2"></i>
                            今すぐ参加する
                        </a>
                        <a href="#posts" class="bg-white/10 backdrop-blur-sm text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold text-base md:text-lg hover:bg-white/20 transition border-2 border-white/30">
                            <i class="fas fa-newspaper mr-2"></i>
                            投稿を見る
                        </a>
                    </div>
                    
                    <!-- 統計サマリー -->
                    <div class="grid grid-cols-3 gap-4 md:gap-8 mt-8 md:mt-12 pt-8 md:pt-12 border-t border-white/20">
                        <div>
                            <div class="text-2xl md:text-4xl font-bold">${tenantData.member_count}</div>
                            <div class="text-xs md:text-sm text-gray-200 mt-1">メンバー</div>
                        </div>
                        <div>
                            <div class="text-2xl md:text-4xl font-bold">${posts.length}</div>
                            <div class="text-xs md:text-sm text-gray-200 mt-1">投稿</div>
                        </div>
                        <div>
                            <div class="text-2xl md:text-4xl font-bold">${new Date().getFullYear()}</div>
                            <div class="text-xs md:text-sm text-gray-200 mt-1">設立</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- メインコンテンツ -->
        <main class="max-w-7xl mx-auto px-4 py-4 md:py-8">
            ${posts.length > 0 ? `
            <!-- 最新の投稿 -->
            <section id="posts" class="mb-6 md:mb-8">
                <h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
                    <i class="fas fa-newspaper mr-2 theme-text-primary"></i>
                    最新の投稿
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    ${posts.map(post => `
                    <article class="card hover:shadow-xl transition-all duration-300 overflow-hidden group">
                        <a href="/posts/${post.id}" class="block">
                            ${post.thumbnail_url ? `
                            <div class="relative overflow-hidden">
                                <img src="${post.thumbnail_url}" alt="${post.title}" class="w-full h-48 md:h-56 object-cover group-hover:scale-110 transition-transform duration-300">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                            </div>
                            ` : `
                            <div class="relative h-48 md:h-56 theme-bg-primary bg-opacity-10 flex items-center justify-center">
                                <i class="fas fa-file-alt text-6xl text-gray-300"></i>
                            </div>
                            `}
                            <div class="p-4 md:p-6">
                                <h3 class="text-lg md:text-xl font-bold text-gray-900 mb-2 group-hover:theme-text-primary transition line-clamp-2">
                                    ${post.title}
                                </h3>
                                <p class="text-sm text-gray-600 mb-4 line-clamp-3">${post.excerpt || post.content.substring(0, 120) + '...'}</p>
                                
                                <div class="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                                    <div class="flex items-center gap-2">
                                        <div class="w-6 h-6 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                            ${post.author_name.charAt(0).toUpperCase()}
                                        </div>
                                        <span class="font-medium truncate">${post.author_name}</span>
                                    </div>
                                    <div class="flex items-center gap-1 whitespace-nowrap">
                                        <i class="fas fa-clock"></i>
                                        <span>${new Date(post.published_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>
                        </a>
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
            <section class="mt-8 md:mt-12 bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
                <div class="text-center mb-6 md:mb-8">
                    <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        <i class="fas fa-chart-line mr-2 theme-text-primary"></i>
                        コミュニティの成長
                    </h2>
                    <p class="text-sm md:text-base text-gray-600">私たちのコミュニティについて</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    <div class="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition text-center border-l-4 border-primary-500">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white mb-4">
                            <i class="fas fa-users text-2xl"></i>
                        </div>
                        <div class="text-3xl md:text-4xl font-bold theme-text-primary mb-2">${tenantData.member_count}</div>
                        <div class="text-gray-600 font-medium">アクティブメンバー</div>
                        <div class="text-xs text-gray-500 mt-2">参加して交流しよう</div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition text-center border-l-4 border-success-500">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-success-400 to-success-600 text-white mb-4">
                            <i class="fas fa-file-alt text-2xl"></i>
                        </div>
                        <div class="text-3xl md:text-4xl font-bold text-success-600 mb-2">${posts.length}</div>
                        <div class="text-gray-600 font-medium">公開投稿</div>
                        <div class="text-xs text-gray-500 mt-2">知識を共有</div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition text-center border-l-4 border-accent-500">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 text-white mb-4">
                            <i class="fas fa-crown text-2xl"></i>
                        </div>
                        <div class="text-3xl md:text-4xl font-bold text-accent-600 mb-2">${tenantData.plan.toUpperCase()}</div>
                        <div class="text-gray-600 font-medium">現在のプラン</div>
                        <div class="text-xs text-gray-500 mt-2">充実した機能</div>
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
        <script>
            // モバイルメニュートグル
            const mobileMenuBtn = document.getElementById('mobileMenuBtn')
            const mobileMenu = document.getElementById('mobileMenu')
            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden')
                })
            }
        </script>
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

/**
 * GET /join
 * 会員申請フォームページ
 */
tenant.get('/join', tenantMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  // テナント情報取得
  const tenantResult = await globalQuery<any>(
    db,
    `SELECT t.* 
     FROM tenants t
     WHERE t.id = ?`,
    [tenantId]
  )

  if (!tenantResult.success || !tenantResult.results || tenantResult.results.length === 0) {
    return c.html('<h1>Tenant not found</h1>', 404)
  }

  const tenantData = tenantResult.results[0]

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>会員登録 - ${tenantData.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <!-- ヘッダー -->
        <header class="bg-white shadow-sm sticky top-0 z-10">
            <div class="max-w-4xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <a href="/" class="text-xl font-bold text-primary-600 hover:text-primary-700 transition">
                        <i class="fas fa-arrow-left mr-2"></i>
                        ${tenantData.name}
                    </a>
                    <a href="/member/login" class="text-gray-600 hover:text-gray-900">
                        <i class="fas fa-sign-in-alt mr-2"></i>
                        ログイン
                    </a>
                </div>
            </div>
        </header>

        <!-- メイン -->
        <main class="max-w-2xl mx-auto px-4 py-12">
            <div class="card">
                <div class="text-center mb-8">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                        <i class="fas fa-user-plus text-2xl text-primary-600"></i>
                    </div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">
                        ${tenantData.name} への会員登録
                    </h1>
                    ${tenantData.subtitle ? `<p class="text-gray-600">${tenantData.subtitle}</p>` : ''}
                </div>

                <!-- 会員登録フォーム -->
                <form id="joinForm" class="space-y-6">
                    <!-- ニックネーム -->
                    <div>
                        <label for="nickname" class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-user mr-2 text-primary-500"></i>
                            ニックネーム *
                        </label>
                        <input type="text" id="nickname" name="nickname" required
                            class="input-primary w-full"
                            placeholder="山田太郎">
                    </div>

                    <!-- メールアドレス -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-envelope mr-2 text-primary-500"></i>
                            メールアドレス *
                        </label>
                        <input type="email" id="email" name="email" required
                            class="input-primary w-full"
                            placeholder="you@example.com">
                        <p class="mt-1 text-sm text-gray-500">
                            <i class="fas fa-info-circle mr-1"></i>
                            承認通知はこのメールアドレスに送信されます
                        </p>
                    </div>

                    <!-- パスワード -->
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-lock mr-2 text-primary-500"></i>
                            パスワード *
                        </label>
                        <input type="password" id="password" name="password" required
                            class="input-primary w-full"
                            placeholder="8文字以上">
                        <p class="mt-1 text-sm text-gray-500">
                            <i class="fas fa-info-circle mr-1"></i>
                            8文字以上、大文字・小文字・数字を含む
                        </p>
                    </div>

                    <!-- 確認用パスワード -->
                    <div>
                        <label for="password_confirm" class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-lock mr-2 text-primary-500"></i>
                            パスワード（確認用） *
                        </label>
                        <input type="password" id="password_confirm" name="password_confirm" required
                            class="input-primary w-full"
                            placeholder="パスワードを再入力">
                    </div>

                    <!-- 利用規約 -->
                    <div class="flex items-start">
                        <input type="checkbox" id="terms" name="terms" required
                            class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
                        <label for="terms" class="ml-2 text-sm text-gray-700">
                            <a href="#" class="text-primary-600 hover:text-primary-700 underline">利用規約</a>
                            および
                            <a href="#" class="text-primary-600 hover:text-primary-700 underline">プライバシーポリシー</a>
                            に同意します *
                        </label>
                    </div>

                    <!-- 送信ボタン -->
                    <button type="submit" id="submitBtn" class="btn-primary w-full">
                        <i class="fas fa-paper-plane mr-2"></i>
                        申請を送信
                    </button>

                    <!-- 注意事項 -->
                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <div class="flex items-start">
                            <i class="fas fa-info-circle text-blue-500 mt-0.5 mr-3"></i>
                            <div class="text-sm text-blue-700">
                                <p class="font-semibold mb-1">申請の流れ</p>
                                <ol class="list-decimal ml-5 space-y-1">
                                    <li>申請フォームを送信</li>
                                    <li>管理者が申請を確認</li>
                                    <li>承認されるとメールで通知</li>
                                    <li>ログインしてコミュニティに参加</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
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

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            document.getElementById('joinForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const submitBtn = document.getElementById('submitBtn')
                const nickname = document.getElementById('nickname').value
                const email = document.getElementById('email').value
                const password = document.getElementById('password').value
                const passwordConfirm = document.getElementById('password_confirm').value
                const terms = document.getElementById('terms').checked

                // バリデーション
                if (!terms) {
                    showToast('利用規約に同意してください', 'error')
                    return
                }

                if (password !== passwordConfirm) {
                    showToast('パスワードが一致しません', 'error')
                    return
                }

                if (password.length < 8) {
                    showToast('パスワードは8文字以上で入力してください', 'error')
                    return
                }

                showLoading(submitBtn)

                try {
                    const response = await axios.post('/api/members/apply', {
                        nickname,
                        email,
                        password
                    })

                    if (response.data.success) {
                        showToast('申請を受け付けました！承認をお待ちください', 'success')
                        // 3秒後にトップページへ
                        setTimeout(() => {
                            window.location.href = '/'
                        }, 3000)
                    } else {
                        showToast(response.data.error || '申請に失敗しました', 'error')
                        hideLoading(submitBtn)
                    }
                } catch (error) {
                    console.error('Join error:', error)
                    showToast(error.response?.data?.error || '申請に失敗しました', 'error')
                    hideLoading(submitBtn)
                }
            })
        </script>
    </body>
    </html>
  `)
})

/**
 * GET /posts/:id
 * 投稿詳細ページ（コメント機能付き）
 */
tenant.get('/posts/:id', tenantMiddleware, async (c) => {
  const postId = parseInt(c.req.param('id'))
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  // テナント情報取得
  const tenantResult = await globalQuery<any>(
    db,
    `SELECT t.* 
     FROM tenants t
     WHERE t.id = ?`,
    [tenantId]
  )

  if (!tenantResult.success || !tenantResult.results || tenantResult.results.length === 0) {
    return c.html('<h1>Tenant not found</h1>', 404)
  }

  const tenantData = tenantResult.results[0]

  // 投稿取得
  const postResult = await globalQuery<any>(
    db,
    `SELECT p.*, u.nickname as author_name
     FROM posts p
     JOIN users u ON p.author_id = u.id
     WHERE p.id = ? AND p.tenant_id = ? AND p.status = 'published'`,
    [postId, tenantId]
  )

  if (!postResult.success || !postResult.results || postResult.results.length === 0) {
    return c.html('<h1>Post not found</h1>', 404)
  }

  const post = postResult.results[0]

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${post.title} - ${tenantData.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <!-- ヘッダー -->
        <header class="bg-white shadow-sm sticky top-0 z-10">
            <div class="max-w-5xl mx-auto px-4 py-3 md:py-4">
                <div class="flex items-center justify-between">
                    <a href="/" class="text-base md:text-xl font-bold text-primary-600 hover:text-primary-700 transition">
                        <i class="fas fa-arrow-left mr-1 md:mr-2"></i>
                        <span class="hidden sm:inline">${tenantData.name}</span>
                        <span class="sm:hidden">Back</span>
                    </a>
                    <div class="flex items-center gap-2 md:gap-4">
                        <a href="/member/login" class="text-sm md:text-base text-gray-600 hover:text-gray-900">
                            <i class="fas fa-sign-in-alt mr-1 md:mr-2"></i>
                            <span class="hidden sm:inline">ログイン</span>
                            <span class="sm:hidden">Login</span>
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <!-- メイン -->
        <main class="max-w-5xl mx-auto px-4 py-4 md:py-8">
            <!-- 投稿本体 -->
            <article class="bg-white rounded-xl shadow-lg mb-6 md:mb-8 overflow-hidden">
                <div class="p-6 md:p-10">
                    <!-- タイトル -->
                    <h1 class="text-2xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6 leading-tight">${post.title}</h1>
                    
                    <!-- メタ情報 -->
                    <div class="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-gray-600 mb-6 md:mb-8 pb-6 md:pb-8 border-b border-gray-200">
                        <div class="flex items-center gap-2">
                            <div class="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-base md:text-lg shadow-md">
                                ${post.author_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="font-semibold text-gray-900">${post.author_name}</div>
                                <div class="text-xs text-gray-500">投稿者</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                                <i class="fas fa-calendar text-primary-500"></i>
                                ${new Date(post.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            <span class="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                                <i class="fas fa-eye text-primary-500"></i>
                                ${post.view_count || 0}
                            </span>
                        </div>
                    </div>

                    <!-- 本文 -->
                    <div class="prose prose-sm md:prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-primary-600 prose-strong:text-gray-900">
                        ${post.content.split('\n').map((line: string) => line.trim() ? `<p class="mb-4">${line}</p>` : '').join('')}
                    </div>
                </div>
            </article>

            <!-- コメントセクション -->
            <div class="card">
                <div class="p-4 md:p-6 border-b border-gray-200">
                    <h2 class="text-xl md:text-2xl font-bold text-gray-900">
                        <i class="fas fa-comments mr-2 text-primary-500"></i>
                        コメント
                        <span id="commentCount" class="ml-2 text-base md:text-lg text-gray-600">(0)</span>
                    </h2>
                </div>

                <!-- コメント投稿フォーム -->
                <div class="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                    <form id="commentForm" class="space-y-3 md:space-y-4">
                        <textarea id="commentContent" 
                            class="input-primary w-full h-20 md:h-24 resize-none text-sm md:text-base"
                            placeholder="コメントを入力...&#10;※ログインが必要です"
                            maxlength="1000"></textarea>
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <span class="text-xs md:text-sm text-gray-500">
                                <span id="charCount">0</span> / 1000文字
                            </span>
                            <button type="submit" id="submitCommentBtn" class="btn-primary w-full sm:w-auto text-sm md:text-base">
                                <i class="fas fa-paper-plane mr-1 md:mr-2"></i>
                                コメントを投稿
                            </button>
                        </div>
                    </form>
                </div>

                <!-- コメント一覧 -->
                <div id="commentsList" class="divide-y divide-gray-200">
                    <!-- 動的に追加されます -->
                </div>
            </div>
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

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            const postId = ${postId}
            let replyToCommentId = null

            // 文字数カウント
            document.getElementById('commentContent').addEventListener('input', (e) => {
                const count = e.target.value.length
                document.getElementById('charCount').textContent = count
            })

            // コメント取得
            async function loadComments() {
                try {
                    const response = await axios.get(\`/api/posts/\${postId}/comments\`)
                    
                    if (response.data.success) {
                        const comments = response.data.comments || []
                        document.getElementById('commentCount').textContent = \`(\${comments.length})\`
                        renderComments(comments)
                    }
                } catch (error) {
                    console.error('Load comments error:', error)
                }
            }

            // コメント表示
            function renderComments(comments) {
                const container = document.getElementById('commentsList')
                
                if (comments.length === 0) {
                    container.innerHTML = \`
                        <div class="p-12 text-center">
                            <i class="fas fa-comments text-6xl text-gray-300 mb-4"></i>
                            <p class="text-gray-600">まだコメントがありません</p>
                            <p class="text-sm text-gray-500 mt-2">最初のコメントを投稿してみましょう</p>
                        </div>
                    \`
                    return
                }

                // ルートコメント（parent_comment_id が null）のみ取得
                const rootComments = comments.filter(c => !c.parent_comment_id)
                
                container.innerHTML = rootComments.map(comment => \`
                    <div class="p-4 md:p-6">
                        <div class="flex items-start gap-2 md:gap-4">
                            <div class="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-success-400 to-success-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm md:text-base">
                                \${comment.user_name.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                                    <span class="font-bold text-gray-900 text-sm md:text-base truncate">\${comment.user_name}</span>
                                    <span class="text-xs md:text-sm text-gray-500 flex-shrink-0">
                                        \${new Date(comment.created_at).toLocaleString('ja-JP')}
                                    </span>
                                </div>
                                <p class="text-gray-700 whitespace-pre-wrap text-sm md:text-base break-words">\${comment.content}</p>
                                
                                <div class="mt-2 md:mt-3 flex gap-3 md:gap-4">
                                    <button onclick="startReply(\${comment.id}, '\${comment.user_name}')" 
                                        class="text-xs md:text-sm text-primary-600 hover:text-primary-700 font-semibold">
                                        <i class="fas fa-reply mr-1"></i>
                                        返信
                                    </button>
                                </div>

                                <!-- 返信コメント -->
                                \${renderReplies(comments, comment.id)}
                            </div>
                        </div>
                    </div>
                \`).join('')
            }

            // 返信コメント表示
            function renderReplies(comments, parentId) {
                const replies = comments.filter(c => c.parent_comment_id === parentId)
                
                if (replies.length === 0) return ''

                return \`
                    <div class="ml-4 md:ml-8 mt-3 md:mt-4 space-y-3 md:space-y-4 border-l-2 border-gray-200 pl-2 md:pl-4">
                        \${replies.map(reply => \`
                            <div class="flex items-start gap-2 md:gap-3">
                                <div class="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-xs md:text-sm">
                                    \${reply.user_name.charAt(0).toUpperCase()}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex flex-wrap items-center gap-1 md:gap-2 mb-1">
                                        <span class="font-bold text-gray-900 text-xs md:text-sm truncate">\${reply.user_name}</span>
                                        <span class="text-xs text-gray-500 flex-shrink-0">
                                            \${new Date(reply.created_at).toLocaleString('ja-JP')}
                                        </span>
                                    </div>
                                    <p class="text-gray-700 text-xs md:text-sm whitespace-pre-wrap break-words">\${reply.content}</p>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                \`
            }

            // 返信開始
            function startReply(commentId, userName) {
                replyToCommentId = commentId
                const textarea = document.getElementById('commentContent')
                textarea.placeholder = \`\${userName} さんに返信...\\n※ログインが必要です\`
                textarea.focus()
                showToast(\`\${userName} さんへの返信モード\`, 'info')
            }

            // コメント投稿
            document.getElementById('commentForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const content = document.getElementById('commentContent').value.trim()
                const submitBtn = document.getElementById('submitCommentBtn')

                if (!content) {
                    showToast('コメント内容を入力してください', 'error')
                    return
                }

                const token = getToken()
                if (!token) {
                    showToast('ログインが必要です', 'error')
                    setTimeout(() => {
                        window.location.href = '/member/login'
                    }, 2000)
                    return
                }

                showLoading(submitBtn)

                try {
                    const response = await axios.post(\`/api/posts/\${postId}/comments\`, {
                        content,
                        parent_comment_id: replyToCommentId
                    }, {
                        headers: { Authorization: \`Bearer \${token}\` }
                    })

                    if (response.data.success) {
                        showToast('コメントを投稿しました', 'success')
                        document.getElementById('commentContent').value = ''
                        document.getElementById('commentContent').placeholder = 'コメントを入力...\\n※ログインが必要です'
                        document.getElementById('charCount').textContent = '0'
                        replyToCommentId = null
                        loadComments()
                    } else {
                        showToast(response.data.error || 'コメント投稿に失敗しました', 'error')
                    }
                } catch (error) {
                    console.error('Comment submit error:', error)
                    showToast(error.response?.data?.error || 'コメント投稿に失敗しました', 'error')
                } finally {
                    hideLoading(submitBtn)
                }
            })

            // ページロード時
            loadComments()
        </script>
    </body>
    </html>
  `)
})

export default tenant
