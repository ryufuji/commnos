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
import passwordReset from './routes/password-reset' // パスワードリセット
import members from './routes/members'
import admin from './routes/admin'
import adminPosts from './routes/admin-posts' // 管理者用投稿管理
import tenant from './routes/tenant'
import profile from './routes/profile' // Week 5-6
import posts from './routes/posts' // Week 7-8
import stripe from './routes/stripe' // Week 9-10
import stripeWebhook from './routes/stripe-webhook' // Stripe Webhook Handler
import subscription from './routes/subscription' // サブスクリプション管理
import tenantPlans from './routes/tenant-plans' // テナント独自プラン管理
import platform from './routes/platform' // プラットフォーム管理（VALUE ARCHITECTS専用）
import { platformCoupons } from './routes/platform-coupons' // プラットフォーム管理 - クーポンページ
import upload from './routes/upload' // Phase 2 - 画像アップロード
import images from './routes/images' // Phase 2 - 画像取得
import tenantPublic from './routes/tenant-public' // Phase 3 - テナント公開ページ
import passwordResetPages from './routes/password-reset-pages' // パスワードリセットページ
import tenantAuth from './routes/tenant-auth' // Phase 2 - テナント会員認証
import memberPlans from './routes/member-plans' // 一般会員向けプラン管理
import likes from './routes/likes' // Phase 4 - いいね機能
import notifications from './routes/notifications' // Phase 5 - 通知機能
import chat from './routes/chat' // Phase 6 - チャット機能
import { coupons } from './routes/coupons' // クーポン管理
import postAccess from './routes/post-access' // 投稿アクセス制御管理
import surveys from './routes/surveys' // アンケート機能
import birthdayEmail from './routes/birthday-email' // 誕生日メール機能
import analytics from './routes/analytics' // 統計ダッシュボード
import points from './routes/points' // ポイントシステム
import shop from './routes/shop' // Phase 7 - ショップシステム

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
app.route('/api/auth', passwordReset) // パスワードリセット

// プロフィールルート（Week 5-6）
app.route('/api/profile', profile)

// 投稿ルート（Week 7-8）
app.route('/api/posts', posts)
app.route('/api/posts', postAccess) // 投稿アクセス制御管理

// Stripe決済ルート（Week 9-10）
app.route('/api/stripe', stripe)
app.route('/api/stripe', stripeWebhook) // Stripe Webhook Handler

// サブスクリプション管理ルート
app.route('/api/subscription', subscription)

// テナントプラン管理ルート（マーケットプレイス）
app.route('/api/tenant-plans', tenantPlans)

// プラットフォーム管理ルート（VALUE ARCHITECTS専用）
app.route('/api/platform', platform)

// クーポン管理ルート
app.route('/api/coupon', coupons)  // Changed to /api/coupon for frontend compatibility

// 会員管理ルート
app.route('/api/members', members)

// 管理者ルート
app.route('/api/admin', admin)

// 管理者用投稿管理ルート
app.route('/api/admin/posts', adminPosts)

// 画像アップロードルート（Phase 2）
app.route('/api/upload', upload)

// 画像取得ルート（Phase 2）
app.route('/api/images', images)

// テナント会員認証ルート（Phase 2）
app.route('/api/tenant', tenantAuth)
app.route('/api/tenant/member', memberPlans) // 一般会員向けプラン管理

// いいねルート（Phase 4）
app.route('/api/likes', likes)

// 通知ルート（Phase 5）
app.route('/api/notifications', notifications)

// チャットルート（Phase 6）
app.route('/api/chat', chat)

// アンケートルート
app.route('/api/surveys', surveys)
app.route('/api/birthday-email', birthdayEmail)

// 統計ダッシュボードルート
app.route('/api/analytics', analytics)

// ポイントシステムルート
app.route('/api/points', points)

// ショップシステムルート（Phase 7）
app.route('/api/shop', shop)

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
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Commons - あなたのコミュニティプラットフォーム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-gray-50 to-gray-100">
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
                    </div>
                </div>

                <!-- 特徴 -->
                <div class="grid md:grid-cols-3 gap-8 mt-20">
                    <div class="card-hover p-8 text-center">
                        <div class="text-5xl mb-4"><i class="fas fa-bolt text-accent-500"></i></div>
                        <h3 class="text-xl font-bold mb-3 text-gray-900">5分で開設</h3>
                        <p class="text-secondary-600">技術知識不要。サブドメイン選択だけで即座に開設。</p>
                    </div>
                    <div class="card-hover p-8 text-center">
                        <div class="text-5xl mb-4"><i class="fas fa-yen-sign text-success-500"></i></div>
                        <h3 class="text-xl font-bold mb-3 text-gray-900">低コスト</h3>
                        <p class="text-secondary-600">月額980円から。無料プランもあります。</p>
                    </div>
                    <div class="card-hover p-8 text-center">
                        <div class="text-5xl mb-4"><i class="fas fa-palette text-primary-500"></i></div>
                        <h3 class="text-xl font-bold mb-3 text-gray-900">美しいデザイン</h3>
                        <p class="text-secondary-600">モダンで統一されたデザイン。プロフェッショナルな印象。</p>
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
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>コミュニティ一覧 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50 min-h-screen">
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
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>新規登録 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-primary-50 via-white to-secondary-50">
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
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>料金プラン - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-primary-50 via-white to-secondary-50">
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
                    <p class="text-lg text-secondary-600 mb-6">
                        いつでもプランの変更が可能です
                    </p>
                    
                    <!-- 月払い/年払い切り替え -->
                    <div class="flex items-center justify-center gap-3 mt-6">
                        <span id="monthlyLabel" class="text-lg font-semibold text-primary-600">月払い</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="billingToggle" class="sr-only peer">
                            <div class="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                        <span id="yearlyLabel" class="text-lg font-semibold text-gray-500">年払い<span class="ml-2 text-sm text-success-600 font-bold">2ヶ月分お得</span></span>
                    </div>
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
                                <span class="text-5xl font-bold text-primary-600 plan-price" data-monthly="980" data-yearly="9800">¥980</span>
                                <span class="text-secondary-600 ml-2 plan-interval">/月</span>
                            </div>
                            <p class="text-secondary-600 mt-2 plan-description" data-monthly="中小規模コミュニティ向け" data-yearly="年間¥11,760 → ¥9,800（2ヶ月分お得）">中小規模コミュニティ向け</p>
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
                                <span class="text-5xl font-bold text-primary-600 plan-price" data-monthly="4980" data-yearly="49800">¥4,980</span>
                                <span class="text-secondary-600 ml-2 plan-interval">/月</span>
                            </div>
                            <p class="text-secondary-600 mt-2 plan-description" data-monthly="大規模コミュニティ向け" data-yearly="年間¥59,760 → ¥49,800（2ヶ月分お得）">大規模コミュニティ向け</p>
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
            // 月払い/年払い切り替え処理
            let currentInterval = 'month'; // デフォルトは月払い
            
            document.addEventListener('DOMContentLoaded', function() {
                const toggle = document.getElementById('billingToggle');
                const monthlyLabel = document.getElementById('monthlyLabel');
                const yearlyLabel = document.getElementById('yearlyLabel');
                const priceElements = document.querySelectorAll('.plan-price');
                const intervalElements = document.querySelectorAll('.plan-interval');
                const descriptionElements = document.querySelectorAll('.plan-description');
                
                if (toggle) {
                    toggle.addEventListener('change', function() {
                        currentInterval = this.checked ? 'year' : 'month';
                        
                        // ラベルのスタイル切り替え
                        if (this.checked) {
                            monthlyLabel.classList.remove('text-primary-600');
                            monthlyLabel.classList.add('text-gray-500');
                            yearlyLabel.classList.remove('text-gray-500');
                            yearlyLabel.classList.add('text-primary-600');
                        } else {
                            monthlyLabel.classList.remove('text-gray-500');
                            monthlyLabel.classList.add('text-primary-600');
                            yearlyLabel.classList.remove('text-primary-600');
                            yearlyLabel.classList.add('text-gray-500');
                        }
                        
                        // 価格表示の切り替え
                        priceElements.forEach(el => {
                            const price = this.checked ? el.getAttribute('data-yearly') : el.getAttribute('data-monthly');
                            el.textContent = '¥' + parseInt(price).toLocaleString();
                        });
                        
                        // 期間表示の切り替え
                        intervalElements.forEach(el => {
                            el.textContent = this.checked ? '/年' : '/月';
                        });
                        
                        // 説明文の切り替え
                        descriptionElements.forEach(el => {
                            const desc = this.checked ? el.getAttribute('data-yearly') : el.getAttribute('data-monthly');
                            el.textContent = desc;
                        });
                    });
                }
            });

            async function handleCheckout(plan) {
                try {
                    showLoading(event.target)
                    
                    const response = await fetch('/api/stripe/checkout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            plan: plan,
                            interval: currentInterval  // 選択された期間を送信
                        })
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
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>決済完了 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-success-50 via-white to-primary-50">
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
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>決済キャンセル - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-warning-50 via-white to-primary-50">
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
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>プロフィール - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <div class="min-h-screen py-8 px-4">
            <div class="max-w-2xl mx-auto">
                <!-- ヘッダー -->
                <div class="mb-8">
                    <a href="#" id="backLink" class="text-blue-600 hover:underline">
                        <i class="fas fa-arrow-left mr-2"></i>
                        <span id="backLinkText">ホームに戻る</span>
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
                            <p class="text-gray-700 whitespace-pre-line mb-3" id="displayBio"></p>
                            <div class="flex items-center text-sm text-gray-600">
                                <i class="fas fa-birthday-cake mr-2 text-primary-500"></i>
                                <span id="displayBirthday">未設定</span>
                            </div>
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

                        <!-- メールアドレス -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-envelope mr-1 text-primary-500"></i>
                                メールアドレス
                            </label>
                            <input type="email" id="inputEmail" required
                                   class="input-field"
                                   placeholder="your@example.com">
                            <p class="text-xs text-gray-500 mt-1">
                                ログイン時に使用するメールアドレスです
                            </p>
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

                        <!-- 誕生日 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-birthday-cake mr-1 text-primary-500"></i>
                                誕生日
                            </label>
                            <input type="date" id="inputBirthday"
                                   class="input-field"
                                   placeholder="誕生日を選択">
                            <p class="text-xs text-gray-500 mt-1">
                                誕生日を設定すると、誕生日にお祝いメッセージが届きます
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

            // URLパラメータからsubdomainを取得してlocalStorageに保存
            const urlParams = new URLSearchParams(window.location.search)
            const urlSubdomain = urlParams.get('subdomain')
            if (urlSubdomain) {
                const membership = JSON.parse(localStorage.getItem('membership') || '{}')
                membership.subdomain = urlSubdomain
                localStorage.setItem('membership', JSON.stringify(membership))
                console.log('[Profile] Saved subdomain to localStorage:', urlSubdomain)
            }

            // ページロード時にプロフィール取得
            async function loadProfile() {
                const token = getToken()
                const user = JSON.parse(localStorage.getItem('user') || '{}')
                
                if (!token || !user.id) {
                    showToast('ログインしてください', 'error')
                    
                    // テナント情報からサブドメインを取得してログインページにリダイレクト
                    const membership = JSON.parse(localStorage.getItem('membership') || '{}')
                    const subdomain = membership.subdomain || user.tenantId || 'test'
                    
                    setTimeout(() => {
                        window.location.href = '/login?subdomain=' + subdomain
                    }, 1500)
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
                    console.error('Profile load error:', error)
                    showToast('プロフィールの取得に失敗しました', 'error')
                }
            }

            // プロフィール表示
            function displayProfile(user) {
                document.getElementById('displayNickname').textContent = user.nickname
                document.getElementById('displayEmail').textContent = user.email
                document.getElementById('displayBio').textContent = user.bio || '自己紹介が未設定です'

                // 誕生日表示
                const displayBirthday = document.getElementById('displayBirthday')
                if (displayBirthday) {
                    if (user.birthday) {
                        const birthday = new Date(user.birthday)
                        displayBirthday.textContent = birthday.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                    } else {
                        displayBirthday.textContent = '未設定'
                    }
                }

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
                document.getElementById('inputEmail').value = currentProfile.email
                document.getElementById('inputBio').value = currentProfile.bio || ''
                document.getElementById('inputBirthday').value = currentProfile.birthday || ''
                
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
                        email: document.getElementById('inputEmail').value,
                        bio: document.getElementById('inputBio').value,
                        birthday: document.getElementById('inputBirthday').value || null
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
                        
                        // localStorageのユーザー情報も更新
                        const user = JSON.parse(localStorage.getItem('user') || '{}')
                        user.nickname = response.user.nickname
                        user.email = response.user.email
                        user.bio = response.user.bio
                        user.birthday = response.user.birthday
                        user.avatar_url = response.user.avatar_url
                        localStorage.setItem('user', JSON.stringify(user))
                        
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

            // 戻るリンクの設定
            function setupBackLink() {
                const user = JSON.parse(localStorage.getItem('user') || '{}')
                const membership = JSON.parse(localStorage.getItem('membership') || '{}')
                const userRole = user.role || membership.role
                
                console.log('[Profile] setupBackLink user:', user)
                console.log('[Profile] setupBackLink membership:', membership)
                console.log('[Profile] setupBackLink userRole:', userRole)
                
                const backLink = document.getElementById('backLink')
                const backLinkText = document.getElementById('backLinkText')
                
                if (!backLink || !backLinkText) {
                    console.error('[Profile] Back link elements not found')
                    return
                }
                
                if (userRole === 'owner' || userRole === 'admin') {
                    backLink.href = '/dashboard'
                    backLinkText.textContent = 'ダッシュボードに戻る'
                    console.log('[Profile] Admin back link set to:', backLink.href)
                } else {
                    // Try multiple sources for subdomain
                    let subdomain = membership.subdomain 
                                 || membership.tenant_subdomain 
                                 || user.tenant_subdomain
                                 || 'test'
                    
                    // If still no subdomain, try to get from current URL
                    if (subdomain === 'test') {
                        const urlParams = new URLSearchParams(window.location.search)
                        const urlSubdomain = urlParams.get('subdomain')
                        if (urlSubdomain) {
                            subdomain = urlSubdomain
                        }
                    }
                    
                    console.log('[Profile] Using subdomain:', subdomain)
                    backLink.href = '/tenant/home?subdomain=' + subdomain
                    backLinkText.textContent = 'ホームに戻る'
                    console.log('[Profile] Member back link set to:', backLink.href)
                }
            }

            // ページロード時
            loadProfile()
            setupBackLink()
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
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ダッシュボード - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
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
                        <div class="hidden md:flex gap-4 items-center">
                            <a href="/dashboard" class="text-gray-700 hover:text-primary transition">
                                <i class="fas fa-home mr-2"></i>
                                ダッシュボード
                            </a>
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
                        <a href="/dashboard" class="block btn-ghost text-center">
                            <i class="fas fa-home mr-2"></i>
                            ダッシュボード
                        </a>
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

                <!-- 支払いアラート -->
                <div id="paymentAlerts" class="mb-8"></div>

                <!-- 統計カード -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                    <div class="card p-6 border-l-4 border-l-primary-500">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-3xl text-primary-500">
                                <i class="fas fa-users"></i>
                            </div>
                            <span id="pendingBadge" class="badge badge-primary hidden">New</span>
                        </div>
                        <h3 id="memberCount" class="text-2xl font-bold text-gray-900 mb-1">--</h3>
                        <p class="text-secondary-600">メンバー数</p>
                    </div>

                    <div class="card p-6 border-l-4 border-l-success-500">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-3xl text-success-500">
                                <i class="fas fa-file-alt"></i>
                            </div>
                        </div>
                        <h3 id="postCount" class="text-2xl font-bold text-gray-900 mb-1">--</h3>
                        <p class="text-secondary-600">投稿数</p>
                    </div>

                    <div class="card p-6 border-l-4 border-l-accent-500">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-3xl text-accent-500">
                                <i class="fas fa-comments"></i>
                            </div>
                        </div>
                        <h3 id="commentCount" class="text-2xl font-bold text-gray-900 mb-1">--</h3>
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

                        <a href="/posts-admin" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-success-500">
                                <i class="fas fa-tasks"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">投稿管理</h3>
                            <p class="text-sm text-secondary-600">投稿の作成・編集・削除</p>
                        </a>

                        <a href="/surveys" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-accent-500">
                                <i class="fas fa-poll"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">アンケート管理</h3>
                            <p class="text-sm text-secondary-600">入会・退会時のアンケート設定</p>
                        </a>

                        <a href="/analytics" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-purple-500">
                                <i class="fas fa-chart-bar"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">統計ダッシュボード</h3>
                            <p class="text-sm text-secondary-600">会員・投稿・アンケート分析</p>
                        </a>

                        <a href="/birthday-email-settings" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-pink-500">
                                <i class="fas fa-birthday-cake"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">誕生日メール設定</h3>
                            <p class="text-sm text-secondary-600">誕生日メッセージの内容を設定</p>
                        </a>

                        <a href="/points-management" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-yellow-500">
                                <i class="fas fa-coins"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">ポイント管理</h3>
                            <p class="text-sm text-secondary-600">ポイントルール・報酬・交換申請を管理</p>
                        </a>

                        <a href="/shop-settings" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-purple-500">
                                <i class="fas fa-store"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">ショップ設定</h3>
                            <p class="text-sm text-secondary-600">特定商取引法・商品管理・注文管理</p>
                        </a>

                        <a href="/profile" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-info-500">
                                <i class="fas fa-user-edit"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">プロフィール編集</h3>
                            <p class="text-sm text-secondary-600">プロフィールを更新</p>
                        </a>
                        
                        <button onclick="openPrivacyModal()" class="card-interactive p-6 text-center">
                            <div class="text-4xl mb-3 text-info-500">
                                <i class="fas fa-eye"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">公開設定</h3>
                            <p class="text-sm text-secondary-600">表示設定を変更</p>
                        </button>
                        
                        <a id="subscriptionLink" href="#" class="card-interactive p-6 text-center hidden">
                            <div class="text-4xl mb-3 text-purple-500">
                                <i class="fas fa-tags"></i>
                            </div>
                            <h3 class="font-bold text-gray-900 mb-2">プラン管理</h3>
                            <p class="text-sm text-secondary-600">メンバー向けプランを作成・編集</p>
                        </a>
                    </div>
                </div>
            </main>
            
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
                
                console.log('[Dashboard] User data:', user)
                console.log('[Dashboard] Membership data:', membership)
                
                // user.role を優先的にチェック、なければ membership.role をチェック
                const userRole = user.role || membership.role
                
                console.log('[Dashboard] Determined user role:', userRole)
                console.log('[Dashboard] user.role:', user.role)
                console.log('[Dashboard] membership.role:', membership.role)
                
                // 一般メンバーはテナントホームにリダイレクト
                if (userRole !== 'admin' && userRole !== 'owner') {
                    console.log('[Dashboard] User is not admin/owner, redirecting to tenant home')
                    const subdomain = membership.subdomain || user.tenantId || 'test'
                    window.location.href = \`/tenant/home?subdomain=\${subdomain}\`
                    return
                }
                
                console.log('[Dashboard] User is admin/owner, showing dashboard')

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
                                <span class="status-active mt-2">\${userRole || 'member'}</span>
                            </div>
                        </div>
                    </div>
                \`

                // オーナーのみサブスクリプション管理リンクを表示
                console.log('[Dashboard] Checking subscription link visibility for role:', userRole)
                if (userRole === 'owner') {
                    console.log('[Dashboard] User is owner, showing subscription link')
                    const subscriptionLink = document.getElementById('subscriptionLink')
                    const subdomain = membership.subdomain || user.tenantId || 'test'
                    console.log('[Dashboard] Subscription subdomain:', subdomain)
                    console.log('[Dashboard] Subscription link element:', subscriptionLink)
                    if (subscriptionLink) {
                        // オーナーはプラン管理ページへ遷移
                        subscriptionLink.href = \`/tenant/plans?subdomain=\${subdomain}\`
                        subscriptionLink.classList.remove('hidden')
                        console.log('[Dashboard] Plan management link set to:', subscriptionLink.href)
                    } else {
                        console.error('[Dashboard] Subscription link element not found!')
                    }
                } else {
                    console.log('[Dashboard] User is not owner (role:', userRole, '), subscription link hidden')
                }

                // 統計データを取得（管理者のみ）
                console.log('User role:', userRole)
                if (userRole === 'admin' || userRole === 'owner') {
                    console.log('User is admin/owner, fetching stats...')
                    try {
                        const token = localStorage.getItem('token')
                        const response = await fetch('/api/admin/dashboard/stats', {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                        
                        console.log('Stats API response status:', response.status)
                        
                        if (response.ok) {
                            const data = await response.json()
                            console.log('Stats data:', data)
                            if (data.success) {
                                document.getElementById('memberCount').textContent = data.stats.memberCount
                                document.getElementById('postCount').textContent = data.stats.postCount
                                document.getElementById('commentCount').textContent = data.stats.commentCount
                                
                                // 承認待ちメンバーがいる場合はバッジを表示
                                if (data.stats.pendingCount > 0) {
                                    document.getElementById('pendingBadge').classList.remove('hidden')
                                }
                            }
                        } else {
                            console.error('Stats API error:', response.status, await response.text())
                        }
                    } catch (error) {
                        console.error('Failed to load stats:', error)
                    }

                    // 支払いアラートを取得（オーナーと管理者のみ）
                    try {
                        const token = localStorage.getItem('token')
                        const alertsResponse = await fetch('/api/admin/payment-alerts', {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                        
                        if (alertsResponse.ok) {
                            const alertsData = await alertsResponse.json()
                            if (alertsData.success && alertsData.alerts.length > 0) {
                                displayPaymentAlerts(alertsData.alerts)
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load payment alerts:', error)
                    }
                } else {
                    console.log('User is not admin/owner, skipping stats fetch')
                }
            }

            function displayPaymentAlerts(alerts) {
                const alertsContainer = document.getElementById('paymentAlerts')
                let alertsHtml = \`
                    <div class="card p-6 bg-error-50 border-error-200">
                        <div class="flex items-start mb-4">
                            <i class="fas fa-exclamation-triangle text-error-500 text-2xl mr-3 mt-1"></i>
                            <div>
                                <h3 class="font-bold text-error-900 text-lg mb-2">
                                    支払い失敗アラート (\${alerts.length}件)
                                </h3>
                                <p class="text-sm text-error-700 mb-4">
                                    以下の会員のサブスクリプション決済が失敗しています。
                                </p>
                                <div class="space-y-3">
                \`
                
                alerts.forEach(alert => {
                    const amount = (alert.amount / 100).toLocaleString('ja-JP')
                    const failedDate = new Date(alert.created_at).toLocaleDateString('ja-JP')
                    alertsHtml += \`
                        <div class="bg-white p-4 rounded-lg border border-error-200">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-semibold text-gray-900">\${alert.user_nickname}</span>
                                <span class="text-sm text-error-600 font-semibold">¥\${amount}</span>
                            </div>
                            <div class="flex items-center justify-between text-sm text-gray-600">
                                <span>\${alert.user_email}</span>
                                <span>失敗日: \${failedDate}</span>
                            </div>
                            \${alert.reminder_count > 0 ? \`
                                <div class="mt-2 text-xs text-gray-500">
                                    <i class="fas fa-bell mr-1"></i>
                                    リマインダー送信済み: \${alert.reminder_count}回
                                </div>
                            \` : ''}
                        </div>
                    \`
                })
                
                alertsHtml += \`
                                </div>
                            </div>
                        </div>
                    </div>
                \`
                
                alertsContainer.innerHTML = alertsHtml
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

            // Get tenant URL with subdomain
            function getTenantUrl(path = '') {
              const membershipStr = localStorage.getItem('membership');
              if (!membershipStr) {
                console.warn('No membership found, using fallback URL');
                return '/tenant' + path;  // Fallback
              }
              
              try {
                const membership = JSON.parse(membershipStr);
                const subdomain = membership.subdomain || membership.tenant?.subdomain;
                
                if (!subdomain) {
                  console.warn('No subdomain found in membership, using fallback URL');
                  return '/tenant' + path;  // Fallback
                }
                
                console.log('Building tenant URL with subdomain:', subdomain, 'path:', path);
                
                // Always use query parameter for now
                // TODO: Switch to subdomain-based routing when DNS is configured
                return \`/tenant\${path}?subdomain=\${subdomain}\`;
              } catch (e) {
                console.error('Failed to parse membership:', e);
                return '/tenant' + path;
              }
            }

            // 認証チェック
            function checkAuth() {
              const token = localStorage.getItem('token');
              const user = localStorage.getItem('user');
              
              if (!token || !user) {
                console.error('Not authenticated, redirecting to login...');
                showToast('ログインしてください', 'error');
                
                // Get subdomain from URL or membership
                const urlParams = new URLSearchParams(window.location.search);
                const subdomain = urlParams.get('subdomain');
                
                if (subdomain) {
                  window.location.href = '/login?subdomain=' + subdomain;
                } else {
                  // Try to get subdomain from membership
                  const membershipStr = localStorage.getItem('membership');
                  if (membershipStr) {
                    try {
                      const membership = JSON.parse(membershipStr);
                      const subdomainFromMembership = membership.subdomain || membership.tenant?.subdomain;
                      if (subdomainFromMembership) {
                        window.location.href = '/login?subdomain=' + subdomainFromMembership;
                        return false;
                      }
                    } catch (e) {
                      console.error('Failed to parse membership:', e);
                    }
                  }
                  // Fallback: redirect to home
                  window.location.href = '/';
                }
                return false;
              }
              
              // Check user role
              try {
                const userData = JSON.parse(user);
                if (userData.role !== 'owner' && userData.role !== 'admin') {
                  console.error('Not authorized: user role is', userData.role);
                  showToast('管理者のみアクセス可能です', 'error');
                  
                  // Redirect to tenant home
                  const membershipStr = localStorage.getItem('membership');
                  if (membershipStr) {
                    try {
                      const membership = JSON.parse(membershipStr);
                      const subdomain = membership.subdomain || membership.tenant?.subdomain;
                      if (subdomain) {
                        setTimeout(function() {
                          window.location.href = '/tenant/home?subdomain=' + subdomain;
                        }, 1500);
                        return false;
                      }
                    } catch (e) {
                      console.error('Failed to parse membership:', e);
                    }
                  }
                  window.location.href = '/';
                  return false;
                }
              } catch (e) {
                console.error('Failed to parse user data:', e);
                window.location.href = '/';
                return false;
              }
              
              return true;
            }

            // Navigate to tenant post creation page
            // ページロード時
            if (checkAuth()) {
              loadDashboard();
            }
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
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>会員管理 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
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
                                    \${member.status === 'active' ? '<span class="badge bg-green-100 text-green-700">アクティブ</span>' : ''}
                                    \${member.status === 'suspended' ? '<span class="badge bg-orange-100 text-orange-700">停止中</span>' : ''}
                                    \${member.status === 'withdrawn' ? '<span class="badge bg-gray-100 text-gray-700">退会済み</span>' : ''}
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
                    const token = getToken()
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
// 投稿管理ページ（管理者専用）
// --------------------------------------------

app.get('/posts-admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-src 'self';">
        <title>投稿管理 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <!-- ヘッダー -->
        <header class="bg-white shadow-sm sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <h1 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-tasks mr-2 text-blue-600"></i>
                        投稿管理
                    </h1>
                    <div class="flex gap-2">
                        <button onclick="window.goToTenantPostNew(event)" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                            <i class="fas fa-plus mr-2"></i>投稿作成
                        </button>
                        <a href="/dashboard" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                            <i class="fas fa-arrow-left mr-2"></i>ダッシュボード
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <!-- メインコンテンツ -->
        <main class="container mx-auto px-4 py-8">
            <!-- フィルター -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <div class="flex flex-wrap gap-4 items-center">
                    <div>
                        <label class="text-sm font-medium text-gray-700 mb-2 block">ステータスで絞り込み</label>
                        <select id="statusFilter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="all">すべて</option>
                            <option value="published">公開済み</option>
                            <option value="scheduled">予約投稿</option>
                            <option value="draft">下書き</option>
                        </select>
                    </div>
                    <div class="ml-auto">
                        <span id="totalCount" class="text-sm text-gray-600 font-medium">-</span>
                    </div>
                </div>
            </div>

            <!-- 投稿一覧 -->
            <div id="postsList" class="space-y-4">
                <div class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">読み込み中...</p>
                </div>
            </div>

            <!-- ページネーション -->
            <div id="pagination" class="mt-8 flex justify-center gap-2"></div>
        </main>

        <!-- 編集モーダル -->
        <div id="editModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
                <div class="p-6 border-b border-gray-200 bg-white rounded-t-lg">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-900">
                            <i class="fas fa-edit mr-2 text-blue-600"></i>
                            投稿を編集
                        </h2>
                        <button onclick="closeEditModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <form id="editForm" class="p-6 space-y-6">
                    <input type="hidden" id="editPostId">
                    
                    <div>
                        <label for="editTitle" class="block text-sm font-medium text-gray-700 mb-2">
                            タイトル <span class="text-red-500">*</span>
                        </label>
                        <input type="text" id="editTitle" required maxlength="200"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>

                    <div>
                        <label for="editContent" class="block text-sm font-medium text-gray-700 mb-2">
                            本文 <span class="text-red-500">*</span>
                        </label>
                        <textarea id="editContent" required rows="12" maxlength="10000"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                    </div>

                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">公開ステータス</label>
                            <select id="editStatus" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="published">公開</option>
                                <option value="scheduled">予約投稿</option>
                                <option value="draft">下書き</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">公開範囲</label>
                            <select id="editVisibility" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="public">パブリック（誰でも閲覧可能）</option>
                                <option value="members_only">会員限定</option>
                            </select>
                        </div>
                    </div>

                    <!-- 予約投稿日時 -->
                    <div id="editScheduledDateTimeField" style="display: none;">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            公開日時 <span class="text-red-500">*</span>
                        </label>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label for="editScheduledDate" class="block text-sm text-gray-600 mb-1">日付</label>
                                <input 
                                    type="date" 
                                    id="editScheduledDate" 
                                    name="editScheduledDate"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                            </div>
                            <div>
                                <label for="editScheduledTime" class="block text-sm text-gray-600 mb-1">時刻</label>
                                <input 
                                    type="time" 
                                    id="editScheduledTime" 
                                    name="editScheduledTime"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                            </div>
                        </div>
                        <p class="text-sm text-gray-500 mt-2">
                            <i class="fas fa-info-circle mr-1"></i>
                            過去の日時は選択できません。指定した日時になると自動的に公開されます。
                        </p>
                    </div>

                    <!-- 現在のメディア情報 -->
                    <div id="mediaInfo" class="p-4 bg-gray-50 rounded-lg"></div>

                    <!-- 画像アップロード -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            サムネイル画像
                        </label>
                        <div class="flex items-center gap-4">
                            <button type="button" id="editSelectThumbnailBtn"
                                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                                <i class="fas fa-image mr-2"></i>画像を選択
                            </button>
                            <input type="file" id="editThumbnail" accept="image/*" class="hidden">
                            <button type="button" id="editRemoveThumbnailBtn" class="hidden px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition">
                                <i class="fas fa-trash mr-2"></i>画像を削除
                            </button>
                        </div>
                        <div id="editThumbnailPreview" class="hidden mt-4">
                            <img id="editThumbnailImg" src="" alt="サムネイル" class="max-w-full h-auto max-h-64 rounded-lg">
                        </div>
                    </div>

                    <!-- 動画アップロード -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            動画
                        </label>
                        <div class="flex items-center gap-4">
                            <button type="button" id="editSelectVideoBtn"
                                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                                <i class="fas fa-video mr-2"></i>動画を選択
                            </button>
                            <input type="file" id="editVideo" accept="video/*" class="hidden">
                            <button type="button" id="editRemoveVideoBtn" class="hidden px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition">
                                <i class="fas fa-trash mr-2"></i>動画を削除
                            </button>
                        </div>
                        <div id="editVideoPreview" class="hidden mt-4">
                            <video id="editVideoPlayer" controls class="max-w-full h-auto max-h-64 rounded-lg"></video>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">最大100MB、MP4/WebM/OGG形式</p>
                    </div>

                    <div class="flex gap-4 pt-4">
                        <button type="submit" id="saveBtn"
                            class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                            <i class="fas fa-save mr-2"></i>更新する
                        </button>
                        <button type="button" onclick="closeEditModal()"
                            class="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
                            キャンセル
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- プレビューモーダル -->
        <div id="previewModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                    <div class="flex items-center justify-between">
                        <h2 class="text-2xl font-bold text-gray-900">
                            <i class="fas fa-eye mr-2 text-green-600"></i>
                            投稿プレビュー
                        </h2>
                        <button onclick="closePreviewModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <div id="previewContent" class="p-8">
                    <!-- プレビュー内容がここに表示されます -->
                </div>
            </div>
        </div>

        <!-- 画像拡大モーダル -->
        <div id="imageModal" class="hidden fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onclick="closeImageModal()">
            <div class="relative max-w-7xl max-h-[95vh] w-full h-full flex items-center justify-center">
                <button onclick="closeImageModal()" class="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
                    <i class="fas fa-times text-3xl"></i>
                </button>
                <img id="modalImage" src="" alt="拡大表示" class="max-w-full max-h-full object-contain" onclick="event.stopPropagation()">
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <script src="/static/app.js"></script>
        <script src="/static/posts-admin.js"></script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// テナント公開ページ（Phase 3）
// --------------------------------------------
app.route('/tenant', tenantPublic)
app.route('/', tenantPublic) // ルートパスにもマウント（/login, /register等）

// --------------------------------------------
// プラットフォーム管理ページ
// --------------------------------------------
app.route('/platform', platformCoupons)

// --------------------------------------------
// パスワードリセットページ
// --------------------------------------------
app.route('/', passwordResetPages)

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

// ============================================
// プラットフォーム管理者ログインページ
// ============================================
app.get('/va-admin-portal/login', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platform Admin Login - VALUE ARCHITECTS</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-indigo-600 to-purple-700 min-h-screen flex items-center justify-center">
    <div class="w-full max-w-md px-4">
        <div class="bg-white rounded-lg shadow-2xl p-8">
            <!-- ヘッダー -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full mb-4">
                    <i class="fas fa-shield-alt text-white text-2xl"></i>
                </div>
                <h1 class="text-2xl font-bold text-gray-900">Platform Admin</h1>
                <p class="text-sm text-gray-600 mt-2">VALUE ARCHITECTS</p>
            </div>

            <!-- ログインフォーム -->
            <form id="loginForm" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                    </label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i class="fas fa-envelope text-gray-400"></i>
                        </div>
                        <input type="email" id="email" required
                            class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="admin@valuearchitects.jp">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Password
                    </label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i class="fas fa-lock text-gray-400"></i>
                        </div>
                        <input type="password" id="password" required
                            class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="••••••••">
                    </div>
                </div>

                <button type="submit" 
                    class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl">
                    <i class="fas fa-sign-in-alt mr-2"></i>
                    Login
                </button>
            </form>

            <!-- エラーメッセージ -->
            <div id="errorMessage" class="hidden mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-sm text-red-800"></p>
            </div>
        </div>

        <!-- フッター -->
        <p class="text-center text-white text-sm mt-8 opacity-80">
            © 2026 VALUE ARCHITECTS. All rights reserved.
        </p>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault()

            const email = document.getElementById('email').value
            const password = document.getElementById('password').value
            const errorDiv = document.getElementById('errorMessage')
            const errorText = errorDiv.querySelector('p')

            // エラーメッセージをクリア
            errorDiv.classList.add('hidden')

            try {
                const response = await axios.post('/api/platform/auth/login', {
                    email,
                    password
                })

                if (response.data.success) {
                    // トークンを保存
                    localStorage.setItem('token', response.data.token)
                    localStorage.setItem('platformAdmin', JSON.stringify(response.data.admin))

                    // ダッシュボードへリダイレクト
                    window.location.href = '/va-admin-portal'
                } else {
                    throw new Error(response.data.error || 'Login failed')
                }
            } catch (error) {
                console.error('Login error:', error)
                errorText.textContent = error.response?.data?.error || 'Invalid credentials. Please try again.'
                errorDiv.classList.remove('hidden')
            }
        })

        // すでにログイン済みの場合はリダイレクト
        const token = localStorage.getItem('token')
        if (token) {
            window.location.href = '/va-admin-portal'
        }
    </script>
</body>
</html>
  `)
})

