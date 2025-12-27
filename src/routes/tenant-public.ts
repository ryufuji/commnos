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

// テスト用会員IDルート
tenantPublic.get('/members/:memberId/test', async (c) => {
  const memberId = c.req.param('memberId')
  const subdomain = c.req.query('subdomain')
  return c.text(`Member ID: ${memberId}, Subdomain: ${subdomain}`)
})

// --------------------------------------------
// テナント会員ログインページ
// --------------------------------------------
tenantPublic.get('/login', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.text('Subdomain is required', 400)
  }

  // Get tenant by subdomain
  const tenantResult = await DB.prepare(`
    SELECT * FROM tenants WHERE subdomain = ?
  `).bind(subdomain).first()

  if (!tenantResult) {
    return c.text('Tenant not found', 404)
  }

  const tenant = tenantResult as any

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ログイン - ${tenant.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-bg {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .input-focus:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <header class="gradient-bg text-white shadow-lg">
            <div class="container mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <a href="/home?subdomain=${subdomain}" class="text-2xl font-bold hover:opacity-80 transition">
                        <i class="fas fa-users mr-2"></i>
                        ${tenant.name}
                    </a>
                    <nav class="hidden md:flex space-x-6">
                        <a href="/home?subdomain=${subdomain}" class="hover:opacity-80 transition">
                            <i class="fas fa-home mr-1"></i> ホーム
                        </a>
                        <a href="/register?subdomain=${subdomain}" class="hover:opacity-80 transition">
                            <i class="fas fa-user-plus mr-1"></i> 新規登録
                        </a>
                    </nav>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="container mx-auto px-4 py-12">
            <div class="max-w-md mx-auto">
                <!-- Login Card -->
                <div class="bg-white rounded-lg shadow-xl p-8">
                    <div class="text-center mb-8">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-bg text-white mb-4">
                            <i class="fas fa-sign-in-alt text-2xl"></i>
                        </div>
                        <h1 class="text-3xl font-bold text-gray-800 mb-2">ログイン</h1>
                        <p class="text-gray-600">${tenant.name}へようこそ</p>
                    </div>

                    <!-- Login Form -->
                    <form id="loginForm" class="space-y-6">
                        <!-- Email -->
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-envelope mr-1"></i> メールアドレス
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                class="input-focus w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition"
                                placeholder="your@email.com"
                            />
                        </div>

                        <!-- Password -->
                        <div>
                            <label for="password" class="block text="sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-lock mr-1"></i> パスワード
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                required
                                minlength="8"
                                class="input-focus w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition"
                                placeholder="••••••••"
                            />
                        </div>

                        <!-- Remember Me -->
                        <div class="flex items-center justify-between">
                            <label class="flex items-center">
                                <input type="checkbox" id="remember" name="remember" class="rounded text-purple-600 mr-2">
                                <span class="text-sm text-gray-600">ログイン状態を保持</span>
                            </label>
                            <a href="#" class="text-sm text-purple-600 hover:text-purple-700">
                                パスワードを忘れた場合
                            </a>
                        </div>

                        <!-- Submit Button -->
                        <button
                            type="submit"
                            id="loginBtn"
                            class="w-full gradient-bg text-white py-3 rounded-lg font-semibold hover:opacity-90 transition transform hover:scale-105"
                        >
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            ログイン
                        </button>
                    </form>

                    <!-- Divider -->
                    <div class="relative my-8">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-4 bg-white text-gray-500">または</span>
                        </div>
                    </div>

                    <!-- Register Link -->
                    <div class="text-center">
                        <p class="text-gray-600 mb-4">まだアカウントをお持ちでない方</p>
                        <a
                            href="/register?subdomain=${subdomain}"
                            class="inline-block w-full border-2 border-purple-600 text-purple-600 py-3 rounded-lg font-semibold hover:bg-purple-50 transition"
                        >
                            <i class="fas fa-user-plus mr-2"></i>
                            新規登録
                        </a>
                    </div>
                </div>

                <!-- Back to Home -->
                <div class="text-center mt-6">
                    <a href="/home?subdomain=${subdomain}" class="text-gray-600 hover:text-gray-800">
                        <i class="fas fa-arrow-left mr-2"></i>
                        ホームに戻る
                    </a>
                </div>
            </div>
        </main>

        <!-- Toast Container -->
        <div id="toast" class="fixed top-4 right-4 z-50 hidden">
            <div class="bg-white rounded-lg shadow-xl p-4 max-w-md">
                <div class="flex items-center">
                    <div id="toastIcon" class="mr-3"></div>
                    <p id="toastMessage" class="text-gray-800"></p>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            const subdomain = '${subdomain}';

            // Toast notification
            function showToast(message, type = 'success') {
                const toast = document.getElementById('toast');
                const toastMessage = document.getElementById('toastMessage');
                const toastIcon = document.getElementById('toastIcon');

                toastMessage.textContent = message;

                if (type === 'success') {
                    toastIcon.innerHTML = '<i class="fas fa-check-circle text-green-500 text-xl"></i>';
                } else if (type === 'error') {
                    toastIcon.innerHTML = '<i class="fas fa-times-circle text-red-500 text-xl"></i>';
                }

                toast.classList.remove('hidden');
                setTimeout(() => {
                    toast.classList.add('hidden');
                }, 3000);
            }

            // Handle login form submission
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                const remember = document.getElementById('remember').checked;
                const loginBtn = document.getElementById('loginBtn');

                // Validation
                if (!email || !password) {
                    showToast('すべての項目を入力してください', 'error');
                    return;
                }

                // Disable button
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> ログイン中...';

                try {
                    const response = await axios.post('/api/tenant/login', {
                        email,
                        password,
                        subdomain,
                        remember
                    });

                    if (response.data.success) {
                        // Store token
                        localStorage.setItem('authToken', response.data.token);
                        localStorage.setItem('user', JSON.stringify(response.data.user));

                        showToast('ログインに成功しました', 'success');

                        // Redirect to home
                        setTimeout(() => {
                            window.location.href = \`/home?subdomain=\${subdomain}\`;
                        }, 1500);
                    } else {
                        throw new Error(response.data.message || 'ログインに失敗しました');
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    const errorMessage = error.response?.data?.message || error.message || 'ログインに失敗しました';
                    showToast(errorMessage, 'error');

                    // Re-enable button
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> ログイン';
                }
            });
        </script>
    </body>
    </html>
  `)
})

// --------------------------------------------
// テナント会員登録ページ
// --------------------------------------------
tenantPublic.get('/register', async (c) => {
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
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>会員登録 - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full">
        <!-- ロゴ・タイトル -->
        <div class="text-center mb-8">
            <a href="/tenant/home?subdomain=${subdomain}" class="inline-block mb-4">
                <h1 class="text-3xl font-bold text-gray-800">${tenantName}</h1>
                ${tenantSubtitle ? `<p class="text-gray-600">${tenantSubtitle}</p>` : ''}
            </a>
            <h2 class="text-2xl font-bold text-gray-800 mt-4">会員登録</h2>
            <p class="text-gray-600 mt-2">コミュニティに参加しましょう</p>
        </div>

        <!-- 登録フォーム -->
        <div class="bg-white rounded-lg shadow-xl p-8">
            <form id="registerForm" class="space-y-6">
                <!-- ニックネーム -->
                <div>
                    <label for="nickname" class="block text-sm font-medium text-gray-700 mb-2">
                        ニックネーム <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        id="nickname" 
                        name="nickname" 
                        required
                        maxlength="50"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="山田太郎"
                    >
                </div>

                <!-- メールアドレス -->
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                        メールアドレス <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        required
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your@example.com"
                    >
                </div>

                <!-- パスワード -->
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                        パスワード <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required
                        minlength="8"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                    >
                    <p class="text-sm text-gray-500 mt-1">8文字以上</p>
                </div>

                <!-- パスワード確認 -->
                <div>
                    <label for="passwordConfirm" class="block text-sm font-medium text-gray-700 mb-2">
                        パスワード（確認） <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="password" 
                        id="passwordConfirm" 
                        name="passwordConfirm" 
                        required
                        minlength="8"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                    >
                </div>

                <!-- 自己紹介（任意） -->
                <div>
                    <label for="bio" class="block text-sm font-medium text-gray-700 mb-2">
                        自己紹介（任意）
                    </label>
                    <textarea 
                        id="bio" 
                        name="bio"
                        rows="3"
                        maxlength="500"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="簡単な自己紹介をお願いします"
                    ></textarea>
                    <p class="text-sm text-gray-500 mt-1">最大500文字</p>
                </div>

                <!-- 送信ボタン -->
                <button 
                    type="submit" 
                    id="submitBtn"
                    class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                    <i class="fas fa-user-plus mr-2"></i>会員申請を送信
                </button>
            </form>

            <!-- ログインリンク -->
            <div class="mt-6 text-center">
                <p class="text-gray-600">
                    すでにアカウントをお持ちですか？
                    <a href="/tenant/login?subdomain=${subdomain}" class="text-blue-600 hover:text-blue-700 font-semibold">
                        ログイン
                    </a>
                </p>
            </div>

            <!-- ホームに戻る -->
            <div class="mt-4 text-center">
                <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-arrow-left mr-2"></i>ホームに戻る
                </a>
            </div>
        </div>

        <!-- 注意事項 -->
        <div class="mt-6 text-center text-sm text-gray-600">
            <p>会員申請後、管理者の承認をお待ちください。</p>
            <p>承認されるとメールでお知らせします。</p>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        const registerForm = document.getElementById('registerForm')
        const submitBtn = document.getElementById('submitBtn')
        
        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const formData = new FormData(registerForm)
            const nickname = formData.get('nickname')
            const email = formData.get('email')
            const password = formData.get('password')
            const passwordConfirm = formData.get('passwordConfirm')
            const bio = formData.get('bio')
            
            // バリデーション
            if (!nickname || !email || !password) {
                showToast('必須項目を入力してください', 'error')
                return
            }
            
            if (password !== passwordConfirm) {
                showToast('パスワードが一致しません', 'error')
                return
            }
            
            if (password.length < 8) {
                showToast('パスワードは8文字以上にしてください', 'error')
                return
            }
            
            try {
                submitBtn.disabled = true
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>送信中...'
                
                const response = await axios.post('/api/tenant/register', {
                    subdomain: '${subdomain}',
                    nickname: nickname.trim(),
                    email: email.trim(),
                    password: password,
                    bio: bio?.trim() || null
                })
                
                if (response.data.success) {
                    showToast('会員申請を送信しました！管理者の承認をお待ちください', 'success')
                    setTimeout(() => {
                        window.location.href = '/tenant/register/pending?subdomain=${subdomain}'
                    }, 2000)
                } else {
                    throw new Error(response.data.message || '会員申請に失敗しました')
                }
            } catch (error) {
                console.error('登録エラー:', error)
                const message = error.response?.data?.message || error.message || '会員申請に失敗しました'
                showToast(message, 'error')
                submitBtn.disabled = false
                submitBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>会員申請を送信'
            }
        })
    </script>
</body>
</html>`)
})

// --------------------------------------------
// 会員登録（承認待ち画面）
// --------------------------------------------
tenantPublic.get('/register/pending', async (c) => {
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.redirect('/')
  }
  
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>承認待ち - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full text-center">
        <div class="bg-white rounded-lg shadow-xl p-8">
            <div class="mb-6">
                <i class="fas fa-clock text-6xl text-blue-600"></i>
            </div>
            <h1 class="text-3xl font-bold text-gray-800 mb-4">会員申請を受付ました</h1>
            <p class="text-gray-600 mb-6">
                管理者が申請を確認し、承認されるとメールでお知らせします。<br>
                しばらくお待ちください。
            </p>
            <div class="space-y-4">
                <a href="/tenant/home?subdomain=${subdomain}" 
                   class="block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                    <i class="fas fa-home mr-2"></i>ホームに戻る
                </a>
            </div>
        </div>
    </div>
</body>
</html>`)
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
                    <a href="/tenant/tenant/members?subdomain=${subdomain}" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <i class="fas fa-users mr-2"></i>メンバー
                    </a>
                    <a href="/login?subdomain=${subdomain}" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
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
                <a href="/login?subdomain=${subdomain}" class="block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center">
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
                <a href="/tenant/register?subdomain=${subdomain}" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-lg transition-colors">
                    <i class="fas fa-user-plus mr-2"></i>メンバー申請
                </a>
                <a href="/login?subdomain=${subdomain}" class="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg text-lg transition-colors">
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

        // 未読通知数を取得して表示
        async function loadUnreadCount() {
            const token = localStorage.getItem('authToken')
            if (!token) return

            try {
                const response = await fetch('/api/notifications/unread-count', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await response.json()
                
                if (data.success && data.unreadCount > 0) {
                    const badge = document.getElementById('notificationBadge')
                    const badgeMobile = document.getElementById('notificationBadgeMobile')
                    
                    if (badge) {
                        badge.textContent = data.unreadCount
                        badge.classList.remove('hidden')
                    }
                    if (badgeMobile) {
                        badgeMobile.textContent = data.unreadCount
                        badgeMobile.classList.remove('hidden')
                    }
                }
            } catch (error) {
                console.error('未読数取得エラー:', error)
            }
        }

        // ページ読み込み時に未読数を取得
        loadUnreadCount()
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
    <title>コミュニティが見つかりません</title>
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
  
  // クライアントサイドで管理者判定を行う（JavaScriptでAPIから取得）
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
                    <a href="/tenant/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-users mr-2"></i>メンバー
                    </a>
                    <a href="/login?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
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
                <a href="/tenant/tenant/members?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
                    <i class="fas fa-users mr-2"></i>メンバー
                </a>
                <a href="/login?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
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

                <!-- 公開範囲 (管理者のみ) -->
                <div id="visibilityField" style="display: none;">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        公開範囲 <span class="text-xs text-gray-500">(管理者のみ設定可能)</span>
                    </label>
                    <div class="space-y-2">
                        <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                            <input 
                                type="radio" 
                                name="visibility" 
                                value="public" 
                                checked
                                class="mr-3 w-4 h-4 text-primary"
                            >
                            <div>
                                <span class="font-medium text-gray-700">パブリック</span>
                                <p class="text-sm text-gray-500">誰でも閲覧できます（非会員も閲覧可能）</p>
                            </div>
                        </label>
                        <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                            <input 
                                type="radio" 
                                name="visibility" 
                                value="members_only"
                                class="mr-3 w-4 h-4 text-primary"
                            >
                            <div>
                                <span class="font-medium text-gray-700">会員限定</span>
                                <p class="text-sm text-gray-500">コミュニティの会員のみ閲覧できます</p>
                            </div>
                        </label>
                    </div>
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
                            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                        >
                            <i class="fas fa-paper-plane mr-2"></i>投稿する
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </main>

    <!-- プレビューモーダル -->
    <div id="previewModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <!-- モーダルヘッダー -->
            <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-eye mr-2 text-blue-600"></i>投稿プレビュー
                </h2>
                <button onclick="closePreview()" class="text-gray-500 hover:text-gray-700 text-2xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- プレビューコンテンツ -->
            <div class="p-6">
                <!-- サムネイル画像 -->
                <div id="previewThumbnailContainer" class="hidden mb-6">
                    <img id="previewThumbnail" src="" alt="サムネイル" class="w-full h-64 object-cover rounded-lg">
                </div>
                
                <!-- 投稿情報 -->
                <div class="mb-6">
                    <div class="flex items-center gap-3 text-sm text-gray-600 mb-4 flex-wrap">
                        <span id="previewCategory" class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium"></span>
                        <span id="previewStatus" class="px-3 py-1 rounded-full font-medium"></span>
                        <span id="previewVisibility" class="hidden px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-medium"></span>
                    </div>
                    <h1 id="previewTitle" class="text-3xl font-bold text-gray-900 mb-4"></h1>
                </div>
                
                <!-- 投稿本文 -->
                <div id="previewContent" class="prose prose-lg max-w-none text-gray-700 whitespace-pre-wrap"></div>
            </div>
            
            <!-- モーダルフッター -->
            <div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-4">
                <button onclick="closePreview()" class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                    閉じる
                </button>
                <button onclick="submitFromPreview()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                    <i class="fas fa-paper-plane mr-2"></i>この内容で投稿する
                </button>
            </div>
        </div>
    </div>

    <!-- フッター -->
    <footer class="bg-white border-t mt-16">
        <div class="container mx-auto px-4 py-6 text-center text-gray-600">
            <p>© 2025 ${tenant.name}. All rights reserved.</p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        // 認証チェックと管理者判定
        async function checkAuthAndRole() {
            const token = getToken()  // Use getToken() from app.js
            if (!token) {
                console.warn('No token found, redirecting to login')
                window.location.href = '/login?subdomain=${subdomain}'
                return
            }
            
            try {
                // Check localStorage membership data directly
                const membershipStr = localStorage.getItem('membership')
                if (!membershipStr) {
                    console.warn('No membership found, redirecting to login')
                    window.location.href = '/login?subdomain=${subdomain}'
                    return
                }
                
                const membership = JSON.parse(membershipStr)
                console.log('Membership:', membership)
                
                // Check if subdomain matches
                if (membership.subdomain !== '${subdomain}') {
                    alert('このコミュニティの会員ではありません')
                    window.location.href = '/tenant/home?subdomain=${subdomain}'
                    return
                }
                
                if (membership.status === 'pending') {
                    alert('会員申請は承認待ちです')
                    window.location.href = '/tenant/home?subdomain=${subdomain}'
                    return
                }
                
                if (membership.status !== 'active') {
                    alert('投稿を作成する権限がありません')
                    window.location.href = '/tenant/home?subdomain=${subdomain}'
                    return
                }
                
                // 管理者の場合は公開範囲フィールドを表示
                const isAdmin = membership.role === 'owner' || membership.role === 'admin'
                if (isAdmin) {
                    document.getElementById('visibilityField').style.display = 'block'
                }
                
                console.log('Authentication check passed')
            } catch (error) {
                console.error('認証エラー:', error)
                window.location.href = '/login?subdomain=${subdomain}'
            }
        }
        
        // ページ読み込み時に認証チェック
        checkAuthAndRole()
        
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
        
        // プレビュー機能
        const previewBtn = document.getElementById('previewBtn')
        const previewModal = document.getElementById('previewModal')
        
        window.openPreview = function() {
            const title = document.getElementById('title').value
            const content = document.getElementById('content').value
            const category = document.getElementById('category').value
            const status = document.querySelector('input[name="status"]:checked')?.value
            const visibility = document.querySelector('input[name="visibility"]:checked')?.value
            
            // バリデーション
            if (!title || title.trim() === '') {
                showToast('タイトルを入力してください', 'error')
                return
            }
            
            if (!content || content.trim() === '') {
                showToast('本文を入力してください', 'error')
                return
            }
            
            // プレビュー内容を設定
            document.getElementById('previewTitle').textContent = title
            document.getElementById('previewContent').textContent = content
            
            // カテゴリー表示
            const categoryBadge = document.getElementById('previewCategory')
            if (category) {
                categoryBadge.textContent = category
                categoryBadge.classList.remove('hidden')
            } else {
                categoryBadge.classList.add('hidden')
            }
            
            // ステータスバッジ
            const statusBadge = document.getElementById('previewStatus')
            if (status === 'published') {
                statusBadge.textContent = '公開'
                statusBadge.className = 'px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium'
            } else {
                statusBadge.textContent = '下書き'
                statusBadge.className = 'px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-medium'
            }
            
            // 公開範囲バッジ（管理者のみ）
            const visibilityBadge = document.getElementById('previewVisibility')
            if (visibility) {
                if (visibility === 'public') {
                    visibilityBadge.textContent = 'パブリック'
                } else {
                    visibilityBadge.textContent = '会員限定'
                }
                visibilityBadge.classList.remove('hidden')
            } else {
                visibilityBadge.classList.add('hidden')
            }
            
            // サムネイル画像
            const thumbnailPreview = document.getElementById('thumbnailPreview')
            const previewThumbnailContainer = document.getElementById('previewThumbnailContainer')
            const previewThumbnail = document.getElementById('previewThumbnail')
            
            if (!thumbnailPreview.classList.contains('hidden')) {
                const thumbnailSrc = document.getElementById('thumbnailImg').src
                previewThumbnail.src = thumbnailSrc
                previewThumbnailContainer.classList.remove('hidden')
            } else {
                previewThumbnailContainer.classList.add('hidden')
            }
            
            // モーダルを表示
            previewModal.classList.remove('hidden')
        }
        
        window.closePreview = function() {
            previewModal.classList.add('hidden')
        }
        
        window.submitFromPreview = function() {
            closePreview()
            // フォームを送信
            document.getElementById('createPostForm').dispatchEvent(new Event('submit'))
        }
        
        previewBtn?.addEventListener('click', openPreview)
        
        // モーダル外クリックで閉じる
        previewModal?.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                closePreview()
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
                const visibility = document.querySelector('input[name="visibility"]:checked')?.value || 'public'
                const postData = {
                    title: title.trim(),
                    content: content.trim(),
                    category: category || null,
                    status: status,
                    thumbnail_url: thumbnailUrl,
                    visibility: visibility
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
  
  // 投稿を取得（いいね数を含む）
  const postsResult = await DB.prepare(`
    SELECT p.*, u.nickname as author_name,
           (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.tenant_id = ? AND p.status = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(tenant.id, 'published', perPage, offset).all()
  
  const posts = postsResult.results || []
  
  // 人気投稿を取得（いいね数上位5件）
  const popularPostsResult = await DB.prepare(`
    SELECT p.*, u.nickname as author_name,
           (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.tenant_id = ? AND p.status = ?
    ORDER BY like_count DESC, p.view_count DESC
    LIMIT 5
  `).bind(tenant.id, 'published').all()
  
  const popularPosts = popularPostsResult.results || []
  
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
      const likeCount = Number(post.like_count || 0)
      
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
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-4 text-sm text-gray-600">
                        <span><i class="far fa-thumbs-up mr-1"></i>${likeCount}</span>
                        <span><i class="far fa-eye mr-1"></i>${post.view_count || 0}</span>
                    </div>
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
  
  // 人気投稿HTMLを生成
  let popularPostsHTML = ''
  if (popularPosts.length > 0) {
    popularPostsHTML = popularPosts.map((post: any, index: number) => {
      const postTitle = String(post.title || '')
      const authorName = String(post.author_name || '不明')
      const likeCount = Number(post.like_count || 0)
      const viewCount = Number(post.view_count || 0)
      
      // ランキングバッジの色
      let badgeClass = 'bg-gray-500'
      if (index === 0) badgeClass = 'bg-yellow-500'
      else if (index === 1) badgeClass = 'bg-gray-400'
      else if (index === 2) badgeClass = 'bg-orange-600'
      
      return `
        <a href="/tenant/posts/${post.id}?subdomain=${subdomain}" 
           class="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition">
            <div class="${badgeClass} text-white font-bold w-8 h-8 rounded-full flex items-center justify-center mr-4">
                ${index + 1}
            </div>
            <div class="flex-grow">
                <h4 class="font-semibold text-gray-900 mb-1 line-clamp-1">${postTitle}</h4>
                <div class="flex items-center space-x-4 text-xs text-gray-500">
                    <span><i class="fas fa-user mr-1"></i>${authorName}</span>
                    <span><i class="far fa-thumbs-up mr-1"></i>${likeCount}</span>
                    <span><i class="far fa-eye mr-1"></i>${viewCount}</span>
                </div>
            </div>
        </a>
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
                    <a href="/tenant/members?subdomain=${subdomain}" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
                        <i class="fas fa-users mr-2"></i>メンバー
                    </a>
                    <a href="/tenant/notifications?subdomain=${subdomain}" id="notificationLink" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition relative">
                        <i class="fas fa-bell mr-2"></i>通知
                        <span id="notificationBadge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full"></span>
                    </a>
                    <a href="/login?subdomain=${subdomain}" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
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
                <a href="/tenant/members?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-center">
                    <i class="fas fa-users mr-2"></i>メンバー
                </a>
                <a href="/tenant/notifications?subdomain=${subdomain}" id="notificationLinkMobile" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-center relative">
                    <i class="fas fa-bell mr-2"></i>通知
                    <span id="notificationBadgeMobile" class="hidden ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full"></span>
                </a>
                <a href="/login?subdomain=${subdomain}" class="block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center">
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

        <!-- 人気投稿ランキング -->
        ${popularPostsHTML ? `
        <div class="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
            <h3 class="text-2xl font-bold text-gray-900 mb-4">
                <i class="fas fa-fire text-orange-500 mr-2"></i>人気投稿ランキング
            </h3>
            <div class="space-y-3">
                ${popularPostsHTML}
            </div>
        </div>
        ` : ''}

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

        // 未読通知数を取得して表示
        async function loadUnreadCount() {
            const token = localStorage.getItem('authToken')
            if (!token) return

            try {
                const response = await fetch('/api/notifications/unread-count', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await response.json()
                
                if (data.success && data.unreadCount > 0) {
                    const badge = document.getElementById('notificationBadge')
                    const badgeMobile = document.getElementById('notificationBadgeMobile')
                    
                    if (badge) {
                        badge.textContent = data.unreadCount
                        badge.classList.remove('hidden')
                    }
                    if (badgeMobile) {
                        badgeMobile.textContent = data.unreadCount
                        badgeMobile.classList.remove('hidden')
                    }
                }
            } catch (error) {
                console.error('未読数取得エラー:', error)
            }
        }

        // ページ読み込み時に未読数を取得
        loadUnreadCount()
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

// --------------------------------------------
// 投稿詳細ページ
// --------------------------------------------
tenantPublic.get('/posts/:id', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  const postId = c.req.param('id')
  
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
  
  // 投稿を取得
  const post = await DB.prepare(`
    SELECT p.*, u.nickname as author_name, u.avatar_url as author_avatar
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.id = ? AND p.tenant_id = ? AND p.status = ?
  `).bind(postId, tenant.id, 'published').first()
  
  if (!post) {
    return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投稿が見つかりません - ${tenant.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="flex items-center justify-center min-h-screen">
        <div class="text-center">
            <i class="fas fa-exclamation-triangle text-6xl text-yellow-500 mb-4"></i>
            <h1 class="text-4xl font-bold text-gray-800 mb-4">投稿が見つかりません</h1>
            <p class="text-gray-600 mb-6">指定された投稿は存在しないか、削除された可能性があります。</p>
            <a href="/tenant/posts?subdomain=${subdomain}" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <i class="fas fa-arrow-left mr-2"></i>投稿一覧に戻る
            </a>
        </div>
    </div>
</body>
</html>`)
  }
  
  // 閲覧数を増加
  await DB.prepare(
    'UPDATE posts SET view_count = view_count + 1 WHERE id = ?'
  ).bind(postId).run()
  
  // コメントを取得（いいね数を含む）
  const commentsResult = await DB.prepare(`
    SELECT c.*, u.nickname as user_name, u.avatar_url as user_avatar,
           (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as like_count
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? AND c.tenant_id = ?
    ORDER BY c.created_at DESC
  `).bind(postId, tenant.id).all()
  
  const comments = commentsResult.results || []
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  const postTitle = String(post.title || '')
  const postContent = String(post.content || '')
  const authorName = String(post.author_name || '不明')
  const authorAvatar = String(post.author_avatar || '')
  const viewCount = post.view_count || 0
  const createdDate = new Date(String(post.created_at)).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${postTitle} - ${tenantName}</title>
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
                        ${tenantName}
                    </a>
                    ${tenantSubtitle ? `<span class="text-gray-500 hidden md:inline">- ${tenantSubtitle}</span>` : ''}
                </div>
                
                <!-- デスクトップナビ -->
                <nav class="hidden md:flex items-center space-x-6">
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-home mr-2"></i>ホーム
                    </a>
                    <a href="/tenant/posts?subdomain=${subdomain}" class="text-primary font-semibold">
                        <i class="fas fa-newspaper mr-2"></i>投稿
                    </a>
                    <a href="/tenant/posts/new?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-plus-circle mr-2"></i>投稿作成
                    </a>
                    <a href="/tenant/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-users mr-2"></i>メンバー
                    </a>
                    <a href="/login?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
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
                <a href="/tenant/posts?subdomain=${subdomain}" class="block py-2 text-primary font-semibold">
                    <i class="fas fa-newspaper mr-2"></i>投稿
                </a>
                <a href="/tenant/posts/new?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
                    <i class="fas fa-plus-circle mr-2"></i>投稿作成
                </a>
                <a href="/tenant/tenant/members?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
                    <i class="fas fa-users mr-2"></i>メンバー
                </a>
                <a href="/login?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
                    <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                </a>
            </nav>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="container mx-auto px-4 py-8 max-w-4xl">
        <!-- パンくずリスト -->
        <nav class="mb-6 text-sm">
            <ol class="flex items-center space-x-2 text-gray-600">
                <li><a href="/tenant/home?subdomain=${subdomain}" class="hover:text-primary transition">ホーム</a></li>
                <li><i class="fas fa-chevron-right text-xs"></i></li>
                <li><a href="/tenant/posts?subdomain=${subdomain}" class="hover:text-primary transition">投稿一覧</a></li>
                <li><i class="fas fa-chevron-right text-xs"></i></li>
                <li class="text-gray-900 font-semibold">${postTitle}</li>
            </ol>
        </nav>

        <!-- 投稿コンテンツ -->
        <article class="bg-white rounded-lg shadow-md overflow-hidden">
            <!-- サムネイル画像 -->
            ${post.thumbnail_url ? `
            <div class="w-full h-96 overflow-hidden">
                <img src="${post.thumbnail_url}" alt="${postTitle}" class="w-full h-full object-cover">
            </div>
            ` : `
            <div class="w-full h-64 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <i class="fas fa-file-alt text-8xl text-white opacity-50"></i>
            </div>
            `}
            
            <!-- 投稿ヘッダー -->
            <div class="p-8 border-b">
                <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">${postTitle}</h1>
                
                <!-- メタ情報 -->
                <div class="flex flex-wrap items-center gap-6 text-gray-600">
                    <div class="flex items-center space-x-2">
                        ${authorAvatar ? `
                        <img src="${authorAvatar}" alt="${authorName}" class="w-10 h-10 rounded-full object-cover">
                        ` : `
                        <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <i class="fas fa-user text-gray-600"></i>
                        </div>
                        `}
                        <span class="font-medium">${authorName}</span>
                    </div>
                    <div class="flex items-center space-x-1">
                        <i class="fas fa-calendar text-sm"></i>
                        <span>${createdDate}</span>
                    </div>
                    <div class="flex items-center space-x-1">
                        <i class="fas fa-eye text-sm"></i>
                        <span>${viewCount + 1} 回閲覧</span>
                    </div>
                </div>
            </div>
            
            <!-- 投稿本文 -->
            <div class="p-8">
                <div class="prose prose-lg max-w-none">
                    ${postContent.split('\n').map(paragraph => {
                      if (paragraph.trim() === '') return '<br>'
                      return `<p class="mb-4 text-gray-700 leading-relaxed">${paragraph}</p>`
                    }).join('')}
                </div>
            </div>
            
            <!-- 投稿フッター -->
            <div class="p-8 bg-gray-50 border-t">
                <div class="flex items-center justify-between">
                    <a href="/tenant/posts?subdomain=${subdomain}" 
                       class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                        <i class="fas fa-arrow-left mr-2"></i>投稿一覧に戻る
                    </a>
                    <div class="flex items-center space-x-4">
                        <button id="likeButton" data-post-id="${postId}" class="px-4 py-2 text-gray-600 hover:text-blue-600 transition">
                            <i id="likeIcon" class="far fa-thumbs-up mr-2"></i>
                            <span id="likeText">いいね</span>
                            <span id="likeCount" class="ml-2 text-sm font-semibold">(0)</span>
                        </button>
                        <button class="px-4 py-2 text-gray-600 hover:text-blue-600 transition">
                            <i class="fas fa-share-alt mr-2"></i>シェア
                        </button>
                    </div>
                </div>
            </div>
        </article>
        
        <!-- コメントセクション -->
        <div class="mt-8 bg-white rounded-lg shadow-md p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">
                <i class="fas fa-comments mr-2 text-blue-600"></i>コメント (${comments.length})
            </h2>
            
            ${comments.length === 0 ? `
                <p class="text-gray-600 text-center py-8">まだコメントがありません。最初のコメントを投稿しましょう！</p>
            ` : comments.map((comment: any) => {
                const commentUserName = String(comment.user_name || '匿名')
                const commentUserAvatar = String(comment.user_avatar || '')
                const commentContent = String(comment.content || '')
                const commentLikeCount = Number(comment.like_count || 0)
                const commentDate = new Date(String(comment.created_at)).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                
                return `
                    <div class="border-b border-gray-200 py-6 last:border-b-0" data-comment-id="${comment.id}">
                        <div class="flex items-start space-x-4">
                            <div class="flex-shrink-0">
                                ${commentUserAvatar ? `
                                    <img src="${commentUserAvatar}" alt="${commentUserName}" class="w-12 h-12 rounded-full object-cover">
                                ` : `
                                    <div class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                                        <i class="fas fa-user text-gray-600"></i>
                                    </div>
                                `}
                            </div>
                            <div class="flex-grow">
                                <div class="flex items-center justify-between mb-2">
                                    <div>
                                        <span class="font-semibold text-gray-900">${commentUserName}</span>
                                        <span class="text-sm text-gray-500 ml-2">${commentDate}</span>
                                    </div>
                                </div>
                                <p class="text-gray-700 mb-3 whitespace-pre-wrap">${commentContent}</p>
                                <div class="flex items-center space-x-4">
                                    <button class="comment-like-btn text-sm text-gray-600 hover:text-blue-600 transition" data-comment-id="${comment.id}">
                                        <i class="far fa-thumbs-up mr-1"></i>
                                        <span class="comment-like-text">いいね</span>
                                        <span class="comment-like-count ml-1">(${commentLikeCount})</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            }).join('')}
        </div>
    </main>

    <!-- フッター -->
    <footer class="bg-white border-t mt-16">
        <div class="container mx-auto px-4 py-6 text-center text-gray-600">
            <p>© 2025 ${tenantName}. All rights reserved.</p>
        </div>
    </footer>

    <script src="/static/app.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
        // モバイルメニュー切替
        document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
            const menu = document.getElementById('mobileMenu')
            menu.classList.toggle('hidden')
        })
        
        // いいね機能
        const likeButton = document.getElementById('likeButton')
        const likeIcon = document.getElementById('likeIcon')
        const likeText = document.getElementById('likeText')
        const likeCount = document.getElementById('likeCount')
        
        if (likeButton) {
            const postId = likeButton.dataset.postId
            const subdomain = '${subdomain}'
            
            let isLiked = false
            let currentLikeCount = 0
            
            // いいね情報を読み込み
            async function loadLikeStatus() {
                try {
                    const response = await axios.get('/api/likes/posts/' + postId + '?subdomain=' + subdomain)
                    if (response.data.success) {
                        currentLikeCount = response.data.likeCount || 0
                        isLiked = response.data.liked || false
                        updateLikeButton()
                    }
                } catch (error) {
                    console.error('Failed to load like status:', error)
                }
            }
            
            // いいねボタンの表示を更新
            function updateLikeButton() {
                likeCount.textContent = '(' + currentLikeCount + ')'
                if (isLiked) {
                    likeIcon.className = 'fas fa-thumbs-up mr-2 text-blue-600'
                    likeText.textContent = 'いいね済み'
                    likeButton.classList.add('text-blue-600')
                } else {
                    likeIcon.className = 'far fa-thumbs-up mr-2'
                    likeText.textContent = 'いいね'
                    likeButton.classList.remove('text-blue-600')
                }
            }
            
            // いいねボタンのクリックイベント
            likeButton.addEventListener('click', async () => {
                const token = localStorage.getItem('authToken')
                if (!token) {
                    alert('いいねするにはログインが必要です')
                    window.location.href = '/login?subdomain=' + subdomain
                    return
                }
                
                try {
                    likeButton.disabled = true
                    
                    if (isLiked) {
                        // いいねを取り消す
                        const response = await axios.delete('/api/likes/posts/' + postId, {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                        if (response.data.success) {
                            currentLikeCount = response.data.likeCount
                            isLiked = false
                            updateLikeButton()
                        }
                    } else {
                        // いいねする
                        const response = await axios.post('/api/likes/posts/' + postId, {}, {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                        if (response.data.success) {
                            currentLikeCount = response.data.likeCount
                            isLiked = true
                            updateLikeButton()
                        }
                    }
                } catch (error) {
                    console.error('Like error:', error)
                    if (error.response && error.response.status === 401) {
                        alert('ログインセッションが切れました。再度ログインしてください')
                        window.location.href = '/login?subdomain=' + subdomain
                    } else {
                        alert('エラーが発生しました')
                    }
                } finally {
                    likeButton.disabled = false
                }
            })
            
            // ページ読み込み時にいいね情報を取得
            loadLikeStatus()
        }
        
        // コメントのいいね機能
        const commentLikeButtons = document.querySelectorAll('.comment-like-btn')
        commentLikeButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const token = localStorage.getItem('authToken')
                if (!token) {
                    alert('いいねするにはログインが必要です')
                    window.location.href = '/login?subdomain=' + subdomain
                    return
                }
                
                const commentId = button.dataset.commentId
                const likeIcon = button.querySelector('i')
                const likeText = button.querySelector('.comment-like-text')
                const likeCountSpan = button.querySelector('.comment-like-count')
                
                try {
                    button.disabled = true
                    
                    if (likeIcon.classList.contains('fas')) {
                        // いいねを取り消す
                        const response = await axios.delete('/api/likes/comments/' + commentId, {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                        if (response.data.success) {
                            likeIcon.className = 'far fa-thumbs-up mr-1'
                            likeText.textContent = 'いいね'
                            likeCountSpan.textContent = '(' + response.data.likeCount + ')'
                            button.classList.remove('text-blue-600')
                        }
                    } else {
                        // いいねする
                        const response = await axios.post('/api/likes/comments/' + commentId, {}, {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                        if (response.data.success) {
                            likeIcon.className = 'fas fa-thumbs-up mr-1'
                            likeText.textContent = 'いいね済み'
                            likeCountSpan.textContent = '(' + response.data.likeCount + ')'
                            button.classList.add('text-blue-600')
                        }
                    }
                } catch (error) {
                    console.error('Comment like error:', error)
                    if (error.response && error.response.status === 401) {
                        alert('ログインセッションが切れました。再度ログインしてください')
                        window.location.href = '/login?subdomain=' + subdomain
                    } else {
                        alert('エラーが発生しました')
                    }
                } finally {
                    button.disabled = false
                }
            })
        })
    </script>
</body>
</html>`)
})

// --------------------------------------------
// 会員一覧ページ
// --------------------------------------------
// ============================================
// 会員一覧ページ（Phase 3: Week 18-19）
// ============================================
tenantPublic.get('/members', async (c) => {
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
  
  // 検索パラメータ
  const searchQuery = c.req.query('search') || ''
  const searchRole = c.req.query('role') || ''
  
  // ページネーション設定
  const page = parseInt(c.req.query('page') || '1')
  const perPage = 12
  const offset = (page - 1) * perPage
  
  // 検索条件を構築
  let whereConditions = 'tm.tenant_id = ? AND (tm.status = ? OR tm.status = ?)'
  const bindParams: any[] = [tenant.id, 'approved', 'active']
  
  if (searchQuery) {
    whereConditions += ' AND (u.nickname LIKE ? OR u.email LIKE ? OR u.bio LIKE ?)'
    const searchPattern = `%${searchQuery}%`
    bindParams.push(searchPattern, searchPattern, searchPattern)
  }
  
  if (searchRole) {
    whereConditions += ' AND tm.role = ?'
    bindParams.push(searchRole)
  }
  
  // 会員数を取得
  const countResult = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM tenant_memberships tm
    JOIN users u ON tm.user_id = u.id
    WHERE ${whereConditions}
  `).bind(...bindParams).first()
  
  const totalMembers = countResult?.count || 0
  const totalPages = Math.ceil(totalMembers / perPage)
  
  // 会員を取得
  const membersResult = await DB.prepare(`
    SELECT 
      u.id, u.nickname, u.email, u.avatar_url, u.bio, u.created_at,
      tm.role, tm.joined_at,
      COUNT(DISTINCT p.id) as post_count
    FROM tenant_memberships tm
    JOIN users u ON tm.user_id = u.id
    LEFT JOIN posts p ON p.author_id = u.id AND p.tenant_id = tm.tenant_id AND p.status = 'published'
    WHERE ${whereConditions}
    GROUP BY u.id, u.nickname, u.email, u.avatar_url, u.bio, u.created_at, tm.role, tm.joined_at
    ORDER BY tm.joined_at DESC
    LIMIT ? OFFSET ?
  `).bind(...bindParams, perPage, offset).all()
  
  const members = membersResult.results || []
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  
  // 会員カードのHTML生成
  let membersHTML = ''
  if (members.length === 0) {
    membersHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-600 text-lg">まだ会員がいません</p></div>'
  } else {
    membersHTML = members.map((member: any) => {
      const nickname = String(member.nickname || '不明')
      const bio = String(member.bio || 'プロフィールが設定されていません')
      const avatarUrl = String(member.avatar_url || '')
      const role = String(member.role || 'member')
      const postCount = member.post_count || 0
      const joinedDate = new Date(String(member.joined_at)).toLocaleDateString('ja-JP')
      
      // ロールのバッジ
      let roleBadge = ''
      if (role === 'owner') {
        roleBadge = '<span class="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">オーナー</span>'
      } else if (role === 'admin') {
        roleBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">管理者</span>'
      } else if (role === 'moderator') {
        roleBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">モデレーター</span>'
      }
      
      return `
        <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6">
            <div class="flex flex-col items-center text-center">
                <!-- アバター -->
                <div class="mb-4">
                    ${avatarUrl ? `
                    <img src="${avatarUrl}" alt="${nickname}" class="w-24 h-24 rounded-full object-cover border-4 border-gray-100">
                    ` : `
                    <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-4 border-gray-100">
                        <i class="fas fa-user text-3xl text-white"></i>
                    </div>
                    `}
                </div>
                
                <!-- 会員情報 -->
                <div class="mb-2 flex items-center gap-2">
                    <h3 class="text-xl font-bold text-gray-900">${nickname}</h3>
                    ${roleBadge}
                </div>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">${bio}</p>
                
                <!-- 統計情報 -->
                <div class="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div class="flex items-center gap-1">
                        <i class="fas fa-file-alt"></i>
                        <span>${postCount} 投稿</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <i class="fas fa-calendar"></i>
                        <span>${joinedDate} 参加</span>
                    </div>
                </div>
                
                <!-- アクションボタン -->
                <a href="/tenant/members/${member.id}?subdomain=${subdomain}" 
                   class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                    <i class="fas fa-user mr-2"></i>プロフィールを見る
                </a>
            </div>
        </div>
      `
    }).join('')
  }
  
  // ページネーションHTML生成
  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams()
    params.set('subdomain', subdomain)
    params.set('page', String(pageNum))
    if (searchQuery) params.set('search', searchQuery)
    if (searchRole) params.set('role', searchRole)
    return `/tenant/members?${params.toString()}`
  }
  
  let paginationHTML = ''
  if (totalPages > 1) {
    const pages = []
    
    // 前へボタン
    if (page > 1) {
      pages.push(`<a href="${buildPageUrl(page - 1)}" 
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
        pages.push(`<span class="px-4 py-2 bg-blue-600 text-white border border-blue-600 rounded-lg font-semibold">${i}</span>`)
      } else if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
        pages.push(`<a href="${buildPageUrl(i)}" 
                      class="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                      ${i}
                   </a>`)
      } else if (i === page - 3 || i === page + 3) {
        pages.push(`<span class="px-4 py-2 text-gray-500">...</span>`)
      }
    }
    
    // 次へボタン
    if (page < totalPages) {
      pages.push(`<a href="${buildPageUrl(page + 1)}" 
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
<html lang="ja" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>会員一覧 - ${tenantName}</title>
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
                        ${tenantName}
                    </a>
                    ${tenantSubtitle ? `<span class="text-gray-500 hidden md:inline">- ${tenantSubtitle}</span>` : ''}
                </div>
                
                <!-- デスクトップナビ -->
                <nav class="hidden md:flex items-center space-x-6">
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-home mr-2"></i>ホーム
                    </a>
                    <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-newspaper mr-2"></i>投稿
                    </a>
                    <a href="/tenant/posts/new?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                        <i class="fas fa-plus-circle mr-2"></i>投稿作成
                    </a>
                    <a href="/tenant/tenant/members?subdomain=${subdomain}" class="text-primary font-semibold">
                        <i class="fas fa-users mr-2"></i>メンバー
                    </a>
                    <a href="/login?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
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
                <a href="/tenant/posts/new?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
                    <i class="fas fa-plus-circle mr-2"></i>投稿作成
                </a>
                <a href="/tenant/tenant/members?subdomain=${subdomain}" class="block py-2 text-primary font-semibold">
                    <i class="fas fa-users mr-2"></i>メンバー
                </a>
                <a href="/login?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
                    <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                </a>
            </nav>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="container mx-auto px-4 py-8">
        <!-- ページヘッダー -->
        <div class="mb-8">
            <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                <i class="fas fa-users mr-2 text-blue-600"></i>メンバー一覧
            </h1>
            <p class="text-gray-600">コミュニティのメンバー ${totalMembers} 人</p>
        </div>
        
        <!-- 検索バー -->
        <div class="mb-8 bg-white rounded-lg shadow-sm p-6">
            <form method="GET" action="/tenant/members" class="space-y-4">
                <input type="hidden" name="subdomain" value="${subdomain}">
                
                <div class="flex flex-col md:flex-row gap-4">
                    <!-- 検索キーワード -->
                    <div class="flex-1">
                        <input 
                            type="text" 
                            name="search"
                            placeholder="名前、メール、プロフィールで検索..."
                            value="${searchQuery}"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                    </div>
                    
                    <!-- ロールフィルター -->
                    <div class="md:w-48">
                        <select 
                            name="role"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">すべての役割</option>
                            <option value="owner" ${searchRole === 'owner' ? 'selected' : ''}>オーナー</option>
                            <option value="admin" ${searchRole === 'admin' ? 'selected' : ''}>管理者</option>
                            <option value="moderator" ${searchRole === 'moderator' ? 'selected' : ''}>モデレーター</option>
                            <option value="member" ${searchRole === 'member' ? 'selected' : ''}>メンバー</option>
                        </select>
                    </div>
                    
                    <!-- 検索ボタン -->
                    <button 
                        type="submit"
                        class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <i class="fas fa-search mr-2"></i>検索
                    </button>
                    
                    <!-- リセットボタン -->
                    ${searchQuery || searchRole ? `
                    <a href="/tenant/members?subdomain=${subdomain}" 
                       class="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center">
                        <i class="fas fa-times mr-2"></i>クリア
                    </a>
                    ` : ''}
                </div>
                
                ${searchQuery || searchRole ? `
                <div class="text-sm text-gray-600">
                    <i class="fas fa-filter mr-2"></i>
                    検索結果: ${totalMembers} 人のメンバー
                </div>
                ` : ''}
            </form>
        </div>

        <!-- 会員グリッド -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            ${membersHTML}
        </div>

        <!-- ページネーション -->
        ${paginationHTML}
    </main>

    <!-- フッター -->
    <footer class="bg-white border-t mt-16">
        <div class="container mx-auto px-4 py-6 text-center text-gray-600">
            <p>© 2025 ${tenantName}. All rights reserved.</p>
        </div>
    </footer>

    <script src="/static/app.js"></script>
    <script>
        // モバイルメニュー切替
        document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
            const menu = document.getElementById('mobileMenu')
            menu.classList.toggle('hidden')
        })
    </script>
</body>
</html>`)
})

// ============================================
// 通知一覧ページ（Phase 5）
// ============================================
tenantPublic.get('/notifications', async (c) => {
  try {
    const { DB } = c.env
    const subdomain = c.req.query('subdomain')
    
    if (!subdomain) {
      return c.html('<html><body><h1>開発環境</h1><p>URLに ?subdomain=your-subdomain を追加してください。</p></body></html>')
    }

    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.redirect('/login?subdomain=' + subdomain)
    }

    const userId = 1

    const tenant = await DB.prepare('SELECT id, name FROM tenants WHERE subdomain = ? AND status = ?').bind(subdomain, 'active').first()
    if (!tenant) {
      return c.html('<html><body><h1>コミュニティが見つかりません</h1></body></html>')
    }
    
    const tenantId = Number(tenant.id)
    const tenantName = String(tenant.name)

    const page = Number(c.req.query('page')) || 1
    const perPage = 20
    const offset = (page - 1) * perPage

    const countResult = await DB.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND tenant_id = ?').bind(userId, tenant.id).first()
    const totalCount = countResult?.count || 0
    const totalPages = Math.ceil(totalCount / perPage)

    const notificationsResult = await DB.prepare(`
      SELECT n.*, u.nickname as actor_name 
      FROM notifications n 
      LEFT JOIN users u ON n.actor_id = u.id 
      WHERE n.user_id = ? AND n.tenant_id = ? 
      ORDER BY n.created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(userId, tenant.id, perPage, offset).all()
    const notifications = notificationsResult.results || []

    const unreadCountResult = await DB.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND tenant_id = ? AND is_read = 0').bind(userId, tenant.id).first()
    const unreadCount = unreadCountResult?.count || 0

    let notificationsHTML = ''
    if (notifications.length === 0) {
      notificationsHTML = `
        <div class="text-center py-12">
          <i class="fas fa-bell-slash text-gray-400 text-6xl mb-4"></i>
          <p class="text-gray-600">通知がありません</p>
        </div>
      `
    } else {
      notificationsHTML = notifications.map((notif: any) => {
        const isUnread = notif.is_read === 0
        const bgClass = isUnread ? 'bg-blue-50' : 'bg-white'
        const fontWeight = isUnread ? 'font-bold' : ''
        const badge = isUnread ? '<span class="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">NEW</span>' : ''
        
        const iconMap: any = {
          'post_like': 'fas fa-thumbs-up text-blue-500',
          'comment_like': 'fas fa-thumbs-up text-blue-500',
          'comment': 'fas fa-comment text-green-500'
        }
        const icon = iconMap[notif.type] || 'fas fa-bell'
        
        let linkUrl = '#'
        if (notif.target_type === 'post') {
          linkUrl = '/tenant/posts/' + notif.target_id + '?subdomain=' + subdomain
        }
        
        const createdDate = new Date(notif.created_at).toLocaleString('ja-JP')
        
        return `
          <a href="${linkUrl}" class="block hover:bg-gray-50 transition-colors cursor-pointer" data-notification-id="${notif.id}">
            <div class="${bgClass} p-4 rounded-lg border border-gray-200 mb-2">
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <i class="${icon}"></i>
                </div>
                <div class="flex-1">
                  ${badge}
                  <p class="${fontWeight} text-gray-800">${notif.message}</p>
                  <p class="text-sm text-gray-500 mt-1">${createdDate}</p>
                </div>
              </div>
            </div>
          </a>
        `
      }).join('')
    }

    let paginationHTML = ''
    if (totalPages > 1) {
      paginationHTML = '<div class="flex justify-center items-center gap-2 mt-6">'
      
      if (page > 1) {
        paginationHTML += `<a href="/tenant/notifications?subdomain=${subdomain}&page=${page - 1}" class="px-4 py-2 bg-white text-blue-600 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors">前へ</a>`
      } else {
        paginationHTML += '<span class="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-300 rounded-lg cursor-not-allowed">前へ</span>'
      }
      
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
          if (i === page) {
            paginationHTML += `<span class="px-4 py-2 bg-blue-600 text-white rounded-lg">${i}</span>`
          } else {
            paginationHTML += `<a href="/tenant/notifications?subdomain=${subdomain}&page=${i}" class="px-4 py-2 bg-white text-blue-600 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors">${i}</a>`
          }
        } else if (i === page - 3 || i === page + 3) {
          paginationHTML += '<span class="px-2 py-2 text-gray-500">...</span>'
        }
      }
      
      if (page < totalPages) {
        paginationHTML += `<a href="/tenant/notifications?subdomain=${subdomain}&page=${page + 1}" class="px-4 py-2 bg-white text-blue-600 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors">次へ</a>`
      } else {
        paginationHTML += '<span class="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-300 rounded-lg cursor-not-allowed">次へ</span>'
      }
      
      paginationHTML += '</div>'
    }

    return c.html(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>通知 - ${tenantName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-100">
          <header class="bg-white shadow-md">
              <div class="container mx-auto px-4 py-4 flex justify-between items-center">
                  <h1 class="text-2xl font-bold text-gray-800">
                      <a href="/tenant/home?subdomain=${subdomain}" class="hover:text-blue-600">${tenantName}</a>
                  </h1>
                  <nav class="hidden md:flex space-x-6 items-center">
                      <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600 transition-colors">
                          <i class="fas fa-home mr-1"></i>ホーム
                      </a>
                      <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600 transition-colors">
                          <i class="fas fa-newspaper mr-1"></i>投稿
                      </a>
                      <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600 transition-colors">
                          <i class="fas fa-users mr-1"></i>メンバー
                      </a>
                      <a href="/tenant/notifications?subdomain=${subdomain}" class="text-blue-600 font-semibold">
                          <i class="fas fa-bell mr-1"></i>通知
                          ${unreadCount > 0 ? `<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-1">${unreadCount}</span>` : ''}
                      </a>
                      <a href="/tenant/mypage?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600 transition-colors">
                          <i class="fas fa-user mr-1"></i>マイページ
                      </a>
                  </nav>
                  <button id="mobileMenuToggle" class="md:hidden text-gray-600">
                      <i class="fas fa-bars text-2xl"></i>
                  </button>
              </div>
              <div id="mobileMenu" class="hidden md:hidden bg-white border-t border-gray-200">
                  <nav class="flex flex-col p-4 space-y-2">
                      <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600 py-2">
                          <i class="fas fa-home mr-2"></i>ホーム
                      </a>
                      <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600 py-2">
                          <i class="fas fa-newspaper mr-2"></i>投稿
                      </a>
                      <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600 py-2">
                          <i class="fas fa-users mr-2"></i>メンバー
                      </a>
                      <a href="/tenant/notifications?subdomain=${subdomain}" class="text-blue-600 font-semibold py-2">
                          <i class="fas fa-bell mr-2"></i>通知
                          ${unreadCount > 0 ? `<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-1">${unreadCount}</span>` : ''}
                      </a>
                      <a href="/tenant/mypage?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600 py-2">
                          <i class="fas fa-user mr-2"></i>マイページ
                      </a>
                  </nav>
              </div>
          </header>

          <main class="container mx-auto px-4 py-8 max-w-4xl">
              <div class="bg-white rounded-lg shadow-lg p-6">
                  <div class="flex justify-between items-center mb-6">
                      <h2 class="text-2xl font-bold text-gray-800">
                          <i class="fas fa-bell mr-2"></i>通知
                      </h2>
                      ${unreadCount > 0 ? `
                      <button id="markAllReadBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <i class="fas fa-check-double mr-2"></i>すべて既読にする
                      </button>
                      ` : ''}
                  </div>

                  <div class="mb-4 text-gray-600">
                      全${totalCount}件の通知 ${unreadCount > 0 ? '（未読: ' + unreadCount + '件）' : ''}
                  </div>

                  ${notificationsHTML}
                  
                  ${paginationHTML}
              </div>
          </main>

          <footer class="bg-white border-t mt-16">
              <div class="container mx-auto px-4 py-6 text-center text-gray-600">
                  <p>© 2025 ${tenantName}. All rights reserved.</p>
              </div>
          </footer>

          <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
          <script>
              // モバイルメニュー切替
              document.getElementById('mobileMenuToggle').addEventListener('click', () => {
                  document.getElementById('mobileMenu').classList.toggle('hidden')
              })

              // 通知クリック時に既読化
              document.querySelectorAll('[data-notification-id]').forEach(elem => {
                  elem.addEventListener('click', async (e) => {
                      const notificationId = elem.getAttribute('data-notification-id')
                      if (!notificationId) return
                      
                      try {
                          const token = localStorage.getItem('authToken')
                          await axios.put('/api/notifications/' + notificationId + '/read', {}, {
                              headers: { 'Authorization': 'Bearer ' + token }
                          })
                      } catch (error) {
                          console.error('既読化エラー:', error)
                      }
                  })
              })

              // すべて既読にする
              const markAllReadBtn = document.getElementById('markAllReadBtn')
              if (markAllReadBtn) {
                  markAllReadBtn.addEventListener('click', async () => {
                      try {
                          markAllReadBtn.disabled = true
                          markAllReadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>処理中...'
                          
                          const token = localStorage.getItem('authToken')
                          await axios.put('/api/notifications/read-all', {}, {
                              headers: { 'Authorization': 'Bearer ' + token }
                          })
                          
                          location.reload()
                      } catch (error) {
                          console.error('一括既読化エラー:', error)
                          alert('エラーが発生しました')
                          markAllReadBtn.disabled = false
                          markAllReadBtn.innerHTML = '<i class="fas fa-check-double mr-2"></i>すべて既読にする'
                      }
                  })
              }
          </script>
      </body>
      </html>
    `)
  } catch (error) {
    console.error('Notification page error:', error)
    return c.html('<html><body><h1>Error</h1><pre>' + String(error) + '</pre></body></html>', 500)
  }
})

// --------------------------------------------

// ============================================
// 会員プロフィール詳細ページ（Phase 3: Week 18-19）
// ============================================
tenantPublic.get('/members/:memberId', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain') || ''
  const memberId = c.req.param('memberId')
  
  if (!subdomain) {
    return c.text('Subdomain is required', 400)
  }

  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first() as any

  if (!tenant) {
    return c.text('Tenant not found', 404)
  }

  const member = await DB.prepare(`
    SELECT 
      u.id, u.nickname, u.email, u.avatar_url, u.bio, u.created_at,
      tm.role, tm.joined_at
    FROM tenant_memberships tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.tenant_id = ? AND (tm.status = ? OR tm.status = ?) AND u.id = ?
  `).bind(tenant.id, 'approved', 'active', memberId).first() as any
  
  if (!member) {
    const notFoundHTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>会員が見つかりません</title>' +
      '<script src="https://cdn.tailwindcss.com"></script></head>' +
      '<body class="bg-gray-50 min-h-screen flex items-center justify-center">' +
      '<div class="text-center"><h1 class="text-4xl font-bold text-gray-800 mb-4">会員が見つかりません</h1>' +
      '<a href="/tenant/members?subdomain=' + subdomain + '" class="text-blue-600 hover:underline">会員一覧に戻る</a>' +
      '</div></body></html>'
    return c.html(notFoundHTML)
  }
  
  const postsResult = await DB.prepare(`
    SELECT p.id, p.title, p.content, p.excerpt, p.view_count, p.created_at,
           COUNT(DISTINCT c.id) as comment_count
    FROM posts p
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.tenant_id = ? AND p.author_id = ? AND p.status = ?
    GROUP BY p.id ORDER BY p.created_at DESC LIMIT 10
  `).bind(tenant.id, memberId, 'published').all()
  
  const posts = postsResult.results || []
  
  const statsResult = await DB.prepare(`
    SELECT 
      COUNT(DISTINCT p.id) as post_count,
      COUNT(DISTINCT c.id) as comment_count,
      COALESCE(SUM(p.view_count), 0) as total_views
    FROM users u
    LEFT JOIN posts p ON p.author_id = u.id AND p.tenant_id = ? AND p.status = ?
    LEFT JOIN comments c ON c.user_id = u.id AND c.tenant_id = ?
    WHERE u.id = ?
  `).bind(tenant.id, 'published', tenant.id, memberId).first() as any
  
  const postCount = Number(statsResult?.post_count || 0)
  const commentCount = Number(statsResult?.comment_count || 0)
  const totalViews = Number(statsResult?.total_views || 0)
  
  const nickname = String(member.nickname || '不明')
  const bio = String(member.bio || 'プロフィールが設定されていません')
  const avatarUrl = member.avatar_url ? String(member.avatar_url) : ''
  const role = String(member.role || 'member')
  const joinedDate = new Date(String(member.joined_at)).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  
  let roleBadgeHTML = ''
  if (role === 'owner') {
    roleBadgeHTML = '<span class="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">オーナー</span>'
  } else if (role === 'admin') {
    roleBadgeHTML = '<span class="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">管理者</span>'
  } else if (role === 'moderator') {
    roleBadgeHTML = '<span class="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">モデレーター</span>'
  } else {
    roleBadgeHTML = '<span class="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">メンバー</span>'
  }
  
  const avatarHTML = avatarUrl 
    ? '<img src="' + avatarUrl + '" alt="' + nickname + '" class="w-32 h-32 rounded-full object-cover border-4 border-blue-100">'
    : '<div class="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center border-4 border-blue-200">' +
      '<i class="fas fa-user text-5xl text-blue-400"></i></div>'
  
  let postsHTML = ''
  if (posts.length === 0) {
    postsHTML = '<div class="text-center py-12 text-gray-600">まだ投稿がありません</div>'
  } else {
    const postItems: string[] = []
    for (const post of posts) {
      const postTitle = String(post.title || '')
      const postExcerpt = String(post.excerpt || post.content || '').substring(0, 100)
      const postViewCount = Number(post.view_count || 0)
      const postCommentCount = Number(post.comment_count || 0)
      const postCreatedDate = new Date(String(post.created_at)).toLocaleDateString('ja-JP')
      
      const postHTML = '<div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">' +
        '<a href="/tenant/posts/' + post.id + '?subdomain=' + subdomain + '" class="block">' +
        '<h3 class="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition">' + postTitle + '</h3>' +
        '<p class="text-gray-600 mb-4">' + postExcerpt + '...</p>' +
        '<div class="flex items-center justify-between text-sm text-gray-500">' +
        '<div class="flex items-center gap-4">' +
        '<span><i class="fas fa-eye mr-1"></i>' + postViewCount + ' 閲覧</span>' +
        '<span><i class="fas fa-comments mr-1"></i>' + postCommentCount + ' コメント</span>' +
        '</div>' +
        '<span><i class="fas fa-calendar mr-1"></i>' + postCreatedDate + '</span>' +
        '</div>' +
        '</a></div>'
      postItems.push(postHTML)
    }
    postsHTML = postItems.join('')
  }

  const html = '<!DOCTYPE html>' +
    '<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + nickname + ' - ' + tenant.name + '</title>' +
    '<script src="https://cdn.tailwindcss.com"></script>' +
    '<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">' +
    '</head><body class="bg-gray-50 min-h-screen">' +
    '<header class="bg-white shadow-sm sticky top-0 z-50">' +
    '<div class="container mx-auto px-4 py-4">' +
    '<div class="flex items-center justify-between">' +
    '<a href="/tenant/home?subdomain=' + subdomain + '" class="text-2xl font-bold text-blue-600">' + tenant.name + '</a>' +
    '<nav class="hidden md:flex items-center space-x-6">' +
    '<a href="/tenant/home?subdomain=' + subdomain + '" class="text-gray-600 hover:text-blue-600"><i class="fas fa-home mr-1"></i>ホーム</a>' +
    '<a href="/tenant/posts?subdomain=' + subdomain + '" class="text-gray-600 hover:text-blue-600"><i class="fas fa-newspaper mr-1"></i>投稿</a>' +
    '<a href="/tenant/members?subdomain=' + subdomain + '" class="text-blue-600 font-semibold"><i class="fas fa-users mr-1"></i>メンバー</a>' +
    '<a href="/login?subdomain=' + subdomain + '" class="text-gray-600 hover:text-blue-600"><i class="fas fa-sign-in-alt mr-1"></i>ログイン</a>' +
    '</nav></div></div></header>' +
    '<main class="container mx-auto px-4 py-8">' +
    '<div class="bg-white rounded-lg shadow-lg p-8 mb-8">' +
    '<div class="flex flex-col md:flex-row items-center md:items-start gap-8">' +
    '<div class="flex-shrink-0">' + avatarHTML + '</div>' +
    '<div class="flex-grow text-center md:text-left">' +
    '<div class="flex flex-col md:flex-row items-center md:items-start gap-3 mb-4">' +
    '<h1 class="text-3xl font-bold text-gray-900">' + nickname + '</h1>' + roleBadgeHTML + '</div>' +
    '<p class="text-gray-600 mb-6 whitespace-pre-wrap">' + bio + '</p>' +
    '<div class="grid grid-cols-3 gap-4 mb-6">' +
    '<div class="text-center p-4 bg-blue-50 rounded-lg">' +
    '<div class="text-2xl font-bold text-blue-600">' + postCount + '</div>' +
    '<div class="text-sm text-gray-600">投稿</div></div>' +
    '<div class="text-center p-4 bg-green-50 rounded-lg">' +
    '<div class="text-2xl font-bold text-green-600">' + commentCount + '</div>' +
    '<div class="text-sm text-gray-600">コメント</div></div>' +
    '<div class="text-center p-4 bg-purple-50 rounded-lg">' +
    '<div class="text-2xl font-bold text-purple-600">' + totalViews + '</div>' +
    '<div class="text-sm text-gray-600">閲覧数</div></div></div>' +
    '<div class="text-sm text-gray-500"><i class="fas fa-calendar mr-2"></i>' + joinedDate + 'に参加</div>' +
    '</div></div></div>' +
    '<div class="bg-white rounded-lg shadow-lg p-8">' +
    '<div class="flex items-center justify-between mb-6">' +
    '<h2 class="text-2xl font-bold text-gray-900"><i class="fas fa-newspaper mr-2 text-blue-600"></i>最近の投稿</h2>' +
    '</div><div class="space-y-4">' + postsHTML + '</div></div>' +
    '<div class="mt-8 text-center">' +
    '<a href="/tenant/members?subdomain=' + subdomain + '" class="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">' +
    '<i class="fas fa-arrow-left mr-2"></i>会員一覧に戻る</a></div></main>' +
    '<footer class="bg-white border-t mt-16">' +
    '<div class="container mx-auto px-4 py-6 text-center text-gray-600">' +
    '<p>&copy; 2025 ' + tenant.name + '. All rights reserved.</p></div></footer>' +
    '</body></html>'

  return c.html(html)
})

// ============================================
// マイページ（Phase 3: Week 20）
// ============================================
tenantPublic.get('/mypage', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.text('Subdomain is required', 400)
  }
  
  // 認証チェック（簡易版 - クッキーまたはクエリパラメータからトークン取得）
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>ログインが必要です - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center">
    <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">ログインが必要です</h1>
        <p class="text-gray-600 mb-6">マイページにアクセスするにはログインしてください</p>
        <a href="/login?subdomain=${subdomain}" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            ログインページへ
        </a>
    </div>
    <script>
        // JavaScriptでトークンチェック
        const token = localStorage.getItem('token')
        if (token) {
            // トークンがある場合はページを再読み込み（Authorization ヘッダー付き）
            fetch('/tenant/mypage?subdomain=${subdomain}', {
                headers: { 'Authorization': 'Bearer ' + token }
            }).then(response => response.text())
              .then(html => {
                  document.open()
                  document.write(html)
                  document.close()
              })
        }
    </script>
</body>
</html>`)
  }
  
  // TODO: JWTトークン検証（簡易版では省略）
  // 実際にはトークンからユーザーIDとテナントIDを取得
  
  // 仮のユーザーID取得（後でJWT検証に置き換え）
  const userId = 3 // テスト用
  
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first() as any
  
  if (!tenant) {
    return c.text('Tenant not found', 404)
  }
  
  // 自分の投稿一覧を取得
  const postsResult = await DB.prepare(`
    SELECT p.id, p.title, p.content, p.excerpt, p.status, p.view_count, p.created_at,
           COUNT(DISTINCT c.id) as comment_count
    FROM posts p
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.tenant_id = ? AND p.author_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 50
  `).bind(tenant.id, userId).all()
  
  const posts = postsResult.results || []
  
  // 統計情報
  const totalPosts = posts.length
  const publishedPosts = posts.filter((p: any) => p.status === 'published').length
  const draftPosts = posts.filter((p: any) => p.status === 'draft').length
  const totalViews = posts.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0)
  
  // 投稿HTML生成
  let postsHTML = ''
  if (posts.length === 0) {
    postsHTML = '<div class="text-center py-12 text-gray-600">まだ投稿がありません</div>'
  } else {
    postsHTML = posts.map((post: any) => {
      const title = String(post.title || '')
      const excerpt = String(post.excerpt || post.content || '').substring(0, 100)
      const status = String(post.status || 'draft')
      const viewCount = Number(post.view_count || 0)
      const commentCount = Number(post.comment_count || 0)
      const createdDate = new Date(String(post.created_at)).toLocaleDateString('ja-JP')
      
      const statusBadge = status === 'published' 
        ? '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">公開中</span>'
        : '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">下書き</span>'
      
      return `
        <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between mb-3">
                <h3 class="text-xl font-bold text-gray-900 flex-1">${title}</h3>
                ${statusBadge}
            </div>
            <p class="text-gray-600 mb-4">${excerpt}...</p>
            <div class="flex items-center justify-between text-sm text-gray-500">
                <div class="flex items-center gap-4">
                    <span><i class="fas fa-eye mr-1"></i>${viewCount} 閲覧</span>
                    <span><i class="fas fa-comments mr-1"></i>${commentCount} コメント</span>
                    <span><i class="fas fa-calendar mr-1"></i>${createdDate}</span>
                </div>
                <a href="/tenant/posts/${post.id}?subdomain=${subdomain}" 
                   class="text-blue-600 hover:text-blue-700 font-semibold">
                    詳細を見る <i class="fas fa-arrow-right ml-1"></i>
                </a>
            </div>
        </div>
      `
    }).join('')
  }
  
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>マイページ - ${tenant.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- ヘッダー -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <a href="/tenant/home?subdomain=${subdomain}" class="text-2xl font-bold text-blue-600">
                    ${tenant.name}
                </a>
                <nav class="hidden md:flex items-center space-x-6">
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-home mr-1"></i>ホーム
                    </a>
                    <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-newspaper mr-1"></i>投稿
                    </a>
                    <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-users mr-1"></i>メンバー
                    </a>
                    <a href="/tenant/mypage?subdomain=${subdomain}" class="text-blue-600 font-semibold">
                        <i class="fas fa-user mr-1"></i>マイページ
                    </a>
                </nav>
            </div>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="container mx-auto px-4 py-8">
        <!-- ページヘッダー -->
        <div class="mb-8">
            <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                <i class="fas fa-user-circle mr-2 text-blue-600"></i>マイページ
            </h1>
            <p class="text-gray-600">あなたの活動状況</p>
        </div>
        
        <!-- 統計カード -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                <div class="text-3xl font-bold text-blue-600 mb-1">${totalPosts}</div>
                <div class="text-sm text-gray-600">総投稿数</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                <div class="text-3xl font-bold text-green-600 mb-1">${publishedPosts}</div>
                <div class="text-sm text-gray-600">公開中</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
                <div class="text-3xl font-bold text-yellow-600 mb-1">${draftPosts}</div>
                <div class="text-sm text-gray-600">下書き</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
                <div class="text-3xl font-bold text-purple-600 mb-1">${totalViews}</div>
                <div class="text-sm text-gray-600">総閲覧数</div>
            </div>
        </div>
        
        <!-- タブナビゲーション -->
        <div class="bg-white rounded-lg shadow-sm mb-6">
            <div class="border-b border-gray-200">
                <nav class="flex">
                    <button class="px-6 py-4 text-blue-600 border-b-2 border-blue-600 font-semibold">
                        <i class="fas fa-newspaper mr-2"></i>投稿
                    </button>
                    <button class="px-6 py-4 text-gray-600 hover:text-gray-900">
                        <i class="fas fa-comments mr-2"></i>コメント
                    </button>
                </nav>
            </div>
        </div>
        
        <!-- 投稿一覧 -->
        <div class="space-y-4">
            ${postsHTML}
        </div>
    </main>

    <!-- フッター -->
    <footer class="bg-white border-t mt-16">
        <div class="container mx-auto px-4 py-6 text-center text-gray-600">
            <p>© 2025 ${tenant.name}. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`)
})

// --------------------------------------------
// いいね一覧ページ
// --------------------------------------------
tenantPublic.get('/liked-posts', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  
  // 認証チェック（簡易版）
  const token = c.req.header('Authorization')?.replace('Bearer ', '') || 
                c.req.query('token') || ''
  
  if (!subdomain) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Development - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">Development Environment</h1>
        <p class="text-xl text-gray-600 mb-4">Please add ?subdomain=your-subdomain to URL</p>
        <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
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
    <title>Community not found - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p class="text-xl text-gray-600 mb-4">Community not found</p>
        <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
    </div>
</body>
</html>`)
  }
  
  // ログインチェック（クライアント側）
  if (!token) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Login Required - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center">
    <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">Login Required</h1>
        <p class="text-gray-600 mb-6">Please login to view your liked posts</p>
        <a href="/login?subdomain=${subdomain}" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Login
        </a>
    </div>
    <script>
        // Check for token in localStorage
        const authToken = localStorage.getItem('authToken')
        if (authToken) {
            // Reload with token
            window.location.href = '/tenant/liked-posts?subdomain=${subdomain}&token=' + authToken
        }
    </script>
</body>
</html>`)
  }
  
  // TODO: JWT検証を実装（現時点では簡易版）
  // 仮のユーザーID（テスト用）
  const userId = 3
  
  // いいねした投稿を取得
  const likedPostsResult = await DB.prepare(`
    SELECT p.*, u.nickname as author_name, pl.created_at as liked_at,
           (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count
    FROM post_likes pl
    INNER JOIN posts p ON pl.post_id = p.id
    LEFT JOIN users u ON p.author_id = u.id
    WHERE pl.user_id = ? AND pl.tenant_id = ? AND p.status = 'published'
    ORDER BY pl.created_at DESC
    LIMIT 50
  `).bind(userId, tenant.id).all()
  
  const likedPosts = likedPostsResult.results || []
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  
  // 投稿カードHTML生成
  let postsHTML = ''
  if (likedPosts.length === 0) {
    postsHTML = '<div class="text-center py-12"><p class="text-gray-600 text-lg">You have not liked any posts yet</p></div>'
  } else {
    postsHTML = likedPosts.map((post: any) => {
      const postTitle = String(post.title || '')
      const postContent = String(post.content || '')
      const postExcerpt = String(post.excerpt || postContent.substring(0, 150))
      const authorName = String(post.author_name || 'Unknown')
      const likeCount = Number(post.like_count || 0)
      const likedDate = new Date(String(post.liked_at)).toLocaleDateString('ja-JP')
      
      return `
        <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6">
            <div class="flex items-start space-x-4">
                <div class="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-file-alt text-3xl text-white opacity-50"></i>
                </div>
                <div class="flex-grow">
                    <h3 class="text-xl font-bold text-gray-900 mb-2">${postTitle}</h3>
                    <p class="text-gray-600 mb-3 line-clamp-2">${postExcerpt}...</p>
                    <div class="flex items-center justify-between text-sm text-gray-500">
                        <div class="flex items-center space-x-4">
                            <span><i class="fas fa-user mr-1"></i>${authorName}</span>
                            <span><i class="far fa-thumbs-up mr-1"></i>${likeCount}</span>
                            <span><i class="far fa-eye mr-1"></i>${post.view_count || 0}</span>
                        </div>
                        <span class="text-xs text-gray-400">Liked on ${likedDate}</span>
                    </div>
                    <a href="/tenant/posts/${post.id}?subdomain=${subdomain}" 
                       class="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                        Read More <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                </div>
            </div>
        </div>
      `
    }).join('')
  }
  
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liked Posts - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <a href="/tenant/home?subdomain=${subdomain}" class="text-2xl font-bold text-blue-600">
                    ${tenantName}
                </a>
                <nav class="flex items-center space-x-6">
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-home mr-1"></i>Home
                    </a>
                    <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-newspaper mr-1"></i>Posts
                    </a>
                    <a href="/tenant/liked-posts?subdomain=${subdomain}" class="text-blue-600 font-semibold">
                        <i class="fas fa-heart mr-1"></i>Liked
                    </a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
        <!-- Page Header -->
        <div class="mb-8">
            <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                <i class="fas fa-heart mr-2 text-red-500"></i>Liked Posts
            </h1>
            <p class="text-gray-600">Posts you have liked (${likedPosts.length})</p>
        </div>
        
        <!-- Posts List -->
        <div class="space-y-4">
            ${postsHTML}
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t mt-16">
        <div class="container mx-auto px-4 py-6 text-center text-gray-600">
            <p>© 2025 ${tenantName}. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`)
})

// ============================================
// いいね一覧ページ（Phase 4）
// ============================================
tenantPublic.get('/liked-posts', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  
  // 開発環境での確認用
  if (!subdomain) {
    return c.html(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
          <meta charset="UTF-8">
          <title>開発環境</title>
      </head>
      <body>
          <h1>開発環境です</h1>
          <p>URLに ?subdomain=your-subdomain を追加してください。</p>
      </body>
      </html>
    `)
  }

  // JWTトークンから認証情報を取得
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 未認証の場合はログインページへ
    return c.redirect('/login?subdomain=' + subdomain)
  }

  // TODO: JWT検証して userId を取得
  // 仮実装: テストユーザーID
  const userId = 1

  // Tenantを取得
  const tenant = await DB.prepare(`
    SELECT id, name, subdomain, subtitle, status
    FROM tenants
    WHERE subdomain = ? AND status = 'active'
  `).bind(subdomain).first()

  if (!tenant) {
    return c.html(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>コミュニティが見つかりません</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-50">
          <div class="min-h-screen flex items-center justify-center">
              <div class="text-center">
                  <i class="fas fa-exclamation-triangle text-6xl text-yellow-500 mb-4"></i>
                  <h1 class="text-2xl font-bold text-gray-800 mb-4">コミュニティが見つかりません</h1>
                  <p class="text-gray-600 mb-6">subdomain: ${subdomain}</p>
                  <a href="/" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <i class="fas fa-home mr-2"></i>ホームに戻る
                  </a>
              </div>
          </div>
      </body>
      </html>
    `)
  }

  // テーマの取得
  const themeResult = await DB.prepare(`
    SELECT theme_preset FROM tenant_customization WHERE tenant_id = ?
  `).bind(tenant.id).first()
  const theme = themeResult?.theme_preset || 'modern-business'

  // ページネーション設定
  const page = Number(c.req.query('page')) || 1
  const perPage = 12
  const offset = (page - 1) * perPage

  // いいねした投稿の総数を取得
  const countResult = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM post_likes
    WHERE user_id = ? AND tenant_id = ?
  `).bind(userId, tenant.id).first()
  const totalLikes = countResult?.count || 0
  const totalPages = Math.ceil(totalLikes / perPage)

  // いいねした投稿を取得（投稿情報も含む）
  const likedPosts = await DB.prepare(`
    SELECT 
      p.id,
      p.title,
      p.content,
      p.thumbnail_url,
      p.view_count,
      p.created_at,
      u.nickname as author_name,
      u.avatar_url as author_avatar,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND tenant_id = ?) as like_count,
      pl.created_at as liked_at
    FROM post_likes pl
    INNER JOIN posts p ON pl.post_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE pl.user_id = ? AND pl.tenant_id = ? AND p.status = 'published'
    ORDER BY pl.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(tenant.id, userId, tenant.id, perPage, offset).all()

  // 投稿HTMLを生成
  let postsHTML = ''
  if (likedPosts.results.length === 0) {
    postsHTML = '<div class="text-center py-12 text-gray-500"><i class="fas fa-heart text-4xl mb-4"></i><p>まだいいねした投稿がありません</p></div>'
  } else {
    postsHTML = likedPosts.results.map((post: any) => {
      const excerpt = post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '')
      const likedDate = new Date(post.liked_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
      
      return '<div class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">' +
        '<div class="flex items-start justify-between mb-3">' +
        '<h3 class="text-xl font-bold text-gray-900 flex-grow">' +
        '<a href="/tenant/posts/' + post.id + '?subdomain=' + subdomain + '" class="hover:text-blue-600">' + post.title + '</a>' +
        '</h3></div>' +
        '<p class="text-gray-600 mb-4">' + excerpt + '</p>' +
        '<div class="flex items-center justify-between text-sm text-gray-500">' +
        '<div class="flex items-center space-x-4">' +
        '<span><i class="fas fa-user mr-1"></i>' + (post.author_name || '不明') + '</span>' +
        '<span><i class="fas fa-heart text-blue-600 mr-1"></i>' + post.like_count + '</span>' +
        '<span><i class="fas fa-eye mr-1"></i>' + post.view_count + '</span>' +
        '</div>' +
        '<span class="text-xs text-gray-400">' + likedDate + ' にいいね</span>' +
        '</div></div>'
    }).join('')
  }

  // ページネーションHTML生成
  let paginationHTML = ''
  if (totalPages > 1) {
    paginationHTML = '<div class="flex justify-center items-center space-x-2 mt-8">'
    
    // 前へボタン
    if (page > 1) {
      paginationHTML += '<a href="/tenant/liked-posts?subdomain=' + subdomain + '&page=' + (page - 1) + '" class="px-4 py-2 border rounded-lg hover:bg-gray-50">前へ</a>'
    } else {
      paginationHTML += '<span class="px-4 py-2 border rounded-lg text-gray-400 cursor-not-allowed">前へ</span>'
    }
    
    // ページ番号
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
        if (i === page) {
          paginationHTML += '<span class="px-4 py-2 bg-blue-600 text-white rounded-lg">' + i + '</span>'
        } else {
          paginationHTML += '<a href="/tenant/liked-posts?subdomain=' + subdomain + '&page=' + i + '" class="px-4 py-2 border rounded-lg hover:bg-gray-50">' + i + '</a>'
        }
      } else if (i === page - 3 || i === page + 3) {
        paginationHTML += '<span class="px-4 py-2">...</span>'
      }
    }
    
    // 次へボタン
    if (page < totalPages) {
      paginationHTML += '<a href="/tenant/liked-posts?subdomain=' + subdomain + '&page=' + (page + 1) + '" class="px-4 py-2 border rounded-lg hover:bg-gray-50">次へ</a>'
    } else {
      paginationHTML += '<span class="px-4 py-2 border rounded-lg text-gray-400 cursor-not-allowed">次へ</span>'
    }
    
    paginationHTML += '</div>'
  }

  return c.html(`
<!DOCTYPE html>
<html lang="ja" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>いいねした投稿 - ${tenant.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <!-- ヘッダー -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <a href="/tenant/home?subdomain=${subdomain}" class="text-2xl font-bold text-blue-600">
                    ${tenant.name}
                </a>
                <nav class="hidden md:flex items-center space-x-6">
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-home mr-1"></i>ホーム
                    </a>
                    <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-newspaper mr-1"></i>投稿
                    </a>
                    <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-users mr-1"></i>メンバー
                    </a>
                    <a href="/tenant/liked-posts?subdomain=${subdomain}" class="text-blue-600 font-semibold">
                        <i class="fas fa-heart mr-1"></i>いいね
                    </a>
                    <a href="/tenant/mypage?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-user mr-1"></i>マイページ
                    </a>
                </nav>
                
                <!-- モバイルメニュー -->
                <button id="mobileMenuToggle" class="md:hidden">
                    <i class="fas fa-bars text-2xl text-gray-600"></i>
                </button>
            </div>
            
            <!-- モバイルメニューコンテンツ -->
            <div id="mobileMenu" class="hidden md:hidden mt-4 pb-4 border-t pt-4">
                <nav class="flex flex-col space-y-3">
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-home mr-2"></i>ホーム
                    </a>
                    <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-newspaper mr-2"></i>投稿
                    </a>
                    <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-users mr-2"></i>メンバー
                    </a>
                    <a href="/tenant/liked-posts?subdomain=${subdomain}" class="text-blue-600 font-semibold">
                        <i class="fas fa-heart mr-2"></i>いいね
                    </a>
                    <a href="/tenant/mypage?subdomain=${subdomain}" class="text-gray-600 hover:text-blue-600">
                        <i class="fas fa-user mr-2"></i>マイページ
                    </a>
                </nav>
            </div>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="container mx-auto px-4 py-8">
        <!-- ページヘッダー -->
        <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
                <i class="fas fa-heart text-red-500 mr-3"></i>いいねした投稿
            </h1>
            <p class="text-gray-600">
                あなたがいいねした投稿一覧です（全${totalLikes}件）
            </p>
        </div>

        <!-- 投稿一覧 -->
        <div class="space-y-4">
            ${postsHTML}
        </div>

        <!-- ページネーション -->
        ${paginationHTML}
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
        // モバイルメニューの切り替え
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileMenuToggle && mobileMenu) {
            mobileMenuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    </script>
</body>
</html>`)
})


export default tenantPublic

