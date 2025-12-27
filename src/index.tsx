// ============================================
// メインアプリケーション（Phase 1）
// マルチテナント型コミュニティプラットフォーム
// ============================================

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { AppContext } from './types'

// ルート
import auth from './routes/auth'
import members from './routes/members'
import admin from './routes/admin'
import tenant from './routes/tenant'
import profile from './routes/profile' // Week 5-6
import posts from './routes/posts' // Week 7-8
import stripe from './routes/stripe' // Week 9-10
import upload from './routes/upload' // Phase 2 - 画像アップロード
import images from './routes/images' // Phase 2 - 画像取得
import tenantPublic from './routes/tenant-public' // Phase 3 - テナント公開ページ
import tenantAuth from './routes/tenant-auth' // Phase 2 - テナント会員認証
import likes from './routes/likes' // Phase 4 - いいね機能
import notifications from './routes/notifications' // Phase 5 - 通知機能

const app = new Hono<AppContext>()

// --------------------------------------------
// グローバルミドルウェア
// --------------------------------------------

// CORS 設定（API ルートのみ）
app.use('/api/*', cors())

// 静的ファイル配信
// public/ ディレクトリの内容を /static/* で配信
app.use('/static/*', serveStatic({ root: './public' }))

// --------------------------------------------
// API ルート
// --------------------------------------------

// 認証ルート
app.route('/api/auth', auth)

// プロフィールルート（Week 5-6）
app.route('/api/profile', profile)

// 投稿ルート（Week 7-8）
app.route('/api/posts', posts)

// Stripe決済ルート（Week 9-10）
app.route('/api/stripe', stripe)

// 会員管理ルート
app.route('/api/members', members)

// 管理者ルート
app.route('/api/admin', admin)

// 画像アップロードルート（Phase 2）
app.route('/api/upload', upload)

// 画像取得ルート（Phase 2）
app.route('/api/images', images)

// テナント会員認証ルート（Phase 2）
app.route('/api/tenant', tenantAuth)

// いいねルート（Phase 4）
app.route('/api/likes', likes)

// 通知ルート（Phase 5）
app.route('/api/notifications', notifications)

// --------------------------------------------
// ルーティングロジック
// サブドメインがある場合: テナントページ
// メインドメインの場合: プラットフォームページ
// --------------------------------------------

// サブドメイン判定ミドルウェア
app.use('*', async (c, next) => {
  const host = c.req.header('Host') || ''
  const platformDomain = c.env.PLATFORM_DOMAIN || 'commons.com'
  
  // サブドメインを抽出
  // 例: golf-club.commons.com -> golf-club
  //     commons.com -> null
  //     localhost:3000 -> null
  const subdomain = host.replace(`.${platformDomain}`, '').replace(/:\d+$/, '')
  
  // サブドメインがある場合（プラットフォームドメイン以外）
  if (subdomain && subdomain !== platformDomain && subdomain !== 'localhost' && !subdomain.includes('.')) {
    c.set('isSubdomain', true as any)
  } else {
    c.set('isSubdomain', false as any)
  }
  
  await next()
})

// テナントページルート（サブドメインの場合のみ）
app.use('*', async (c, next) => {
  if ((c.get('isSubdomain' as any) as boolean)) {
    // テナントルートを適用
    return tenant.fetch(c.req.raw, c.env, c.executionCtx)
  }
  await next()
})

// --------------------------------------------
// フロントエンド（トップページ）
// --------------------------------------------