// ============================================
// プラットフォーム管理画面（VALUE ARCHITECTS専用）
// セキュリティ: 予測困難なURLパス
// ============================================
app.get('/va-admin-portal', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platform Admin - VALUE ARCHITECTS</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div class="min-h-screen">
        <!-- ヘッダー -->
        <header class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-6">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-shield-alt mr-2"></i>
                        Platform Admin - VALUE ARCHITECTS
                    </h1>
                    <button id="logoutBtn" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded">
                        <i class="fas fa-sign-out-alt mr-2"></i>Logout
                    </button>
                </div>
            </div>
        </header>

        <!-- タブナビゲーション -->
        <div class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4">
                <nav class="flex space-x-8">
                    <button onclick="switchTab('dashboard')" id="tab-dashboard" class="tab-active py-4 px-1 border-b-2 font-medium text-sm">
                        <i class="fas fa-chart-line mr-2"></i>ダッシュボード
                    </button>
                    <button onclick="switchTab('tenants')" id="tab-tenants" class="tab-inactive py-4 px-1 border-b-2 font-medium text-sm">
                        <i class="fas fa-building mr-2"></i>テナント管理
                    </button>
                    <button onclick="switchTab('media')" id="tab-media" class="tab-inactive py-4 px-1 border-b-2 font-medium text-sm">
                        <i class="fas fa-photo-video mr-2"></i>メディア管理
                    </button>
                </nav>
            </div>
        </div>

        <!-- コンテンツ -->
        <main class="max-w-7xl mx-auto px-4 py-8">
            <!-- ダッシュボード -->
            <div id="content-dashboard" class="tab-content">
                <div id="kpi-cards" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <!-- KPIカード（動的生成） -->
                </div>
                <div id="top-tenants" class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-xl font-bold mb-4">トップテナント（収益順）</h2>
                    <div id="top-tenants-list"></div>
                </div>
            </div>

            <!-- テナント管理 -->
            <div id="content-tenants" class="tab-content hidden">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold">テナント一覧</h2>
                        <div class="flex gap-3">
                            <input type="text" id="tenant-search" placeholder="検索..." 
                                class="px-4 py-2 border rounded">
                            <select id="tenant-status-filter" class="px-4 py-2 border rounded">
                                <option value="all">すべて</option>
                                <option value="active">有効</option>
                                <option value="suspended">停止中</option>
                            </select>
                        </div>
                    </div>
                    <div id="tenants-list"></div>
                    <div id="tenants-pagination" class="mt-6"></div>
                </div>
            </div>

            <!-- メディア管理 -->
            <div id="content-media" class="tab-content hidden">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold">メディアコンテンツ</h2>
                        <div class="flex gap-3">
                            <input type="text" id="media-search" placeholder="検索..." 
                                class="px-4 py-2 border rounded">
                            <select id="media-type-filter" class="px-4 py-2 border rounded">
                                <option value="">すべて</option>
                                <option value="image">画像のみ</option>
                                <option value="video">動画のみ</option>
                            </select>
                        </div>
                    </div>
                    <div id="media-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>
                    <div id="media-pagination" class="mt-6"></div>
                </div>
            </div>
        </main>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        let currentTab = 'dashboard'
        let kpiData = null
        let tenantsData = []
        let mediaData = []

        // タブ切り替え
        function switchTab(tab) {
            currentTab = tab
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'))
            document.querySelectorAll('[id^="tab-"]').forEach(el => {
                el.classList.remove('tab-active')
                el.classList.add('tab-inactive')
            })
            document.getElementById(\`content-\${tab}\`).classList.remove('hidden')
            document.getElementById(\`tab-\${tab}\`).classList.remove('tab-inactive')
            document.getElementById(\`tab-\${tab}\`).classList.add('tab-active')

            if (tab === 'dashboard') loadDashboard()
            else if (tab === 'tenants') loadTenants()
            else if (tab === 'media') loadMedia()
        }

        // ダッシュボード読み込み
        async function loadDashboard() {
            try {
                const token = localStorage.getItem('token')
                const response = await axios.get('/api/platform/dashboard', {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })

                if (response.data.success) {
                    kpiData = response.data.kpi
                    renderKPI()
                    renderTopTenants(response.data.top_tenants)
                }
            } catch (error) {
                handleError(error)
            }
        }

        // KPI表示
        function renderKPI() {
            if (!kpiData) return
            document.getElementById('kpi-cards').innerHTML = \`
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">総テナント数</p>
                            <p class="text-3xl font-bold text-indigo-600">\${kpiData.tenants.total}</p>
                            <p class="text-xs text-gray-500">有効: \${kpiData.tenants.active}</p>
                        </div>
                        <i class="fas fa-building text-4xl text-indigo-200"></i>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">総ユーザー数</p>
                            <p class="text-3xl font-bold text-green-600">\${kpiData.users.total}</p>
                            <p class="text-xs text-gray-500">今月: +\${kpiData.users.new_this_month}</p>
                        </div>
                        <i class="fas fa-users text-4xl text-green-200"></i>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">総投稿数</p>
                            <p class="text-3xl font-bold text-blue-600">\${kpiData.content.total_posts}</p>
                            <p class="text-xs text-gray-500">コメント: \${kpiData.content.total_comments}</p>
                        </div>
                        <i class="fas fa-file-alt text-4xl text-blue-200"></i>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">手数料収益</p>
                            <p class="text-3xl font-bold text-purple-600">¥\${(kpiData.revenue.platform_revenue || 0).toLocaleString()}</p>
                            <p class="text-xs text-gray-500">総収益: ¥\${(kpiData.revenue.total_earned || 0).toLocaleString()}</p>
                        </div>
                        <i class="fas fa-yen-sign text-4xl text-purple-200"></i>
                    </div>
                </div>
            \`
        }

        // トップテナント表示
        function renderTopTenants(tenants) {
            document.getElementById('top-tenants-list').innerHTML = tenants.map((t, i) => \`
                <div class="flex items-center justify-between py-3 border-b">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl font-bold text-gray-300">\${i + 1}</span>
                        <div>
                            <p class="font-bold">\${t.name}</p>
                            <p class="text-sm text-gray-500">\${t.subdomain}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-green-600">¥\${(t.total_earned || 0).toLocaleString()}</p>
                        <p class="text-sm text-gray-500">\${t.member_count}人</p>
                    </div>
                </div>
            \`).join('')
        }

        // テナント読み込み
        async function loadTenants(page = 1) {
            try {
                const token = localStorage.getItem('token')
                const status = document.getElementById('tenant-status-filter')?.value || 'all'
                const search = document.getElementById('tenant-search')?.value || ''
                
                const response = await axios.get('/api/platform/tenants', {
                    headers: { 'Authorization': \`Bearer \${token}\` },
                    params: { page, status, search }
                })

                if (response.data.success) {
                    tenantsData = response.data.tenants
                    renderTenants()
                    renderTenantsPagination(response.data.pagination)
                }
            } catch (error) {
                handleError(error)
            }
        }

        // テナント一覧表示
        function renderTenants() {
            document.getElementById('tenants-list').innerHTML = \`
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">テナント</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">オーナー</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">メンバー</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">収益</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        \${tenantsData.map(t => \`
                            <tr>
                                <td class="px-6 py-4">
                                    <div class="font-bold">\${t.name}</div>
                                    <div class="text-sm text-gray-500">\${t.subdomain}</div>
                                </td>
                                <td class="px-6 py-4 text-sm">\${t.owner_nickname || '-'}</td>
                                <td class="px-6 py-4 text-sm">\${t.member_count || 0}</td>
                                <td class="px-6 py-4 text-sm">¥\${(t.total_earned || 0).toLocaleString()}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 text-xs rounded \${t.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        \${t.status}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <button onclick="toggleTenantStatus(\${t.id}, '\${t.status}')" class="text-blue-600 hover:text-blue-800 text-sm">
                                        \${t.status === 'active' ? '停止' : '再開'}
                                    </button>
                                </td>
                            </tr>
                        \`).join('')}
                    </tbody>
                </table>
            \`
        }

        // テナントステータス切り替え
        async function toggleTenantStatus(tenantId, currentStatus) {
            const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
            if (!confirm(\`このテナントを\${newStatus === 'active' ? '再開' : '停止'}しますか？\`)) return

            try {
                const token = localStorage.getItem('token')
                await axios.patch(\`/api/platform/tenants/\${tenantId}/status\`, 
                    { status: newStatus },
                    { headers: { 'Authorization': \`Bearer \${token}\` } }
                )
                showToast(\`ステータスを\${newStatus}に変更しました\`, 'success')
                loadTenants()
            } catch (error) {
                handleError(error)
            }
        }

        // メディア読み込み
        async function loadMedia(page = 1) {
            try {
                const token = localStorage.getItem('token')
                const type = document.getElementById('media-type-filter')?.value || ''
                const search = document.getElementById('media-search')?.value || ''
                
                const response = await axios.get('/api/platform/media', {
                    headers: { 'Authorization': \`Bearer \${token}\` },
                    params: { page, type, search, per_page: 24 }
                })

                if (response.data.success) {
                    mediaData = response.data.media
                    renderMedia()
                    renderMediaPagination(response.data.pagination)
                }
            } catch (error) {
                handleError(error)
            }
        }

        // メディア一覧表示
        function renderMedia() {
            document.getElementById('media-grid').innerHTML = mediaData.map(m => \`
                <div class="relative group">
                    <img src="\${m.thumbnail_url || '/static/placeholder.png'}" 
                        class="w-full h-32 object-cover rounded cursor-pointer"
                        onclick="viewMedia(\${m.id})">
                    <div class="absolute top-2 right-2">
                        <button onclick="deleteMedia(\${m.id}, event)" 
                            class="bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                    <p class="text-xs text-gray-600 mt-1 truncate">\${m.title}</p>
                    <p class="text-xs text-gray-400">\${m.tenant_name}</p>
                </div>
            \`).join('')
        }

        // メディア削除
        async function deleteMedia(mediaId, event) {
            event.stopPropagation()
            if (!confirm('このメディアを削除しますか？')) return

            try {
                const token = localStorage.getItem('token')
                await axios.delete(\`/api/platform/media/\${mediaId}\`, {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })
                showToast('メディアを削除しました', 'success')
                loadMedia()
            } catch (error) {
                handleError(error)
            }
        }

        // ページネーション（省略版）
        function renderTenantsPagination(pagination) {
            // 実装省略
        }
        function renderMediaPagination(pagination) {
            // 実装省略
        }

        // エラーハンドリング
        function handleError(error) {
            console.error(error)
            if (error.response?.status === 403) {
                showToast('プラットフォーム管理者のみアクセス可能です', 'error')
                setTimeout(() => window.location.href = '/login', 1500)
            } else {
                showToast(error.response?.data?.error || 'エラーが発生しました', 'error')
            }
        }

        // ログアウト
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await handleLogout()
        })

        // 認証チェック
        const token = localStorage.getItem('token')
        const platformAdmin = localStorage.getItem('platformAdmin')
        
        if (!token || !platformAdmin) {
            window.location.href = '/va-admin-portal/login'
            return
        }

        // 初期化
        loadDashboard()
    </script>
</body>
</html>
  `)
})

// --------------------------------------------
// アンケート管理ページ（管理者専用）
// --------------------------------------------