app.get('/', (c) => {
  const platformDomain = c.env.PLATFORM_DOMAIN || 'commons.com'

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Commons - あなたのコミュニティプラットフォーム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-gray-50 to-gray-100" data-theme="modern-business">
        <div class="min-h-screen flex flex-col">
            <!-- ヘッダー -->
            <header class="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div class="container-custom py-6">
                    <div class="flex justify-between items-center">
                        <div>
                            <h1 class="text-3xl font-bold text-gradient">
                                <i class="fas fa-users mr-2"></i>
                                Commons
                            </h1>
                            <p class="text-secondary-600 mt-2">誰でも5分で自分色のコミュニティを持てる世界</p>
                        </div>
                    </div>
                </div>
            </header>

            <!-- メインコンテンツ -->
            <main class="flex-1 container-custom section-spacing">
                <div class="text-center mb-16 fade-in">
                    <h2 class="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                        あなただけのコミュニティを<br>
                        <span class="text-gradient">今すぐ始めよう</span>
                    </h2>
                    <p class="text-xl text-secondary-600 mb-10 max-w-2xl mx-auto">
                        技術不要、月額980円から。5分でコミュニティサイトが完成。
                    </p>
                    <div class="flex gap-4 justify-center flex-wrap">
                        <a href="/communities" class="btn-primary text-lg px-10 py-4">
                            <i class="fas fa-globe mr-2"></i>
                            コミュニティを探す
                        </a>
                        <a href="/register" class="btn-secondary text-lg px-10 py-4">
                            <i class="fas fa-rocket mr-2"></i>
                            コミュニティを作る
                        </a>
                        <a href="/login" class="btn-secondary text-lg px-10 py-4">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            ログイン
                        </a>
                    </div>
                </div>

                <!-- 特徴 -->
                <div class="grid md:grid-cols-3 gap-8 mt-20">
                    <div class="card-hover p-8 text-center">
                        <div class="text-5xl mb-4"><i class="fas fa-bolt text-accent-500"></i></div>
                        <h3 class="text-xl font-bold mb-3 text-gray-900">5分で開設</h3>
                        <p class="text-secondary-600">技術知識不要。サブドメイン選択、テーマ選択だけで即座に開設。</p>
                    </div>
                    <div class="card-hover p-8 text-center">
                        <div class="text-5xl mb-4"><i class="fas fa-yen-sign text-success-500"></i></div>
                        <h3 class="text-xl font-bold mb-3 text-gray-900">低コスト</h3>
                        <p class="text-secondary-600">月額980円から。無料プランもあります。</p>
                    </div>
                    <div class="card-hover p-8 text-center">
                        <div class="text-5xl mb-4"><i class="fas fa-palette text-primary-500"></i></div>
                        <h3 class="text-xl font-bold mb-3 text-gray-900">カスタマイズ可能</h3>
                        <p class="text-secondary-600">4つのテーマから選択。あなた色のコミュニティを作成。</p>
                    </div>
                </div>

                <!-- プラン -->
                <div class="mt-20">
                    <h3 class="text-4xl font-bold text-center mb-12 text-gray-900">料金プラン</h3>
                    <div class="grid md:grid-cols-4 gap-6">
                        <div class="card p-8">
                            <h4 class="text-xl font-bold mb-2 text-gray-900">Free</h4>
                            <p class="text-4xl font-bold mb-6 text-gray-900">¥0<span class="text-sm text-secondary-500">/月</span></p>
                            <ul class="text-sm text-secondary-600 space-y-3">
                                <li><i class="fas fa-check text-success-500 mr-2"></i>100人まで</li>
                                <li><i class="fas fa-check text-success-500 mr-2"></i>1GB ストレージ</li>
                                <li><i class="fas fa-check text-success-500 mr-2"></i>基本機能</li>
                            </ul>
                        </div>
                        <div class="card p-8 border-2 border-primary-500 bg-primary-50 relative">
                            <div class="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <span class="badge badge-primary px-4 py-1">人気</span>
                            </div>
                            <h4 class="text-xl font-bold mb-2 text-gray-900">Starter</h4>
                            <p class="text-4xl font-bold mb-6 text-primary-600">¥980<span class="text-sm text-secondary-500">/月</span></p>
                            <ul class="text-sm text-secondary-600 space-y-3">
                                <li><i class="fas fa-check text-success-500 mr-2"></i>500人まで</li>
                                <li><i class="fas fa-check text-success-500 mr-2"></i>5GB ストレージ</li>
                                <li><i class="fas fa-check text-success-500 mr-2"></i>カスタマイズ</li>
                            </ul>
                        </div>
                        <div class="card p-8">
                            <h4 class="text-xl font-bold mb-2 text-gray-900">Pro</h4>
                            <p class="text-4xl font-bold mb-6 text-gray-900">¥4,980<span class="text-sm text-secondary-500">/月</span></p>
                            <ul class="text-sm text-secondary-600 space-y-3">
                                <li><i class="fas fa-check text-success-500 mr-2"></i>無制限</li>
                                <li><i class="fas fa-check text-success-500 mr-2"></i>50GB ストレージ</li>
                                <li><i class="fas fa-check text-success-500 mr-2"></i>独自ドメイン</li>
                            </ul>
                        </div>
                        <div class="card p-8">
                            <h4 class="text-xl font-bold mb-2 text-gray-900">Enterprise</h4>
                            <p class="text-4xl font-bold mb-6 text-gray-900">要相談</p>
                            <ul class="text-sm text-secondary-600 space-y-3">
                                <li><i class="fas fa-check text-success-500 mr-2"></i>カスタマイズ</li>
                                <li><i class="fas fa-check text-success-500 mr-2"></i>API提供</li>
                                <li><i class="fas fa-check text-success-500 mr-2"></i>専任サポート</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            <!-- フッター -->
            <footer class="bg-secondary-900 text-white py-12 mt-20">
                <div class="container-custom text-center">
                    <p class="text-lg">&copy; 2025 Commons. All rights reserved.</p>
                    <p class="mt-2 text-secondary-400">Platform domain: ${platformDomain}</p>
                </div>
            </footer>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            // ログイン済みの場合はダッシュボードにリダイレクト
            if (isLoggedIn()) {
                window.location.href = '/dashboard'
            }
        </script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// コミュニティ一覧ページ
// --------------------------------------------

app.get('/communities', async (c) => {
  const { DB } = c.env
  const searchQuery = c.req.query('search') || ''
  
  // 公開コミュニティのみ取得
  let whereConditions = 'status = ? AND is_public = ?'
  const bindParams: any[] = ['active', 1]
  
  if (searchQuery) {
    whereConditions += ' AND (name LIKE ? OR subtitle LIKE ?)'
    const searchPattern = `%${searchQuery}%`
    bindParams.push(searchPattern, searchPattern)
  }
  
  const communitiesResult = await DB.prepare(`
    SELECT id, subdomain, name, subtitle, member_count, created_at
    FROM tenants
    WHERE ${whereConditions}
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(...bindParams).all()
  
  const communities = communitiesResult.results || []
  
  // コミュニティカードHTML生成
  let communitiesHTML = ''
  if (communities.length === 0) {
    communitiesHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-600 text-lg">コミュニティが見つかりませんでした</p></div>'
  } else {
    communitiesHTML = communities.map((community: any) => {
      const name = String(community.name || '')
      const subtitle = String(community.subtitle || '')
      const memberCount = community.member_count || 0
      const subdomain = String(community.subdomain || '')
      
      return `
        <a href="/tenant/home?subdomain=${subdomain}" 
           class="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-900 mb-2">${name}</h3>
              ${subtitle ? `<p class="text-gray-600 text-sm">${subtitle}</p>` : ''}
            </div>
          </div>
          <div class="flex items-center justify-between text-sm text-gray-500">
            <div class="flex items-center gap-2">
              <i class="fas fa-users"></i>
              <span>${memberCount} 人のメンバー</span>
            </div>
            <div class="text-blue-600 font-semibold">
              訪問する <i class="fas fa-arrow-right ml-1"></i>
            </div>
          </div>
        </a>
      `
    }).join('')
  }
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>コミュニティ一覧 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50 min-h-screen" data-theme="modern-business">
        <!-- ヘッダー -->
        <header class="bg-white shadow-sm sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <a href="/" class="text-2xl font-bold text-blue-600">
                        <i class="fas fa-users mr-2"></i>
                        Commons
                    </a>
                    <div class="flex items-center gap-4">
                        <a href="/register" class="btn-primary">
                            <i class="fas fa-plus mr-2"></i>
                            コミュニティを作る
                        </a>
                        <a href="/login" class="btn-secondary">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            ログイン
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <!-- メインコンテンツ -->
        <main class="container mx-auto px-4 py-8">
            <!-- ページヘッダー -->
            <div class="mb-8 text-center">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">
                    <i class="fas fa-globe mr-2 text-blue-600"></i>
                    コミュニティ一覧
                </h1>
                <p class="text-gray-600 text-lg">
                    興味のあるコミュニティを見つけて参加しよう
                </p>
            </div>
            
            <!-- 検索バー -->
            <div class="mb-8 max-w-2xl mx-auto">
                <form method="GET" action="/communities" class="flex gap-4">
                    <input 
                        type="text" 
                        name="search"
                        placeholder="コミュニティを検索..."
                        value="${searchQuery}"
                        class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                    <button 
                        type="submit"
                        class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <i class="fas fa-search mr-2"></i>検索
                    </button>
                </form>
                ${searchQuery ? `
                <div class="mt-4 text-center text-sm text-gray-600">
                    <i class="fas fa-filter mr-2"></i>
                    "${searchQuery}" の検索結果: ${communities.length} 件
                    <a href="/communities" class="ml-4 text-blue-600 hover:underline">
                        <i class="fas fa-times mr-1"></i>クリア
                    </a>
                </div>
                ` : ''}
            </div>

            <!-- コミュニティグリッド -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                ${communitiesHTML}
            </div>

            <!-- フッター説明 -->
            <div class="max-w-3xl mx-auto mt-16 text-center">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-8">
                    <i class="fas fa-info-circle text-4xl text-blue-600 mb-4"></i>
                    <h3 class="text-xl font-bold text-gray-900 mb-2">
                        あなたもコミュニティを作ってみませんか？
                    </h3>
                    <p class="text-gray-600 mb-6">
                        5分で開設、月額980円から。技術知識不要で簡単にコミュニティサイトが作れます。
                    </p>
                    <a href="/register" class="btn-primary text-lg">
                        <i class="fas fa-rocket mr-2"></i>
                        無料で始める
                    </a>
                </div>
            </div>
        </main>

        <!-- フッター -->
        <footer class="bg-white border-t mt-16">
            <div class="container mx-auto px-4 py-6 text-center text-gray-600">
                <p>© 2025 Commons. All rights reserved.</p>
            </div>
        </footer>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// 登録ページ
// --------------------------------------------

app.get('/register', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>新規登録 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-primary-50 via-white to-secondary-50" data-theme="modern-business">
        <div class="min-h-screen flex items-center justify-center px-4 py-12">
            <div class="max-w-md w-full">
                <!-- ロゴ -->
                <div class="text-center mb-8 fade-in">
                    <a href="/" class="text-4xl font-bold text-gradient hover:opacity-80 transition-opacity">
                        <i class="fas fa-users mr-2"></i>
                        Commons
                    </a>
                    <p class="text-secondary-600 mt-3 text-lg">コミュニティを作成</p>
                </div>

                <!-- 登録フォーム -->
                <div class="card p-8 fade-in">
                    <form id="registerForm" class="space-y-5">
                        <!-- メールアドレス -->
                        <div>
                            <label class="form-label">
                                <i class="fas fa-envelope mr-1 text-primary-500"></i>
                                メールアドレス
                            </label>
                            <input type="email" name="email" required
                                   class="input-field"
                                   placeholder="your@example.com">
                        </div>

                        <!-- パスワード -->
                        <div>
                            <label class="form-label">
                                <i class="fas fa-lock mr-1 text-primary-500"></i>
                                パスワード（8文字以上）
                            </label>
                            <input type="password" name="password" required minlength="8"
                                   class="input-field"
                                   placeholder="••••••••">
                        </div>

                        <!-- サブドメイン -->
                        <div>
                            <label class="form-label">
                                <i class="fas fa-link mr-1 text-primary-500"></i>
                                サブドメイン（3-20文字、英数字とハイフンのみ）
                            </label>
                            <div class="flex items-center">
                                <input type="text" name="subdomain" required
                                       pattern="[a-z0-9\\-]{3,20}"
                                       title="3-20文字の英小文字、数字、ハイフンのみ使用可能"
                                       class="input-field"
                                       placeholder="my-community">
                                <span class="ml-2 text-secondary-600 font-medium">.commons.com</span>
                            </div>
                            <p class="text-xs text-secondary-500 mt-2">
                                <i class="fas fa-info-circle mr-1"></i>
                                例: golf-club, yoga-community, tech-meetup
                            </p>
                        </div>

                        <!-- コミュニティ名 -->
                        <div>
                            <label class="form-label">
                                <i class="fas fa-users mr-1 text-primary-500"></i>
                                コミュニティ名
                            </label>
                            <input type="text" name="communityName" required
                                   maxlength="100"
                                   class="input-field"
                                   placeholder="ゴルフサークル「あみーず」">
                        </div>

                        <!-- サブタイトル -->
                        <div>
                            <label class="form-label">
                                <i class="fas fa-tag mr-1 text-primary-500"></i>
                                サブタイトル（任意）
                            </label>
                            <input type="text" name="subtitle"
                                   class="input-field"
                                   placeholder="週末ゴルフ仲間">
                        </div>

                        <!-- 公開設定 -->
                        <div>
                            <label class="form-label">
                                <i class="fas fa-eye mr-1 text-primary-500"></i>
                                公開設定
                            </label>
                            <div class="space-y-3">
                                <label class="flex items-start p-4 border-2 border-primary-200 rounded-lg cursor-pointer hover:bg-primary-50 transition-colors">
                                    <input type="radio" name="isPublic" value="1" checked
                                           class="mt-1 mr-3 text-primary-600 focus:ring-primary-500">
                                    <div class="flex-1">
                                        <div class="font-semibold text-gray-900">
                                            <i class="fas fa-globe mr-1 text-primary-500"></i>
                                            公開コミュニティ
                                        </div>
                                        <div class="text-sm text-secondary-600 mt-1">
                                            コミュニティ一覧に表示され、誰でも参加申請できます
                                        </div>
                                    </div>
                                </label>
                                <label class="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="radio" name="isPublic" value="0"
                                           class="mt-1 mr-3 text-primary-600 focus:ring-primary-500">
                                    <div class="flex-1">
                                        <div class="font-semibold text-gray-900">
                                            <i class="fas fa-lock mr-1 text-gray-500"></i>
                                            非公開コミュニティ
                                        </div>
                                        <div class="text-sm text-secondary-600 mt-1">
                                            URLを知っている人のみアクセス可能。一覧には表示されません
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- 送信ボタン -->
                        <button type="submit" id="submitBtn" class="btn-primary w-full">
                            <i class="fas fa-rocket mr-2"></i>
                            コミュニティを作成
                        </button>
                    </form>

                    <!-- ログインリンク -->
                    <div class="mt-6 text-center text-sm text-secondary-600">
                        すでにアカウントをお持ちですか？
                        <a href="/login" class="link-primary font-medium">ログイン</a>
                    </div>
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
        <script>
            // フォーム送信
            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const submitBtn = document.getElementById('submitBtn')
                showLoading(submitBtn)
                
                const formData = new FormData(e.target)
                const data = {
                    email: formData.get('email'),
                    password: formData.get('password'),
                    subdomain: formData.get('subdomain').toLowerCase(),
                    communityName: formData.get('communityName'),
                    subtitle: formData.get('subtitle') || undefined,
                    isPublic: parseInt(formData.get('isPublic') || '1')
                    // theme はデフォルトで 'modern-business' を使用（データベースのデフォルト値）
                }
                
                try {
                    await handleRegister(data)
                } catch (error) {
                    hideLoading(submitBtn)
                }
            })
        </script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            // ログイン済みの場合はダッシュボードにリダイレクト
            if (isLoggedIn()) {
                window.location.href = '/dashboard'
            }
        </script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// ログインページ
// --------------------------------------------

app.get('/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ログイン - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-primary-50 via-white to-secondary-50" data-theme="modern-business">
        <div class="min-h-screen flex items-center justify-center px-4 py-12">
            <div class="max-w-md w-full">
                <!-- ロゴ -->
                <div class="text-center mb-8 fade-in">
                    <a href="/" class="text-4xl font-bold text-gradient hover:opacity-80 transition-opacity">
                        <i class="fas fa-users mr-2"></i>
                        Commons
                    </a>
                    <p class="text-secondary-600 mt-3 text-lg">ログイン</p>
                </div>

                <!-- ログインフォーム -->
                <div class="card p-8 fade-in">
                    <form id="loginForm" class="space-y-5">
                        <!-- メールアドレス -->
                        <div>
                            <label class="form-label">
                                <i class="fas fa-envelope mr-1 text-primary-500"></i>
                                メールアドレス
                            </label>
                            <input type="email" name="email" required
                                   class="input-field"
                                   placeholder="your@example.com">
                        </div>

                        <!-- パスワード -->
                        <div>
                            <label class="form-label">
                                <i class="fas fa-lock mr-1 text-primary-500"></i>
                                パスワード
                            </label>
                            <input type="password" name="password" required
                                   class="input-field"
                                   placeholder="••••••••">
                        </div>

                        <!-- 送信ボタン -->
                        <button type="submit" id="submitBtn" class="btn-primary w-full">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            ログイン
                        </button>
                    </form>

                    <!-- 登録リンク -->
                    <div class="mt-6 text-center text-sm text-secondary-600">
                        アカウントをお持ちでないですか？
                        <a href="/register" class="link-primary font-medium">新規登録</a>
                    </div>
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const submitBtn = document.getElementById('submitBtn')
                showLoading(submitBtn)
                
                const formData = new FormData(e.target)
                
                try {
                    await handleLogin(
                        formData.get('email'),
                        formData.get('password')
                    )
                } catch (error) {
                    hideLoading(submitBtn)
                }
            })
        </script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            // ログイン済みの場合はダッシュボードにリダイレクト
            if (isLoggedIn()) {
                window.location.href = '/dashboard'
            }
        </script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// プラン選択ページ（Week 9-10）
// --------------------------------------------

app.get('/plans', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>料金プラン - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-primary-50 via-white to-secondary-50" data-theme="modern-business">
        <div class="min-h-screen py-12 px-4">
            <div class="max-w-7xl mx-auto">
                <!-- ヘッダー -->
                <div class="text-center mb-12 fade-in">
                    <a href="/" class="inline-block text-4xl font-bold text-gradient hover:opacity-80 transition-opacity mb-4">
                        <i class="fas fa-users mr-2"></i>
                        Commons
                    </a>
                    <h1 class="text-4xl font-bold text-gray-900 mt-6 mb-3">
                        あなたに最適なプランを選択
                    </h1>
                    <p class="text-lg text-secondary-600">
                        いつでもプランの変更が可能です
                    </p>
                </div>

                <!-- プラン比較 -->
                <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <!-- Free プラン -->
                    <div class="card-hover p-8 fade-in">
                        <div class="text-center mb-6">
                            <h3 class="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                            <div class="mt-4">
                                <span class="text-5xl font-bold text-gray-900">¥0</span>
                                <span class="text-secondary-600 ml-2">/月</span>
                            </div>
                            <p class="text-secondary-600 mt-2">小規模コミュニティ向け</p>
                        </div>

                        <ul class="space-y-4 mb-8">
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">最大100人のメンバー</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">1GB ストレージ</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">基本機能</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">コミュニティサポート</span>
                            </li>
                        </ul>

                        <button class="btn-secondary w-full" disabled>
                            現在のプラン
                        </button>
                    </div>

                    <!-- Starter プラン -->
                    <div class="card-hover p-8 fade-in relative" style="animation-delay: 0.1s;">
                        <!-- 人気バッジ -->
                        <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <span class="badge badge-primary text-sm px-4 py-1">
                                <i class="fas fa-star mr-1"></i>
                                人気
                            </span>
                        </div>

                        <div class="text-center mb-6">
                            <h3 class="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                            <div class="mt-4">
                                <span class="text-5xl font-bold text-primary-600">¥980</span>
                                <span class="text-secondary-600 ml-2">/月</span>
                            </div>
                            <p class="text-secondary-600 mt-2">中小規模コミュニティ向け</p>
                        </div>

                        <ul class="space-y-4 mb-8">
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">最大500人のメンバー</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">5GB ストレージ</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">カスタマイズ可能</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">メール通知機能</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">優先サポート</span>
                            </li>
                        </ul>

                        <button class="btn-primary w-full" onclick="handleCheckout('starter')">
                            <i class="fas fa-credit-card mr-2"></i>
                            このプランを選択
                        </button>
                    </div>

                    <!-- Pro プラン -->
                    <div class="card-hover p-8 fade-in" style="animation-delay: 0.2s;">
                        <div class="text-center mb-6">
                            <h3 class="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                            <div class="mt-4">
                                <span class="text-5xl font-bold text-primary-600">¥4,980</span>
                                <span class="text-secondary-600 ml-2">/月</span>
                            </div>
                            <p class="text-secondary-600 mt-2">大規模コミュニティ向け</p>
                        </div>

                        <ul class="space-y-4 mb-8">
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">無制限のメンバー</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">50GB ストレージ</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">独自ドメイン対応</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">高度なカスタマイズ</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">API アクセス</span>
                            </li>
                            <li class="flex items-start">
                                <i class="fas fa-check text-success-500 mt-1 mr-3"></i>
                                <span class="text-gray-700">専任サポート</span>
                            </li>
                        </ul>

                        <button class="btn-primary w-full" onclick="handleCheckout('pro')">
                            <i class="fas fa-credit-card mr-2"></i>
                            このプランを選択
                        </button>
                    </div>
                </div>

                <!-- FAQ セクション -->
                <div class="max-w-3xl mx-auto mt-16 fade-in" style="animation-delay: 0.3s;">
                    <h2 class="text-3xl font-bold text-center text-gray-900 mb-8">
                        よくある質問
                    </h2>

                    <div class="space-y-4">
                        <div class="card p-6">
                            <h3 class="font-bold text-gray-900 mb-2">
                                <i class="fas fa-question-circle text-primary-500 mr-2"></i>
                                プランはいつでも変更できますか？
                            </h3>
                            <p class="text-secondary-600 ml-8">
                                はい、いつでもプランの変更が可能です。アップグレードは即時反映され、ダウングレードは次回請求サイクルから適用されます。
                            </p>
                        </div>

                        <div class="card p-6">
                            <h3 class="font-bold text-gray-900 mb-2">
                                <i class="fas fa-question-circle text-primary-500 mr-2"></i>
                                支払い方法は何がありますか？
                            </h3>
                            <p class="text-secondary-600 ml-8">
                                クレジットカード（Visa、Mastercard、American Express）での支払いが可能です。
                            </p>
                        </div>

                        <div class="card p-6">
                            <h3 class="font-bold text-gray-900 mb-2">
                                <i class="fas fa-question-circle text-primary-500 mr-2"></i>
                                無料トライアルはありますか？
                            </h3>
                            <p class="text-secondary-600 ml-8">
                                Freeプランは無期限で無料でご利用いただけます。有料プランへのアップグレードもいつでも可能です。
                            </p>
                        </div>
                    </div>
                </div>

                <!-- 戻るリンク -->
                <div class="text-center mt-12">
                    <a href="/" class="link-primary">
                        <i class="fas fa-arrow-left mr-2"></i>
                        ホームに戻る
                    </a>
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
        <script>
            async function handleCheckout(plan) {
                try {
                    showLoading(event.target)
                    
                    const response = await fetch('/api/stripe/checkout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ plan })
                    })

                    const data = await response.json()

                    if (!response.ok) {
                        throw new Error(data.error || 'チェックアウトセッションの作成に失敗しました')
                    }

                    // Stripe Checkout にリダイレクト
                    window.location.href = data.url
                } catch (error) {
                    hideLoading(event.target)
                    showToast(error.message, 'error')
                }
            }
        </script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// 決済成功ページ（Week 9-10）
// --------------------------------------------

app.get('/success', (c) => {
  const sessionId = c.req.query('session_id')

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>決済完了 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-success-50 via-white to-primary-50" data-theme="modern-business">
        <div class="min-h-screen flex items-center justify-center px-4 py-12">
            <div class="max-w-2xl w-full">
                <div class="card p-12 text-center fade-in">
                    <!-- 成功アイコン -->
                    <div class="mb-8">
                        <div class="w-24 h-24 bg-success-100 rounded-full mx-auto flex items-center justify-center">
                            <i class="fas fa-check text-5xl text-success-600"></i>
                        </div>
                    </div>

                    <!-- メッセージ -->
                    <h1 class="text-4xl font-bold text-gray-900 mb-4">
                        決済が完了しました！
                    </h1>
                    <p class="text-lg text-secondary-600 mb-8">
                        プランのアップグレードが完了しました。<br>
                        新しい機能をお楽しみください。
                    </p>

                    <!-- セッション情報 -->
                    ${sessionId ? `
                        <div class="bg-gray-50 rounded-lg p-4 mb-8">
                            <p class="text-sm text-secondary-600">
                                <i class="fas fa-info-circle mr-2"></i>
                                セッションID: <code class="text-xs bg-white px-2 py-1 rounded">${sessionId}</code>
                            </p>
                        </div>
                    ` : ''}

                    <!-- 次のステップ -->
                    <div class="space-y-4">
                        <a href="/dashboard" class="btn-primary inline-flex items-center">
                            <i class="fas fa-home mr-2"></i>
                            ダッシュボードに移動
                        </a>
                        <div>
                            <a href="/plans" class="link-primary">
                                <i class="fas fa-arrow-left mr-2"></i>
                                プラン一覧に戻る
                            </a>
                        </div>
                    </div>

                    <!-- 追加情報 -->
                    <div class="mt-12 pt-8 border-t border-gray-200">
                        <div class="grid md:grid-cols-3 gap-6 text-left">
                            <div>
                                <i class="fas fa-envelope text-primary-500 text-2xl mb-3"></i>
                                <h3 class="font-bold text-gray-900 mb-2">請求書メール</h3>
                                <p class="text-sm text-secondary-600">
                                    登録メールアドレスに請求書を送信しました
                                </p>
                            </div>
                            <div>
                                <i class="fas fa-sync text-primary-500 text-2xl mb-3"></i>
                                <h3 class="font-bold text-gray-900 mb-2">自動更新</h3>
                                <p class="text-sm text-secondary-600">
                                    毎月自動的に更新されます
                                </p>
                            </div>
                            <div>
                                <i class="fas fa-headset text-primary-500 text-2xl mb-3"></i>
                                <h3 class="font-bold text-gray-900 mb-2">サポート</h3>
                                <p class="text-sm text-secondary-600">
                                    ご不明な点はお問い合わせください
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// 決済キャンセルページ（Week 9-10）
// --------------------------------------------

app.get('/cancel', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>決済キャンセル - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-warning-50 via-white to-primary-50" data-theme="modern-business">
        <div class="min-h-screen flex items-center justify-center px-4 py-12">
            <div class="max-w-2xl w-full">
                <div class="card p-12 text-center fade-in">
                    <!-- キャンセルアイコン -->
                    <div class="mb-8">
                        <div class="w-24 h-24 bg-warning-100 rounded-full mx-auto flex items-center justify-center">
                            <i class="fas fa-times text-5xl text-warning-600"></i>
                        </div>
                    </div>

                    <!-- メッセージ -->
                    <h1 class="text-4xl font-bold text-gray-900 mb-4">
                        決済がキャンセルされました
                    </h1>
                    <p class="text-lg text-secondary-600 mb-8">
                        プランの変更は行われませんでした。<br>
                        いつでも再度お試しいただけます。
                    </p>

                    <!-- アクション -->
                    <div class="space-y-4">
                        <a href="/plans" class="btn-primary inline-flex items-center">
                            <i class="fas fa-redo mr-2"></i>
                            プランを選び直す
                        </a>
                        <div>
                            <a href="/" class="link-primary">
                                <i class="fas fa-home mr-2"></i>
                                ホームに戻る
                            </a>
                        </div>
                    </div>

                    <!-- FAQ -->
                    <div class="mt-12 pt-8 border-t border-gray-200 text-left">
                        <h3 class="font-bold text-gray-900 mb-4 text-center">
                            <i class="fas fa-question-circle text-primary-500 mr-2"></i>
                            よくある質問
                        </h3>
                        
                        <div class="space-y-4">
                            <div>
                                <p class="font-semibold text-gray-900 mb-1">決済情報は安全ですか？</p>
                                <p class="text-sm text-secondary-600">
                                    はい、すべての決済情報は Stripe により安全に暗号化されます。
                                </p>
                            </div>
                            
                            <div>
                                <p class="font-semibold text-gray-900 mb-1">いつでもプラン変更できますか？</p>
                                <p class="text-sm text-secondary-600">
                                    はい、いつでもプランの変更が可能です。
                                </p>
                            </div>
                            
                            <div>
                                <p class="font-semibold text-gray-900 mb-1">無料プランに戻れますか？</p>
                                <p class="text-sm text-secondary-600">
                                    はい、いつでもダウングレード可能です。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// プロフィールページ（Week 5-6）
// --------------------------------------------

app.get('/profile', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>プロフィール - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100" data-theme="modern-business">
        <div class="min-h-screen py-8 px-4">
            <div class="max-w-2xl mx-auto">
                <!-- ヘッダー -->
                <div class="mb-8">
                    <a href="/dashboard" class="text-blue-600 hover:underline">
                        <i class="fas fa-arrow-left mr-2"></i>
                        ダッシュボードに戻る
                    </a>
                </div>

                <!-- プロフィールカード -->
                <div class="card fade-in" id="profileCard">
                    <div class="flex flex-col md:flex-row items-start gap-6 mb-6">
                        <!-- アバター -->
                        <div class="flex-shrink-0">
                            <div class="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden" id="avatarContainer">
                                <span id="avatarIcon">U</span>
                                <img id="avatarImage" class="w-full h-full object-cover hidden" alt="Avatar">
                            </div>
                        </div>

                        <!-- プロフィール情報 -->
                        <div class="flex-1">
                            <h1 class="text-2xl font-bold mb-2" id="displayNickname">Loading...</h1>
                            <p class="text-gray-600 mb-2" id="displayEmail"></p>
                            <p class="text-gray-700 whitespace-pre-line" id="displayBio"></p>
                        </div>
                    </div>

                    <!-- 編集ボタン -->
                    <div class="flex flex-col sm:flex-row gap-2">
                        <button id="editBtn" class="btn-primary">
                            <i class="fas fa-edit mr-2"></i>
                            プロフィールを編集
                        </button>
                        <button id="logoutBtn" class="btn-secondary">
                            <i class="fas fa-sign-out-alt mr-2"></i>
                            ログアウト
                        </button>
                    </div>
                </div>

                <!-- 編集フォーム（非表示） -->
                <div class="card fade-in hidden" id="editForm">
                    <h2 class="text-xl font-bold mb-4">プロフィール編集</h2>
                    <form id="profileForm" class="space-y-4">
                        <!-- アバター画像 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                プロフィール画像
                            </label>
                            <div class="flex items-center gap-4">
                                <div id="avatarPreview" class="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                                    <img id="avatarImg" class="w-full h-full object-cover hidden" alt="Avatar">
                                    <span id="avatarInitial">U</span>
                                </div>
                                <div class="flex-1">
                                    <input type="file" id="avatarInput" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden">
                                    <button type="button" id="selectAvatarBtn" class="btn-secondary text-sm">
                                        <i class="fas fa-image mr-2"></i>
                                        画像を選択
                                    </button>
                                    <p class="text-xs text-gray-500 mt-1">
                                        JPEG, PNG, GIF, WebP形式（最大5MB）
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- ニックネーム -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                ニックネーム
                            </label>
                            <input type="text" id="inputNickname" maxlength="50" required
                                   class="input-field"
                                   placeholder="ニックネーム">
                        </div>

                        <!-- 自己紹介 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                自己紹介（500文字以内）
                            </label>
                            <textarea id="inputBio" maxlength="500" rows="4"
                                      class="input-field"
                                      placeholder="自己紹介を入力"></textarea>
                            <p class="text-xs text-gray-500 mt-1">
                                <span id="bioCharCount">0</span> / 500
                            </p>
                        </div>

                        <!-- ボタン -->
                        <div class="flex gap-2">
                            <button type="submit" id="saveBtn" class="btn-primary">
                                <i class="fas fa-save mr-2"></i>
                                保存
                            </button>
                            <button type="button" id="cancelBtn" class="btn-secondary">
                                キャンセル
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
        <script>
            let currentProfile = null

            // ページロード時にプロフィール取得
            async function loadProfile() {
                const token = getToken()
                if (!token) {
                    showToast('ログインしてください', 'error')
                    setTimeout(() => window.location.href = '/login', 1500)
                    return
                }

                try {
                    const response = await apiRequest('/api/profile', {
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    })

                    if (response.success) {
                        currentProfile = response.user
                        displayProfile(response.user)
                    }
                } catch (error) {
                    showToast('プロフィールの取得に失敗しました', 'error')
                }
            }

            // プロフィール表示
            function displayProfile(user) {
                document.getElementById('displayNickname').textContent = user.nickname
                document.getElementById('displayEmail').textContent = user.email
                document.getElementById('displayBio').textContent = user.bio || '自己紹介が未設定です'

                // アバター表示
                const avatarIcon = document.getElementById('avatarIcon')
                const avatarImage = document.getElementById('avatarImage')
                
                if (user.avatar_url) {
                    avatarImage.src = user.avatar_url
                    avatarImage.classList.remove('hidden')
                    avatarIcon.classList.add('hidden')
                } else {
                    avatarImage.classList.add('hidden')
                    avatarIcon.classList.remove('hidden')
                    avatarIcon.textContent = user.nickname.charAt(0).toUpperCase()
                }
            }

            // 編集フォーム表示
            document.getElementById('editBtn').addEventListener('click', () => {
                document.getElementById('profileCard').classList.add('hidden')
                document.getElementById('editForm').classList.remove('hidden')

                // 現在の値をフォームに設定
                document.getElementById('inputNickname').value = currentProfile.nickname
                document.getElementById('inputBio').value = currentProfile.bio || ''
                
                // アバター画像表示
                if (currentProfile.avatar_url) {
                    document.getElementById('avatarImg').src = currentProfile.avatar_url
                    document.getElementById('avatarImg').classList.remove('hidden')
                    document.getElementById('avatarInitial').classList.add('hidden')
                } else {
                    document.getElementById('avatarInitial').textContent = currentProfile.nickname.charAt(0).toUpperCase()
                    document.getElementById('avatarImg').classList.add('hidden')
                    document.getElementById('avatarInitial').classList.remove('hidden')
                }
                
                updateCharCount()
            })
            
            // アバター選択ボタン
            document.getElementById('selectAvatarBtn').addEventListener('click', () => {
                document.getElementById('avatarInput').click()
            })
            
            // アバタープレビュー
            let selectedAvatarFile = null
            document.getElementById('avatarInput').addEventListener('change', (e) => {
                const file = e.target.files[0]
                if (!file) return
                
                // ファイルサイズチェック（5MB）
                if (file.size > 5 * 1024 * 1024) {
                    showToast('画像サイズは5MB以下にしてください', 'error')
                    return
                }
                
                selectedAvatarFile = file
                
                // プレビュー表示
                const reader = new FileReader()
                reader.onload = (e) => {
                    document.getElementById('avatarImg').src = e.target.result
                    document.getElementById('avatarImg').classList.remove('hidden')
                    document.getElementById('avatarInitial').classList.add('hidden')
                }
                reader.readAsDataURL(file)
            })

            // キャンセル
            document.getElementById('cancelBtn').addEventListener('click', () => {
                document.getElementById('editForm').classList.add('hidden')
                document.getElementById('profileCard').classList.remove('hidden')
            })

            // 文字数カウント
            document.getElementById('inputBio').addEventListener('input', updateCharCount)

            function updateCharCount() {
                const count = document.getElementById('inputBio').value.length
                document.getElementById('bioCharCount').textContent = count
            }

            // プロフィール保存
            document.getElementById('profileForm').addEventListener('submit', async (e) => {
                e.preventDefault()

                const saveBtn = document.getElementById('saveBtn')
                showLoading(saveBtn)

                const token = getToken()
                
                try {
                    // アバター画像がある場合は先にアップロード
                    if (selectedAvatarFile) {
                        const formData = new FormData()
                        formData.append('avatar', selectedAvatarFile)
                        
                        const uploadResponse = await fetch('/api/upload/avatar', {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Bearer ' + token
                            },
                            body: formData
                        })
                        
                        const uploadResult = await uploadResponse.json()
                        if (!uploadResult.success) {
                            throw new Error(uploadResult.error || 'アバターのアップロードに失敗しました')
                        }
                        
                        // アップロード成功後、ファイルをクリア
                        selectedAvatarFile = null
                    }
                    
                    // プロフィール情報を更新
                    const data = {
                        nickname: document.getElementById('inputNickname').value,
                        bio: document.getElementById('inputBio').value
                    }
                    
                    const response = await apiRequest('/api/profile', {
                        method: 'PUT',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    })

                    if (response.success) {
                        currentProfile = response.user
                        displayProfile(response.user)
                        document.getElementById('editForm').classList.add('hidden')
                        document.getElementById('profileCard').classList.remove('hidden')
                        showToast('プロフィールを更新しました', 'success')
                    }
                } catch (error) {
                    showToast(error.message || '更新に失敗しました', 'error')
                } finally {
                    hideLoading(saveBtn)
                }
            })

            // ログアウト
            document.getElementById('logoutBtn').addEventListener('click', async () => {
                await handleLogout()
            })

            // ページロード時
            loadProfile()
        </script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// ダッシュボードページ（簡易版）
// --------------------------------------------

app.get('/dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ダッシュボード - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-gray-50 to-gray-100">
        <div class="min-h-screen">
            <!-- ヘッダー -->
            <header class="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
                <div class="container-custom py-4">
                    <div class="flex justify-between items-center">
                        <h1 class="text-xl md:text-2xl font-bold text-gradient">
                            <i class="fas fa-th-large mr-2"></i>
                            <span class="hidden sm:inline">ダッシュボード</span>
                            <span class="sm:hidden">Dashboard</span>
                        </h1>
                        <!-- デスクトップナビ -->
                        <div class="hidden md:flex gap-4">
                            <a href="/profile" class="btn-ghost">
                                <i class="fas fa-user mr-2"></i>
                                プロフィール
                            </a>
                            <button id="logoutBtn" class="btn-secondary">
                                <i class="fas fa-sign-out-alt mr-2"></i>
                                ログアウト
                            </button>
                        </div>
                        <!-- モバイルメニューボタン -->
                        <button id="mobileMenuBtn" class="md:hidden btn-ghost p-2">
                            <i class="fas fa-bars text-xl"></i>
                        </button>
                    </div>
                    <!-- モバイルメニュー -->
                    <div id="mobileMenu" class="hidden md:hidden mt-4 space-y-2">
                        <a href="/profile" class="block btn-ghost text-center">
                            <i class="fas fa-user mr-2"></i>
                            プロフィール
                        </a>
                        <button id="logoutBtnMobile" class="w-full btn-secondary">
                            <i class="fas fa-sign-out-alt mr-2"></i>
                            ログアウト
                        </button>
                    </div>
                </div>
            </header>

            <!-- メインコンテンツ -->
            <main class="container-custom section-spacing">
                <div id="userInfo" class="mb-8 fade-in"></div>

                <!-- 統計カード -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                    <div class="card p-6 border-l-4 border-l-primary-500">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-3xl text-primary-500">
                                <i class="fas fa-users"></i>
                            </div>
                            <span class="badge badge-primary">New</span>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-1">--</h3>
                        <p class="text-secondary-600">メンバー数</p>
                    </div>

                    <div class="card p-6 border-l-4 border-l-success-500">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-3xl text-success-500">
                                <i class="fas fa-file-alt"></i>
                            </div>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-1">--</h3>
                        <p class="text-secondary-600">投稿数</p>
                    </div>

                    <div class="card p-6 border-l-4 border-l-accent-500">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-3xl text-accent-500">
                                <i class="fas fa-comments"></i>
                            </div>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-1">--</h3>
                        <p class="text-secondary-600">コメント数</p>
                    </div>
                </div>

                <!-- クイックアクション -->
                <div class="card p-8">
                    <h2 class="text-xl font-bold text-gray-900 mb-6">
                        <i class="fas fa-rocket mr-2 text-primary-500"></i>
                        クイックアクション
                    </h2>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">

                        <a href="/members" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-warning-500">
                                <i class="fas fa-user-check"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">会員管理</h3>
                            <p class="text-sm text-secondary-600">申請の承認・会員一覧</p>
                        </a>

                        <a href="/profile" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-success-500">
                                <i class="fas fa-user-edit"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">プロフィール編集</h3>
                            <p class="text-sm text-secondary-600">プロフィールを更新</p>
                        </a>
                        
                        <button onclick="openThemeModal()" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-accent-500">
                                <i class="fas fa-palette"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">テーマ設定</h3>
                            <p class="text-sm text-secondary-600">デザインを変更</p>
                        </button>
                        
                        <button onclick="openPrivacyModal()" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-info-500">
                                <i class="fas fa-eye"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">公開設定</h3>
                            <p class="text-sm text-secondary-600">表示設定を変更</p>
                        </button>
                    </div>
                </div>
            </main>
            
            <!-- テーマ選択モーダル -->
            <div id="themeModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h2 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-palette mr-2 text-primary-500"></i>
                                テーマ設定
                            </h2>
                            <button onclick="closeThemeModal()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <p class="text-sm text-secondary-600 mt-2">
                            コミュニティ全体のデザインテーマを選択してください
                        </p>
                    </div>
                    
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Modern Business -->
                            <label class="theme-card cursor-pointer">
                                <input type="radio" name="themeModal" value="modern-business" checked class="hidden theme-radio-modal">
                                <div class="p-5 border-2 rounded-lg transition-all duration-200 hover:border-primary-400">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="w-12 h-12 rounded-lg" style="background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);"></div>
                                        <div class="flex-1">
                                            <p class="font-semibold text-lg text-gray-900">Modern Business</p>
                                            <p class="text-sm text-secondary-500">プロフェッショナル・信頼感</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <div class="w-6 h-6 rounded" style="background: #4F46E5;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #6366F1;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #818CF8;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #64748B;"></div>
                                    </div>
                                </div>
                            </label>
                            
                            <!-- Wellness Nature -->
                            <label class="theme-card cursor-pointer">
                                <input type="radio" name="themeModal" value="wellness-nature" class="hidden theme-radio-modal">
                                <div class="p-5 border-2 rounded-lg transition-all duration-200 hover:border-primary-400">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="w-12 h-12 rounded-lg" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%);"></div>
                                        <div class="flex-1">
                                            <p class="font-semibold text-lg text-gray-900">Wellness Nature</p>
                                            <p class="text-sm text-secondary-500">自然・健康・リラックス</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <div class="w-6 h-6 rounded" style="background: #059669;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #10B981;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #34D399;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #84CC16;"></div>
                                    </div>
                                </div>
                            </label>
                            
                            <!-- Creative Studio -->
                            <label class="theme-card cursor-pointer">
                                <input type="radio" name="themeModal" value="creative-studio" class="hidden theme-radio-modal">
                                <div class="p-5 border-2 rounded-lg transition-all duration-200 hover:border-primary-400">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="w-12 h-12 rounded-lg" style="background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);"></div>
                                        <div class="flex-1">
                                            <p class="font-semibold text-lg text-gray-900">Creative Studio</p>
                                            <p class="text-sm text-secondary-500">創造性・芸術・個性</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <div class="w-6 h-6 rounded" style="background: #8B5CF6;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #A78BFA;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #EC4899;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #F59E0B;"></div>
                                    </div>
                                </div>
                            </label>
                            
                            <!-- Tech Innovation -->
                            <label class="theme-card cursor-pointer">
                                <input type="radio" name="themeModal" value="tech-innovation" class="hidden theme-radio-modal">
                                <div class="p-5 border-2 rounded-lg transition-all duration-200 hover:border-primary-400">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="w-12 h-12 rounded-lg" style="background: linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%);"></div>
                                        <div class="flex-1">
                                            <p class="font-semibold text-lg text-gray-900">Tech Innovation</p>
                                            <p class="text-sm text-secondary-500">革新・先進・テクノロジー</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <div class="w-6 h-6 rounded" style="background: #06B6D4;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #22D3EE;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #6366F1;"></div>
                                        <div class="w-6 h-6 rounded" style="background: #14B8A6;"></div>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <div class="p-6 border-t border-gray-200 flex gap-3 justify-end">
                        <button onclick="closeThemeModal()" class="btn-secondary">
                            キャンセル
                        </button>
                        <button onclick="saveTheme()" class="btn-primary">
                            <i class="fas fa-save mr-2"></i>
                            保存
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 公開設定モーダル -->
            <div id="privacyModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg shadow-2xl max-w-lg w-full">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h2 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-eye mr-2 text-info-500"></i>
                                公開設定
                            </h2>
                            <button onclick="closePrivacyModal()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <p class="text-sm text-secondary-600 mt-2">
                            コミュニティの表示設定を変更します
                        </p>
                    </div>
                    
                    <div class="p-6" id="privacyContent">
                        <div class="space-y-4">
                            <label class="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input type="radio" name="isPublic" value="1" class="mt-1 mr-3 text-primary-600 focus:ring-primary-500">
                                <div class="flex-1">
                                    <div class="font-semibold text-gray-900 mb-1">
                                        <i class="fas fa-globe mr-1 text-primary-500"></i>
                                        公開コミュニティ
                                    </div>
                                    <div class="text-sm text-secondary-600">
                                        コミュニティ一覧に表示され、誰でも参加申請できます
                                    </div>
                                </div>
                            </label>
                            
                            <label class="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input type="radio" name="isPublic" value="0" class="mt-1 mr-3 text-primary-600 focus:ring-primary-500">
                                <div class="flex-1">
                                    <div class="font-semibold text-gray-900 mb-1">
                                        <i class="fas fa-lock mr-1 text-gray-500"></i>
                                        非公開コミュニティ
                                    </div>
                                    <div class="text-sm text-secondary-600">
                                        URLを知っている人のみアクセス可能。一覧には表示されません
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <div class="p-6 border-t border-gray-200 flex gap-3 justify-end">
                        <button onclick="closePrivacyModal()" class="btn-secondary">
                            キャンセル
                        </button>
                        <button onclick="savePrivacySetting()" class="btn-primary">
                            <i class="fas fa-save mr-2"></i>
                            保存
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
        <script src="/static/member-modal.js"></script>
        <script>
            // ユーザー情報を表示
            async function loadDashboard() {
                const user = JSON.parse(localStorage.getItem('user') || '{}')
                const membership = JSON.parse(localStorage.getItem('membership') || '{}')
                
                if (!user.id) {
                    window.location.href = '/login'
                    return
                }

                const userInfoEl = document.getElementById('userInfo')
                userInfoEl.innerHTML = \`
                    <div class="card p-6">
                        <div class="flex items-center gap-4">
                            <div class="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl text-primary-600">
                                <i class="fas fa-user"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold text-gray-900">\${user.nickname || 'ユーザー'}</h2>
                                <p class="text-secondary-600">\${user.email}</p>
                                <span class="status-active mt-2">\${membership.role || 'member'}</span>
                            </div>
                        </div>
                    </div>
                \`
            }

            // モバイルメニュートグル
            const mobileMenuBtn = document.getElementById('mobileMenuBtn')
            const mobileMenu = document.getElementById('mobileMenu')
            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden')
                })
            }

            // ログアウト（デスクトップ）
            document.getElementById('logoutBtn').addEventListener('click', async () => {
                await handleLogout()
            })
            
            // ログアウト（モバイル）
            const logoutBtnMobile = document.getElementById('logoutBtnMobile')
            if (logoutBtnMobile) {
                logoutBtnMobile.addEventListener('click', async () => {
                    await handleLogout()
                })
            }
            
            // テーマモーダル制御
            window.openThemeModal = function() {
                document.getElementById('themeModal').classList.remove('hidden')
                
                // テーマカードの選択状態を更新
                document.querySelectorAll('.theme-radio-modal').forEach(radio => {
                    radio.addEventListener('change', function() {
                        document.querySelectorAll('#themeModal .theme-card > div').forEach(card => {
                            card.classList.remove('border-primary-600', 'bg-primary-50', 'shadow-md')
                            card.classList.add('border-gray-200')
                        })
                        
                        if (this.checked) {
                            const card = this.nextElementSibling
                            card.classList.remove('border-gray-200')
                            card.classList.add('border-primary-600', 'bg-primary-50', 'shadow-md')
                        }
                    })
                })
                
                // 初期選択状態を設定
                const checkedRadio = document.querySelector('.theme-radio-modal:checked')
                if (checkedRadio) {
                    const card = checkedRadio.nextElementSibling
                    card.classList.remove('border-gray-200')
                    card.classList.add('border-primary-600', 'bg-primary-50', 'shadow-md')
                }
            }
            
            window.closeThemeModal = function() {
                document.getElementById('themeModal').classList.add('hidden')
            }
            
            window.saveTheme = async function() {
                const selectedTheme = document.querySelector('.theme-radio-modal:checked')?.value
                
                if (!selectedTheme) {
                    showToast('テーマを選択してください', 'error')
                    return
                }
                
                try {
                    showToast('テーマを保存しています...', 'info')
                    
                    // TODO: API実装後に有効化
                    // await apiRequest('/api/settings/theme', {
                    //     method: 'PUT',
                    //     body: JSON.stringify({ theme: selectedTheme })
                    // })
                    
                    // とりあえずローカルに保存してテーマを適用
                    switchTheme(selectedTheme)
                    closeThemeModal()
                    showToast('テーマを変更しました！ページをリロードすると全体に反映されます。', 'success')
                } catch (error) {
                    showToast('テーマの保存に失敗しました', 'error')
                    console.error('Theme save error:', error)
                }
            }

            // 公開設定モーダル制御
            window.openPrivacyModal = async function() {
                document.getElementById('privacyModal').classList.remove('hidden')
                
                // 現在の設定を取得
                try {
                    const token = localStorage.getItem('token')
                    const response = await fetch('/api/admin/tenant/settings', {
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    })
                    
                    if (response.ok) {
                        const data = await response.json()
                        const isPublic = data.tenant?.is_public || 1
                        
                        // ラジオボタンの選択状態を設定
                        document.querySelectorAll('input[name="isPublic"]').forEach(radio => {
                            if (parseInt(radio.value) === isPublic) {
                                radio.checked = true
                                // 選択されたカードのスタイルを更新
                                radio.closest('label').classList.add('border-primary-600', 'bg-primary-50')
                                radio.closest('label').classList.remove('border-gray-200')
                            }
                        })
                        
                        // ラジオボタンの変更イベント
                        document.querySelectorAll('input[name="isPublic"]').forEach(radio => {
                            radio.addEventListener('change', function() {
                                document.querySelectorAll('#privacyModal label').forEach(label => {
                                    label.classList.remove('border-primary-600', 'bg-primary-50')
                                    label.classList.add('border-gray-200')
                                })
                                
                                if (this.checked) {
                                    this.closest('label').classList.remove('border-gray-200')
                                    this.closest('label').classList.add('border-primary-600', 'bg-primary-50')
                                }
                            })
                        })
                    }
                } catch (error) {
                    console.error('Failed to load privacy settings:', error)
                }
            }
            
            window.closePrivacyModal = function() {
                document.getElementById('privacyModal').classList.add('hidden')
            }
            
            window.savePrivacySetting = async function() {
                const selectedValue = document.querySelector('input[name="isPublic"]:checked')?.value
                
                if (selectedValue === undefined) {
                    showToast('設定を選択してください', 'error')
                    return
                }
                
                try {
                    showToast('設定を保存しています...', 'info')
                    
                    const token = localStorage.getItem('token')
                    const response = await fetch('/api/admin/tenant/privacy', {
                        method: 'PUT',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ isPublic: parseInt(selectedValue) })
                    })
                    
                    if (response.ok) {
                        closePrivacyModal()
                        showToast('公開設定を変更しました！', 'success')
                    } else {
                        const error = await response.json()
                        showToast(error.error || '設定の保存に失敗しました', 'error')
                    }
                } catch (error) {
                    showToast('設定の保存に失敗しました', 'error')
                    console.error('Privacy save error:', error)
                }
            }

            // ページロード時
            loadDashboard()
        </script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// 会員管理ページ（Phase 2）
// --------------------------------------------

app.get('/members', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="modern-business">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>会員管理 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-gray-50 to-gray-100">
        <div class="min-h-screen">
            <!-- ヘッダー -->
            <header class="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
                <div class="container-custom py-4">
                    <div class="flex justify-between items-center">
                        <h1 class="text-xl md:text-2xl font-bold text-gradient">
                            <i class="fas fa-user-check mr-2"></i>
                            <span class="hidden sm:inline">会員管理</span>
                            <span class="sm:hidden">Members</span>
                        </h1>
                        <!-- デスクトップナビ -->
                        <div class="hidden md:flex gap-4">
                            <a href="/dashboard" class="btn-ghost">
                                <i class="fas fa-arrow-left mr-2"></i>
                                ダッシュボード
                            </a>
                            <button id="logoutBtn" class="btn-secondary">
                                <i class="fas fa-sign-out-alt mr-2"></i>
                                ログアウト
                            </button>
                        </div>
                        <!-- モバイルメニューボタン -->
                        <button id="mobileMenuBtn" class="md:hidden btn-ghost p-2">
                            <i class="fas fa-bars text-xl"></i>
                        </button>
                    </div>
                    <!-- モバイルメニュー -->
                    <div id="mobileMenu" class="hidden md:hidden mt-4 space-y-2">
                        <a href="/dashboard" class="block btn-ghost text-center">
                            <i class="fas fa-arrow-left mr-2"></i>
                            ダッシュボード
                        </a>
                        <button id="logoutBtnMobile" class="w-full btn-secondary">
                            <i class="fas fa-sign-out-alt mr-2"></i>
                            ログアウト
                        </button>
                    </div>
                </div>
            </header>

            <!-- メインコンテンツ -->
            <main class="container-custom section-spacing">
                <!-- タブ -->
                <div class="mb-6">
                    <div class="bg-white rounded-lg shadow p-2 flex gap-2 overflow-x-auto">
                        <button id="tabPending" onclick="switchTab('pending')" 
                            class="px-6 py-2 rounded-md font-semibold transition whitespace-nowrap"
                            style="background-color: #6366F1 !important; color: #FFFFFF !important; border: 2px solid #6366F1 !important;">
                            <i class="fas fa-hourglass-half mr-2"></i>
                            <span class="hidden sm:inline">承認待ち</span>
                            <span class="sm:hidden">Pending</span>
                            <span id="pendingCount" class="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style="background-color: white !important; color: #6366F1 !important;">0</span>
                        </button>
                        <button id="tabActive" onclick="switchTab('active')" 
                            class="px-6 py-2 rounded-md font-semibold transition whitespace-nowrap"
                            style="background-color: #F3F4F6 !important; color: #4B5563 !important; border: 2px solid #E5E7EB !important;">
                            <i class="fas fa-check-circle mr-2"></i>
                            <span class="hidden sm:inline">承認済み会員</span>
                            <span class="sm:hidden">Active</span>
                        </button>
                    </div>
                </div>

                <!-- 承認待ちリスト -->
                <div id="pendingSection" class="card">
                    <div class="p-6 border-b border-gray-200">
                        <h2 class="text-xl font-bold text-gray-900">
                            <i class="fas fa-hourglass-half mr-2 text-warning-500"></i>
                            承認待ち会員申請
                        </h2>
                        <p class="text-sm text-gray-600 mt-1">申請を確認して承認または却下してください</p>
                    </div>
                    <div id="pendingList" class="divide-y divide-gray-200">
                        <!-- 動的に追加されます -->
                    </div>
                </div>

                <!-- 承認済み会員リスト -->
                <div id="activeSection" class="card hidden">
                    <div class="p-6 border-b border-gray-200">
                        <h2 class="text-xl font-bold text-gray-900">
                            <i class="fas fa-users mr-2 text-success-500"></i>
                            承認済み会員一覧
                        </h2>
                        <p class="text-sm text-gray-600 mt-1">現在のコミュニティメンバー</p>
                    </div>
                    <div id="activeList" class="divide-y divide-gray-200">
                        <!-- 動的に追加されます -->
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script src="/static/member-modal.js"></script>
        <script>
            let currentTab = 'pending'

            // タブ切り替え
            function switchTab(tab) {
                currentTab = tab
                
                // タブボタンのスタイル更新
                const tabPending = document.getElementById('tabPending')
                const tabActive = document.getElementById('tabActive')
                
                if (tab === 'pending') {
                    tabPending.className = 'px-4 px-6 py-2 rounded-md font-semibold transition whitespace-nowrap'
                    tabPending.style.cssText = 'background-color: #6366F1 !important; color: #FFFFFF !important; border: 2px solid #6366F1 !important;'
                    tabActive.className = 'px-4 px-6 py-2 rounded-md font-semibold transition whitespace-nowrap'
                    tabActive.style.cssText = 'background-color: #F3F4F6 !important; color: #4B5563 !important; border: 2px solid #E5E7EB !important;'
                    document.getElementById('pendingSection').classList.remove('hidden')
                    document.getElementById('activeSection').classList.add('hidden')
                    loadPendingMembers()
                } else {
                    tabActive.className = 'px-4 px-6 py-2 rounded-md font-semibold transition whitespace-nowrap'
                    tabActive.style.cssText = 'background-color: #6366F1 !important; color: #FFFFFF !important; border: 2px solid #6366F1 !important;'
                    tabPending.className = 'px-4 px-6 py-2 rounded-md font-semibold transition whitespace-nowrap'
                    tabPending.style.cssText = 'background-color: #F3F4F6 !important; color: #4B5563 !important; border: 2px solid #E5E7EB !important;'
                    document.getElementById('activeSection').classList.remove('hidden')
                    document.getElementById('pendingSection').classList.add('hidden')
                    loadActiveMembers()
                }
            }

            // 承認待ちメンバー取得
            async function loadPendingMembers() {
                try {
                    const token = getToken()
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    const response = await axios.get('/api/admin/members/pending', {
                        headers: { Authorization: \`Bearer \${token}\` }
                    })

                    if (response.data.success) {
                        const members = response.data.members || []
                        document.getElementById('pendingCount').textContent = members.length
                        renderPendingMembers(members)
                    } else {
                        showToast(response.data.error || 'データ取得に失敗しました', 'error')
                    }
                } catch (error) {
                    console.error('Load pending members error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login'
                    } else {
                        showToast('データ取得に失敗しました', 'error')
                    }
                }
            }

            // 承認待ちメンバー表示
            function renderPendingMembers(members) {
                const container = document.getElementById('pendingList')
                
                if (members.length === 0) {
                    container.innerHTML = \`
                        <div class="p-12 text-center">
                            <i class="fas fa-check-circle text-6xl text-gray-300 mb-4"></i>
                            <p class="text-gray-600 text-lg">承認待ちの申請はありません</p>
                        </div>
                    \`
                    return
                }

                container.innerHTML = members.map(member => \`
                    <div class="p-6 hover:bg-gray-50 transition">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <div class="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        \${member.nickname.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-gray-900 text-lg">\${member.nickname}</h3>
                                        <p class="text-sm text-gray-600">\${member.email}</p>
                                    </div>
                                </div>
                                <p class="text-sm text-gray-500 ml-15">
                                    <i class="fas fa-clock mr-1"></i>
                                    申請日時: \${new Date(member.joined_at).toLocaleString('ja-JP')}
                                </p>
                            </div>
                            <div class="flex gap-2 ml-4">
                                <button onclick="approveMember(\${member.id}, '\${member.nickname}')" 
                                    class="btn-primary px-4 py-2">
                                    <i class="fas fa-check mr-2"></i>
                                    承認
                                </button>
                                <button onclick="rejectMember(\${member.id}, '\${member.nickname}')" 
                                    class="btn-danger px-4 py-2">
                                    <i class="fas fa-times mr-2"></i>
                                    却下
                                </button>
                            </div>
                        </div>
                    </div>
                \`).join('')
            }

            // 会員承認
            async function approveMember(id, nickname) {
                if (!confirm(\`\${nickname} さんの申請を承認しますか？\`)) {
                    return
                }

                try {
                    const token = getToken()
                    const response = await axios.post(\`/api/admin/members/\${id}/approve\`, {}, {
                        headers: { Authorization: \`Bearer \${token}\` }
                    })

                    if (response.data.success) {
                        showToast(\`\${nickname} さんを承認しました\`, 'success')
                        // 少し待ってからリスト更新（DBの反映を待つ）
                        await new Promise(resolve => setTimeout(resolve, 500))
                        await loadPendingMembers()
                    } else {
                        showToast(response.data.error || '承認に失敗しました', 'error')
                    }
                } catch (error) {
                    console.error('Approve member error:', error)
                    showToast(error.response?.data?.error || '承認に失敗しました', 'error')
                }
            }

            // 会員却下
            async function rejectMember(id, nickname) {
                if (!confirm(\`\${nickname} さんの申請を却下しますか？\`)) {
                    return
                }

                try {
                    const token = getToken()
                    const response = await axios.post(\`/api/admin/members/\${id}/reject\`, {}, {
                        headers: { Authorization: \`Bearer \${token}\` }
                    })

                    if (response.data.success) {
                        showToast(\`\${nickname} さんの申請を却下しました\`, 'success')
                        // 少し待ってからリスト更新（DBの反映を待つ）
                        await new Promise(resolve => setTimeout(resolve, 500))
                        await loadPendingMembers()
                    } else {
                        showToast(response.data.error || '却下に失敗しました', 'error')
                    }
                } catch (error) {
                    console.error('Reject member error:', error)
                    showToast(error.response?.data?.error || '却下に失敗しました', 'error')
                }
            }

            // 承認済みメンバー取得
            async function loadActiveMembers() {
                try {
                    const token = getToken()
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    const response = await axios.get('/api/admin/members/active', {
                        headers: { Authorization: \`Bearer \${token}\` }
                    })

                    if (response.data.success) {
                        const members = response.data.members || []
                        renderActiveMembers(members)
                    } else {
                        showToast(response.data.error || 'データ取得に失敗しました', 'error')
                    }
                } catch (error) {
                    console.error('Load active members error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login'
                    } else {
                        showToast('データ取得に失敗しました', 'error')
                    }
                }
            }

            // 承認済みメンバー表示
            function renderActiveMembers(members) {
                const container = document.getElementById('activeList')
                
                if (members.length === 0) {
                    container.innerHTML = \`
                        <div class="p-12 text-center">
                            <i class="fas fa-users text-6xl text-gray-300 mb-4"></i>
                            <p class="text-gray-600 text-lg">承認済みの会員がいません</p>
                        </div>
                    \`
                    return
                }

                container.innerHTML = members.map(member => \`
                    <div class="p-6 hover:bg-gray-50 transition">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 bg-gradient-to-br from-success-400 to-success-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                \${member.nickname.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-1">
                                    <h3 class="font-bold text-gray-900 text-lg">\${member.nickname}</h3>
                                    <span class="badge badge-success">\${member.member_number}</span>
                                    \${member.role === 'owner' ? '<span class="badge bg-purple-100 text-purple-700">オーナー</span>' : ''}
                                    \${member.role === 'admin' ? '<span class="badge bg-blue-100 text-blue-700">管理者</span>' : ''}
                                </div>
                                <p class="text-sm text-gray-600">\${member.email}</p>
                                <p class="text-xs text-gray-500 mt-1">
                                    <i class="fas fa-calendar mr-1"></i>
                                    登録日: \${new Date(member.joined_at).toLocaleDateString('ja-JP')}
                                </p>
                            </div>
                            <div class="text-right">
                                <button class="text-gray-400 hover:text-gray-600 p-2" 
                                    onclick="showMemberMenu(\${member.id})">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                \`).join('')
            }

            // 会員管理機能のスクリプトを読み込み

            // ログアウト（デスクトップ）
            document.getElementById('logoutBtn').addEventListener('click', async () => {
                await handleLogout()
            })

            // ログアウト（モバイル）
            const logoutBtnMobile = document.getElementById('logoutBtnMobile')
            if (logoutBtnMobile) {
                logoutBtnMobile.addEventListener('click', async () => {
                    await handleLogout()
                })
            }

            // モバイルメニュー切り替え
            const mobileMenuBtn = document.getElementById('mobileMenuBtn')
            const mobileMenu = document.getElementById('mobileMenu')
            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden')
                })
            }

            // ページロード時：ユーザー役割を取得してlocalStorageに保存
            async function initializeDashboard() {
                try {
                    const token = localStorage.getItem('authToken')
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    // プロフィールAPIから役割を取得
                    const response = await axios.get('/api/profile', {
                        headers: { Authorization: 'Bearer ' + token }
                    })

                    if (response.data.success && response.data.user && response.data.user.role) {
                        // ユーザーの役割をlocalStorageに保存
                        localStorage.setItem('userRole', response.data.user.role)
                    }
                } catch (error) {
                    console.error('Initialize dashboard error:', error)
                }

                // 承認待ちメンバーを読み込み
                loadPendingMembers()
            }

            initializeDashboard()
        </script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// テナント公開ページ（Phase 3）
// --------------------------------------------
app.route('/tenant', tenantPublic)

// --------------------------------------------
// ヘルスチェック
// --------------------------------------------

// ============================================
// /join リダイレクト（レガシー対応）
// ============================================
app.get('/join', (c) => {
  const subdomain = c.req.query('subdomain')
  if (subdomain) {
    return c.redirect(`/tenant/register?subdomain=${subdomain}`)
  }
  return c.redirect('/register')
})

// Favicon handler
app.get('/favicon.ico', (c) => {
  // Return a simple 1x1 transparent PNG as favicon
  const transparentPNG = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ])
  
  return new Response(transparentPNG, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400'
    }
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