app.get('/surveys', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>アンケート管理 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <!-- ヘッダー -->
        <header class="bg-white shadow-sm sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <h1 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-poll mr-2 text-accent-600"></i>
                        アンケート管理
                    </h1>
                    <div class="flex gap-2">
                        <a href="/dashboard" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                            <i class="fas fa-arrow-left mr-2"></i>ダッシュボード
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <!-- メインコンテンツ -->
        <main class="container mx-auto px-4 py-8">
            <!-- タブ -->
            <div class="flex gap-2 mb-6 border-b border-gray-200">
                <button id="joinTab" onclick="switchTab('join')" class="px-6 py-3 font-semibold text-primary-600 border-b-2 border-primary-600 transition">
                    入会時アンケート
                </button>
                <button id="leaveTab" onclick="switchTab('leave')" class="px-6 py-3 font-semibold text-gray-500 hover:text-gray-700 transition">
                    退会時アンケート
                </button>
            </div>

            <!-- 入会時アンケート -->
            <div id="joinContent" class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-gray-900">入会時アンケート</h2>
                    <button onclick="createSurvey('join')" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>新規作成
                    </button>
                </div>
                <div id="joinSurveyList" class="space-y-4">
                    <div class="text-center py-12">
                        <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-500">読み込み中...</p>
                    </div>
                </div>
            </div>

            <!-- 退会時アンケート -->
            <div id="leaveContent" class="space-y-6 hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-gray-900">退会時アンケート</h2>
                    <button onclick="createSurvey('leave')" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>新規作成
                    </button>
                </div>
                <div id="leaveSurveyList" class="space-y-4">
                    <div class="text-center py-12">
                        <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-500">読み込み中...</p>
                    </div>
                </div>
            </div>
        </main>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            let currentTab = 'join'
            let tenantId = null
            let membership = null

            // タブ切り替え
            function switchTab(tab) {
                currentTab = tab
                
                // タブのスタイル更新
                document.getElementById('joinTab').className = tab === 'join' 
                    ? 'px-6 py-3 font-semibold text-primary-600 border-b-2 border-primary-600 transition'
                    : 'px-6 py-3 font-semibold text-gray-500 hover:text-gray-700 transition'
                
                document.getElementById('leaveTab').className = tab === 'leave'
                    ? 'px-6 py-3 font-semibold text-primary-600 border-b-2 border-primary-600 transition'
                    : 'px-6 py-3 font-semibold text-gray-500 hover:text-gray-700 transition'
                
                // コンテンツの表示切り替え
                document.getElementById('joinContent').classList.toggle('hidden', tab !== 'join')
                document.getElementById('leaveContent').classList.toggle('hidden', tab !== 'leave')
                
                // データ再読み込み
                loadSurveys(tab)
            }

            // アンケート一覧取得
            async function loadSurveys(type) {
                try {
                    const container = document.getElementById(type + 'SurveyList')
                    container.innerHTML = '<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i><p class="text-gray-500">読み込み中...</p></div>'

                    const response = await axios.get('/api/surveys', {
                        params: { tenant_id: tenantId, type: type }
                    })

                    if (response.data.success && response.data.surveys.length > 0) {
                        renderSurveys(response.data.surveys, type)
                    } else {
                        container.innerHTML = \`
                            <div class="card p-12 text-center">
                                <i class="fas fa-poll text-6xl text-gray-300 mb-4"></i>
                                <h3 class="text-xl font-bold text-gray-700 mb-2">\${type === 'join' ? '入会時' : '退会時'}アンケートが未設定です</h3>
                                <p class="text-gray-500 mb-6">新規作成ボタンからアンケートを作成してください</p>
                                <button onclick="createSurvey('\${type}')" class="btn-primary">
                                    <i class="fas fa-plus mr-2"></i>今すぐ作成
                                </button>
                            </div>
                        \`
                    }
                } catch (error) {
                    console.error('Error loading surveys:', error)
                    showToast('アンケートの取得に失敗しました', 'error')
                }
            }

            // アンケート一覧レンダリング
            function renderSurveys(surveys, type) {
                const container = document.getElementById(type + 'SurveyList')
                container.innerHTML = surveys.map(survey => \`
                    <div class="card p-6">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <h3 class="text-xl font-bold text-gray-900">\${survey.title}</h3>
                                    <span class="badge \${survey.is_active ? 'badge-success' : 'badge-secondary'}">
                                        <i class="fas fa-\${survey.is_active ? 'check-circle' : 'pause-circle'} mr-1"></i>
                                        \${survey.is_active ? '有効' : '無効'}
                                    </span>
                                </div>
                                <p class="text-gray-600 mb-3">\${survey.description || '説明なし'}</p>
                                <div class="flex gap-4 text-sm text-gray-500">
                                    <span><i class="fas fa-question-circle mr-1"></i>質問数: \${survey.question_count || 0}問</span>
                                    <span><i class="fas fa-users mr-1"></i>回答数: \${survey.response_count || 0}件</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="editSurvey(\${survey.id})" class="btn-secondary">
                                <i class="fas fa-edit mr-1"></i>編集
                            </button>
                            <button onclick="viewResults(\${survey.id})" class="btn-secondary">
                                <i class="fas fa-chart-bar mr-1"></i>結果を見る
                            </button>
                            <button onclick="toggleSurvey(\${survey.id}, \${!survey.is_active})" class="btn-secondary">
                                <i class="fas fa-\${survey.is_active ? 'pause' : 'play'} mr-1"></i>
                                \${survey.is_active ? '無効化' : '有効化'}
                            </button>
                            <button onclick="deleteSurvey(\${survey.id})" class="btn-danger">
                                <i class="fas fa-trash mr-1"></i>削除
                            </button>
                        </div>
                    </div>
                \`).join('')
            }

            // アンケート作成
            function createSurvey(type) {
                window.location.href = \`/surveys/edit?type=\${type}\`
            }

            // アンケート編集
            function editSurvey(id) {
                window.location.href = \`/surveys/edit?id=\${id}\`
            }

            // 結果表示
            function viewResults(id) {
                window.location.href = \`/surveys/results?id=\${id}\`
            }

            // アンケート有効/無効切り替え
            async function toggleSurvey(id, isActive) {
                try {
                    const response = await axios.put(\`/api/surveys/\${id}\`, {
                        is_active: isActive
                    })

                    if (response.data.success) {
                        showToast(\`アンケートを\${isActive ? '有効' : '無効'}にしました\`, 'success')
                        loadSurveys(currentTab)
                    }
                } catch (error) {
                    console.error('Error toggling survey:', error)
                    showToast('更新に失敗しました', 'error')
                }
            }

            // アンケート削除
            async function deleteSurvey(id) {
                if (!confirm('このアンケートを削除してもよろしいですか？\\n回答データも削除されます。')) {
                    return
                }

                try {
                    const response = await axios.delete(\`/api/surveys/\${id}\`)

                    if (response.data.success) {
                        showToast('アンケートを削除しました', 'success')
                        loadSurveys(currentTab)
                    }
                } catch (error) {
                    console.error('Error deleting survey:', error)
                    showToast('削除に失敗しました', 'error')
                }
            }

            // 初期化
            document.addEventListener('DOMContentLoaded', async () => {
                // 認証チェック
                const token = getToken()
                if (!token) {
                    window.location.href = '/login'
                    return
                }

                // ユーザー情報とメンバーシップを取得
                const user = JSON.parse(localStorage.getItem('user') || '{}')
                membership = JSON.parse(localStorage.getItem('membership') || '{}')

                if (!membership.tenant_id) {
                    showToast('テナント情報が見つかりません', 'error')
                    setTimeout(() => window.location.href = '/dashboard', 2000)
                    return
                }

                tenantId = membership.tenant_id

                // 管理者権限チェック
                if (membership.role !== 'owner' && membership.role !== 'admin') {
                    showToast('アンケート管理は管理者のみアクセスできます', 'error')
                    setTimeout(() => window.location.href = '/dashboard', 2000)
                    return
                }

                // アンケート一覧読み込み
                loadSurveys('join')
            })
        </script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// アンケート作成・編集ページ
// --------------------------------------------

app.get('/surveys/edit', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>アンケート編集 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <!-- ヘッダー -->
        <header class="bg-white shadow-sm sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <h1 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-poll mr-2 text-accent-600"></i>
                        <span id="pageTitle">アンケート作成</span>
                    </h1>
                    <div class="flex gap-2">
                        <button onclick="saveSurvey()" class="btn-primary" id="saveBtn">
                            <i class="fas fa-save mr-2"></i>保存
                        </button>
                        <a href="/surveys" class="btn-secondary">
                            <i class="fas fa-times mr-2"></i>キャンセル
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <!-- メインコンテンツ -->
        <main class="container mx-auto px-4 py-8 max-w-4xl">
            <!-- 基本情報 -->
            <div class="card p-6 mb-6">
                <h2 class="text-xl font-bold text-gray-900 mb-4">
                    <i class="fas fa-info-circle mr-2 text-primary-600"></i>
                    基本情報
                </h2>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            タイトル <span class="text-red-500">*</span>
                        </label>
                        <input type="text" id="surveyTitle" class="input-field" placeholder="例: このコミュニティをどこで知りましたか？" required>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            説明文
                        </label>
                        <textarea id="surveyDescription" class="input-field" rows="3" placeholder="例: ご入会前に簡単なアンケートにご協力ください"></textarea>
                    </div>

                    <div>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="surveyActive" class="w-4 h-4 text-primary-600 rounded" checked>
                            <span class="text-sm font-medium text-gray-700">このアンケートを有効にする</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- 質問一覧 -->
            <div class="card p-6 mb-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold text-gray-900">
                        <i class="fas fa-list mr-2 text-primary-600"></i>
                        質問一覧
                    </h2>
                    <button onclick="openQuestionModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>質問を追加
                    </button>
                </div>

                <div id="questionsList" class="space-y-4">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-question-circle text-4xl mb-2"></i>
                        <p>質問が追加されていません</p>
                        <button onclick="openQuestionModal()" class="btn-secondary mt-4">
                            <i class="fas fa-plus mr-2"></i>最初の質問を追加
                        </button>
                    </div>
                </div>
            </div>
        </main>

        <!-- 質問追加/編集モーダル -->
        <div id="questionModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200 sticky top-0 bg-white">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-900">
                            <i class="fas fa-question-circle mr-2 text-primary-600"></i>
                            <span id="modalTitle">質問を追加</span>
                        </h2>
                        <button onclick="closeQuestionModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                <div class="p-6 space-y-6">
                    <!-- 質問タイプ -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-3">
                            質問タイプ <span class="text-red-500">*</span>
                        </label>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label class="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                <input type="radio" name="questionType" value="text" class="w-4 h-4 text-primary-600">
                                <span class="ml-3">
                                    <i class="fas fa-font mr-2 text-primary-600"></i>
                                    短文テキスト
                                </span>
                            </label>
                            <label class="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                <input type="radio" name="questionType" value="textarea" class="w-4 h-4 text-primary-600">
                                <span class="ml-3">
                                    <i class="fas fa-align-left mr-2 text-primary-600"></i>
                                    長文テキスト
                                </span>
                            </label>
                            <label class="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                <input type="radio" name="questionType" value="radio" class="w-4 h-4 text-primary-600" checked>
                                <span class="ml-3">
                                    <i class="fas fa-dot-circle mr-2 text-primary-600"></i>
                                    単一選択
                                </span>
                            </label>
                            <label class="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                <input type="radio" name="questionType" value="checkbox" class="w-4 h-4 text-primary-600">
                                <span class="ml-3">
                                    <i class="fas fa-check-square mr-2 text-primary-600"></i>
                                    複数選択
                                </span>
                            </label>
                            <label class="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition col-span-full">
                                <input type="radio" name="questionType" value="scale" class="w-4 h-4 text-primary-600">
                                <span class="ml-3">
                                    <i class="fas fa-star-half-alt mr-2 text-primary-600"></i>
                                    評価スケール
                                </span>
                            </label>
                        </div>
                    </div>

                    <!-- 質問文 -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            質問文 <span class="text-red-500">*</span>
                        </label>
                        <textarea id="questionText" class="input-field" rows="3" placeholder="例: このコミュニティをどこで知りましたか？" required></textarea>
                    </div>

                    <!-- 選択肢（radio/checkbox用） -->
                    <div id="optionsSection" class="hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            選択肢 <span class="text-red-500">*</span>
                        </label>
                        <div id="optionsList" class="space-y-2 mb-3"></div>
                        <button onclick="addOption()" class="btn-secondary w-full">
                            <i class="fas fa-plus mr-2"></i>選択肢を追加
                        </button>
                    </div>

                    <!-- スケール設定（scale用） -->
                    <div id="scaleSection" class="hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            スケール設定
                        </label>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">最小値</label>
                                <input type="number" id="scaleMin" class="input-field" value="1" min="0">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">最大値</label>
                                <input type="number" id="scaleMax" class="input-field" value="5" min="1">
                            </div>
                        </div>
                    </div>

                    <!-- 必須設定 -->
                    <div>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="questionRequired" class="w-4 h-4 text-primary-600 rounded">
                            <span class="text-sm font-medium text-gray-700">この質問を必須にする</span>
                        </label>
                    </div>
                </div>

                <div class="p-6 border-t border-gray-200 flex justify-end gap-2">
                    <button onclick="closeQuestionModal()" class="btn-secondary">
                        キャンセル
                    </button>
                    <button onclick="saveQuestion()" class="btn-primary">
                        <i class="fas fa-check mr-2"></i>保存
                    </button>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            let tenantId = null
            let surveyId = null
            let surveyType = null
            let questions = []
            let currentQuestion = null
            let editingIndex = -1

            // URLパラメータ取得
            const urlParams = new URLSearchParams(window.location.search)
            surveyId = urlParams.get('id')
            surveyType = urlParams.get('type') || 'join'

            // 質問タイプ変更時
            document.addEventListener('DOMContentLoaded', () => {
                const typeRadios = document.querySelectorAll('input[name="questionType"]')
                typeRadios.forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        updateQuestionTypeUI(e.target.value)
                    })
                })

                // 初期化
                init()
            })

            async function init() {
                // 認証チェック
                const token = getToken()
                if (!token) {
                    window.location.href = '/login'
                    return
                }

                const membership = JSON.parse(localStorage.getItem('membership') || '{}')
                tenantId = membership.tenant_id

                if (!tenantId) {
                    showToast('テナント情報が見つかりません', 'error')
                    setTimeout(() => window.location.href = '/dashboard', 2000)
                    return
                }

                // 編集モードの場合、既存データを読み込む
                if (surveyId) {
                    await loadSurvey()
                }
            }

            // 既存アンケート読み込み
            async function loadSurvey() {
                try {
                    const response = await axios.get(\`/api/surveys/\${surveyId}\`)
                    
                    if (response.data.success) {
                        const survey = response.data.survey
                        
                        document.getElementById('pageTitle').textContent = 'アンケート編集'
                        document.getElementById('surveyTitle').value = survey.title
                        document.getElementById('surveyDescription').value = survey.description || ''
                        document.getElementById('surveyActive').checked = survey.is_active
                        
                        surveyType = survey.type
                        questions = survey.questions || []
                        
                        renderQuestions()
                    }
                } catch (error) {
                    console.error('Error loading survey:', error)
                    showToast('アンケートの読み込みに失敗しました', 'error')
                }
            }

            // 質問一覧レンダリング
            function renderQuestions() {
                const container = document.getElementById('questionsList')
                
                if (questions.length === 0) {
                    container.innerHTML = \`
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-question-circle text-4xl mb-2"></i>
                            <p>質問が追加されていません</p>
                            <button onclick="openQuestionModal()" class="btn-secondary mt-4">
                                <i class="fas fa-plus mr-2"></i>最初の質問を追加
                            </button>
                        </div>
                    \`
                    return
                }

                container.innerHTML = questions.map((q, index) => {
                    const typeLabels = {
                        text: '短文テキスト',
                        textarea: '長文テキスト',
                        radio: '単一選択',
                        checkbox: '複数選択',
                        scale: '評価スケール'
                    }

                    let optionsHtml = ''
                    if (q.question_type === 'radio' || q.question_type === 'checkbox') {
                        optionsHtml = \`
                            <div class="mt-2 text-sm text-gray-600">
                                選択肢: \${q.options.join(', ')}
                            </div>
                        \`
                    } else if (q.question_type === 'scale') {
                        optionsHtml = \`
                            <div class="mt-2 text-sm text-gray-600">
                                スケール: \${q.scale_min} 〜 \${q.scale_max}
                            </div>
                        \`
                    }

                    return \`
                        <div class="card p-4 hover:shadow-md transition">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-2">
                                        <span class="text-lg font-bold text-gray-700">質問 \${index + 1}</span>
                                        <span class="badge badge-secondary">\${typeLabels[q.question_type]}</span>
                                        \${q.is_required ? '<span class="badge badge-danger">必須</span>' : ''}
                                    </div>
                                    <p class="text-gray-900 mb-1">\${q.question_text}</p>
                                    \${optionsHtml}
                                </div>
                                <div class="flex gap-2 ml-4">
                                    <button onclick="moveQuestion(\${index}, -1)" class="text-gray-500 hover:text-gray-700" \${index === 0 ? 'disabled' : ''}>
                                        <i class="fas fa-chevron-up"></i>
                                    </button>
                                    <button onclick="moveQuestion(\${index}, 1)" class="text-gray-500 hover:text-gray-700" \${index === questions.length - 1 ? 'disabled' : ''}>
                                        <i class="fas fa-chevron-down"></i>
                                    </button>
                                    <button onclick="editQuestion(\${index})" class="text-blue-600 hover:text-blue-700">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteQuestion(\${index})" class="text-red-600 hover:text-red-700">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    \`
                }).join('')
            }

            // 質問タイプUIの更新
            function updateQuestionTypeUI(type) {
                const optionsSection = document.getElementById('optionsSection')
                const scaleSection = document.getElementById('scaleSection')

                if (type === 'radio' || type === 'checkbox') {
                    optionsSection.classList.remove('hidden')
                    scaleSection.classList.add('hidden')
                    if (document.getElementById('optionsList').children.length === 0) {
                        addOption()
                        addOption()
                    }
                } else if (type === 'scale') {
                    optionsSection.classList.add('hidden')
                    scaleSection.classList.remove('hidden')
                } else {
                    optionsSection.classList.add('hidden')
                    scaleSection.classList.add('hidden')
                }
            }

            // 質問モーダルを開く
            function openQuestionModal(index = -1) {
                editingIndex = index
                const modal = document.getElementById('questionModal')
                
                if (index >= 0) {
                    // 編集モード
                    const q = questions[index]
                    document.getElementById('modalTitle').textContent = '質問を編集'
                    document.getElementById('questionText').value = q.question_text
                    document.querySelector(\`input[name="questionType"][value="\${q.question_type}"]\`).checked = true
                    document.getElementById('questionRequired').checked = q.is_required

                    updateQuestionTypeUI(q.question_type)

                    if (q.question_type === 'radio' || q.question_type === 'checkbox') {
                        document.getElementById('optionsList').innerHTML = ''
                        q.options.forEach(opt => addOption(opt))
                    } else if (q.question_type === 'scale') {
                        document.getElementById('scaleMin').value = q.scale_min
                        document.getElementById('scaleMax').value = q.scale_max
                    }
                } else {
                    // 新規作成モード
                    document.getElementById('modalTitle').textContent = '質問を追加'
                    document.getElementById('questionText').value = ''
                    document.querySelector('input[name="questionType"][value="radio"]').checked = true
                    document.getElementById('questionRequired').checked = false
                    document.getElementById('optionsList').innerHTML = ''
                    addOption()
                    addOption()
                    updateQuestionTypeUI('radio')
                }

                modal.classList.remove('hidden')
            }

            // 質問モーダルを閉じる
            function closeQuestionModal() {
                document.getElementById('questionModal').classList.add('hidden')
            }

            // 選択肢を追加
            function addOption(value = '') {
                const container = document.getElementById('optionsList')
                const index = container.children.length
                const optionHtml = \`
                    <div class="flex gap-2" data-option-index="\${index}">
                        <input type="text" class="input-field flex-1" placeholder="選択肢 \${index + 1}" value="\${value}">
                        <button onclick="removeOption(this)" class="btn-danger">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                \`
                container.insertAdjacentHTML('beforeend', optionHtml)
            }

            // 選択肢を削除
            function removeOption(btn) {
                btn.parentElement.remove()
            }

            // 質問を保存
            function saveQuestion() {
                const type = document.querySelector('input[name="questionType"]:checked').value
                const text = document.getElementById('questionText').value.trim()
                const isRequired = document.getElementById('questionRequired').checked

                if (!text) {
                    showToast('質問文を入力してください', 'error')
                    return
                }

                const question = {
                    question_type: type,
                    question_text: text,
                    is_required: isRequired,
                    display_order: editingIndex >= 0 ? questions[editingIndex].display_order : questions.length
                }

                if (type === 'radio' || type === 'checkbox') {
                    const optionInputs = document.querySelectorAll('#optionsList input')
                    const options = Array.from(optionInputs).map(input => input.value.trim()).filter(v => v)
                    
                    if (options.length < 2) {
                        showToast('選択肢は2つ以上必要です', 'error')
                        return
                    }
                    
                    question.options = options
                } else if (type === 'scale') {
                    question.scale_min = parseInt(document.getElementById('scaleMin').value)
                    question.scale_max = parseInt(document.getElementById('scaleMax').value)
                }

                if (editingIndex >= 0) {
                    questions[editingIndex] = question
                } else {
                    questions.push(question)
                }

                renderQuestions()
                closeQuestionModal()
                showToast('質問を追加しました', 'success')
            }

            // 質問を編集
            function editQuestion(index) {
                openQuestionModal(index)
            }

            // 質問を削除
            function deleteQuestion(index) {
                if (!confirm('この質問を削除してもよろしいですか？')) {
                    return
                }
                questions.splice(index, 1)
                renderQuestions()
                showToast('質問を削除しました', 'success')
            }

            // 質問を移動
            function moveQuestion(index, direction) {
                const newIndex = index + direction
                if (newIndex < 0 || newIndex >= questions.length) {
                    return
                }
                
                [questions[index], questions[newIndex]] = [questions[newIndex], questions[index]]
                renderQuestions()
            }

            // アンケートを保存
            async function saveSurvey() {
                const title = document.getElementById('surveyTitle').value.trim()
                const description = document.getElementById('surveyDescription').value.trim()
                const isActive = document.getElementById('surveyActive').checked

                if (!title) {
                    showToast('タイトルを入力してください', 'error')
                    return
                }

                if (questions.length === 0) {
                    showToast('質問を1つ以上追加してください', 'error')
                    return
                }

                const saveBtn = document.getElementById('saveBtn')
                saveBtn.disabled = true
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中...'

                try {
                    const data = {
                        tenant_id: tenantId,
                        type: surveyType,
                        title,
                        description,
                        is_active: isActive,
                        questions: questions.map((q, i) => ({ ...q, display_order: i }))
                    }

                    let response
                    if (surveyId) {
                        response = await axios.put(\`/api/surveys/\${surveyId}\`, data)
                    } else {
                        response = await axios.post('/api/surveys', data)
                    }

                    if (response.data.success) {
                        showToast('アンケートを保存しました', 'success')
                        setTimeout(() => window.location.href = '/surveys', 1500)
                    }
                } catch (error) {
                    console.error('Error saving survey:', error)
                    showToast('保存に失敗しました', 'error')
                    saveBtn.disabled = false
                    saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>保存'
                }
            }
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 統計ダッシュボードページ（/analytics）
// ============================================
app.get('/analytics', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>統計ダッシュボード - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <a href="/dashboard" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-chart-bar mr-2 text-purple-500"></i>
                                統計ダッシュボード
                            </h1>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span id="tenantName" class="text-sm text-gray-600"></span>
                            <button onclick="logout()" class="btn-outline">
                                <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <!-- Loading State -->
                <div id="loadingState" class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-purple-500 mb-4"></i>
                    <p class="text-gray-600">統計データを読み込み中...</p>
                </div>

                <!-- Content Container -->
                <div id="contentContainer" class="hidden space-y-8">
                    <!-- KPI Cards -->
                    <div>
                        <h2 class="text-xl font-bold text-gray-900 mb-4">
                            <i class="fas fa-tachometer-alt mr-2 text-purple-500"></i>
                            主要指標
                        </h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <!-- Members Card -->
                            <div class="card p-6">
                                <div class="flex items-center justify-between mb-3">
                                    <div class="text-3xl text-primary-500">
                                        <i class="fas fa-users"></i>
                                    </div>
                                    <a href="/analytics/members" class="text-sm text-primary-600 hover:text-primary-700">
                                        詳細 <i class="fas fa-arrow-right ml-1"></i>
                                    </a>
                                </div>
                                <div class="text-3xl font-bold text-gray-900 mb-1" id="totalMembers">-</div>
                                <div class="text-sm text-gray-600 mb-2">総会員数</div>
                                <div class="flex items-center text-xs text-gray-500">
                                    <span class="text-warning-600 font-semibold mr-1" id="pendingMembers">-</span>
                                    件の承認待ち
                                </div>
                            </div>

                            <!-- Posts Card -->
                            <div class="card p-6">
                                <div class="flex items-center justify-between mb-3">
                                    <div class="text-3xl text-success-500">
                                        <i class="fas fa-file-alt"></i>
                                    </div>
                                    <a href="/analytics/posts" class="text-sm text-success-600 hover:text-success-700">
                                        詳細 <i class="fas fa-arrow-right ml-1"></i>
                                    </a>
                                </div>
                                <div class="text-3xl font-bold text-gray-900 mb-1" id="publishedPosts">-</div>
                                <div class="text-sm text-gray-600 mb-2">公開投稿数</div>
                                <div class="flex items-center text-xs text-gray-500">
                                    <i class="fas fa-eye mr-1"></i>
                                    <span id="totalViews">-</span> 総閲覧数
                                </div>
                            </div>

                            <!-- Engagement Card -->
                            <div class="card p-6">
                                <div class="flex items-center justify-between mb-3">
                                    <div class="text-3xl text-error-500">
                                        <i class="fas fa-heart"></i>
                                    </div>
                                    <a href="/analytics/posts" class="text-sm text-error-600 hover:text-error-700">
                                        詳細 <i class="fas fa-arrow-right ml-1"></i>
                                    </a>
                                </div>
                                <div class="text-3xl font-bold text-gray-900 mb-1" id="totalLikes">-</div>
                                <div class="text-sm text-gray-600 mb-2">総いいね数</div>
                                <div class="flex items-center text-xs text-gray-500">
                                    <i class="fas fa-comment mr-1"></i>
                                    <span id="totalComments">-</span> コメント
                                </div>
                            </div>

                            <!-- Surveys Card -->
                            <div class="card p-6">
                                <div class="flex items-center justify-between mb-3">
                                    <div class="text-3xl text-accent-500">
                                        <i class="fas fa-poll"></i>
                                    </div>
                                    <a href="/analytics/surveys" class="text-sm text-accent-600 hover:text-accent-700">
                                        詳細 <i class="fas fa-arrow-right ml-1"></i>
                                    </a>
                                </div>
                                <div class="text-3xl font-bold text-gray-900 mb-1" id="joinResponses">-</div>
                                <div class="text-sm text-gray-600 mb-2">入会アンケート回答数</div>
                                <div class="flex items-center text-xs text-gray-500">
                                    <span id="leaveResponses">-</span> 退会アンケート回答数
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Navigation Cards -->
                    <div>
                        <h2 class="text-xl font-bold text-gray-900 mb-4">
                            <i class="fas fa-chart-line mr-2 text-purple-500"></i>
                            詳細分析
                        </h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <a href="/analytics/members" class="card-interactive p-6">
                                <div class="text-4xl mb-3 text-primary-500">
                                    <i class="fas fa-user-friends"></i>
                                </div>
                                <h3 class="font-bold text-gray-900 mb-2">会員分析</h3>
                                <p class="text-sm text-gray-600">会員数推移、プラン別分布、ロール別内訳</p>
                            </a>

                            <a href="/analytics/posts" class="card-interactive p-6">
                                <div class="text-4xl mb-3 text-success-500">
                                    <i class="fas fa-newspaper"></i>
                                </div>
                                <h3 class="font-bold text-gray-900 mb-2">コンテンツ分析</h3>
                                <p class="text-sm text-gray-600">人気投稿、投稿者別統計、エンゲージメント率</p>
                            </a>

                            <a href="/analytics/surveys" class="card-interactive p-6">
                                <div class="text-4xl mb-3 text-accent-500">
                                    <i class="fas fa-clipboard-list"></i>
                                </div>
                                <h3 class="font-bold text-gray-900 mb-2">アンケート分析</h3>
                                <p class="text-sm text-gray-600">入会・退会時アンケート結果の集計と分析</p>
                            </a>

                            <a href="/analytics/subscriptions" class="card-interactive p-6">
                                <div class="text-4xl mb-3 text-purple-500">
                                    <i class="fas fa-credit-card"></i>
                                </div>
                                <h3 class="font-bold text-gray-900 mb-2">収益分析</h3>
                                <p class="text-sm text-gray-600">サブスクリプション、プラン別収益（オーナーのみ）</p>
                            </a>

                            <a href="/analytics/engagement" class="card-interactive p-6 opacity-50 pointer-events-none">
                                <div class="text-4xl mb-3 text-info-500">
                                    <i class="fas fa-fire"></i>
                                </div>
                                <h3 class="font-bold text-gray-900 mb-2">エンゲージメント分析</h3>
                                <p class="text-sm text-gray-600">DAU/MAU、アクティブ率（近日公開）</p>
                            </a>

                            <a href="/analytics/storage" class="card-interactive p-6 opacity-50 pointer-events-none">
                                <div class="text-4xl mb-3 text-warning-500">
                                    <i class="fas fa-database"></i>
                                </div>
                                <h3 class="font-bold text-gray-900 mb-2">ストレージ分析</h3>
                                <p class="text-sm text-gray-600">使用状況、ファイル別内訳（近日公開）</p>
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            let analyticsData = null

            async function loadAnalytics() {
                try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    axios.defaults.headers.common['Authorization'] = 'Bearer ' + token

                    // 概要統計を取得
                    const response = await axios.get('/api/analytics/overview')
                    
                    if (!response.data.success) {
                        throw new Error(response.data.message)
                    }

                    analyticsData = response.data.data

                    // データを表示
                    displayAnalytics()

                    // ローディングを非表示、コンテンツを表示
                    document.getElementById('loadingState').classList.add('hidden')
                    document.getElementById('contentContainer').classList.remove('hidden')

                } catch (error) {
                    console.error('Analytics error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login'
                    } else if (error.response?.status === 403) {
                        showToast('統計ダッシュボードへのアクセス権限がありません', 'error')
                        setTimeout(() => window.location.href = '/dashboard', 2000)
                    } else {
                        showToast('統計データの読み込みに失敗しました', 'error')
                    }
                }
            }

            function displayAnalytics() {
                if (!analyticsData) return

                // 会員統計
                document.getElementById('totalMembers').textContent = analyticsData.members.total.toLocaleString()
                document.getElementById('pendingMembers').textContent = analyticsData.members.pending

                // 投稿統計
                document.getElementById('publishedPosts').textContent = analyticsData.posts.published.toLocaleString()
                document.getElementById('totalViews').textContent = (analyticsData.posts.total_views || 0).toLocaleString()

                // エンゲージメント統計
                document.getElementById('totalLikes').textContent = analyticsData.engagement.total_likes.toLocaleString()
                document.getElementById('totalComments').textContent = analyticsData.engagement.total_comments.toLocaleString()

                // アンケート統計
                document.getElementById('joinResponses').textContent = analyticsData.surveys.join_responses.toLocaleString()
                document.getElementById('leaveResponses').textContent = analyticsData.surveys.leave_responses.toLocaleString()
            }

            // ページ読み込み時に実行
            document.addEventListener('DOMContentLoaded', loadAnalytics)
        </script>
    </body>
    </html>
  `)
})

// ============================================
// コンテンツ分析ページ (/analytics/posts)
// ============================================
app.get('/analytics/posts', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>コンテンツ分析 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <a href="/analytics" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-newspaper mr-2 text-success-500"></i>
                                コンテンツ分析
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <!-- Loading State -->
                <div id="loadingState" class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-success-500 mb-4"></i>
                    <p class="text-gray-600">投稿データを読み込み中...</p>
                </div>

                <!-- Content Container -->
                <div id="contentContainer" class="hidden space-y-8">
                    <!-- Summary Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="card p-6">
                            <div class="text-sm text-gray-600 mb-1">公開投稿</div>
                            <div class="text-3xl font-bold text-success-600" id="publishedPosts">-</div>
                        </div>
                        <div class="card p-6">
                            <div class="text-sm text-gray-600 mb-1">下書き</div>
                            <div class="text-3xl font-bold text-gray-600" id="draftPosts">-</div>
                        </div>
                        <div class="card p-6">
                            <div class="text-sm text-gray-600 mb-1">予約投稿</div>
                            <div class="text-3xl font-bold text-warning-600" id="scheduledPosts">-</div>
                        </div>
                        <div class="card p-6">
                            <div class="text-sm text-gray-600 mb-1">総閲覧数</div>
                            <div class="text-3xl font-bold text-primary-600" id="totalViews">-</div>
                        </div>
                    </div>

                    <!-- Post Status Chart -->
                    <div class="card p-6">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">
                            <i class="fas fa-chart-bar mr-2 text-primary-500"></i>
                            投稿ステータス別分布
                        </h3>
                        <canvas id="postStatusChart" style="max-height: 300px;"></canvas>
                    </div>

                    <!-- Top Posts -->
                    <div class="card p-6">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">
                            <i class="fas fa-trophy mr-2 text-warning-500"></i>
                            人気投稿トップ10
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="min-w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">順位</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイトル</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">著者</th>
                                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">閲覧</th>
                                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">いいね</th>
                                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">コメント</th>
                                    </tr>
                                </thead>
                                <tbody id="topPostsTable" class="bg-white divide-y divide-gray-200">
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Author Stats -->
                    <div class="card p-6">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">
                            <i class="fas fa-user-edit mr-2 text-primary-500"></i>
                            投稿者別統計
                        </h3>
                        <div id="authorStats" class="space-y-3"></div>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
        <script src="/static/app.js"></script>
        <script>
            let postData = null
            let statusChart = null

            async function loadPostAnalytics() {
                try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    axios.defaults.headers.common['Authorization'] = 'Bearer ' + token

                    const response = await axios.get('/api/analytics/posts')
                    
                    if (!response.data.success) {
                        throw new Error(response.data.message)
                    }

                    postData = response.data.data
                    displayPostAnalytics()

                    document.getElementById('loadingState').classList.add('hidden')
                    document.getElementById('contentContainer').classList.remove('hidden')

                } catch (error) {
                    console.error('Post analytics error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login'
                    } else {
                        showToast('投稿データの読み込みに失敗しました', 'error')
                    }
                }
            }

            function displayPostAnalytics() {
                if (!postData) return

                const basic = postData.basic
                document.getElementById('publishedPosts').textContent = (basic.published || 0).toLocaleString()
                document.getElementById('draftPosts').textContent = (basic.draft || 0).toLocaleString()
                document.getElementById('scheduledPosts').textContent = (basic.scheduled || 0).toLocaleString()
                document.getElementById('totalViews').textContent = (basic.total_views || 0).toLocaleString()

                // 投稿ステータス別棒グラフ
                if (statusChart) statusChart.destroy()
                const statusCtx = document.getElementById('postStatusChart').getContext('2d')
                statusChart = new Chart(statusCtx, {
                    type: 'bar',
                    data: {
                        labels: ['公開投稿', '下書き', '予約投稿'],
                        datasets: [{
                            label: '投稿数',
                            data: [basic.published || 0, basic.draft || 0, basic.scheduled || 0],
                            backgroundColor: [
                                'rgba(76, 175, 80, 0.8)',
                                'rgba(158, 158, 158, 0.8)',
                                'rgba(255, 152, 0, 0.8)'
                            ],
                            borderColor: [
                                '#4CAF50',
                                '#9E9E9E',
                                '#FF9800'
                            ],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return '投稿数: ' + context.parsed.y + '件'
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1,
                                    callback: function(value) {
                                        return value + '件'
                                    }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                })

                // 人気投稿トップ10
                const topPosts = postData.top_posts || []
                let tableHtml = ''
                topPosts.forEach((post, index) => {
                    const rankClass = index === 0 ? 'text-warning-600 font-bold' : index === 1 ? 'text-gray-500 font-semibold' : index === 2 ? 'text-orange-600 font-semibold' : 'text-gray-400'
                    tableHtml += \`
                        <tr>
                            <td class="px-4 py-3 whitespace-nowrap">
                                <span class="\${rankClass}">#\${index + 1}</span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="text-sm font-medium text-gray-900 max-w-md truncate">\${escapeHtml(post.title)}</div>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">
                                <div class="text-sm text-gray-600">\${post.author_name || '不明'}</div>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap text-right">
                                <div class="text-sm text-gray-900">\${(post.view_count || 0).toLocaleString()}</div>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap text-right">
                                <div class="text-sm text-error-600">\${post.like_count || 0}</div>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap text-right">
                                <div class="text-sm text-primary-600">\${post.comment_count || 0}</div>
                            </td>
                        </tr>
                    \`
                })
                document.getElementById('topPostsTable').innerHTML = tableHtml || '<tr><td colspan="6" class="px-4 py-3 text-center text-gray-500">データがありません</td></tr>'

                // 投稿者別統計
                const authorStats = postData.author_stats || []
                let authorHtml = ''
                authorStats.forEach(author => {
                    const avgViews = author.post_count > 0 ? Math.round(author.total_views / author.post_count) : 0
                    authorHtml += \`
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                                <div class="font-semibold text-gray-900">\${author.author_name}</div>
                                <div class="text-sm text-gray-600">\${author.post_count}件の投稿</div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-gray-600">総閲覧: \${author.total_views.toLocaleString()}</div>
                                <div class="text-sm text-gray-500">平均: \${avgViews.toLocaleString()}</div>
                            </div>
                        </div>
                    \`
                })
                document.getElementById('authorStats').innerHTML = authorHtml || '<p class="text-gray-500 text-sm">データがありません</p>'
            }

            function escapeHtml(text) {
                const div = document.createElement('div')
                div.textContent = text
                return div.innerHTML
            }

            document.addEventListener('DOMContentLoaded', loadPostAnalytics)
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 会員分析ページ (/analytics/members)
// ============================================
app.get('/analytics/members', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>会員分析 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <a href="/analytics" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-user-friends mr-2 text-primary-500"></i>
                                会員分析
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <!-- Loading State -->
                <div id="loadingState" class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-primary-500 mb-4"></i>
                    <p class="text-gray-600">会員データを読み込み中...</p>
                </div>

                <!-- Content Container -->
                <div id="contentContainer" class="hidden space-y-8">
                    <!-- Summary Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="card p-6">
                            <div class="text-sm text-gray-600 mb-1">アクティブ会員</div>
                            <div class="text-3xl font-bold text-primary-600" id="totalActive">-</div>
                        </div>
                        <div class="card p-6">
                            <div class="text-sm text-gray-600 mb-1">承認待ち</div>
                            <div class="text-3xl font-bold text-warning-600" id="totalPending">-</div>
                        </div>
                        <div class="card p-6">
                            <div class="text-sm text-gray-600 mb-1">退会済み</div>
                            <div class="text-3xl font-bold text-gray-600" id="totalInactive">-</div>
                        </div>
                    </div>

                    <!-- Role Distribution -->
                    <div class="card p-6">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">
                            <i class="fas fa-user-tag mr-2 text-primary-500"></i>
                            ロール別内訳
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="text-center p-4 bg-gray-50 rounded-lg">
                                <div class="text-2xl font-bold text-purple-600" id="ownerCount">-</div>
                                <div class="text-sm text-gray-600">オーナー</div>
                            </div>
                            <div class="text-center p-4 bg-gray-50 rounded-lg">
                                <div class="text-2xl font-bold text-blue-600" id="adminCount">-</div>
                                <div class="text-sm text-gray-600">管理者</div>
                            </div>
                            <div class="text-center p-4 bg-gray-50 rounded-lg">
                                <div class="text-2xl font-bold text-green-600" id="memberCount">-</div>
                                <div class="text-sm text-gray-600">一般会員</div>
                            </div>
                        </div>
                    </div>

                    <!-- Plan Distribution -->
                    <div class="card p-6">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">
                            <i class="fas fa-chart-pie mr-2 text-primary-500"></i>
                            プラン別分布
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <canvas id="planChart"></canvas>
                            </div>
                            <div id="planDistribution" class="space-y-3"></div>
                        </div>
                    </div>

                    <!-- Monthly Trend -->
                    <div class="card p-6">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">
                            <i class="fas fa-chart-line mr-2 text-primary-500"></i>
                            会員数推移（過去12ヶ月）
                        </h3>
                        <canvas id="monthlyTrendChart"></canvas>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
        <script src="/static/app.js"></script>
        <script>
            let memberData = null
            let planChart = null
            let trendChart = null

            async function loadMemberAnalytics() {
                try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    axios.defaults.headers.common['Authorization'] = 'Bearer ' + token

                    const response = await axios.get('/api/analytics/members')
                    
                    if (!response.data.success) {
                        throw new Error(response.data.message)
                    }

                    memberData = response.data.data
                    displayMemberAnalytics()

                    document.getElementById('loadingState').classList.add('hidden')
                    document.getElementById('contentContainer').classList.remove('hidden')

                } catch (error) {
                    console.error('Member analytics error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login'
                    } else {
                        showToast('会員データの読み込みに失敗しました', 'error')
                    }
                }
            }

            function displayMemberAnalytics() {
                if (!memberData) return

                const basic = memberData.basic
                document.getElementById('totalActive').textContent = (basic.total_active || 0).toLocaleString()
                document.getElementById('totalPending').textContent = (basic.total_pending || 0).toLocaleString()
                document.getElementById('totalInactive').textContent = (basic.total_inactive || 0).toLocaleString()
                
                document.getElementById('ownerCount').textContent = (basic.owner_count || 0).toLocaleString()
                document.getElementById('adminCount').textContent = (basic.admin_count || 0).toLocaleString()
                document.getElementById('memberCount').textContent = (basic.member_count || 0).toLocaleString()

                // プラン別分布
                const planDist = memberData.plan_distribution || []
                let planHtml = ''
                planDist.forEach(plan => {
                    const total = planDist.reduce((sum, p) => sum + p.count, 0)
                    const percentage = total > 0 ? Math.round((plan.count / total) * 100) : 0
                    planHtml += \`
                        <div>
                            <div class="flex justify-between text-sm mb-1">
                                <span class="text-gray-700">\${plan.plan_name}</span>
                                <span class="font-semibold text-gray-900">\${plan.count}人 (\${percentage}%)</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-primary-500 h-2 rounded-full" style="width: \${percentage}%"></div>
                            </div>
                        </div>
                    \`
                })
                document.getElementById('planDistribution').innerHTML = planHtml || '<p class="text-gray-500 text-sm">データがありません</p>'

                // プラン別分布円グラフ
                if (planChart) planChart.destroy()
                const planCtx = document.getElementById('planChart').getContext('2d')
                planChart = new Chart(planCtx, {
                    type: 'pie',
                    data: {
                        labels: planDist.map(p => p.plan_name),
                        datasets: [{
                            data: planDist.map(p => p.count),
                            backgroundColor: [
                                '#00BCD4',
                                '#4CAF50',
                                '#FF9800',
                                '#9C27B0',
                                '#F44336',
                                '#2196F3'
                            ],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 15,
                                    font: { size: 12 }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || ''
                                        const value = context.parsed || 0
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0)
                                        const percentage = Math.round((value / total) * 100)
                                        return label + ': ' + value + '人 (' + percentage + '%)'
                                    }
                                }
                            }
                        }
                    }
                })

                // 月次推移折れ線グラフ
                const monthlyTrend = memberData.monthly_trend || []
                if (trendChart) trendChart.destroy()
                const trendCtx = document.getElementById('monthlyTrendChart').getContext('2d')
                trendChart = new Chart(trendCtx, {
                    type: 'line',
                    data: {
                        labels: monthlyTrend.map(t => t.month),
                        datasets: [{
                            label: '会員数',
                            data: monthlyTrend.map(t => t.count),
                            borderColor: '#00BCD4',
                            backgroundColor: 'rgba(0, 188, 212, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            pointBackgroundColor: '#00BCD4',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return '会員数: ' + context.parsed.y + '人'
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1,
                                    callback: function(value) {
                                        return value + '人'
                                    }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                })
            }

            document.addEventListener('DOMContentLoaded', loadMemberAnalytics)
        </script>
    </body>
    </html>
  `)
})

// ============================================
// アンケート分析ページ (/analytics/surveys)
// ============================================
app.get('/analytics/surveys', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>アンケート分析 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <a href="/analytics" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-clipboard-list mr-2 text-accent-500"></i>
                                アンケート分析
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <!-- Loading State -->
                <div id="loadingState" class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-accent-500 mb-4"></i>
                    <p class="text-gray-600">アンケートデータを読み込み中...</p>
                </div>

                <!-- Content Container -->
                <div id="contentContainer" class="hidden space-y-8">
                    <!-- Summary Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Join Survey Card -->
                        <div class="card p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-bold text-gray-900">
                                    <i class="fas fa-sign-in-alt mr-2 text-primary-500"></i>
                                    入会時アンケート
                                </h3>
                            </div>
                            <div id="joinSurveyInfo">
                                <p class="text-sm text-gray-500">アンケートが設定されていません</p>
                            </div>
                        </div>

                        <!-- Leave Survey Card -->
                        <div class="card p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-bold text-gray-900">
                                    <i class="fas fa-sign-out-alt mr-2 text-error-500"></i>
                                    退会時アンケート
                                </h3>
                            </div>
                            <div id="leaveSurveyInfo">
                                <p class="text-sm text-gray-500">アンケートが設定されていません</p>
                            </div>
                        </div>
                    </div>

                    <!-- Question Analysis -->
                    <div id="questionAnalysis"></div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            let surveyData = null
            let questionData = null

            async function loadSurveyAnalytics() {
                try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    axios.defaults.headers.common['Authorization'] = 'Bearer ' + token

                    // アンケート統計を取得
                    const response = await axios.get('/api/analytics/surveys')
                    
                    if (!response.data.success) {
                        throw new Error(response.data.message)
                    }

                    surveyData = response.data.data

                    // データを表示
                    await displaySurveyAnalytics()

                    // ローディングを非表示、コンテンツを表示
                    document.getElementById('loadingState').classList.add('hidden')
                    document.getElementById('contentContainer').classList.remove('hidden')

                } catch (error) {
                    console.error('Survey analytics error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login'
                    } else if (error.response?.status === 403) {
                        showToast('アンケート分析へのアクセス権限がありません', 'error')
                        setTimeout(() => window.location.href = '/analytics', 2000)
                    } else {
                        showToast('アンケートデータの読み込みに失敗しました', 'error')
                    }
                }
            }

            async function displaySurveyAnalytics() {
                if (!surveyData) return

                // 入会時アンケート
                const joinSurvey = surveyData.join_survey
                if (joinSurvey && joinSurvey.survey_id) {
                    const responseRate = joinSurvey.total_members > 0 
                        ? Math.round((joinSurvey.total_responses / joinSurvey.total_members) * 100) 
                        : 0
                    
                    document.getElementById('joinSurveyInfo').innerHTML = \`
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">アンケート名</span>
                                <span class="font-semibold text-gray-900">\${joinSurvey.survey_title || '無題'}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">総回答数</span>
                                <span class="text-2xl font-bold text-primary-600">\${joinSurvey.total_responses}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">回答率</span>
                                <span class="text-lg font-semibold text-gray-900">\${responseRate}%</span>
                            </div>
                            <button onclick="viewSurveyDetails(\${joinSurvey.survey_id}, 'join')" class="btn-primary w-full mt-4">
                                <i class="fas fa-chart-pie mr-2"></i>詳細を見る
                            </button>
                        </div>
                    \`
                }

                // 退会時アンケート
                const leaveSurvey = surveyData.leave_survey
                if (leaveSurvey && leaveSurvey.survey_id) {
                    const responseRate = leaveSurvey.total_exits > 0 
                        ? Math.round((leaveSurvey.total_responses / leaveSurvey.total_exits) * 100) 
                        : 0
                    
                    document.getElementById('leaveSurveyInfo').innerHTML = \`
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">アンケート名</span>
                                <span class="font-semibold text-gray-900">\${leaveSurvey.survey_title || '無題'}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">総回答数</span>
                                <span class="text-2xl font-bold text-error-600">\${leaveSurvey.total_responses}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">回答率</span>
                                <span class="text-lg font-semibold text-gray-900">\${responseRate}%</span>
                            </div>
                            <button onclick="viewSurveyDetails(\${leaveSurvey.survey_id}, 'leave')" class="btn-primary w-full mt-4">
                                <i class="fas fa-chart-pie mr-2"></i>詳細を見る
                            </button>
                        </div>
                    \`
                }
            }

            async function viewSurveyDetails(surveyId, type) {
                try {
                    const response = await axios.get(\`/api/analytics/surveys/\${surveyId}/questions\`)
                    
                    if (!response.data.success) {
                        throw new Error(response.data.message)
                    }

                    questionData = response.data.data
                    displayQuestionAnalysis(type)

                } catch (error) {
                    console.error('Question analytics error:', error)
                    showToast('質問別統計の読み込みに失敗しました', 'error')
                }
            }

            function displayQuestionAnalysis(type) {
                if (!questionData || !questionData.question_stats) return

                const typeLabel = type === 'join' ? '入会時' : '退会時'
                const typeColor = type === 'join' ? 'primary' : 'error'
                const chartColors = type === 'join' 
                    ? ['#00BCD4', '#26C6DA', '#4DD0E1', '#80DEEA', '#B2EBF2', '#E0F7FA']
                    : ['#F44336', '#EF5350', '#E57373', '#EF9A9A', '#FFCDD2', '#FFEBEE']

                let html = \`
                    <div class="card p-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-6">
                            <i class="fas fa-question-circle mr-2 text-\${typeColor}-500"></i>
                            \${typeLabel}アンケート - 質問別分析
                        </h3>
                        <div class="space-y-8">
                \`

                questionData.question_stats.forEach((q, index) => {
                    const chartId = \`chart-\${type}-\${index}\`
                    
                    html += \`
                        <div class="border-b border-gray-200 pb-6 last:border-b-0">
                            <h4 class="font-semibold text-gray-900 mb-4">
                                Q\${index + 1}. \${q.question_text}
                            </h4>
                    \`

                    if (q.question_type === 'text' || q.question_type === 'textarea') {
                        // テキスト回答
                        html += \`
                            <div class="space-y-2">
                                <p class="text-sm text-gray-600 mb-3">回答一覧（最新10件）</p>
                        \`
                        const responses = q.responses.slice(0, 10)
                        responses.forEach(r => {
                            html += \`
                                <div class="bg-gray-50 p-3 rounded">
                                    <p class="text-sm text-gray-800">\${escapeHtml(r.answer)}</p>
                                    <p class="text-xs text-gray-500 mt-1">\${r.user_nickname || '匿名'} - \${new Date(r.created_at).toLocaleDateString('ja-JP')}</p>
                                </div>
                            \`
                        })
                        html += \`</div>\`

                    } else if (q.question_type === 'radio' || q.question_type === 'checkbox') {
                        // 選択肢集計（円グラフ + テーブル）
                        html += \`
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <canvas id="\${chartId}" style="max-height: 300px;"></canvas>
                                </div>
                                <div class="space-y-2">
                                    <p class="text-sm text-gray-600 mb-3">回答数: \${q.total_responses}件</p>
                        \`
                        q.aggregation.forEach(agg => {
                            const percentage = agg.percentage
                            html += \`
                                <div>
                                    <div class="flex justify-between text-sm mb-1">
                                        <span class="text-gray-700">\${escapeHtml(agg.answer)}</span>
                                        <span class="font-semibold text-gray-900">\${agg.count}件 (\${percentage}%)</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2">
                                        <div class="bg-\${typeColor}-500 h-2 rounded-full" style="width: \${percentage}%"></div>
                                    </div>
                                </div>
                            \`
                        })
                        html += \`
                                </div>
                            </div>
                        \`

                    } else if (q.question_type === 'scale') {
                        // スケール評価（棒グラフ + 平均スコア）
                        html += \`
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <canvas id="\${chartId}" style="max-height: 300px;"></canvas>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">平均スコア</span>
                                        <span class="text-3xl font-bold text-\${typeColor}-600">\${q.avg_score}</span>
                                    </div>
                                    <div class="flex justify-between text-xs text-gray-500">
                                        <span>\${q.scale_label_min || ''}</span>
                                        <span>\${q.scale_label_max || ''}</span>
                                    </div>
                                    <p class="text-sm text-gray-600">回答数: \${q.total_responses}件</p>
                                </div>
                            </div>
                        \`
                    }

                    html += \`</div>\`
                })

                html += \`
                        </div>
                    </div>
                \`

                document.getElementById('questionAnalysis').innerHTML = html

                // Chart.jsでグラフを描画
                setTimeout(() => {
                    questionData.question_stats.forEach((q, index) => {
                        const chartId = \`chart-\${type}-\${index}\`
                        const canvas = document.getElementById(chartId)
                        
                        if (!canvas) return

                        if (q.question_type === 'radio' || q.question_type === 'checkbox') {
                            // 円グラフ
                            new Chart(canvas.getContext('2d'), {
                                type: 'pie',
                                data: {
                                    labels: q.aggregation.map(a => a.answer),
                                    datasets: [{
                                        data: q.aggregation.map(a => a.count),
                                        backgroundColor: chartColors,
                                        borderWidth: 2,
                                        borderColor: '#fff'
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                            labels: {
                                                padding: 10,
                                                font: { size: 11 }
                                            }
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: function(context) {
                                                    const label = context.label || ''
                                                    const value = context.parsed || 0
                                                    const total = context.dataset.data.reduce((a, b) => a + b, 0)
                                                    const percentage = Math.round((value / total) * 100)
                                                    return label + ': ' + value + '件 (' + percentage + '%)'
                                                }
                                            }
                                        }
                                    }
                                }
                            })
                        } else if (q.question_type === 'scale') {
                            // 棒グラフ
                            const scaleData = q.distribution || []
                            new Chart(canvas.getContext('2d'), {
                                type: 'bar',
                                data: {
                                    labels: scaleData.map(s => \`\${s.score}点\`),
                                    datasets: [{
                                        label: '回答数',
                                        data: scaleData.map(s => s.count),
                                        backgroundColor: chartColors[0],
                                        borderColor: chartColors[0],
                                        borderWidth: 2
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    plugins: {
                                        legend: {
                                            display: false
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: function(context) {
                                                    return '回答数: ' + context.parsed.y + '件'
                                                }
                                            }
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                stepSize: 1,
                                                callback: function(value) {
                                                    return value + '件'
                                                }
                                            },
                                            grid: {
                                                color: 'rgba(0, 0, 0, 0.05)'
                                            }
                                        },
                                        x: {
                                            grid: {
                                                display: false
                                            }
                                        }
                                    }
                                }
                            })
                        }
                    })
                }, 100)
            }

            function escapeHtml(text) {
                const div = document.createElement('div')
                div.textContent = text
                return div.innerHTML
            }

            // ページ読み込み時に実行
            document.addEventListener('DOMContentLoaded', loadSurveyAnalytics)
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 収益分析ページ (/analytics/subscriptions)
// ============================================
app.get('/analytics/subscriptions', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>収益分析 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <a href="/analytics" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-dollar-sign mr-2 text-purple-500"></i>
                                収益分析
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <!-- Loading State -->
                <div id="loadingState" class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-purple-500 mb-4"></i>
                    <p class="text-gray-600">収益データを読み込み中...</p>
                </div>

                <!-- Content Container -->
                <div id="contentContainer" class="hidden space-y-8">
                    <!-- Summary Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="card p-6">
                            <div class="text-sm text-gray-600 mb-1">アクティブサブスク</div>
                            <div class="text-3xl font-bold text-purple-600" id="activeSubscriptions">-</div>
                        </div>
                        <div class="card p-6">
                            <div class="text-sm text-gray-600 mb-1">月額プラン</div>
                            <div class="text-3xl font-bold text-primary-600" id="monthlyCount">-</div>
                        </div>
                        <div class="card p-6">
                            <div class="text-sm text-gray-600 mb-1">年額プラン</div>
                            <div class="text-3xl font-bold text-success-600" id="yearlyCount">-</div>
                        </div>
                    </div>

                    <!-- Plan Distribution -->
                    <div class="card p-6">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">
                            <i class="fas fa-chart-pie mr-2 text-purple-500"></i>
                            プラン別サブスクリプション分布
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <canvas id="planChart"></canvas>
                            </div>
                            <div id="planBreakdown" class="space-y-3"></div>
                        </div>
                    </div>

                    <!-- Owner Only Notice -->
                    <div class="card p-6 bg-purple-50 border-purple-200">
                        <div class="flex items-start">
                            <i class="fas fa-info-circle text-purple-500 text-xl mr-3 mt-1"></i>
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-1">オーナー限定機能</h4>
                                <p class="text-sm text-gray-600">
                                    収益データはコミュニティオーナーのみが閲覧できます。
                                    詳細な売上データや決済履歴は、Stripeダッシュボードをご確認ください。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
        <script src="/static/app.js"></script>
        <script>
            let subscriptionData = null
            let planChart = null

            async function loadSubscriptionAnalytics() {
                try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    axios.defaults.headers.common['Authorization'] = 'Bearer ' + token

                    const response = await axios.get('/api/analytics/subscriptions')
                    
                    if (!response.data.success) {
                        throw new Error(response.data.message)
                    }

                    subscriptionData = response.data.data
                    displaySubscriptionAnalytics()

                    document.getElementById('loadingState').classList.add('hidden')
                    document.getElementById('contentContainer').classList.remove('hidden')

                } catch (error) {
                    console.error('Subscription analytics error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login'
                    } else if (error.response?.status === 403) {
                        showToast('収益データはオーナーのみ閲覧可能です', 'error')
                        setTimeout(() => window.location.href = '/analytics', 2000)
                    } else {
                        showToast('収益データの読み込みに失敗しました', 'error')
                    }
                }
            }

            function displaySubscriptionAnalytics() {
                if (!subscriptionData) return

                const stats = subscriptionData.subscription_stats
                document.getElementById('activeSubscriptions').textContent = (stats.active_count || 0).toLocaleString()
                document.getElementById('monthlyCount').textContent = (stats.monthly_count || 0).toLocaleString()
                document.getElementById('yearlyCount').textContent = (stats.yearly_count || 0).toLocaleString()

                // プラン別分布
                const planBreakdown = subscriptionData.plan_breakdown || []
                let breakdownHtml = ''
                planBreakdown.forEach(plan => {
                    const total = planBreakdown.reduce((sum, p) => sum + p.count, 0)
                    const percentage = total > 0 ? Math.round((plan.count / total) * 100) : 0
                    breakdownHtml += \`
                        <div>
                            <div class="flex justify-between text-sm mb-1">
                                <span class="text-gray-700">\${plan.plan_name}</span>
                                <span class="font-semibold text-gray-900">\${plan.count}件 (\${percentage}%)</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-purple-500 h-2 rounded-full" style="width: \${percentage}%"></div>
                            </div>
                        </div>
                    \`
                })
                document.getElementById('planBreakdown').innerHTML = breakdownHtml || '<p class="text-gray-500 text-sm">データがありません</p>'

                // プラン別分布円グラフ
                if (planBreakdown.length > 0) {
                    if (planChart) planChart.destroy()
                    const planCtx = document.getElementById('planChart').getContext('2d')
                    planChart = new Chart(planCtx, {
                        type: 'pie',
                        data: {
                            labels: planBreakdown.map(p => p.plan_name),
                            datasets: [{
                                data: planBreakdown.map(p => p.count),
                                backgroundColor: [
                                    '#9C27B0',
                                    '#00BCD4',
                                    '#4CAF50',
                                    '#FF9800',
                                    '#F44336',
                                    '#2196F3'
                                ],
                                borderWidth: 2,
                                borderColor: '#fff'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        padding: 15,
                                        font: { size: 12 }
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const label = context.label || ''
                                            const value = context.parsed || 0
                                            const total = context.dataset.data.reduce((a, b) => a + b, 0)
                                            const percentage = Math.round((value / total) * 100)
                                            return label + ': ' + value + '件 (' + percentage + '%)'
                                        }
                                    }
                                }
                            }
                        }
                    })
                }
            }

            document.addEventListener('DOMContentLoaded', loadSubscriptionAnalytics)
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 誕生日メール設定ページ (/birthday-email-settings)
// ============================================
app.get('/birthday-email-settings', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>誕生日メール設定 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <a href="/dashboard" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-birthday-cake mr-2 text-pink-500"></i>
                                誕生日メール設定
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <!-- Loading State -->
                <div id="loadingState" class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-pink-500 mb-4"></i>
                    <p class="text-gray-600">設定を読み込み中...</p>
                </div>

                <!-- Content Container -->
                <div id="contentContainer" class="hidden space-y-6">
                    <!-- 説明カード -->
                    <div class="card p-6 bg-pink-50 border-pink-200">
                        <div class="flex items-start">
                            <i class="fas fa-info-circle text-pink-500 text-xl mr-3 mt-1"></i>
                            <div>
                                <h3 class="font-semibold text-gray-900 mb-2">誕生日メールについて</h3>
                                <p class="text-sm text-gray-700 mb-2">
                                    会員の誕生日に自動的にお祝いメッセージを送信します。
                                </p>
                                <ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
                                    <li>メッセージは誕生日当日に自動送信されます</li>
                                    <li>{{nickname}}で会員のニックネームを挿入できます</li>
                                    <li>{{email}}で会員のメールアドレスを挿入できます</li>
                                    <li>テンプレートは何度でも編集できます</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- テンプレート編集フォーム -->
                    <div class="card p-6">
                        <form id="templateForm" class="space-y-4">
                            <!-- 件名 -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-envelope mr-1 text-pink-500"></i>
                                    メール件名
                                </label>
                                <input type="text" id="inputSubject" required
                                       class="input-field"
                                       placeholder="例: {{nickname}}さん、お誕生日おめでとうございます！">
                            </div>

                            <!-- 本文 -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-align-left mr-1 text-pink-500"></i>
                                    メール本文
                                </label>
                                <textarea id="inputBody" rows="10" required
                                          class="input-field"
                                          placeholder="例:\\n{{nickname}}さん、お誕生日おめでとうございます！\\n\\n素敵な一年になりますように。\\n\\nコミュニティ一同"></textarea>
                                <p class="text-xs text-gray-500 mt-1">
                                    <span id="bodyCharCount">0</span> 文字
                                </p>
                            </div>

                            <!-- 有効/無効 -->
                            <div class="flex items-center">
                                <input type="checkbox" id="inputIsActive" class="mr-2">
                                <label for="inputIsActive" class="text-sm text-gray-700">
                                    この誕生日メールを有効にする
                                </label>
                            </div>

                            <!-- ボタン -->
                            <div class="flex gap-2">
                                <button type="submit" id="saveBtn" class="btn-primary">
                                    <i class="fas fa-save mr-2"></i>
                                    保存
                                </button>
                                <button type="button" id="testBtn" class="btn-secondary">
                                    <i class="fas fa-paper-plane mr-2"></i>
                                    テスト送信
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- プレビューカード -->
                    <div class="card p-6">
                        <h3 class="font-semibold text-gray-900 mb-4">
                            <i class="fas fa-eye mr-2 text-pink-500"></i>
                            プレビュー
                        </h3>
                        <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div class="mb-3">
                                <span class="text-xs text-gray-500">件名:</span>
                                <p id="previewSubject" class="font-semibold text-gray-900">（未設定）</p>
                            </div>
                            <div>
                                <span class="text-xs text-gray-500">本文:</span>
                                <p id="previewBody" class="text-gray-700 whitespace-pre-line">（未設定）</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            let currentTemplate = null

            async function loadTemplate() {
                try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    axios.defaults.headers.common['Authorization'] = 'Bearer ' + token

                    const response = await axios.get('/api/birthday-email/template')
                    
                    if (response.data.success) {
                        currentTemplate = response.data.template
                        if (currentTemplate) {
                            displayTemplate(currentTemplate)
                        } else {
                            // デフォルト値を設定
                            document.getElementById('inputSubject').value = '{{nickname}}さん、お誕生日おめでとうございます！'
                            document.getElementById('inputBody').value = '{{nickname}}さん\\n\\nお誕生日おめでとうございます！\\n素敵な一年になりますように。\\n\\nコミュニティ一同'
                            document.getElementById('inputIsActive').checked = true
                            updatePreview()
                        }
                    }

                    document.getElementById('loadingState').classList.add('hidden')
                    document.getElementById('contentContainer').classList.remove('hidden')

                } catch (error) {
                    console.error('Template load error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login'
                    } else {
                        showToast('設定の読み込みに失敗しました', 'error')
                    }
                }
            }

            function displayTemplate(template) {
                document.getElementById('inputSubject').value = template.subject
                document.getElementById('inputBody').value = template.body
                document.getElementById('inputIsActive').checked = template.is_active === 1
                updatePreview()
            }

            function updatePreview() {
                const subject = document.getElementById('inputSubject').value
                const body = document.getElementById('inputBody').value
                
                // {{nickname}}と{{email}}をサンプル値に置換
                const previewSubject = subject
                    .replace(/{{nickname}}/g, '山田太郎')
                    .replace(/{{email}}/g, 'yamada@example.com')
                
                const previewBody = body
                    .replace(/{{nickname}}/g, '山田太郎')
                    .replace(/{{email}}/g, 'yamada@example.com')
                
                document.getElementById('previewSubject').textContent = previewSubject || '（未設定）'
                document.getElementById('previewBody').textContent = previewBody || '（未設定）'
            }

            // リアルタイムプレビュー更新
            document.getElementById('inputSubject').addEventListener('input', updatePreview)
            document.getElementById('inputBody').addEventListener('input', (e) => {
                const charCount = e.target.value.length
                document.getElementById('bodyCharCount').textContent = charCount
                updatePreview()
            })

            // フォーム送信
            document.getElementById('templateForm').addEventListener('submit', async (e) => {
                e.preventDefault()

                const saveBtn = document.getElementById('saveBtn')
                const originalText = saveBtn.innerHTML
                saveBtn.disabled = true
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中...'

                try {
                    const token = localStorage.getItem('token')
                    const data = {
                        subject: document.getElementById('inputSubject').value,
                        body: document.getElementById('inputBody').value,
                        is_active: document.getElementById('inputIsActive').checked
                    }

                    const response = await axios.post('/api/birthday-email/template', data, {
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        }
                    })

                    if (response.data.success) {
                        currentTemplate = response.data.template
                        showToast('設定を保存しました', 'success')
                    }
                } catch (error) {
                    console.error('Save error:', error)
                    showToast(error.response?.data?.message || '保存に失敗しました', 'error')
                } finally {
                    saveBtn.disabled = false
                    saveBtn.innerHTML = originalText
                }
            })

            // テスト送信
            document.getElementById('testBtn').addEventListener('click', async () => {
                const testBtn = document.getElementById('testBtn')
                const originalText = testBtn.innerHTML
                testBtn.disabled = true
                testBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>送信中...'

                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.post('/api/birthday-email/test', {}, {
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    })

                    if (response.data.success) {
                        showToast('テストメールを送信しました（自分宛）', 'success')
                    }
                } catch (error) {
                    console.error('Test send error:', error)
                    showToast(error.response?.data?.message || 'テスト送信に失敗しました', 'error')
                } finally {
                    testBtn.disabled = false
                    testBtn.innerHTML = originalText
                }
            })

            document.addEventListener('DOMContentLoaded', loadTemplate)
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 統計詳細ページ（準備中）
// ============================================
app.get('/analytics/:page', (c) => {
  const page = c.req.param('page')
  const pageNames: Record<string, string> = {
    'members': '会員分析',
    'posts': 'コンテンツ分析',
    'surveys': 'アンケート分析',
    'subscriptions': '収益分析',
    'engagement': 'エンゲージメント分析',
    'storage': 'ストレージ分析'
  }
  
  const pageName = pageNames[page] || '詳細分析'
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${pageName} - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <a href="/analytics" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-chart-bar mr-2 text-purple-500"></i>
                                ${pageName}
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <div class="text-center py-16">
                    <div class="text-6xl text-gray-300 mb-6">
                        <i class="fas fa-tools"></i>
                    </div>
                    <h2 class="text-3xl font-bold text-gray-900 mb-4">準備中</h2>
                    <p class="text-lg text-gray-600 mb-8">
                        ${pageName}ページは現在開発中です。<br>
                        近日中に公開予定です。
                    </p>
                    <a href="/analytics" class="btn-primary">
                        <i class="fas fa-arrow-left mr-2"></i>
                        統計ダッシュボードに戻る
                    </a>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// ============================================
// ポイント管理ページ (/points-management)
// ============================================
app.get('/points-management', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ポイント管理 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <a href="/dashboard" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-coins mr-2 text-yellow-500"></i>
                                ポイント管理
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <!-- Tabs -->
                <div class="mb-6 border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8">
                        <button id="rulesTab" class="tab-button active" onclick="switchTab('rules')">
                            <i class="fas fa-sliders-h mr-2"></i>
                            ポイントルール
                        </button>
                        <button id="rewardsTab" class="tab-button" onclick="switchTab('rewards')">
                            <i class="fas fa-gift mr-2"></i>
                            報酬管理
                        </button>
                        <button id="exchangesTab" class="tab-button" onclick="switchTab('exchanges')">
                            <i class="fas fa-exchange-alt mr-2"></i>
                            交換申請
                        </button>
                        <button id="grantTab" class="tab-button" onclick="switchTab('grant')">
                            <i class="fas fa-user-plus mr-2"></i>
                            ポイント付与
                        </button>
                    </nav>
                </div>

                <!-- Loading State -->
                <div id="loadingState" class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-yellow-500 mb-4"></i>
                    <p class="text-gray-600">データを読み込み中...</p>
                </div>

                <!-- Rules Tab -->
                <div id="rulesContent" class="tab-content hidden">
                    <div class="card p-6 mb-6 bg-yellow-50 border-yellow-200">
                        <div class="flex items-start">
                            <i class="fas fa-info-circle text-yellow-500 text-xl mr-3 mt-1"></i>
                            <div>
                                <h3 class="font-semibold text-gray-900 mb-2">ポイントルールについて</h3>
                                <p class="text-sm text-gray-700 mb-2">
                                    会員のアクションに対して付与するポイント数を設定できます。
                                </p>
                                <ul class="text-sm text-gray-700 list-disc list-inside space-y-1">
                                    <li><strong>有効</strong>：会員がアクションを実行すると自動的にポイントが付与されます</li>
                                    <li><strong>無効</strong>：ポイント付与を停止します（既存のポイントには影響しません）</li>
                                    <li>ポイント数を0に設定すると、ルールは有効でもポイントは付与されません</li>
                                    <li>各ルールをクリックして、ポイント数と有効/無効を編集できます</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div id="rulesList" class="space-y-6"></div>
                </div>
                                <ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
                                    <li>ポイント数を0にすると付与されません</li>
                                    <li>無効にすると一時的にポイント付与を停止できます</li>
                                    <li>変更はすぐに反映されます</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="card p-6">
                        <h3 class="font-semibold text-gray-900 mb-4">アクション別ポイント設定</h3>
                        <div id="rulesList" class="space-y-4"></div>
                    </div>
                </div>

                <!-- Rewards Tab -->
                <div id="rewardsContent" class="tab-content hidden">
                    <div class="mb-6 flex justify-between items-center">
                        <h3 class="font-semibold text-gray-900">報酬一覧</h3>
                        <button onclick="showCreateRewardModal()" class="btn-primary">
                            <i class="fas fa-plus mr-2"></i>
                            新規作成
                        </button>
                    </div>
                    <div id="rewardsList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
                </div>

                <!-- Exchanges Tab -->
                <div id="exchangesContent" class="tab-content hidden">
                    <div class="mb-6">
                        <h3 class="font-semibold text-gray-900">交換申請一覧</h3>
                    </div>
                    <div id="exchangesList" class="space-y-4"></div>
                </div>

                <!-- Grant Tab -->
                <div id="grantContent" class="tab-content hidden">
                    <div class="card p-6">
                        <h3 class="font-semibold text-gray-900 mb-4">会員へのポイント付与</h3>
                        <form id="grantForm" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    会員ID
                                </label>
                                <input type="number" id="grantUserId" required
                                       class="input-field"
                                       placeholder="会員IDを入力">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    ポイント数
                                </label>
                                <input type="number" id="grantPoints" required min="1"
                                       class="input-field"
                                       placeholder="付与するポイント数">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    備考（任意）
                                </label>
                                <textarea id="grantNote" rows="3"
                                          class="input-field"
                                          placeholder="付与理由など"></textarea>
                            </div>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-gift mr-2"></i>
                                ポイントを付与
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            let currentRules = []

            const actionLabels = {
                // 基本アクション
                'signup': '会員登録',
                'daily_login': 'デイリーログイン',
                'post_view': '記事閲覧（1日1回）',
                'comment_create': 'コメント投稿',
                
                // いいね関連
                'post_like': '投稿にいいね',
                'comment_like': 'コメントにいいね',
                'received_post_like': '投稿にいいねされた',
                'received_comment_like': 'コメントにいいねされた',
                
                // コメント関連
                'comment_reply': 'コメントに返信',
                'received_comment': '自分の投稿にコメントされた',
                
                // プロフィール関連
                'profile_complete': 'プロフィール完成',
                'avatar_upload': 'アバター画像アップロード',
                
                // 連続ログイン
                'login_streak_7': '7日連続ログイン',
                'login_streak_30': '30日連続ログイン',
                
                // その他
                'post_share': '投稿をシェア',
                'post_bookmark': '投稿をブックマーク',
                'first_comment': '初めてのコメント',
                'first_like': '初めてのいいね',
                'birthday_bonus': '誕生日ボーナス',
                'anniversary': '会員登録記念日',
                'survey_complete': 'アンケート回答',
                'feedback_submit': 'フィードバック送信',
                
                // 管理者が有効化するもの
                'subscription': 'サブスクリプション登録',
                'active_commenter': '月間10コメント達成',
                'super_active': '月間50コメント達成',
                'event_participation': 'イベント参加',
                'invite_friend': '友達を招待',
                'invited_signup': '招待された友達が登録'
            }

            const actionCategories = {
                '基本アクション': ['signup', 'daily_login', 'post_view', 'comment_create'],
                'いいね': ['post_like', 'comment_like', 'received_post_like', 'received_comment_like'],
                'コメント': ['comment_reply', 'received_comment', 'first_comment'],
                'プロフィール': ['profile_complete', 'avatar_upload'],
                '連続ログイン': ['login_streak_7', 'login_streak_30'],
                'その他': ['post_share', 'post_bookmark', 'first_like', 'birthday_bonus', 'anniversary', 'survey_complete', 'feedback_submit'],
                '高度な機能': ['subscription', 'active_commenter', 'super_active', 'event_participation', 'invite_friend', 'invited_signup']
            }

            // 自動付与実装済みのアクション
            const implementedActions = [
                'signup',           // 会員登録（承認時）
                'daily_login',      // デイリーログイン
                'post_view',        // 記事閲覧
                'comment_create',   // コメント投稿
                'profile_complete', // プロフィール完成
                'avatar_upload'     // アバターアップロード
            ]

            function switchTab(tab) {
                // タブボタンの切り替え
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'))
                document.getElementById(tab + 'Tab').classList.add('active')

                // コンテンツの切り替え
                document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'))
                document.getElementById(tab + 'Content').classList.remove('hidden')
            }

            async function loadRules() {
                try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    const response = await axios.get('/api/points/rules', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        currentRules = response.data.rules
                        displayRules()
                        document.getElementById('loadingState').classList.add('hidden')
                        document.getElementById('rulesContent').classList.remove('hidden')
                    }
                } catch (error) {
                    console.error('Load rules error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login'
                    } else if (error.response?.status === 403) {
                        showToast('管理者権限が必要です', 'error')
                        setTimeout(() => window.location.href = '/dashboard', 2000)
                    } else {
                        showToast('ルールの読み込みに失敗しました', 'error')
                    }
                }
            }

            function displayRules() {
                const container = document.getElementById('rulesList')
                container.innerHTML = ''

                // カテゴリ別に表示
                Object.entries(actionCategories).forEach(([category, actions]) => {
                    const categoryRules = currentRules.filter(rule => actions.includes(rule.action))
                    
                    if (categoryRules.length === 0) return

                    // カテゴリヘッダー
                    const categoryHeader = document.createElement('div')
                    categoryHeader.className = 'mb-3'
                    categoryHeader.innerHTML = \`<h4 class="font-semibold text-gray-900 text-lg">\${category}</h4>\`
                    container.appendChild(categoryHeader)

                    // カテゴリ内のルール
                    const categoryContainer = document.createElement('div')
                    categoryContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'
                    
                    categoryRules.forEach(rule => {
                        const ruleCard = document.createElement('div')
                        const isImplemented = implementedActions.includes(rule.action)
                        const cardBorder = rule.is_active ? 'border-green-300 bg-green-50' : 'border-gray-200'
                        ruleCard.className = \`border rounded-lg p-4 hover:shadow-md transition-all \${cardBorder}\`
                        ruleCard.innerHTML = \`
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2 mb-1 flex-wrap">
                                        <h5 class="font-semibold text-gray-900">\${actionLabels[rule.action] || rule.action}</h5>
                                        <span class="\${rule.is_active ? 'badge-success' : 'badge-secondary'} text-xs">\${rule.is_active ? '✓ 有効' : '無効'}</span>
                                        \${isImplemented ? '<span class="badge-info text-xs">自動付与</span>' : '<span class="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs">手動のみ</span>'}
                                    </div>
                                    <p class="text-xs text-gray-600">\${rule.note || ''}</p>
                                </div>
                                <div class="text-right ml-3">
                                    <p class="text-xl font-bold text-yellow-600">\${rule.points}pt</p>
                                </div>
                            </div>
                            <button onclick="editRule('\${rule.action}')" class="btn-secondary w-full text-sm">
                                <i class="fas fa-edit mr-1"></i>
                                ポイント数と有効/無効を編集
                            </button>
                        \`
                        categoryContainer.appendChild(ruleCard)
                    })
                    
                    container.appendChild(categoryContainer)
                })

                // 未分類のルール
                const uncategorizedRules = currentRules.filter(rule => {
                    return !Object.values(actionCategories).flat().includes(rule.action)
                })
                
                if (uncategorizedRules.length > 0) {
                    const categoryHeader = document.createElement('div')
                    categoryHeader.className = 'mb-3'
                    categoryHeader.innerHTML = '<h4 class="font-semibold text-gray-900 text-lg">その他</h4>'
                    container.appendChild(categoryHeader)

                    const categoryContainer = document.createElement('div')
                    categoryContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'
                    
                    uncategorizedRules.forEach(rule => {
                        const ruleCard = document.createElement('div')
                        const isImplemented = implementedActions.includes(rule.action)
                        const cardBorder = rule.is_active ? 'border-green-300 bg-green-50' : 'border-gray-200'
                        ruleCard.className = \`border rounded-lg p-4 hover:shadow-md transition-all \${cardBorder}\`
                        ruleCard.innerHTML = \`
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2 mb-1 flex-wrap">
                                        <h5 class="font-semibold text-gray-900">\${rule.action}</h5>
                                        <span class="\${rule.is_active ? 'badge-success' : 'badge-secondary'} text-xs">\${rule.is_active ? '✓ 有効' : '無効'}</span>
                                        \${isImplemented ? '<span class="badge-info text-xs">自動付与</span>' : '<span class="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs">手動のみ</span>'}
                                    </div>
                                    <p class="text-xs text-gray-600">\${rule.note || ''}</p>
                                </div>
                                <div class="text-right ml-3">
                                    <p class="text-xl font-bold text-yellow-600">\${rule.points}pt</p>
                                </div>
                            </div>
                            <button onclick="editRule('\${rule.action}')" class="btn-secondary w-full text-sm">
                                <i class="fas fa-edit mr-1"></i>
                                ポイント数と有効/無効を編集
                            </button>
                        \`
                        categoryContainer.appendChild(ruleCard)
                    })
                    
                    container.appendChild(categoryContainer)
                }
            }

            async function editRule(action) {
                const rule = currentRules.find(r => r.action === action)
                if (!rule) return

                const isImplemented = implementedActions.includes(action)
                const implementNote = isImplemented 
                    ? '\\n\\n【自動付与】このルールは会員のアクション時に自動的にポイント付与されます。\\n無効にすると自動付与が停止されます。' 
                    : '\\n\\n【手動付与のみ】このルールは管理画面から手動でのみ付与できます。'

                const points = prompt(\`\${actionLabels[action] || action}のポイント数を入力してください：\${implementNote}\`, rule.points)
                if (points === null) return

                const pointsNum = parseInt(points)
                if (isNaN(pointsNum) || pointsNum < 0) {
                    showToast('無効なポイント数です', 'error')
                    return
                }

                const isActive = confirm('このルールを有効にしますか？\\n\\n✓ OK = 有効（ポイント付与が実行されます）\\n✗ キャンセル = 無効（ポイント付与が停止されます）')

                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.put(\`/api/points/rules/\${action}\`, {
                        points: pointsNum,
                        is_active: isActive,
                        note: rule.note
                    }, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        showToast(\`ルールを更新しました（\${isActive ? '有効' : '無効'}）\`, 'success')
                        loadRules()
                    }
                } catch (error) {
                    console.error('Update rule error:', error)
                    showToast(error.response?.data?.error || 'ルールの更新に失敗しました', 'error')
                }
            }

            // 報酬管理
            let currentRewards = []

            async function loadRewards() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('/api/points/admin/rewards', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        currentRewards = response.data.rewards
                        displayRewards()
                    }
                } catch (error) {
                    console.error('Load rewards error:', error)
                    showToast('報酬の読み込みに失敗しました', 'error')
                }
            }

            function displayRewards() {
                const container = document.getElementById('rewardsList')
                container.innerHTML = ''

                if (currentRewards.length === 0) {
                    container.innerHTML = '<p class="text-gray-600 text-center col-span-full py-12">報酬がありません</p>'
                    return
                }

                currentRewards.forEach(reward => {
                    const card = document.createElement('div')
                    card.className = 'card p-4'
                    card.innerHTML = \`
                        <div class="mb-3">
                            \${reward.image_url ? \`<img src="\${reward.image_url}" class="w-full h-32 object-cover rounded mb-2">\` : '<div class="w-full h-32 bg-gray-200 rounded mb-2 flex items-center justify-center"><i class="fas fa-gift text-4xl text-gray-400"></i></div>'}
                            <h4 class="font-semibold text-gray-900">\${reward.name}</h4>
                            <p class="text-sm text-gray-600 mt-1">\${reward.description || ''}</p>
                        </div>
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <span class="text-lg font-bold text-yellow-600">\${reward.points_required}pt</span>
                                <span class="text-xs text-gray-500 ml-2">在庫: \${reward.stock === -1 ? '無制限' : reward.stock}</span>
                            </div>
                            <span class="\${reward.is_active ? 'badge-success' : 'badge-secondary'}">\${reward.is_active ? '有効' : '無効'}</span>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="editReward(\${reward.id})" class="btn-secondary flex-1">
                                <i class="fas fa-edit"></i>
                                編集
                            </button>
                            <button onclick="deleteReward(\${reward.id})" class="btn-secondary text-red-600">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    \`
                    container.appendChild(card)
                })
            }

            function showCreateRewardModal() {
                const name = prompt('報酬名を入力してください：')
                if (!name) return

                const description = prompt('説明を入力してください（任意）：')
                const pointsRequired = prompt('必要ポイント数を入力してください：')
                if (!pointsRequired) return

                const pointsNum = parseInt(pointsRequired)
                if (isNaN(pointsNum) || pointsNum <= 0) {
                    showToast('無効なポイント数です', 'error')
                    return
                }

                const stock = prompt('在庫数を入力してください（-1で無制限）：', '-1')
                const stockNum = parseInt(stock)

                createReward({
                    name,
                    description: description || null,
                    points_required: pointsNum,
                    stock: stockNum,
                    display_order: 0
                })
            }

            async function createReward(data) {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.post('/api/points/admin/rewards', data, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        showToast('報酬を作成しました', 'success')
                        loadRewards()
                    }
                } catch (error) {
                    console.error('Create reward error:', error)
                    showToast(error.response?.data?.error || '報酬の作成に失敗しました', 'error')
                }
            }

            async function editReward(id) {
                const reward = currentRewards.find(r => r.id === id)
                if (!reward) return

                const name = prompt('報酬名を入力してください：', reward.name)
                if (!name) return

                const description = prompt('説明を入力してください（任意）：', reward.description || '')
                const pointsRequired = prompt('必要ポイント数を入力してください：', reward.points_required)
                if (!pointsRequired) return

                const pointsNum = parseInt(pointsRequired)
                if (isNaN(pointsNum) || pointsNum <= 0) {
                    showToast('無効なポイント数です', 'error')
                    return
                }

                const stock = prompt('在庫数を入力してください（-1で無制限）：', reward.stock)
                const stockNum = parseInt(stock)

                const isActive = confirm('この報酬を有効にしますか？')

                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.put(\`/api/points/admin/rewards/\${id}\`, {
                        name,
                        description: description || null,
                        points_required: pointsNum,
                        stock: stockNum,
                        is_active: isActive,
                        display_order: reward.display_order
                    }, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        showToast('報酬を更新しました', 'success')
                        loadRewards()
                    }
                } catch (error) {
                    console.error('Update reward error:', error)
                    showToast(error.response?.data?.error || '報酬の更新に失敗しました', 'error')
                }
            }

            async function deleteReward(id) {
                if (!confirm('この報酬を削除しますか？')) return

                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.delete(\`/api/points/admin/rewards/\${id}\`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        showToast('報酬を削除しました', 'success')
                        loadRewards()
                    }
                } catch (error) {
                    console.error('Delete reward error:', error)
                    showToast(error.response?.data?.error || '報酬の削除に失敗しました', 'error')
                }
            }

            // 交換申請管理
            let currentExchanges = []

            async function loadExchanges() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('/api/points/admin/exchanges', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        currentExchanges = response.data.exchanges
                        displayExchanges()
                    }
                } catch (error) {
                    console.error('Load exchanges error:', error)
                    showToast('交換申請の読み込みに失敗しました', 'error')
                }
            }

            function displayExchanges() {
                const container = document.getElementById('exchangesList')
                container.innerHTML = ''

                if (currentExchanges.length === 0) {
                    container.innerHTML = '<p class="text-gray-600 text-center py-12">交換申請がありません</p>'
                    return
                }

                const pendingExchanges = currentExchanges.filter(e => e.status === 'pending')
                const completedExchanges = currentExchanges.filter(e => e.status !== 'pending')

                if (pendingExchanges.length > 0) {
                    const pendingSection = document.createElement('div')
                    pendingSection.innerHTML = '<h4 class="font-semibold text-gray-900 mb-3">承認待ち</h4>'
                    container.appendChild(pendingSection)

                    pendingExchanges.forEach(exchange => {
                        container.appendChild(createExchangeCard(exchange, true))
                    })
                }

                if (completedExchanges.length > 0) {
                    const completedSection = document.createElement('div')
                    completedSection.innerHTML = '<h4 class="font-semibold text-gray-900 mb-3 mt-6">処理済み</h4>'
                    container.appendChild(completedSection)

                    completedExchanges.forEach(exchange => {
                        container.appendChild(createExchangeCard(exchange, false))
                    })
                }
            }

            function createExchangeCard(exchange, isPending) {
                const card = document.createElement('div')
                card.className = 'card p-4'
                
                const statusColors = {
                    'pending': 'badge-warning',
                    'approved': 'badge-success',
                    'rejected': 'badge-secondary'
                }
                const statusLabels = {
                    'pending': '承認待ち',
                    'approved': '承認済み',
                    'rejected': '却下'
                }

                card.innerHTML = \`
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-900">\${exchange.reward_name}</h4>
                            <p class="text-sm text-gray-600 mt-1">
                                会員: \${exchange.user_name} (\${exchange.user_email})
                            </p>
                            <p class="text-sm text-gray-600">
                                消費ポイント: <span class="font-semibold text-yellow-600">\${exchange.points_spent}pt</span>
                            </p>
                            <p class="text-xs text-gray-500 mt-2">\${new Date(exchange.created_at).toLocaleString('ja-JP')}</p>
                        </div>
                        <span class="\${statusColors[exchange.status]}">\${statusLabels[exchange.status]}</span>
                    </div>
                    \${exchange.admin_note ? \`<p class="text-sm text-gray-600 mb-3">メモ: \${exchange.admin_note}</p>\` : ''}
                    \${isPending ? \`
                        <div class="flex gap-2">
                            <button onclick="approveExchange(\${exchange.id})" class="btn-primary flex-1">
                                <i class="fas fa-check mr-2"></i>
                                承認
                            </button>
                            <button onclick="rejectExchange(\${exchange.id})" class="btn-secondary text-red-600 flex-1">
                                <i class="fas fa-times mr-2"></i>
                                却下
                            </button>
                        </div>
                    \` : \`
                        \${exchange.approved_by_name ? \`<p class="text-xs text-gray-500">処理者: \${exchange.approved_by_name}</p>\` : ''}
                        \${exchange.approved_at ? \`<p class="text-xs text-gray-500">処理日時: \${new Date(exchange.approved_at).toLocaleString('ja-JP')}</p>\` : ''}
                    \`}
                \`
                return card
            }

            async function approveExchange(id) {
                const note = prompt('管理者メモ（任意）：')
                
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.post(\`/api/points/admin/exchanges/\${id}/approve\`, {
                        admin_note: note || null
                    }, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        showToast('交換を承認しました', 'success')
                        loadExchanges()
                    }
                } catch (error) {
                    console.error('Approve exchange error:', error)
                    showToast(error.response?.data?.error || '承認に失敗しました', 'error')
                }
            }

            async function rejectExchange(id) {
                const note = prompt('却下理由を入力してください：')
                if (!note) return

                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.post(\`/api/points/admin/exchanges/\${id}/reject\`, {
                        admin_note: note
                    }, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        showToast('交換を却下し、ポイントを返却しました', 'success')
                        loadExchanges()
                    }
                } catch (error) {
                    console.error('Reject exchange error:', error)
                    showToast(error.response?.data?.error || '却下に失敗しました', 'error')
                }
            }

            // ポイント付与
            document.getElementById('grantForm').addEventListener('submit', async (e) => {
                e.preventDefault()

                const userId = document.getElementById('grantUserId').value
                const points = document.getElementById('grantPoints').value
                const note = document.getElementById('grantNote').value

                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.post('/api/points/admin/grant', {
                        user_id: parseInt(userId),
                        points: parseInt(points),
                        note: note || null
                    }, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        showToast(response.data.message, 'success')
                        document.getElementById('grantForm').reset()
                    }
                } catch (error) {
                    console.error('Grant points error:', error)
                    showToast(error.response?.data?.error || 'ポイント付与に失敗しました', 'error')
                }
            })

            // タブ切り替え時のデータ読み込み
            const originalSwitchTab = switchTab
            switchTab = function(tab) {
                originalSwitchTab(tab)
                
                if (tab === 'rewards' && currentRewards.length === 0) {
                    loadRewards()
                } else if (tab === 'exchanges' && currentExchanges.length === 0) {
                    loadExchanges()
                }
            }

            // 初期化
            document.addEventListener('DOMContentLoaded', () => {
                loadRules()
            })
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 会員向けポイントページ (/tenant/points)
// ============================================
app.get('/tenant/points', (c) => {
  const subdomain = c.req.query('subdomain')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>マイポイント - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <a href="/tenant/home?subdomain=\${subdomain}" class="text-gray-600 hover:text-gray-900">
                            <i class="fas fa-arrow-left mr-2"></i>
                            戻る
                        </a>
                        <h1 class="text-2xl font-bold text-gray-900">
                            <i class="fas fa-coins mr-2 text-yellow-500"></i>
                            マイポイント
                        </h1>
                        <div></div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <!-- ポイント残高カード -->
                <div class="card p-6 mb-6 bg-gradient-to-r from-yellow-50 to-yellow-100">
                    <div class="text-center">
                        <p class="text-sm text-gray-600 mb-2">現在の残高</p>
                        <p class="text-5xl font-bold text-yellow-600 mb-4" id="currentBalance">0</p>
                        <div class="flex justify-center gap-8 text-sm text-gray-600">
                            <div>
                                <p class="text-xs">累計獲得</p>
                                <p class="font-semibold" id="totalEarned">0pt</p>
                            </div>
                            <div>
                                <p class="text-xs">累計消費</p>
                                <p class="font-semibold" id="totalSpent">0pt</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- タブ -->
                <div class="mb-6 border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8">
                        <button id="historyTab" class="tab-button active" onclick="switchPointTab('history')">
                            <i class="fas fa-history mr-2"></i>
                            ポイント履歴
                        </button>
                        <button id="rewardsTab" class="tab-button" onclick="switchPointTab('rewards')">
                            <i class="fas fa-gift mr-2"></i>
                            報酬一覧
                        </button>
                        <button id="myExchangesTab" class="tab-button" onclick="switchPointTab('myExchanges')">
                            <i class="fas fa-exchange-alt mr-2"></i>
                            交換履歴
                        </button>
                    </nav>
                </div>

                <!-- ポイント履歴タブ -->
                <div id="historyContent" class="tab-content">
                    <div class="card p-6">
                        <h3 class="font-semibold text-gray-900 mb-4">ポイント履歴</h3>
                        <div id="transactionsList" class="space-y-3"></div>
                    </div>
                </div>

                <!-- 報酬一覧タブ -->
                <div id="rewardsContent" class="tab-content hidden">
                    <div id="availableRewardsList" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
                </div>

                <!-- 交換履歴タブ -->
                <div id="myExchangesContent" class="tab-content hidden">
                    <div id="myExchangesList" class="space-y-4"></div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            let pointBalance = null
            let transactions = []
            let rewards = []
            let myExchanges = []

            function switchPointTab(tab) {
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'))
                document.getElementById(tab + 'Tab').classList.add('active')

                document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'))
                document.getElementById(tab + 'Content').classList.remove('hidden')

                if (tab === 'rewards' && rewards.length === 0) {
                    loadRewards()
                } else if (tab === 'myExchanges' && myExchanges.length === 0) {
                    loadMyExchanges()
                }
            }

            async function loadBalance() {
                try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                        window.location.href = '/login?subdomain=\${subdomain}'
                        return
                    }

                    const response = await axios.get('/api/points/balance', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        pointBalance = response.data.balance
                        document.getElementById('currentBalance').textContent = (pointBalance.balance || 0).toLocaleString() + 'pt'
                        document.getElementById('totalEarned').textContent = (pointBalance.total_earned || 0).toLocaleString() + 'pt'
                        document.getElementById('totalSpent').textContent = (pointBalance.total_spent || 0).toLocaleString() + 'pt'
                    }
                } catch (error) {
                    console.error('Load balance error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login?subdomain=\${subdomain}'
                    }
                }
            }

            async function loadTransactions() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('/api/points/transactions', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        transactions = response.data.transactions
                        displayTransactions()
                    }
                } catch (error) {
                    console.error('Load transactions error:', error)
                }
            }

            function displayTransactions() {
                const container = document.getElementById('transactionsList')
                container.innerHTML = ''

                if (transactions.length === 0) {
                    container.innerHTML = '<p class="text-gray-600 text-center py-8">履歴がありません</p>'
                    return
                }

                transactions.forEach(tx => {
                    const div = document.createElement('div')
                    div.className = 'flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50'
                    
                    const reasonLabels = {
                        // 基本アクション
                        'signup': '会員登録ボーナス',
                        'daily_login': 'デイリーログイン',
                        'post_view': '記事閲覧',
                        'comment_create': 'コメント投稿',
                        
                        // いいね関連
                        'post_like': '投稿にいいね',
                        'comment_like': 'コメントにいいね',
                        'received_post_like': '投稿にいいねされた',
                        'received_comment_like': 'コメントにいいねされた',
                        
                        // コメント関連
                        'comment_reply': 'コメントに返信',
                        'received_comment': '自分の投稿にコメントされた',
                        
                        // プロフィール関連
                        'profile_complete': 'プロフィール完成',
                        'avatar_upload': 'アバター画像アップロード',
                        
                        // 連続ログイン
                        'login_streak_7': '7日連続ログイン',
                        'login_streak_30': '30日連続ログイン',
                        
                        // その他
                        'post_share': '投稿をシェア',
                        'post_bookmark': '投稿をブックマーク',
                        'first_comment': '初めてのコメント',
                        'first_like': '初めてのいいね',
                        'birthday_bonus': '誕生日ボーナス',
                        'anniversary': '会員登録記念日',
                        'survey_complete': 'アンケート回答',
                        'feedback_submit': 'フィードバック送信',
                        
                        // 高度な機能
                        'subscription': 'サブスクリプション登録',
                        'active_commenter': '月間10コメント達成',
                        'super_active': '月間50コメント達成',
                        'event_participation': 'イベント参加',
                        'invite_friend': '友達を招待',
                        'invited_signup': '招待された友達が登録',
                        
                        // システム
                        'admin_grant': '管理者付与',
                        'reward_exchange': '報酬交換',
                        'exchange_rejected': '交換却下（返却）'
                    }

                    const isEarn = tx.action_type === 'earn'
                    const icon = isEarn ? 'fa-plus-circle text-green-500' : 'fa-minus-circle text-red-500'

                    div.innerHTML = \\\`
                        <div class="flex-1">
                            <div class="flex items-center space-x-2">
                                <i class="fas \\\${icon}"></i>
                                <span class="font-semibold text-gray-900">\\\${reasonLabels[tx.reason] || tx.reason}</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">\\\${new Date(tx.created_at).toLocaleString('ja-JP')}</p>
                            \\\${tx.note ? \\\`<p class="text-xs text-gray-600 mt-1">\\\${tx.note}</p>\\\` : ''}
                            \\\${tx.admin_name ? \\\`<p class="text-xs text-gray-500">付与者: \\\${tx.admin_name}</p>\\\` : ''}
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-bold \\\${isEarn ? 'text-green-600' : 'text-red-600'}">
                                \\\${isEarn ? '+' : '-'}\\\${tx.points}pt
                            </p>
                            <p class="text-xs text-gray-500">残高: \\\${tx.balance_after}pt</p>
                        </div>
                    \\\`
                    container.appendChild(div)
                })
            }

            async function loadRewards() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('/api/points/rewards', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        rewards = response.data.rewards
                        displayRewards()
                    }
                } catch (error) {
                    console.error('Load rewards error:', error)
                    showToast('報酬の読み込みに失敗しました', 'error')
                }
            }

            function displayRewards() {
                const container = document.getElementById('availableRewardsList')
                container.innerHTML = ''

                if (rewards.length === 0) {
                    container.innerHTML = '<p class="text-gray-600 text-center col-span-full py-12">報酬がありません</p>'
                    return
                }

                rewards.forEach(reward => {
                    const card = document.createElement('div')
                    card.className = 'card p-4'
                    const canExchange = pointBalance && pointBalance.balance >= reward.points_required && reward.stock !== 0
                    
                    card.innerHTML = \\\`
                        <div class="mb-3">
                            \\\${reward.image_url ? \\\`<img src="\\\${reward.image_url}" class="w-full h-32 object-cover rounded mb-2">\\\` : '<div class="w-full h-32 bg-gray-200 rounded mb-2 flex items-center justify-center"><i class="fas fa-gift text-4xl text-gray-400"></i></div>'}
                            <h4 class="font-semibold text-gray-900">\\\${reward.name}</h4>
                            <p class="text-sm text-gray-600 mt-1">\\\${reward.description || ''}</p>
                        </div>
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-lg font-bold text-yellow-600">\\\${reward.points_required}pt</span>
                            <span class="text-xs text-gray-500">在庫: \\\${reward.stock === -1 ? '無制限' : reward.stock}</span>
                        </div>
                        <button onclick="exchangeReward(\\\${reward.id})" class="btn-primary w-full" \\\${!canExchange ? 'disabled' : ''}>
                            <i class="fas fa-exchange-alt mr-2"></i>
                            \\\${canExchange ? '交換する' : 'ポイント不足'}
                        </button>
                    \\\`
                    container.appendChild(card)
                })
            }

            async function exchangeReward(rewardId) {
                if (!confirm('この報酬と交換しますか？\\n\\n※交換申請は管理者の承認が必要です')) return

                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.post(\\\`/api/points/rewards/\\\${rewardId}/exchange\\\`, {}, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        showToast(response.data.message, 'success')
                        loadBalance()
                        loadTransactions()
                        loadRewards()
                    }
                } catch (error) {
                    console.error('Exchange reward error:', error)
                    showToast(error.response?.data?.error || '交換申請に失敗しました', 'error')
                }
            }

            async function loadMyExchanges() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('/api/points/exchanges', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        myExchanges = response.data.exchanges
                        displayMyExchanges()
                    }
                } catch (error) {
                    console.error('Load exchanges error:', error)
                }
            }

            function displayMyExchanges() {
                const container = document.getElementById('myExchangesList')
                container.innerHTML = ''

                if (myExchanges.length === 0) {
                    container.innerHTML = '<p class="text-gray-600 text-center py-12">交換履歴がありません</p>'
                    return
                }

                const statusColors = {
                    'pending': 'badge-warning',
                    'approved': 'badge-success',
                    'rejected': 'badge-secondary'
                }
                const statusLabels = {
                    'pending': '承認待ち',
                    'approved': '承認済み',
                    'rejected': '却下'
                }

                myExchanges.forEach(exchange => {
                    const card = document.createElement('div')
                    card.className = 'card p-4'
                    card.innerHTML = \\\`
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1">
                                <h4 class="font-semibold text-gray-900">\\\${exchange.reward_name}</h4>
                                <p class="text-sm text-gray-600 mt-1">\\\${exchange.reward_description || ''}</p>
                                <p class="text-sm text-gray-600 mt-2">
                                    消費ポイント: <span class="font-semibold text-yellow-600">\\\${exchange.points_spent}pt</span>
                                </p>
                                <p class="text-xs text-gray-500 mt-2">\\\${new Date(exchange.created_at).toLocaleString('ja-JP')}</p>
                            </div>
                            <span class="\\\${statusColors[exchange.status]}">\\\${statusLabels[exchange.status]}</span>
                        </div>
                        \\\${exchange.admin_note ? \\\`<p class="text-sm text-gray-600 mt-3 p-2 bg-gray-50 rounded">管理者メモ: \\\${exchange.admin_note}</p>\\\` : ''}
                    \\\`
                    container.appendChild(card)
                })
            }

            // 初期化
            document.addEventListener('DOMContentLoaded', () => {
                loadBalance()
                loadTransactions()
            })
        </script>
    </body>
    </html>
  `)
})

// ============================================
// ショップ設定ページ (/shop-settings)
// ============================================
app.get('/shop-settings', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ショップ設定 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <a href="/dashboard" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-store mr-2 text-purple-500"></i>
                                ショップ設定
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <!-- 販売可否ステータス -->
                <div id="statusCard" class="card p-6 mb-6 hidden">
                    <div class="flex items-start">
                        <div id="statusIcon" class="text-4xl mr-4"></div>
                        <div>
                            <h3 id="statusTitle" class="font-semibold text-gray-900 mb-2"></h3>
                            <p id="statusMessage" class="text-sm text-gray-700"></p>
                        </div>
                    </div>
                </div>

                <!-- タブ -->
                <div class="mb-6 border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8">
                        <button id="legalTab" class="tab-button active" onclick="switchTab('legal')">
                            <i class="fas fa-file-contract mr-2"></i>
                            特定商取引法
                        </button>
                        <button id="productsTab" class="tab-button" onclick="switchTab('products')">
                            <i class="fas fa-box mr-2"></i>
                            商品管理
                        </button>
                        <button id="ordersTab" class="tab-button" onclick="switchTab('orders')">
                            <i class="fas fa-shopping-cart mr-2"></i>
                            注文管理
                        </button>
                    </nav>
                </div>

                <!-- 特定商取引法タブ -->
                <div id="legalContent" class="tab-content">
                    <div class="card p-6 mb-6 bg-yellow-50 border-yellow-200">
                        <div class="flex items-start">
                            <i class="fas fa-exclamation-triangle text-yellow-500 text-xl mr-3 mt-1"></i>
                            <div>
                                <h3 class="font-semibold text-gray-900 mb-2">特定商取引法について</h3>
                                <p class="text-sm text-gray-700 mb-2">
                                    インターネット通販を行う場合、特定商取引法に基づく事業者情報の表示が法律で義務付けられています。
                                </p>
                                <p class="text-sm text-gray-700">
                                    以下の情報をすべて入力することで、商品の販売が可能になります。
                                </p>
                            </div>
                        </div>
                    </div>

                    <form id="legalForm" class="card p-6 space-y-6">
                        <h3 class="font-semibold text-gray-900 text-lg mb-4">事業者情報</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    事業者名 <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="business_name" required
                                       class="input-field"
                                       placeholder="例: 株式会社サンプル">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    代表者名
                                </label>
                                <input type="text" id="representative_name"
                                       class="input-field"
                                       placeholder="例: 山田 太郎">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    郵便番号 <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="postal_code" required
                                       class="input-field"
                                       placeholder="例: 123-4567">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    住所 <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="address" required
                                       class="input-field"
                                       placeholder="例: 東京都渋谷区1-2-3">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    電話番号 <span class="text-red-500">*</span>
                                </label>
                                <input type="tel" id="phone_number" required
                                       class="input-field"
                                       placeholder="例: 03-1234-5678">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    メールアドレス <span class="text-red-500">*</span>
                                </label>
                                <input type="email" id="email" required
                                       class="input-field"
                                       placeholder="例: info@example.com">
                            </div>
                            
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    営業時間
                                </label>
                                <input type="text" id="business_hours"
                                       class="input-field"
                                       placeholder="例: 平日10:00-18:00">
                            </div>
                        </div>

                        <h3 class="font-semibold text-gray-900 text-lg mt-8 mb-4">販売条件</h3>
                        
                        <div class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    支払方法 <span class="text-red-500">*</span>
                                </label>
                                <textarea id="payment_methods" required rows="2"
                                          class="input-field"
                                          placeholder="例: クレジットカード（Visa、Mastercard、JCB、American Express）"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    支払時期 <span class="text-red-500">*</span>
                                </label>
                                <textarea id="payment_timing" required rows="2"
                                          class="input-field"
                                          placeholder="例: 商品注文時にお支払いが確定します"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    商品引渡時期 <span class="text-red-500">*</span>
                                </label>
                                <textarea id="delivery_time" required rows="2"
                                          class="input-field"
                                          placeholder="例: ご注文から3営業日以内に発送いたします"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    送料について <span class="text-red-500">*</span>
                                </label>
                                <textarea id="shipping_fee_info" required rows="2"
                                          class="input-field"
                                          placeholder="例: 全国一律500円。10,000円以上のご購入で送料無料"></textarea>
                            </div>
                        </div>

                        <h3 class="font-semibold text-gray-900 text-lg mt-8 mb-4">返品・交換について</h3>
                        
                        <div class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    返品ポリシー <span class="text-red-500">*</span>
                                </label>
                                <textarea id="return_policy" required rows="4"
                                          class="input-field"
                                          placeholder="例: 商品到着後8日以内であれば、未開封・未使用に限り返品可能です。お客様都合による返品の場合は返送料をご負担ください。"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    返品可能期間 <span class="text-red-500">*</span>
                                </label>
                                <input type="number" id="return_period" required min="1"
                                       class="input-field"
                                       placeholder="8"
                                       value="8">
                                <p class="text-xs text-gray-500 mt-1">日数で入力してください（デフォルト: 8日）</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    返品送料負担 <span class="text-red-500">*</span>
                                </label>
                                <textarea id="return_shipping_fee" required rows="2"
                                          class="input-field"
                                          placeholder="例: 返品時の送料はお客様負担となります。ただし、初期不良・誤配送の場合は当社が負担いたします。"></textarea>
                            </div>
                        </div>

                        <h3 class="font-semibold text-gray-900 text-lg mt-8 mb-4">その他（任意）</h3>
                        
                        <div class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    その他費用
                                </label>
                                <textarea id="additional_fees" rows="2"
                                          class="input-field"
                                          placeholder="例: 代金引換の場合は手数料300円が別途かかります"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    商品瑕疵責任
                                </label>
                                <textarea id="product_liability" rows="2"
                                          class="input-field"
                                          placeholder="例: 商品の瑕疵がある場合は、商品到着後7日以内にご連絡ください。交換または返金にて対応いたします。"></textarea>
                            </div>
                        </div>

                        <div class="flex items-center justify-end space-x-4 mt-8">
                            <button type="button" onclick="location.href='/dashboard'" class="btn-secondary">
                                キャンセル
                            </button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save mr-2"></i>
                                保存する
                            </button>
                        </div>
                    </form>
                </div>

                <!-- 商品管理タブ -->
                <div id="productsContent" class="tab-content hidden">
                    <!-- カテゴリ管理セクション -->
                    <div class="card p-6 mb-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-semibold text-gray-900 text-lg">
                                <i class="fas fa-folder mr-2"></i>
                                カテゴリ管理
                            </h3>
                            <button onclick="openCategoryModal()" class="btn-primary">
                                <i class="fas fa-plus mr-2"></i>
                                カテゴリ追加
                            </button>
                        </div>
                        
                        <div id="categoriesList" class="space-y-2">
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                <p>読み込み中...</p>
                            </div>
                        </div>
                    </div>

                    <!-- 商品一覧セクション -->
                    <div class="card p-6">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center space-x-4">
                                <h3 class="font-semibold text-gray-900 text-lg">
                                    <i class="fas fa-box mr-2"></i>
                                    商品一覧
                                </h3>
                                
                                <!-- フィルター -->
                                <div class="flex items-center space-x-2">
                                    <select id="categoryFilter" onchange="loadProducts()" 
                                            class="input-field py-1.5 text-sm">
                                        <option value="">すべてのカテゴリ</option>
                                    </select>
                                    
                                    <select id="typeFilter" onchange="loadProducts()" 
                                            class="input-field py-1.5 text-sm">
                                        <option value="">すべてのタイプ</option>
                                        <option value="physical">物販</option>
                                        <option value="ticket">チケット</option>
                                        <option value="digital">デジタル</option>
                                    </select>
                                    
                                    <select id="statusFilter" onchange="loadProducts()" 
                                            class="input-field py-1.5 text-sm">
                                        <option value="">すべてのステータス</option>
                                        <option value="active">公開中</option>
                                        <option value="inactive">非公開</option>
                                    </select>
                                </div>
                            </div>
                            
                            <button onclick="openProductModal()" class="btn-primary">
                                <i class="fas fa-plus mr-2"></i>
                                商品追加
                            </button>
                        </div>
                        
                        <div id="productsList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div class="col-span-full text-center py-8 text-gray-500">
                                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                <p>読み込み中...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- カテゴリモーダル -->
                <div id="categoryModal" class="modal hidden">
                    <div class="modal-content max-w-md">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-bold" id="categoryModalTitle">カテゴリ追加</h3>
                            <button onclick="closeCategoryModal()" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <form id="categoryForm" class="space-y-4">
                            <input type="hidden" id="categoryId">
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    カテゴリ名 <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="categoryName" required
                                       class="input-field"
                                       placeholder="例: チケット">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    説明
                                </label>
                                <textarea id="categoryDescription" rows="3"
                                          class="input-field"
                                          placeholder="カテゴリの説明（任意）"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    表示順
                                </label>
                                <input type="number" id="categoryDisplayOrder"
                                       class="input-field"
                                       value="0"
                                       min="0">
                                <p class="text-xs text-gray-500 mt-1">数字が小さいほど上位に表示されます</p>
                            </div>
                            
                            <div class="flex justify-end space-x-3">
                                <button type="button" onclick="closeCategoryModal()" class="btn-secondary">
                                    キャンセル
                                </button>
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-save mr-2"></i>
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- 商品モーダル -->
                <div id="productModal" class="modal hidden">
                    <div class="modal-content max-w-3xl">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-bold" id="productModalTitle">商品追加</h3>
                            <button onclick="closeProductModal()" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <form id="productForm" class="space-y-6">
                            <input type="hidden" id="productId">
                            
                            <!-- 基本情報 -->
                            <div class="space-y-4">
                                <h4 class="font-semibold text-gray-900">基本情報</h4>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            商品名 <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="productName" required
                                               class="input-field"
                                               placeholder="例: イベント参加チケット">
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            商品タイプ <span class="text-red-500">*</span>
                                        </label>
                                        <select id="productType" required onchange="handleTypeChange()"
                                                class="input-field">
                                            <option value="">選択してください</option>
                                            <option value="physical">物販（配送あり）</option>
                                            <option value="ticket">チケット（イベント参加）</option>
                                            <option value="digital">デジタル商品</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            価格（円） <span class="text-red-500">*</span>
                                        </label>
                                        <input type="number" id="productPrice" required min="0"
                                               class="input-field"
                                               placeholder="0">
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            カテゴリ
                                        </label>
                                        <select id="productCategory" class="input-field">
                                            <option value="">未分類</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            ステータス
                                        </label>
                                        <select id="productActive" class="input-field">
                                            <option value="1">公開</option>
                                            <option value="0">非公開</option>
                                        </select>
                                    </div>
                                    
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            説明
                                        </label>
                                        <textarea id="productDescription" rows="4"
                                                  class="input-field"
                                                  placeholder="商品の詳細説明"></textarea>
                                    </div>
                                    
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            画像URL
                                        </label>
                                        <input type="url" id="productImageUrl"
                                               class="input-field"
                                               placeholder="https://example.com/image.jpg">
                                        <p class="text-xs text-gray-500 mt-1">商品のサムネイル画像URL</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 在庫設定 -->
                            <div class="space-y-4">
                                <h4 class="font-semibold text-gray-900">在庫設定</h4>
                                
                                <div class="flex items-center space-x-4">
                                    <label class="flex items-center">
                                        <input type="checkbox" id="productUnlimitedStock" onchange="handleStockChange()"
                                               class="mr-2">
                                        <span class="text-sm">無制限</span>
                                    </label>
                                </div>
                                
                                <div id="stockQuantityField">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        在庫数
                                    </label>
                                    <input type="number" id="productStockQuantity" min="0"
                                           class="input-field"
                                           placeholder="0">
                                </div>
                            </div>
                            
                            <!-- チケット専用フィールド -->
                            <div id="ticketFields" class="space-y-4 hidden">
                                <h4 class="font-semibold text-gray-900">イベント情報（チケット専用）</h4>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            イベント日時 <span class="text-red-500">*</span>
                                        </label>
                                        <input type="datetime-local" id="productEventDate"
                                               class="input-field">
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            イベント会場
                                        </label>
                                        <input type="text" id="productEventLocation"
                                               class="input-field"
                                               placeholder="例: 東京国際フォーラム">
                                    </div>
                                    
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            イベント詳細
                                        </label>
                                        <textarea id="productEventDescription" rows="3"
                                                  class="input-field"
                                                  placeholder="イベントの詳細情報"></textarea>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 配送設定 -->
                            <div id="shippingFields" class="space-y-4 hidden">
                                <h4 class="font-semibold text-gray-900">配送設定（物販専用）</h4>
                                
                                <div class="flex items-center space-x-4">
                                    <label class="flex items-center">
                                        <input type="checkbox" id="productRequiresShipping"
                                               class="mr-2" checked>
                                        <span class="text-sm">配送が必要</span>
                                    </label>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        配送情報
                                    </label>
                                    <textarea id="productShippingInfo" rows="2"
                                              class="input-field"
                                              placeholder="配送に関する注意事項"></textarea>
                                </div>
                            </div>
                            
                            <!-- 販売期間 -->
                            <div class="space-y-4">
                                <h4 class="font-semibold text-gray-900">販売期間（任意）</h4>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            販売開始日時
                                        </label>
                                        <input type="datetime-local" id="productSaleStartDate"
                                               class="input-field">
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            販売終了日時
                                        </label>
                                        <input type="datetime-local" id="productSaleEndDate"
                                               class="input-field">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- その他設定 -->
                            <div class="space-y-4">
                                <h4 class="font-semibold text-gray-900">その他設定</h4>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            1人あたりの購入上限
                                        </label>
                                        <input type="number" id="productMaxPurchase" min="1"
                                               class="input-field"
                                               placeholder="制限なし">
                                    </div>
                                    
                                    <div class="flex items-center space-x-4 pt-6">
                                        <label class="flex items-center">
                                            <input type="checkbox" id="productMemberOnly"
                                                   class="mr-2">
                                            <span class="text-sm">会員限定</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex justify-end space-x-3 pt-4 border-t">
                                <button type="button" onclick="closeProductModal()" class="btn-secondary">
                                    キャンセル
                                </button>
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-save mr-2"></i>
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- 注文管理タブ -->
                <div id="ordersContent" class="tab-content hidden">
                    <!-- 統計情報 -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="card p-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-500 mb-1">全注文数</p>
                                    <p class="text-2xl font-bold text-gray-900" id="statTotalOrders">0</p>
                                </div>
                                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <i class="fas fa-shopping-cart text-blue-600 text-xl"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card p-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-500 mb-1">処理待ち</p>
                                    <p class="text-2xl font-bold text-yellow-600" id="statPendingOrders">0</p>
                                </div>
                                <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <i class="fas fa-clock text-yellow-600 text-xl"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card p-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-500 mb-1">今月の売上</p>
                                    <p class="text-2xl font-bold text-green-600" id="statMonthRevenue">¥0</p>
                                </div>
                                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <i class="fas fa-yen-sign text-green-600 text-xl"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card p-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-gray-500 mb-1">総売上</p>
                                    <p class="text-2xl font-bold text-purple-600" id="statTotalRevenue">¥0</p>
                                </div>
                                <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <i class="fas fa-chart-line text-purple-600 text-xl"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- フィルター＆注文一覧 -->
                    <div class="card p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-semibold text-gray-900 text-lg">
                                <i class="fas fa-list mr-2"></i>
                                注文一覧
                            </h3>
                            
                            <div class="flex items-center space-x-2">
                                <select id="orderStatusFilter" onchange="loadOrders()" class="input-field py-2 text-sm">
                                    <option value="">すべてのステータス</option>
                                    <option value="pending">処理待ち</option>
                                    <option value="confirmed">確認済み</option>
                                    <option value="shipped">配送中</option>
                                    <option value="delivered">配送完了</option>
                                    <option value="cancelled">キャンセル</option>
                                </select>
                                
                                <select id="paymentStatusFilter" onchange="loadOrders()" class="input-field py-2 text-sm">
                                    <option value="">すべての決済状況</option>
                                    <option value="pending">決済待ち</option>
                                    <option value="completed">決済完了</option>
                                    <option value="failed">決済失敗</option>
                                    <option value="refunded">返金済み</option>
                                </select>
                            </div>
                        </div>
                        
                        <div id="ordersList" class="space-y-4">
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                <p>読み込み中...</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 注文詳細モーダル -->
                <div id="orderDetailModal" class="modal hidden">
                    <div class="modal-content max-w-4xl">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-bold">注文詳細</h3>
                            <button onclick="closeOrderDetail()" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div id="orderDetailContent">
                            <!-- 注文詳細がここに表示されます -->
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            function switchTab(tab) {
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'))
                document.getElementById(tab + 'Tab').classList.add('active')

                document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'))
                document.getElementById(tab + 'Content').classList.remove('hidden')
            }

            async function loadStatus() {
                try {
                    const token = localStorage.getItem('token')
                    if (!token) {
                        window.location.href = '/login'
                        return
                    }

                    const response = await axios.get('/api/shop/legal-info/status', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        const statusCard = document.getElementById('statusCard')
                        const statusIcon = document.getElementById('statusIcon')
                        const statusTitle = document.getElementById('statusTitle')
                        const statusMessage = document.getElementById('statusMessage')

                        statusCard.classList.remove('hidden')

                        if (response.data.can_sell) {
                            statusCard.className = 'card p-6 mb-6 bg-green-50 border-green-200'
                            statusIcon.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>'
                            statusTitle.textContent = '販売機能が利用可能です'
                            statusMessage.textContent = '特定商取引法に基づく事業者情報が登録されています。商品の販売が可能です。'
                        } else {
                            statusCard.className = 'card p-6 mb-6 bg-yellow-50 border-yellow-200'
                            statusIcon.innerHTML = '<i class="fas fa-exclamation-triangle text-yellow-500"></i>'
                            statusTitle.textContent = '販売機能が利用できません'
                            statusMessage.textContent = '商品を販売するには、特定商取引法に基づく事業者情報の登録が必要です。下記フォームにすべての必須項目を入力してください。'
                        }
                    }
                } catch (error) {
                    console.error('Load status error:', error)
                }
            }

            async function loadLegalInfo() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('/api/shop/legal-info', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success && response.data.legal_info) {
                        const info = response.data.legal_info
                        document.getElementById('business_name').value = info.business_name || ''
                        document.getElementById('representative_name').value = info.representative_name || ''
                        document.getElementById('postal_code').value = info.postal_code || ''
                        document.getElementById('address').value = info.address || ''
                        document.getElementById('phone_number').value = info.phone_number || ''
                        document.getElementById('email').value = info.email || ''
                        document.getElementById('business_hours').value = info.business_hours || ''
                        document.getElementById('payment_methods').value = info.payment_methods || ''
                        document.getElementById('payment_timing').value = info.payment_timing || ''
                        document.getElementById('delivery_time').value = info.delivery_time || ''
                        document.getElementById('shipping_fee_info').value = info.shipping_fee_info || ''
                        document.getElementById('return_policy').value = info.return_policy || ''
                        document.getElementById('return_period').value = info.return_period || 8
                        document.getElementById('return_shipping_fee').value = info.return_shipping_fee || ''
                        document.getElementById('additional_fees').value = info.additional_fees || ''
                        document.getElementById('product_liability').value = info.product_liability || ''
                    }
                } catch (error) {
                    console.error('Load legal info error:', error)
                }
            }

            document.getElementById('legalForm').addEventListener('submit', async (e) => {
                e.preventDefault()

                const token = localStorage.getItem('token')
                if (!token) {
                    window.location.href = '/login'
                    return
                }

                const data = {
                    business_name: document.getElementById('business_name').value,
                    representative_name: document.getElementById('representative_name').value,
                    postal_code: document.getElementById('postal_code').value,
                    address: document.getElementById('address').value,
                    phone_number: document.getElementById('phone_number').value,
                    email: document.getElementById('email').value,
                    business_hours: document.getElementById('business_hours').value,
                    payment_methods: document.getElementById('payment_methods').value,
                    payment_timing: document.getElementById('payment_timing').value,
                    delivery_time: document.getElementById('delivery_time').value,
                    shipping_fee_info: document.getElementById('shipping_fee_info').value,
                    return_policy: document.getElementById('return_policy').value,
                    return_period: parseInt(document.getElementById('return_period').value),
                    return_shipping_fee: document.getElementById('return_shipping_fee').value,
                    additional_fees: document.getElementById('additional_fees').value,
                    product_liability: document.getElementById('product_liability').value
                }

                try {
                    const response = await axios.post('/api/shop/legal-info', data, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })

                    if (response.data.success) {
                        showToast(response.data.message, 'success')
                        await loadStatus()
                        await loadLegalInfo()
                    }
                } catch (error) {
                    console.error('Save error:', error)
                    if (error.response?.data?.missing_fields) {
                        showToast(\`以下の項目が未入力です: \${error.response.data.missing_fields.join('、')}\`, 'error')
                    } else {
                        showToast(error.response?.data?.error || '保存に失敗しました', 'error')
                    }
                }
            })

            // ============================================
            // カテゴリ管理機能
            // ============================================
            
            let currentCategories = []
            
            async function loadCategories() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('/api/shop/categories', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        currentCategories = response.data.categories
                        displayCategories()
                        updateCategorySelects()
                    }
                } catch (error) {
                    console.error('Load categories error:', error)
                }
            }
            
            function displayCategories() {
                const container = document.getElementById('categoriesList')
                
                if (currentCategories.length === 0) {
                    container.innerHTML = \`
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-folder-open text-4xl mb-2"></i>
                            <p>カテゴリが登録されていません</p>
                            <button onclick="openCategoryModal()" class="btn-primary mt-4">
                                <i class="fas fa-plus mr-2"></i>
                                最初のカテゴリを作成
                            </button>
                        </div>
                    \`
                    return
                }
                
                container.innerHTML = currentCategories.map(cat => \`
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <div class="flex items-center space-x-3">
                            <div class="text-gray-400">
                                <i class="fas fa-grip-vertical"></i>
                            </div>
                            <div>
                                <div class="font-medium">\${cat.name}</div>
                                \${cat.description ? \`<div class="text-sm text-gray-500">\${cat.description}</div>\` : ''}
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-gray-500">順序: \${cat.display_order}</span>
                            <button onclick="editCategory(\${cat.id})" class="text-blue-600 hover:text-blue-800 p-2">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteCategory(\${cat.id}, '\${cat.name}')" class="text-red-600 hover:text-red-800 p-2">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                \`).join('')
            }
            
            function updateCategorySelects() {
                const selects = ['categoryFilter', 'productCategory']
                selects.forEach(selectId => {
                    const select = document.getElementById(selectId)
                    if (select) {
                        const currentValue = select.value
                        const isFilter = selectId === 'categoryFilter'
                        
                        select.innerHTML = isFilter 
                            ? '<option value="">すべてのカテゴリ</option>' 
                            : '<option value="">未分類</option>'
                        
                        currentCategories.forEach(cat => {
                            const option = document.createElement('option')
                            option.value = cat.id
                            option.textContent = cat.name
                            select.appendChild(option)
                        })
                        
                        if (currentValue) select.value = currentValue
                    }
                })
            }
            
            function openCategoryModal(categoryId = null) {
                document.getElementById('categoryModal').classList.remove('hidden')
                
                if (categoryId) {
                    const category = currentCategories.find(c => c.id === categoryId)
                    if (category) {
                        document.getElementById('categoryModalTitle').textContent = 'カテゴリ編集'
                        document.getElementById('categoryId').value = category.id
                        document.getElementById('categoryName').value = category.name
                        document.getElementById('categoryDescription').value = category.description || ''
                        document.getElementById('categoryDisplayOrder').value = category.display_order
                    }
                } else {
                    document.getElementById('categoryModalTitle').textContent = 'カテゴリ追加'
                    document.getElementById('categoryForm').reset()
                    document.getElementById('categoryId').value = ''
                }
            }
            
            function closeCategoryModal() {
                document.getElementById('categoryModal').classList.add('hidden')
                document.getElementById('categoryForm').reset()
            }
            
            async function editCategory(categoryId) {
                openCategoryModal(categoryId)
            }
            
            async function deleteCategory(categoryId, categoryName) {
                if (!confirm(\`カテゴリ「\${categoryName}」を削除しますか？\\n\\n※このカテゴリに商品が登録されている場合は削除できません。\`)) {
                    return
                }
                
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.delete(\`/api/shop/categories/\${categoryId}\`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        showToast(response.data.message, 'success')
                        await loadCategories()
                        await loadProducts()
                    }
                } catch (error) {
                    console.error('Delete category error:', error)
                    showToast(error.response?.data?.error || 'カテゴリの削除に失敗しました', 'error')
                }
            }
            
            document.getElementById('categoryForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const token = localStorage.getItem('token')
                const categoryId = document.getElementById('categoryId').value
                const data = {
                    name: document.getElementById('categoryName').value,
                    description: document.getElementById('categoryDescription').value,
                    display_order: parseInt(document.getElementById('categoryDisplayOrder').value) || 0
                }
                
                try {
                    let response
                    if (categoryId) {
                        response = await axios.put(\`/api/shop/categories/\${categoryId}\`, data, {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                    } else {
                        response = await axios.post('/api/shop/categories', data, {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                    }
                    
                    if (response.data.success) {
                        showToast(response.data.message, 'success')
                        closeCategoryModal()
                        await loadCategories()
                    }
                } catch (error) {
                    console.error('Save category error:', error)
                    showToast(error.response?.data?.error || 'カテゴリの保存に失敗しました', 'error')
                }
            })

            // ============================================
            // 商品管理機能
            // ============================================
            
            let currentProducts = []
            
            async function loadProducts() {
                try {
                    const token = localStorage.getItem('token')
                    const params = new URLSearchParams()
                    
                    const categoryFilter = document.getElementById('categoryFilter')?.value
                    const typeFilter = document.getElementById('typeFilter')?.value
                    const statusFilter = document.getElementById('statusFilter')?.value
                    
                    if (categoryFilter) params.append('category_id', categoryFilter)
                    if (typeFilter) params.append('type', typeFilter)
                    if (statusFilter) params.append('status', statusFilter)
                    
                    const response = await axios.get(\`/api/shop/products?\${params.toString()}\`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        currentProducts = response.data.products
                        displayProducts()
                    }
                } catch (error) {
                    console.error('Load products error:', error)
                }
            }
            
            function displayProducts() {
                const container = document.getElementById('productsList')
                
                if (currentProducts.length === 0) {
                    container.innerHTML = \`
                        <div class="col-span-full text-center py-8 text-gray-500">
                            <i class="fas fa-box-open text-4xl mb-2"></i>
                            <p>商品が登録されていません</p>
                            <button onclick="openProductModal()" class="btn-primary mt-4">
                                <i class="fas fa-plus mr-2"></i>
                                最初の商品を作成
                            </button>
                        </div>
                    \`
                    return
                }
                
                const typeLabels = {
                    physical: '物販',
                    ticket: 'チケット',
                    digital: 'デジタル'
                }
                
                const typeIcons = {
                    physical: 'fa-box',
                    ticket: 'fa-ticket-alt',
                    digital: 'fa-file-download'
                }
                
                container.innerHTML = currentProducts.map(product => \`
                    <div class="card overflow-hidden hover:shadow-lg transition-shadow">
                        \${product.image_url ? \`
                            <div class="aspect-video bg-gray-200 overflow-hidden">
                                <img src="\${product.image_url}" alt="\${product.name}" 
                                     class="w-full h-full object-cover">
                            </div>
                        \` : \`
                            <div class="aspect-video bg-gray-100 flex items-center justify-center">
                                <i class="fas \${typeIcons[product.type] || 'fa-box'} text-4xl text-gray-300"></i>
                            </div>
                        \`}
                        
                        <div class="p-4">
                            <div class="flex items-start justify-between mb-2">
                                <h4 class="font-semibold text-gray-900 line-clamp-2 flex-1">\${product.name}</h4>
                                <span class="ml-2 px-2 py-1 rounded text-xs font-medium \${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                    \${product.is_active ? '公開中' : '非公開'}
                                </span>
                            </div>
                            
                            <div class="space-y-2 mb-4">
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-gray-500">
                                        <i class="fas \${typeIcons[product.type]} mr-1"></i>
                                        \${typeLabels[product.type]}
                                    </span>
                                    <span class="font-bold text-lg text-blue-600">¥\${product.price.toLocaleString()}</span>
                                </div>
                                
                                \${product.category_name ? \`
                                    <div class="text-sm text-gray-500">
                                        <i class="fas fa-folder mr-1"></i>
                                        \${product.category_name}
                                    </div>
                                \` : ''}
                                
                                <div class="text-sm text-gray-500">
                                    <i class="fas fa-cubes mr-1"></i>
                                    在庫: \${product.is_unlimited_stock ? '無制限' : product.stock_quantity}
                                </div>
                                
                                \${product.type === 'ticket' && product.event_date ? \`
                                    <div class="text-sm text-gray-500">
                                        <i class="fas fa-calendar mr-1"></i>
                                        \${new Date(product.event_date).toLocaleString('ja-JP', { 
                                            year: 'numeric', month: '2-digit', day: '2-digit', 
                                            hour: '2-digit', minute: '2-digit' 
                                        })}
                                    </div>
                                \` : ''}
                            </div>
                            
                            <div class="flex items-center space-x-2 pt-4 border-t">
                                <button onclick="editProduct(\${product.id})" class="flex-1 btn-secondary text-sm py-2">
                                    <i class="fas fa-edit mr-1"></i>
                                    編集
                                </button>
                                <button onclick="deleteProduct(\${product.id}, '\${product.name.replace(/'/g, "\\\\'")})" class="btn-secondary text-sm py-2 px-3 text-red-600 hover:bg-red-50">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                \`).join('')
            }
            
            function openProductModal(productId = null) {
                document.getElementById('productModal').classList.remove('hidden')
                
                if (productId) {
                    const product = currentProducts.find(p => p.id === productId)
                    if (product) {
                        document.getElementById('productModalTitle').textContent = '商品編集'
                        document.getElementById('productId').value = product.id
                        document.getElementById('productName').value = product.name
                        document.getElementById('productDescription').value = product.description || ''
                        document.getElementById('productPrice').value = product.price
                        document.getElementById('productCategory').value = product.category_id || ''
                        document.getElementById('productType').value = product.type
                        document.getElementById('productImageUrl').value = product.image_url || ''
                        document.getElementById('productStockQuantity').value = product.stock_quantity
                        document.getElementById('productUnlimitedStock').checked = product.is_unlimited_stock === 1
                        document.getElementById('productActive').value = product.is_active ? '1' : '0'
                        
                        if (product.event_date) {
                            document.getElementById('productEventDate').value = product.event_date.slice(0, 16)
                        }
                        document.getElementById('productEventLocation').value = product.event_location || ''
                        document.getElementById('productEventDescription').value = product.event_description || ''
                        
                        document.getElementById('productRequiresShipping').checked = product.requires_shipping === 1
                        document.getElementById('productShippingInfo').value = product.shipping_info || ''
                        
                        if (product.sale_start_date) {
                            document.getElementById('productSaleStartDate').value = product.sale_start_date.slice(0, 16)
                        }
                        if (product.sale_end_date) {
                            document.getElementById('productSaleEndDate').value = product.sale_end_date.slice(0, 16)
                        }
                        
                        document.getElementById('productMaxPurchase').value = product.max_purchase_per_person || ''
                        document.getElementById('productMemberOnly').checked = product.is_member_only === 1
                        
                        handleTypeChange()
                        handleStockChange()
                    }
                } else {
                    document.getElementById('productModalTitle').textContent = '商品追加'
                    document.getElementById('productForm').reset()
                    document.getElementById('productId').value = ''
                    document.getElementById('productActive').value = '1'
                    handleTypeChange()
                    handleStockChange()
                }
            }
            
            function closeProductModal() {
                document.getElementById('productModal').classList.add('hidden')
                document.getElementById('productForm').reset()
            }
            
            function handleTypeChange() {
                const type = document.getElementById('productType').value
                const ticketFields = document.getElementById('ticketFields')
                const shippingFields = document.getElementById('shippingFields')
                const eventDateInput = document.getElementById('productEventDate')
                
                if (type === 'ticket') {
                    ticketFields.classList.remove('hidden')
                    shippingFields.classList.add('hidden')
                    eventDateInput.required = true
                } else if (type === 'physical') {
                    ticketFields.classList.add('hidden')
                    shippingFields.classList.remove('hidden')
                    eventDateInput.required = false
                } else {
                    ticketFields.classList.add('hidden')
                    shippingFields.classList.add('hidden')
                    eventDateInput.required = false
                }
            }
            
            function handleStockChange() {
                const unlimited = document.getElementById('productUnlimitedStock').checked
                const stockField = document.getElementById('stockQuantityField')
                const stockInput = document.getElementById('productStockQuantity')
                
                if (unlimited) {
                    stockField.classList.add('hidden')
                    stockInput.required = false
                } else {
                    stockField.classList.remove('hidden')
                    stockInput.required = true
                }
            }
            
            async function editProduct(productId) {
                openProductModal(productId)
            }
            
            async function deleteProduct(productId, productName) {
                if (!confirm(\`商品「\${productName}」を削除しますか？\\n\\n※注文履歴がある商品は削除できません。\`)) {
                    return
                }
                
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.delete(\`/api/shop/products/\${productId}\`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        showToast(response.data.message, 'success')
                        await loadProducts()
                    }
                } catch (error) {
                    console.error('Delete product error:', error)
                    showToast(error.response?.data?.error || '商品の削除に失敗しました', 'error')
                }
            }
            
            document.getElementById('productForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const token = localStorage.getItem('token')
                const productId = document.getElementById('productId').value
                const type = document.getElementById('productType').value
                
                const data = {
                    name: document.getElementById('productName').value,
                    description: document.getElementById('productDescription').value,
                    price: parseFloat(document.getElementById('productPrice').value),
                    category_id: document.getElementById('productCategory').value || null,
                    type: type,
                    image_url: document.getElementById('productImageUrl').value || null,
                    stock_quantity: document.getElementById('productUnlimitedStock').checked ? 0 : parseInt(document.getElementById('productStockQuantity').value) || 0,
                    is_unlimited_stock: document.getElementById('productUnlimitedStock').checked,
                    is_active: document.getElementById('productActive').value === '1',
                    requires_shipping: type === 'physical' ? document.getElementById('productRequiresShipping').checked : false,
                    shipping_info: type === 'physical' ? document.getElementById('productShippingInfo').value || null : null,
                    event_date: type === 'ticket' ? document.getElementById('productEventDate').value || null : null,
                    event_location: type === 'ticket' ? document.getElementById('productEventLocation').value || null : null,
                    event_description: type === 'ticket' ? document.getElementById('productEventDescription').value || null : null,
                    sale_start_date: document.getElementById('productSaleStartDate').value || null,
                    sale_end_date: document.getElementById('productSaleEndDate').value || null,
                    max_purchase_per_person: parseInt(document.getElementById('productMaxPurchase').value) || null,
                    is_member_only: document.getElementById('productMemberOnly').checked,
                    member_plan_id: null
                }
                
                try {
                    let response
                    if (productId) {
                        response = await axios.put(\`/api/shop/products/\${productId}\`, data, {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                    } else {
                        response = await axios.post('/api/shop/products', data, {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                    }
                    
                    if (response.data.success) {
                        showToast(response.data.message, 'success')
                        closeProductModal()
                        await loadProducts()
                    }
                } catch (error) {
                    console.error('Save product error:', error)
                    showToast(error.response?.data?.error || '商品の保存に失敗しました', 'error')
                }
            })

            // ============================================
            // 注文管理機能
            // ============================================
            
            let currentOrders = []
            let currentOrderDetail = null
            
            const orderStatusLabels = {
                pending: '処理待ち',
                confirmed: '確認済み',
                shipped: '配送中',
                delivered: '配送完了',
                cancelled: 'キャンセル'
            }
            
            const orderStatusColors = {
                pending: 'bg-yellow-100 text-yellow-800',
                confirmed: 'bg-blue-100 text-blue-800',
                shipped: 'bg-purple-100 text-purple-800',
                delivered: 'bg-green-100 text-green-800',
                cancelled: 'bg-red-100 text-red-800'
            }
            
            const paymentStatusLabels = {
                pending: '決済待ち',
                completed: '決済完了',
                failed: '決済失敗',
                refunded: '返金済み'
            }
            
            const paymentStatusColors = {
                pending: 'text-yellow-600',
                completed: 'text-green-600',
                failed: 'text-red-600',
                refunded: 'text-gray-600'
            }
            
            async function loadOrderStats() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('/api/shop/admin/stats', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        const stats = response.data.stats
                        document.getElementById('statTotalOrders').textContent = stats.total_orders
                        document.getElementById('statPendingOrders').textContent = stats.pending_orders
                        document.getElementById('statMonthRevenue').textContent = \`¥\${stats.this_month_revenue.toLocaleString()}\`
                        document.getElementById('statTotalRevenue').textContent = \`¥\${stats.total_revenue.toLocaleString()}\`
                    }
                } catch (error) {
                    console.error('Load order stats error:', error)
                }
            }
            
            async function loadOrders() {
                try {
                    const token = localStorage.getItem('token')
                    const params = new URLSearchParams()
                    
                    const orderStatus = document.getElementById('orderStatusFilter')?.value
                    const paymentStatus = document.getElementById('paymentStatusFilter')?.value
                    
                    if (orderStatus) params.append('status', orderStatus)
                    if (paymentStatus) params.append('payment_status', paymentStatus)
                    
                    const response = await axios.get(\`/api/shop/admin/orders?\${params.toString()}\`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        currentOrders = response.data.orders
                        displayOrders()
                    }
                } catch (error) {
                    console.error('Load orders error:', error)
                    const container = document.getElementById('ordersList')
                    if (container) {
                        container.innerHTML = \`
                            <div class="text-center py-8 text-red-500">
                                <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
                                <p>注文の読み込みに失敗しました</p>
                            </div>
                        \`
                    }
                }
            }
            
            function displayOrders() {
                const container = document.getElementById('ordersList')
                
                if (currentOrders.length === 0) {
                    container.innerHTML = \`
                        <div class="text-center py-12 text-gray-500">
                            <i class="fas fa-shopping-cart text-4xl mb-3"></i>
                            <p class="text-lg">注文はまだありません</p>
                        </div>
                    \`
                    return
                }
                
                container.innerHTML = currentOrders.map(order => \`
                    <div class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1">
                                <div class="flex items-center space-x-3 mb-2">
                                    <span class="font-mono font-semibold text-sm">\${order.order_number}</span>
                                    <span class="px-2 py-1 rounded-full text-xs \${orderStatusColors[order.order_status]}">
                                        \${orderStatusLabels[order.order_status]}
                                    </span>
                                    <span class="text-xs \${paymentStatusColors[order.payment_status]}">
                                        <i class="fas fa-circle text-xs mr-1"></i>
                                        \${paymentStatusLabels[order.payment_status]}
                                    </span>
                                </div>
                                
                                <div class="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p class="text-gray-500 text-xs">顧客</p>
                                        <p class="font-medium">\${order.nickname || order.email}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-500 text-xs">注文日時</p>
                                        <p>\${new Date(order.created_at).toLocaleString('ja-JP', { 
                                            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
                                        })}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-500 text-xs">金額</p>
                                        <p class="font-bold text-blue-600">¥\${order.total_amount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <button onclick="viewOrderDetail(\${order.id})" 
                                    class="ml-4 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                                <i class="fas fa-eye mr-1"></i>
                                詳細
                            </button>
                        </div>
                        
                        \${order.shipping_address ? \`
                            <div class="text-xs text-gray-600 pt-3 border-t">
                                <i class="fas fa-truck mr-1"></i>
                                配送先: \${order.shipping_name}
                            </div>
                        \` : ''}
                    </div>
                \`).join('')
            }
            
            async function viewOrderDetail(orderId) {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get(\`/api/shop/admin/orders/\${orderId}\`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        currentOrderDetail = response.data.order
                        displayOrderDetail()
                        document.getElementById('orderDetailModal').classList.remove('hidden')
                    }
                } catch (error) {
                    console.error('View order detail error:', error)
                    showToast('注文詳細の取得に失敗しました', 'error')
                }
            }
            
            function displayOrderDetail() {
                const order = currentOrderDetail
                if (!order) return
                
                const container = document.getElementById('orderDetailContent')
                
                container.innerHTML = \`
                    <div class="space-y-6">
                        <!-- 注文情報 -->
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-3">注文情報</h4>
                                <dl class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <dt class="text-gray-500">注文番号:</dt>
                                        <dd class="font-mono font-semibold">\${order.order_number}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-500">注文日時:</dt>
                                        <dd>\${new Date(order.created_at).toLocaleString('ja-JP')}</dd>
                                    </div>
                                    <div class="flex justify-between">
                                        <dt class="text-gray-500">顧客:</dt>
                                        <dd>\${order.nickname || order.email}</dd>
                                    </div>
                                </dl>
                            </div>
                            
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-3">ステータス</h4>
                                <div class="space-y-3">
                                    <div>
                                        <label class="block text-xs text-gray-500 mb-1">注文ステータス</label>
                                        <select id="orderStatusSelect" class="input-field py-2 text-sm">
                                            <option value="pending" \${order.order_status === 'pending' ? 'selected' : ''}>処理待ち</option>
                                            <option value="confirmed" \${order.order_status === 'confirmed' ? 'selected' : ''}>確認済み</option>
                                            <option value="shipped" \${order.order_status === 'shipped' ? 'selected' : ''}>配送中</option>
                                            <option value="delivered" \${order.order_status === 'delivered' ? 'selected' : ''}>配送完了</option>
                                            <option value="cancelled" \${order.order_status === 'cancelled' ? 'selected' : ''}>キャンセル</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-xs text-gray-500 mb-1">決済ステータス</label>
                                        <select id="paymentStatusSelect" class="input-field py-2 text-sm">
                                            <option value="pending" \${order.payment_status === 'pending' ? 'selected' : ''}>決済待ち</option>
                                            <option value="completed" \${order.payment_status === 'completed' ? 'selected' : ''}>決済完了</option>
                                            <option value="failed" \${order.payment_status === 'failed' ? 'selected' : ''}>決済失敗</option>
                                            <option value="refunded" \${order.payment_status === 'refunded' ? 'selected' : ''}>返金済み</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 配送先情報 -->
                        \${order.shipping_address ? \`
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-3">配送先情報</h4>
                                <div class="p-4 bg-gray-50 rounded-lg text-sm">
                                    <p class="font-medium mb-1">\${order.shipping_name}</p>
                                    <p class="text-gray-600 mb-1">\${order.shipping_phone}</p>
                                    <p class="text-gray-600 whitespace-pre-wrap">\${order.shipping_address}</p>
                                </div>
                            </div>
                        \` : ''}
                        
                        <!-- 注文明細 -->
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-3">注文明細</h4>
                            <div class="space-y-2">
                                \${order.items.map(item => \`
                                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div class="flex-1">
                                            <p class="font-medium">\${item.product_name}</p>
                                            <p class="text-sm text-gray-500">
                                                ¥\${item.unit_price.toLocaleString()} × \${item.quantity}
                                                \${item.product_type === 'ticket' && item.event_date ? \`
                                                    <span class="ml-2">
                                                        <i class="fas fa-calendar text-xs mr-1"></i>
                                                        \${new Date(item.event_date).toLocaleString('ja-JP', { 
                                                            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
                                                        })}
                                                    </span>
                                                \` : ''}
                                            </p>
                                        </div>
                                        <p class="font-semibold">¥\${item.subtotal.toLocaleString()}</p>
                                    </div>
                                \`).join('')}
                            </div>
                            
                            <div class="mt-4 pt-4 border-t space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">小計:</span>
                                    <span>¥\${(order.total_amount - order.shipping_fee).toLocaleString()}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">送料:</span>
                                    <span>¥\${order.shipping_fee.toLocaleString()}</span>
                                </div>
                                <div class="flex justify-between text-lg font-bold pt-2 border-t">
                                    <span>合計:</span>
                                    <span class="text-blue-600">¥\${order.total_amount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 管理者メモ -->
                        <div>
                            <label class="block font-semibold text-gray-900 mb-2">管理者メモ</label>
                            <textarea id="adminNoteText" rows="3" class="input-field" 
                                      placeholder="この注文に関するメモを入力...">\${order.admin_note || ''}</textarea>
                        </div>
                        
                        <!-- アクションボタン -->
                        <div class="flex justify-end space-x-3 pt-4 border-t">
                            <button onclick="closeOrderDetail()" class="btn-secondary">
                                閉じる
                            </button>
                            <button onclick="updateOrderStatus()" class="btn-primary">
                                <i class="fas fa-save mr-2"></i>
                                更新
                            </button>
                        </div>
                    </div>
                \`
            }
            
            async function updateOrderStatus() {
                const order = currentOrderDetail
                if (!order) return
                
                const orderStatus = document.getElementById('orderStatusSelect').value
                const paymentStatus = document.getElementById('paymentStatusSelect').value
                const adminNote = document.getElementById('adminNoteText').value
                
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.put(\`/api/shop/admin/orders/\${order.id}/status\`, {
                        order_status: orderStatus,
                        payment_status: paymentStatus,
                        admin_note: adminNote
                    }, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        showToast(response.data.message, 'success')
                        closeOrderDetail()
                        await loadOrders()
                        await loadOrderStats()
                    }
                } catch (error) {
                    console.error('Update order status error:', error)
                    showToast(error.response?.data?.error || 'ステータスの更新に失敗しました', 'error')
                }
            }
            
            function closeOrderDetail() {
                document.getElementById('orderDetailModal').classList.add('hidden')
                currentOrderDetail = null
            }

            // 初期化
            document.addEventListener('DOMContentLoaded', () => {
                loadStatus()
                loadLegalInfo()
                loadCategories()
                loadProducts()
                loadOrderStats()
                loadOrders()
            })
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 会員向けショップページ (/tenant/shop)
// ============================================
app.get('/tenant/shop', (c) => {
  const subdomain = c.req.query('subdomain')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ショップ - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-arrow-left"></i>
                            </a>
                            <h1 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-shopping-bag text-blue-600 mr-2"></i>
                                ショップ
                            </h1>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <button onclick="showCart()" class="relative p-2 text-gray-600 hover:text-gray-900">
                                <i class="fas fa-shopping-cart text-xl"></i>
                                <span id="cartBadge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    0
                                </span>
                            </button>
                            <a href="/tenant/shop/orders?subdomain=${subdomain}" class="p-2 text-gray-600 hover:text-gray-900">
                                <i class="fas fa-receipt text-xl"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- フィルター -->
                <div class="card p-6 mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="md:col-span-2">
                            <div class="relative">
                                <input type="text" id="searchInput" 
                                       placeholder="商品を検索..." 
                                       class="input-field pl-10"
                                       onkeyup="handleSearch()">
                                <i class="fas fa-search absolute left-3 top-3.5 text-gray-400"></i>
                            </div>
                        </div>
                        
                        <select id="categoryFilter" onchange="loadProducts()" class="input-field">
                            <option value="">すべてのカテゴリ</option>
                        </select>
                        
                        <select id="typeFilter" onchange="loadProducts()" class="input-field">
                            <option value="">すべてのタイプ</option>
                            <option value="physical">物販</option>
                            <option value="ticket">チケット</option>
                            <option value="digital">デジタル</option>
                        </select>
                    </div>
                </div>

                <!-- 商品一覧 -->
                <div id="productsContainer" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <div class="col-span-full text-center py-12 text-gray-500">
                        <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                        <p>商品を読み込み中...</p>
                    </div>
                </div>
            </main>
        </div>

        <!-- カートモーダル -->
        <div id="cartModal" class="modal hidden">
            <div class="modal-content max-w-2xl">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-bold">
                        <i class="fas fa-shopping-cart mr-2"></i>
                        カート
                    </h3>
                    <button onclick="closeCart()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div id="cartItems" class="space-y-4 mb-6">
                    <!-- カートアイテムがここに表示されます -->
                </div>
                
                <div class="border-t pt-4 mb-6">
                    <div class="flex justify-between text-lg font-semibold mb-2">
                        <span>小計:</span>
                        <span id="cartSubtotal">¥0</span>
                    </div>
                    <div class="flex justify-between text-sm text-gray-600 mb-2">
                        <span>送料:</span>
                        <span id="cartShipping">¥0</span>
                    </div>
                    <div class="flex justify-between text-xl font-bold text-blue-600">
                        <span>合計:</span>
                        <span id="cartTotal">¥0</span>
                    </div>
                </div>
                
                <div class="flex space-x-3">
                    <button onclick="closeCart()" class="flex-1 btn-secondary">
                        買い物を続ける
                    </button>
                    <button onclick="proceedToCheckout()" class="flex-1 btn-primary">
                        <i class="fas fa-credit-card mr-2"></i>
                        購入手続きへ
                    </button>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            const subdomain = '${subdomain}'
            let cart = JSON.parse(localStorage.getItem(\`cart_\${subdomain}\`) || '[]')
            let categories = []
            let products = []
            
            // 商品タイプのラベルとアイコン
            const typeLabels = {
                physical: '物販',
                ticket: 'チケット',
                digital: 'デジタル'
            }
            
            const typeIcons = {
                physical: 'fa-box',
                ticket: 'fa-ticket-alt',
                digital: 'fa-file-download'
            }
            
            async function loadCategories() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('/api/shop/public/categories', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        categories = response.data.categories
                        const select = document.getElementById('categoryFilter')
                        categories.forEach(cat => {
                            const option = document.createElement('option')
                            option.value = cat.id
                            option.textContent = \`\${cat.name} (\${cat.product_count})\`
                            select.appendChild(option)
                        })
                    }
                } catch (error) {
                    console.error('Load categories error:', error)
                }
            }
            
            async function loadProducts() {
                try {
                    const token = localStorage.getItem('token')
                    const params = new URLSearchParams()
                    
                    const categoryId = document.getElementById('categoryFilter').value
                    const type = document.getElementById('typeFilter').value
                    const search = document.getElementById('searchInput').value
                    
                    if (categoryId) params.append('category_id', categoryId)
                    if (type) params.append('type', type)
                    if (search) params.append('search', search)
                    
                    const response = await axios.get(\`/api/shop/public/products?\${params.toString()}\`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        products = response.data.products
                        displayProducts()
                    }
                } catch (error) {
                    console.error('Load products error:', error)
                    if (error.response?.status === 401) {
                        window.location.href = '/login'
                    }
                }
            }
            
            function displayProducts() {
                const container = document.getElementById('productsContainer')
                
                if (products.length === 0) {
                    container.innerHTML = \`
                        <div class="col-span-full text-center py-12 text-gray-500">
                            <i class="fas fa-box-open text-4xl mb-3"></i>
                            <p class="text-lg">商品が見つかりませんでした</p>
                        </div>
                    \`
                    return
                }
                
                container.innerHTML = products.map(product => \`
                    <div class="card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" 
                         onclick="viewProduct(\${product.id})">
                        \${product.image_url ? \`
                            <div class="aspect-square bg-gray-200 overflow-hidden">
                                <img src="\${product.image_url}" alt="\${product.name}" 
                                     class="w-full h-full object-cover">
                            </div>
                        \` : \`
                            <div class="aspect-square bg-gray-100 flex items-center justify-center">
                                <i class="fas \${typeIcons[product.type]} text-5xl text-gray-300"></i>
                            </div>
                        \`}
                        
                        <div class="p-4">
                            <div class="flex items-start justify-between mb-2">
                                <h3 class="font-semibold text-gray-900 line-clamp-2 flex-1">
                                    \${product.name}
                                </h3>
                            </div>
                            
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-xs text-gray-500">
                                    <i class="fas \${typeIcons[product.type]} mr-1"></i>
                                    \${typeLabels[product.type]}
                                </span>
                                <span class="font-bold text-lg text-blue-600">¥\${product.price.toLocaleString()}</span>
                            </div>
                            
                            \${product.type === 'ticket' && product.event_date ? \`
                                <div class="text-xs text-gray-500 mb-3">
                                    <i class="fas fa-calendar mr-1"></i>
                                    \${new Date(product.event_date).toLocaleString('ja-JP', { 
                                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                    })}
                                </div>
                            \` : ''}
                            
                            <div class="flex items-center justify-between pt-3 border-t">
                                <span class="text-xs \${product.is_available ? 'text-green-600' : 'text-red-600'}">
                                    <i class="fas \${product.is_available ? 'fa-check-circle' : 'fa-times-circle'} mr-1"></i>
                                    \${product.is_available ? '在庫あり' : '売り切れ'}
                                </span>
                                \${product.is_available ? \`
                                    <button onclick="addToCart(event, \${product.id})" 
                                            class="text-blue-600 hover:text-blue-800 font-medium text-sm">
                                        <i class="fas fa-cart-plus mr-1"></i>
                                        カートに追加
                                    </button>
                                \` : ''}
                            </div>
                        </div>
                    </div>
                \`).join('')
            }
            
            function handleSearch() {
                clearTimeout(window.searchTimeout)
                window.searchTimeout = setTimeout(() => {
                    loadProducts()
                }, 500)
            }
            
            function viewProduct(productId) {
                window.location.href = \`/tenant/shop/product?subdomain=\${subdomain}&id=\${productId}\`
            }
            
            function addToCart(event, productId) {
                event.stopPropagation()
                
                const product = products.find(p => p.id === productId)
                if (!product || !product.is_available) return
                
                const existingItem = cart.find(item => item.product_id === productId)
                
                if (existingItem) {
                    existingItem.quantity++
                } else {
                    cart.push({
                        product_id: productId,
                        name: product.name,
                        price: product.price,
                        type: product.type,
                        image_url: product.image_url,
                        requires_shipping: product.requires_shipping,
                        max_purchase: product.max_purchase_per_person,
                        quantity: 1
                    })
                }
                
                saveCart()
                updateCartBadge()
                showToast('カートに追加しました', 'success')
            }
            
            function showCart() {
                document.getElementById('cartModal').classList.remove('hidden')
                displayCart()
            }
            
            function closeCart() {
                document.getElementById('cartModal').classList.add('hidden')
            }
            
            function displayCart() {
                const container = document.getElementById('cartItems')
                
                if (cart.length === 0) {
                    container.innerHTML = \`
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-shopping-cart text-4xl mb-3"></i>
                            <p>カートは空です</p>
                        </div>
                    \`
                    document.getElementById('cartSubtotal').textContent = '¥0'
                    document.getElementById('cartShipping').textContent = '¥0'
                    document.getElementById('cartTotal').textContent = '¥0'
                    return
                }
                
                let subtotal = 0
                let requiresShipping = false
                
                container.innerHTML = cart.map((item, index) => {
                    const itemTotal = item.price * item.quantity
                    subtotal += itemTotal
                    if (item.requires_shipping) requiresShipping = true
                    
                    return \`
                        <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                            \${item.image_url ? \`
                                <img src="\${item.image_url}" alt="\${item.name}" 
                                     class="w-16 h-16 object-cover rounded">
                            \` : \`
                                <div class="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                    <i class="fas \${typeIcons[item.type]} text-gray-400"></i>
                                </div>
                            \`}
                            
                            <div class="flex-1">
                                <h4 class="font-medium">\${item.name}</h4>
                                <p class="text-sm text-gray-500">¥\${item.price.toLocaleString()}</p>
                            </div>
                            
                            <div class="flex items-center space-x-2">
                                <button onclick="updateCartQuantity(\${index}, -1)" 
                                        class="w-8 h-8 rounded-full bg-white border hover:bg-gray-100">
                                    <i class="fas fa-minus text-xs"></i>
                                </button>
                                <span class="w-8 text-center font-medium">\${item.quantity}</span>
                                <button onclick="updateCartQuantity(\${index}, 1)" 
                                        class="w-8 h-8 rounded-full bg-white border hover:bg-gray-100">
                                    <i class="fas fa-plus text-xs"></i>
                                </button>
                            </div>
                            
                            <div class="text-right">
                                <p class="font-semibold">¥\${itemTotal.toLocaleString()}</p>
                                <button onclick="removeFromCart(\${index})" 
                                        class="text-red-600 hover:text-red-800 text-sm">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    \`
                }).join('')
                
                const shippingFee = requiresShipping ? 500 : 0
                const total = subtotal + shippingFee
                
                document.getElementById('cartSubtotal').textContent = \`¥\${subtotal.toLocaleString()}\`
                document.getElementById('cartShipping').textContent = \`¥\${shippingFee.toLocaleString()}\`
                document.getElementById('cartTotal').textContent = \`¥\${total.toLocaleString()}\`
            }
            
            function updateCartQuantity(index, delta) {
                const item = cart[index]
                const newQuantity = item.quantity + delta
                
                if (newQuantity <= 0) {
                    removeFromCart(index)
                    return
                }
                
                if (item.max_purchase && newQuantity > item.max_purchase) {
                    showToast(\`購入上限は\${item.max_purchase}個です\`, 'error')
                    return
                }
                
                item.quantity = newQuantity
                saveCart()
                displayCart()
                updateCartBadge()
            }
            
            function removeFromCart(index) {
                cart.splice(index, 1)
                saveCart()
                displayCart()
                updateCartBadge()
                showToast('カートから削除しました', 'success')
            }
            
            function saveCart() {
                localStorage.setItem(\`cart_\${subdomain}\`, JSON.stringify(cart))
            }
            
            function updateCartBadge() {
                const badge = document.getElementById('cartBadge')
                const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
                
                if (totalItems > 0) {
                    badge.textContent = totalItems
                    badge.classList.remove('hidden')
                } else {
                    badge.classList.add('hidden')
                }
            }
            
            function proceedToCheckout() {
                if (cart.length === 0) {
                    showToast('カートに商品がありません', 'error')
                    return
                }
                
                window.location.href = \`/tenant/shop/checkout?subdomain=\${subdomain}\`
            }
            
            // 初期化
            document.addEventListener('DOMContentLoaded', async () => {
                updateCartBadge()
                await loadCategories()
                await loadProducts()
            })
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 商品詳細ページ (/tenant/shop/product)
// ============================================
app.get('/tenant/shop/product', (c) => {
  const subdomain = c.req.query('subdomain')
  const productId = c.req.query('id')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>商品詳細 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center">
                        <a href="/tenant/shop?subdomain=${subdomain}" class="text-gray-600 hover:text-gray-900 mr-4">
                            <i class="fas fa-arrow-left"></i>
                        </a>
                        <h1 class="text-xl font-bold text-gray-900">商品詳細</h1>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div id="productDetail" class="card p-8">
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                        <p>商品情報を読み込み中...</p>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            const subdomain = '${subdomain}'
            const productId = '${productId}'
            
            const typeLabels = {
                physical: '物販',
                ticket: 'チケット',
                digital: 'デジタル'
            }
            
            async function loadProduct() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get(\`/api/shop/public/products/\${productId}\`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        displayProduct(response.data.product)
                    }
                } catch (error) {
                    console.error('Load product error:', error)
                    const container = document.getElementById('productDetail')
                    container.innerHTML = \`
                        <div class="text-center py-12 text-red-500">
                            <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                            <p class="text-lg">\${error.response?.data?.error || '商品情報の取得に失敗しました'}</p>
                            <a href="/tenant/shop?subdomain=\${subdomain}" class="btn-primary mt-4">
                                ショップに戻る
                            </a>
                        </div>
                    \`
                }
            }
            
            function displayProduct(product) {
                const container = document.getElementById('productDetail')
                
                container.innerHTML = \`
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- 商品画像 -->
                        <div>
                            \${product.image_url ? \`
                                <img src="\${product.image_url}" alt="\${product.name}" 
                                     class="w-full rounded-lg shadow-lg">
                            \` : \`
                                <div class="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-image text-6xl text-gray-300"></i>
                                </div>
                            \`}
                        </div>
                        
                        <!-- 商品情報 -->
                        <div>
                            <div class="mb-4">
                                <span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                    \${typeLabels[product.type]}
                                </span>
                                \${product.category_name ? \`
                                    <span class="ml-2 px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                                        \${product.category_name}
                                    </span>
                                \` : ''}
                            </div>
                            
                            <h1 class="text-3xl font-bold text-gray-900 mb-4">\${product.name}</h1>
                            
                            <div class="text-4xl font-bold text-blue-600 mb-6">
                                ¥\${product.price.toLocaleString()}
                            </div>
                            
                            \${product.description ? \`
                                <div class="mb-6">
                                    <h3 class="font-semibold text-gray-900 mb-2">商品説明</h3>
                                    <p class="text-gray-600 whitespace-pre-wrap">\${product.description}</p>
                                </div>
                            \` : ''}
                            
                            \${product.type === 'ticket' ? \`
                                <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <h3 class="font-semibold text-gray-900 mb-3">
                                        <i class="fas fa-calendar-alt mr-2"></i>
                                        イベント情報
                                    </h3>
                                    \${product.event_date ? \`
                                        <p class="text-gray-700 mb-2">
                                            <i class="fas fa-clock mr-2"></i>
                                            <strong>日時:</strong> \${new Date(product.event_date).toLocaleString('ja-JP', {
                                                year: 'numeric', month: 'long', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    \` : ''}
                                    \${product.event_location ? \`
                                        <p class="text-gray-700 mb-2">
                                            <i class="fas fa-map-marker-alt mr-2"></i>
                                            <strong>会場:</strong> \${product.event_location}
                                        </p>
                                    \` : ''}
                                    \${product.event_description ? \`
                                        <p class="text-gray-700">
                                            <strong>詳細:</strong> \${product.event_description}
                                        </p>
                                    \` : ''}
                                </div>
                            \` : ''}
                            
                            <div class="mb-6 space-y-2 text-sm text-gray-600">
                                <p>
                                    <i class="fas fa-cubes mr-2"></i>
                                    <strong>在庫:</strong> 
                                    <span class="\${product.is_available ? 'text-green-600' : 'text-red-600'}">
                                        \${product.is_available ? 
                                            (product.is_unlimited_stock ? '無制限' : \`残り\${product.stock_quantity}個\`) : 
                                            '売り切れ'
                                        }
                                    </span>
                                </p>
                                
                                \${product.max_purchase_per_person ? \`
                                    <p>
                                        <i class="fas fa-user mr-2"></i>
                                        <strong>購入上限:</strong> お一人様\${product.max_purchase_per_person}個まで
                                    </p>
                                \` : ''}
                                
                                \${product.requires_shipping ? \`
                                    <p>
                                        <i class="fas fa-truck mr-2"></i>
                                        <strong>配送:</strong> 必要（送料500円）
                                    </p>
                                \` : ''}
                            </div>
                            
                            <div class="flex space-x-4">
                                \${product.is_available ? \`
                                    <button onclick="addToCart()" class="flex-1 btn-primary text-lg py-4">
                                        <i class="fas fa-cart-plus mr-2"></i>
                                        カートに追加
                                    </button>
                                \` : \`
                                    <button disabled class="flex-1 bg-gray-300 text-gray-600 rounded-lg py-4 text-lg cursor-not-allowed">
                                        <i class="fas fa-times-circle mr-2"></i>
                                        売り切れ
                                    </button>
                                \`}
                            </div>
                        </div>
                    </div>
                \`
                
                window.currentProduct = product
            }
            
            function addToCart() {
                const product = window.currentProduct
                if (!product || !product.is_available) return
                
                let cart = JSON.parse(localStorage.getItem(\`cart_\${subdomain}\`) || '[]')
                const existingItem = cart.find(item => item.product_id === product.id)
                
                if (existingItem) {
                    existingItem.quantity++
                } else {
                    cart.push({
                        product_id: product.id,
                        name: product.name,
                        price: product.price,
                        type: product.type,
                        image_url: product.image_url,
                        requires_shipping: product.requires_shipping,
                        max_purchase: product.max_purchase_per_person,
                        quantity: 1
                    })
                }
                
                localStorage.setItem(\`cart_\${subdomain}\`, JSON.stringify(cart))
                showToast('カートに追加しました', 'success')
                
                setTimeout(() => {
                    window.location.href = \`/tenant/shop?subdomain=\${subdomain}\`
                }, 1000)
            }
            
            document.addEventListener('DOMContentLoaded', loadProduct)
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 購入手続きページ (/tenant/shop/checkout)
// ============================================
app.get('/tenant/shop/checkout', (c) => {
  const subdomain = c.req.query('subdomain')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>購入手続き - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center">
                        <a href="/tenant/shop?subdomain=${subdomain}" class="text-gray-600 hover:text-gray-900 mr-4">
                            <i class="fas fa-arrow-left"></i>
                        </a>
                        <h1 class="text-xl font-bold text-gray-900">購入手続き</h1>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- 注文情報入力 -->
                    <div class="md:col-span-2">
                        <div class="card p-6 mb-6">
                            <h2 class="text-xl font-bold mb-4">
                                <i class="fas fa-truck mr-2"></i>
                                配送先情報
                            </h2>
                            
                            <div id="shippingForm" class="space-y-4">
                                <p class="text-gray-500 text-sm">配送が必要な商品はありません</p>
                            </div>
                        </div>
                        
                        <div class="card p-6">
                            <h2 class="text-xl font-bold mb-4">
                                <i class="fas fa-credit-card mr-2"></i>
                                お支払い方法
                            </h2>
                            
                            <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                                <p class="text-sm text-blue-800">
                                    <i class="fas fa-info-circle mr-2"></i>
                                    現在はクレジットカード決済のみ対応しています
                                </p>
                            </div>
                            
                            <button onclick="proceedToPayment()" class="w-full btn-primary text-lg py-4">
                                <i class="fas fa-lock mr-2"></i>
                                お支払いへ進む
                            </button>
                        </div>
                    </div>
                    
                    <!-- 注文サマリー -->
                    <div class="md:col-span-1">
                        <div class="card p-6 sticky top-4">
                            <h2 class="text-xl font-bold mb-4">注文内容</h2>
                            
                            <div id="orderSummary" class="space-y-3 mb-6">
                                <!-- カート内容がここに表示されます -->
                            </div>
                            
                            <div class="border-t pt-4 space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">小計:</span>
                                    <span id="summarySubtotal">¥0</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">送料:</span>
                                    <span id="summaryShipping">¥0</span>
                                </div>
                                <div class="flex justify-between text-lg font-bold pt-2 border-t">
                                    <span>合計:</span>
                                    <span class="text-blue-600" id="summaryTotal">¥0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            const subdomain = '${subdomain}'
            let cart = []
            let requiresShipping = false
            
            function loadCart() {
                cart = JSON.parse(localStorage.getItem(\`cart_\${subdomain}\`) || '[]')
                
                if (cart.length === 0) {
                    window.location.href = \`/tenant/shop?subdomain=\${subdomain}\`
                    return
                }
                
                requiresShipping = cart.some(item => item.requires_shipping)
                
                displayOrderSummary()
                displayShippingForm()
            }
            
            function displayOrderSummary() {
                const container = document.getElementById('orderSummary')
                let subtotal = 0
                
                container.innerHTML = cart.map(item => {
                    const itemTotal = item.price * item.quantity
                    subtotal += itemTotal
                    
                    return \`
                        <div class="flex items-center space-x-3 pb-3 border-b">
                            \${item.image_url ? \`
                                <img src="\${item.image_url}" alt="\${item.name}" 
                                     class="w-12 h-12 object-cover rounded">
                            \` : \`
                                <div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                    <i class="fas fa-box text-gray-400 text-xs"></i>
                                </div>
                            \`}
                            
                            <div class="flex-1">
                                <p class="font-medium text-sm">\${item.name}</p>
                                <p class="text-xs text-gray-500">数量: \${item.quantity}</p>
                            </div>
                            
                            <p class="font-semibold text-sm">¥\${itemTotal.toLocaleString()}</p>
                        </div>
                    \`
                }).join('')
                
                const shippingFee = requiresShipping ? 500 : 0
                const total = subtotal + shippingFee
                
                document.getElementById('summarySubtotal').textContent = \`¥\${subtotal.toLocaleString()}\`
                document.getElementById('summaryShipping').textContent = \`¥\${shippingFee.toLocaleString()}\`
                document.getElementById('summaryTotal').textContent = \`¥\${total.toLocaleString()}\`
            }
            
            function displayShippingForm() {
                const container = document.getElementById('shippingForm')
                
                if (!requiresShipping) {
                    container.innerHTML = \`
                        <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                            <i class="fas fa-box-open text-2xl mb-2"></i>
                            <p>配送が必要な商品はありません</p>
                        </div>
                    \`
                    return
                }
                
                container.innerHTML = \`
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            お名前 <span class="text-red-500">*</span>
                        </label>
                        <input type="text" id="shippingName" required
                               class="input-field"
                               placeholder="山田 太郎">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            電話番号 <span class="text-red-500">*</span>
                        </label>
                        <input type="tel" id="shippingPhone" required
                               class="input-field"
                               placeholder="090-1234-5678">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            郵便番号 <span class="text-red-500">*</span>
                        </label>
                        <input type="text" id="shippingPostal" required
                               class="input-field"
                               placeholder="123-4567">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            住所 <span class="text-red-500">*</span>
                        </label>
                        <textarea id="shippingAddress" required rows="3"
                                  class="input-field"
                                  placeholder="東京都渋谷区1-2-3&#10;アパート名101号室"></textarea>
                    </div>
                \`
            }
            
            async function proceedToPayment() {
                const token = localStorage.getItem('token')
                if (!token) {
                    window.location.href = '/login'
                    return
                }
                
                // 配送情報のバリデーション
                let shippingData = {}
                if (requiresShipping) {
                    const name = document.getElementById('shippingName')?.value
                    const phone = document.getElementById('shippingPhone')?.value
                    const postal = document.getElementById('shippingPostal')?.value
                    const address = document.getElementById('shippingAddress')?.value
                    
                    if (!name || !phone || !postal || !address) {
                        showToast('配送先情報をすべて入力してください', 'error')
                        return
                    }
                    
                    shippingData = {
                        shipping_name: name,
                        shipping_phone: phone,
                        shipping_address: \`〒\${postal}\\n\${address}\`
                    }
                }
                
                try {
                    const response = await axios.post('/api/shop/orders', {
                        items: cart.map(item => ({
                            product_id: item.product_id,
                            quantity: item.quantity
                        })),
                        ...shippingData
                    }, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        // カートをクリア
                        localStorage.removeItem(\`cart_\${subdomain}\`)
                        
                        // 注文完了ページへ
                        showToast('ご注文ありがとうございます！', 'success')
                        
                        setTimeout(() => {
                            window.location.href = \`/tenant/shop/orders?subdomain=\${subdomain}\`
                        }, 1500)
                    }
                } catch (error) {
                    console.error('Order error:', error)
                    showToast(error.response?.data?.error || '注文の作成に失敗しました', 'error')
                }
            }
            
            document.addEventListener('DOMContentLoaded', loadCart)
        </script>
    </body>
    </html>
  `)
})

// ============================================
// 注文履歴ページ (/tenant/shop/orders)
// ============================================
app.get('/tenant/shop/orders', (c) => {
  const subdomain = c.req.query('subdomain')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>注文履歴 - Commons</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="bg-white border-b border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center">
                        <a href="/tenant/shop?subdomain=${subdomain}" class="text-gray-600 hover:text-gray-900 mr-4">
                            <i class="fas fa-arrow-left"></i>
                        </a>
                        <h1 class="text-xl font-bold text-gray-900">
                            <i class="fas fa-receipt mr-2"></i>
                            注文履歴
                        </h1>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div id="ordersContainer">
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                        <p>注文履歴を読み込み中...</p>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            const subdomain = '${subdomain}'
            
            const statusLabels = {
                pending: '処理待ち',
                confirmed: '確認済み',
                shipped: '配送中',
                delivered: '配送完了',
                cancelled: 'キャンセル'
            }
            
            const statusColors = {
                pending: 'bg-yellow-100 text-yellow-800',
                confirmed: 'bg-blue-100 text-blue-800',
                shipped: 'bg-purple-100 text-purple-800',
                delivered: 'bg-green-100 text-green-800',
                cancelled: 'bg-red-100 text-red-800'
            }
            
            const paymentStatusLabels = {
                pending: '決済待ち',
                completed: '決済完了',
                failed: '決済失敗',
                refunded: '返金済み'
            }
            
            async function loadOrders() {
                try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('/api/shop/orders', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                    
                    if (response.data.success) {
                        displayOrders(response.data.orders)
                    }
                } catch (error) {
                    console.error('Load orders error:', error)
                    const container = document.getElementById('ordersContainer')
                    container.innerHTML = \`
                        <div class="text-center py-12 text-red-500">
                            <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                            <p>注文履歴の取得に失敗しました</p>
                        </div>
                    \`
                }
            }
            
            function displayOrders(orders) {
                const container = document.getElementById('ordersContainer')
                
                if (orders.length === 0) {
                    container.innerHTML = \`
                        <div class="card p-12 text-center text-gray-500">
                            <i class="fas fa-receipt text-5xl mb-4"></i>
                            <p class="text-lg mb-4">注文履歴はありません</p>
                            <a href="/tenant/shop?subdomain=\${subdomain}" class="btn-primary">
                                ショップで買い物をする
                            </a>
                        </div>
                    \`
                    return
                }
                
                container.innerHTML = orders.map(order => \`
                    <div class="card p-6 mb-4 hover:shadow-lg transition-shadow">
                        <div class="flex items-start justify-between mb-4">
                            <div>
                                <p class="text-sm text-gray-500">注文番号</p>
                                <p class="font-mono font-semibold">\${order.order_number}</p>
                            </div>
                            <div class="text-right">
                                <span class="px-3 py-1 rounded-full text-sm \${statusColors[order.order_status]}">
                                    \${statusLabels[order.order_status]}
                                </span>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                                <p class="text-gray-500">注文日時</p>
                                <p>\${new Date(order.created_at).toLocaleString('ja-JP')}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">決済状況</p>
                                <p>\${paymentStatusLabels[order.payment_status]}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-between pt-4 border-t">
                            <div>
                                <p class="text-sm text-gray-500">合計金額</p>
                                <p class="text-2xl font-bold text-blue-600">¥\${order.total_amount.toLocaleString()}</p>
                            </div>
                            <button onclick="viewOrderDetail(\${order.id})" class="btn-secondary">
                                <i class="fas fa-eye mr-2"></i>
                                詳細を見る
                            </button>
                        </div>
                    </div>
                \`).join('')
            }
            
            async function viewOrderDetail(orderId) {
                // TODO: 注文詳細モーダルまたはページを実装
                showToast('注文詳細機能は近日実装予定です', 'info')
            }
            
            document.addEventListener('DOMContentLoaded', loadOrders)
        </script>
    </body>
    </html>
  `)
})

// ============================================
// ヘルスチェックAPI
// ============================================
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
