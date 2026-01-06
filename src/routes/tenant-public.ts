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
                            <a href="/forgot-password" class="text-sm text-purple-600 hover:text-purple-700">
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
                const password = document.getElementById('password').value.trim();
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
                    // デバッグ: 送信データを確認
                    const loginData = {
                        email,
                        password,
                        subdomain,
                        remember
                    };
                    console.log('Login request data:', { 
                        email, 
                        subdomain, 
                        remember, 
                        password: '***',
                        passwordLength: password.length,
                        // 一時デバッグ: パスワードの各文字コードを確認
                        passwordCharCodes: Array.from(password).map(c => c.charCodeAt(0))
                    });
                    
                    const response = await axios.post('/api/tenant/login', loginData);

                    if (response.data.success) {
                        // Store token (キー名を'token'に統一)
                        localStorage.setItem('token', response.data.token);
                        localStorage.setItem('user', JSON.stringify(response.data.user));

                        showToast('ログインに成功しました', 'success');

                        // 役割に応じてリダイレクト
                        const user = response.data.user;
                        setTimeout(() => {
                            if (user && (user.role === 'owner' || user.role === 'admin')) {
                                // オーナー/管理者はダッシュボードへ
                                window.location.href = '/dashboard';
                            } else {
                                // 一般メンバーはテナントホームへ
                                window.location.href = '/tenant/home?subdomain=' + subdomain;
                            }
                        }, 1500);
                    } else {
                        throw new Error(response.data.message || 'ログインに失敗しました');
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    console.error('Error response:', error.response?.data);
                    console.error('Error status:', error.response?.status);
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
                    <a href="/login?subdomain=${subdomain}" class="text-blue-600 hover:text-blue-700 font-semibold">
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
      const thumbnailUrl = String(post.thumbnail_url || '')
      const videoUrl = String(post.video_url || '')
      
      // サムネイル画像の表示
      let thumbnailHTML = ''
      if (thumbnailUrl) {
        // 動画がある場合は再生アイコンを重ねて表示
        const videoOverlay = videoUrl ? `
          <div class="absolute inset-0 flex items-center justify-center bg-black/30">
            <div class="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <i class="fas fa-play text-blue-600 text-2xl ml-1"></i>
            </div>
          </div>
        ` : ''
        
        thumbnailHTML = `
          <div class="w-full h-48 rounded-t-lg overflow-hidden relative">
            <img src="${thumbnailUrl}" alt="${postTitle}" class="w-full h-full object-cover">
            ${videoOverlay}
          </div>
        `
      } else {
        // サムネイルなし：動画があれば動画アイコン、なければ通常アイコン
        const icon = videoUrl ? 'fa-video' : 'fa-file-alt'
        thumbnailHTML = `
          <div class="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 rounded-t-lg flex items-center justify-center">
            <i class="fas ${icon} text-6xl text-white opacity-50"></i>
          </div>
        `
      }
      
      return `
        <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            ${thumbnailHTML}
            <div class="p-6">
                <h4 class="text-xl font-bold text-gray-900 mb-2 line-clamp-2">${postTitle}</h4>
                <p class="text-gray-600 mb-4 line-clamp-3">${postExcerpt}...</p>
                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span><i class="fas fa-user mr-1"></i>${authorName}</span>
                    <span><i class="fas fa-calendar mr-1"></i>${createdDate}</span>
                </div>
                <a href="/tenant/posts/${post.id}?subdomain=${subdomain}" 
                   class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-center transition-colors"
                   data-subdomain="${subdomain}"
                   data-post-id="${post.id}">
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
    <style>
        /* 認証状態によって表示/非表示を制御 */
        .auth-hide { display: flex !important; }
        .auth-show { display: none !important; }
        body.authenticated .auth-hide { display: none !important; }
        body.authenticated .auth-show { display: flex !important; }
    </style>
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
                <!-- デスクトップナビ (動的に更新される) -->
                <nav class="hidden md:flex gap-4" id="desktopNav">
                    <!-- 認証後に updateNavigation() で内容が設定されます -->
                    <a href="/login?subdomain=${subdomain}" id="loginBtn" class="auth-hide px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                        <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                    </a>
                    <div id="userMenuDesktop" class="auth-show hidden relative">
                        <button id="userMenuBtn" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition flex items-center gap-2">
                            <i class="fas fa-user-circle"></i>
                            <span id="userNickname"></span>
                            <i class="fas fa-chevron-down text-xs"></i>
                        </button>
                        <div id="userDropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                            <a href="/tenant/mypage?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                                <i class="fas fa-user mr-2"></i>プロフィール
                            </a>
                            <button id="logoutBtnDesktop" class="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
                                <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                            </button>
                        </div>
                    </div>
                </nav>
                <!-- モバイルメニューボタン -->
                <button id="mobileMenuBtn" class="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            <!-- モバイルメニュー (動的に更新される) -->
            <div id="mobileMenu" class="hidden md:hidden mt-4 space-y-2">
                <!-- 認証後に updateNavigation() で内容が設定されます -->
                <a href="/login?subdomain=${subdomain}" id="loginBtnMobile" class="auth-hide block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center">
                    <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                </a>
                <div id="userMenuMobile" class="auth-show hidden space-y-2">
                    <div class="px-4 py-2 bg-gray-100 rounded-lg text-center">
                        <i class="fas fa-user-circle mr-2"></i>
                        <span id="userNicknameMobile"></span>
                    </div>
                    <a href="/tenant/mypage?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-center">
                        <i class="fas fa-user mr-2"></i>プロフィール
                    </a>
                    <button id="logoutBtnMobile" class="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                        <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                    </button>
                </div>
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
            <div id="heroCTAs" class="auth-hide flex gap-4 justify-center flex-wrap">
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
        // ページ情報を設定（tenant-navigation.jsが使用）
        window.TENANT_PAGE_INFO = {
            subdomain: '${subdomain}',
            tenantName: '${tenantName}'
        }
        
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
            const token = localStorage.getItem('token')
            if (!token) return

            try {
                const response = await fetch('/api/notifications/unread-count', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                
                // 認証エラーの場合はトークンをクリア
                if (response.status === 401) {
                    console.warn('認証トークンが無効です。ログアウトします。')
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    localStorage.removeItem('membership')
                    return
                }
                
                // その他のエラーは静かに無視
                if (!response.ok) {
                    console.warn('通知取得失敗:', response.status)
                    return
                }
                
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
                // エラーは静かに無視（通知は必須機能ではないため）
                console.warn('未読数取得エラー:', error.message)
            }
        }

        // ページ読み込み時に未読数を取得
        loadUnreadCount()
        
        // 認証状態をチェックしてUIを更新
        function updateAuthUI() {
            const token = localStorage.getItem('token')
            const userStr = localStorage.getItem('user')
            const user = userStr ? JSON.parse(userStr) : null
            
            console.log('[Tenant Home] Auth check:', {
                hasToken: !!token,
                hasUser: !!user,
                userNickname: user?.nickname
            })
            
            if (token && user) {
                // ログイン済み：bodyに authenticated クラスを追加
                document.body.classList.add('authenticated')
                
                // ユーザーメニューの表示とニックネーム設定
                const userNickname = document.getElementById('userNickname')
                const userNicknameMobile = document.getElementById('userNicknameMobile')
                
                if (userNickname) userNickname.textContent = user.nickname || 'ユーザー'
                if (userNicknameMobile) userNicknameMobile.textContent = user.nickname || 'ユーザー'
                
                // ユーザーメニューのドロップダウン
                const userMenuBtn = document.getElementById('userMenuBtn')
                const userDropdown = document.getElementById('userDropdown')
                if (userMenuBtn && userDropdown) {
                    userMenuBtn.addEventListener('click', () => {
                        userDropdown.classList.toggle('hidden')
                    })
                    // 外側クリックで閉じる
                    document.addEventListener('click', (e) => {
                        if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                            userDropdown.classList.add('hidden')
                        }
                    })
                }
                
                // ログアウト処理
                const logoutBtnDesktop = document.getElementById('logoutBtnDesktop')
                const logoutBtnMobile = document.getElementById('logoutBtnMobile')
                
                const handleLogout = () => {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    localStorage.removeItem('membership')
                    window.location.reload()
                }
                
                if (logoutBtnDesktop) logoutBtnDesktop.addEventListener('click', handleLogout)
                if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', handleLogout)
            }
        }
        
        updateAuthUI()
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
    <!-- ヘッダー（管理者用・一般メンバー用で動的に変更） -->
    <header id="mainHeader" class="bg-white shadow-sm sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-xl md:text-2xl font-bold text-primary">
                        ${tenant.name}
                    </a>
                    ${tenant.subtitle ? `<span class="text-gray-500 hidden md:inline text-sm">- ${tenant.subtitle}</span>` : ''}
                </div>
                
                <!-- デスクトップナビ（動的生成） -->
                <nav id="desktopNav" class="hidden md:flex items-center space-x-6">
                    <!-- JavaScriptで動的に生成 -->
                </nav>
                
                <!-- モバイルメニューボタン（管理者のみ表示） -->
                <button id="mobileMenuToggle" class="hidden md:hidden text-gray-600 hover:text-primary">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            
            <!-- ハンバーガーメニュー（管理者用モバイル） -->
            <nav id="mobileMenu" class="md:hidden mt-4 pb-4 space-y-2 hidden">
                <!-- JavaScriptで動的に生成 -->
            </nav>
        </div>
    </header>
    
    <!-- ボトムナビゲーション（一般メンバー用モバイル） -->
    <nav id="bottomNav" class="hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset">
        <div class="flex items-center justify-around h-16">
            <a href="/tenant/home?subdomain=${subdomain}" class="bottom-nav-item flex flex-col items-center justify-center flex-1 py-2" data-page="home">
                <i class="fas fa-home text-2xl mb-1"></i>
                <span class="text-xs">ホーム</span>
            </a>
            <a href="/tenant/posts?subdomain=${subdomain}" class="bottom-nav-item flex flex-col items-center justify-center flex-1 py-2" data-page="posts">
                <i class="fas fa-newspaper text-2xl mb-1"></i>
                <span class="text-xs">投稿</span>
            </a>
            <a href="/tenant/members?subdomain=${subdomain}" class="bottom-nav-item flex flex-col items-center justify-center flex-1 py-2" data-page="members">
                <i class="fas fa-users text-2xl mb-1"></i>
                <span class="text-xs">メンバー</span>
            </a>
            <button id="bottomNavProfile" class="bottom-nav-item flex flex-col items-center justify-center flex-1 py-2 relative" data-page="profile">
                <i class="fas fa-user-circle text-2xl mb-1"></i>
                <span class="text-xs">自分</span>
                <!-- ドロップアップメニュー -->
                <div id="profileDropup" class="hidden absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200">
                    <a href="/profile" class="block px-4 py-3 text-gray-700 hover:bg-gray-50 transition">
                        <i class="fas fa-user mr-2"></i>プロフィール
                    </a>
                    <button onclick="logout()" class="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition border-t">
                        <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                    </button>
                </div>
            </button>
        </div>
    </nav>
    
    <style>
        /* ボトムナビゲーションのスタイル */
        .bottom-nav-item {
            -webkit-tap-highlight-color: transparent;
            transition: all 0.2s;
        }
        
        .bottom-nav-item.active {
            color: var(--primary-color, #3B82F6);
        }
        
        .bottom-nav-item:not(.active) {
            color: #9CA3AF;
        }
        
        .bottom-nav-item:active {
            transform: scale(0.95);
        }
        
        /* セーフエリア対応（iPhone X以降） */
        .safe-area-inset {
            padding-bottom: env(safe-area-inset-bottom);
        }
        
        /* ボトムナビ表示時のコンテンツ下部余白 */
        body.has-bottom-nav {
            padding-bottom: calc(64px + env(safe-area-inset-bottom));
        }
    </style>

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

                <!-- 画像ギャラリー -->
                <div>
                    <label for="images" class="block text-sm font-medium text-gray-700 mb-2">
                        画像 <span class="text-xs text-gray-500">(複数選択可能)</span>
                    </label>
                    
                    <!-- プレビューグリッド -->
                    <div id="imagesPreviewGrid" class="hidden grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <!-- 画像プレビューがここに追加される -->
                    </div>
                    
                    <div class="flex items-center space-x-4">
                        <div class="flex-1">
                            <input 
                                type="file" 
                                id="images" 
                                name="images" 
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                multiple
                                class="hidden"
                            >
                            <button 
                                type="button" 
                                id="selectImagesBtn"
                                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                                <i class="fas fa-images mr-2"></i>画像を選択（複数可）
                            </button>
                            <p class="text-sm text-gray-500 mt-2">
                                <i class="fas fa-info-circle mr-1"></i>
                                JPEG, PNG, GIF, WebP形式（1枚最大10MB、最大10枚まで）
                            </p>
                        </div>
                    </div>
                </div>

                <!-- 動画 -->
                <div>
                    <label for="video" class="block text-sm font-medium text-gray-700 mb-2">
                        動画
                    </label>
                    <div class="flex items-center space-x-4">
                        <div id="videoPreview" class="hidden">
                            <video id="videoPlayer" controls class="w-64 h-48 rounded-lg bg-black">
                                <source id="videoSource" src="" type="">
                                お使いのブラウザは動画タグをサポートしていません。
                            </video>
                        </div>
                        <div class="flex-1">
                            <input 
                                type="file" 
                                id="video" 
                                name="video" 
                                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                                class="hidden"
                            >
                            <button 
                                type="button" 
                                id="selectVideoBtn"
                                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                                <i class="fas fa-video mr-2"></i>動画を選択
                            </button>
                            <p class="text-sm text-gray-500 mt-2">MP4, WebM, OGG, MOV形式（最大100MB）</p>
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
        // 動画からサムネイルを生成する関数
        async function generateVideoThumbnail(videoFile, seekToSecond = 1) {
            return new Promise((resolve, reject) => {
                try {
                    // video要素を作成
                    const video = document.createElement('video')
                    video.preload = 'metadata'
                    video.muted = true
                    video.playsInline = true
                    
                    // video読み込み完了時
                    video.addEventListener('loadeddata', () => {
                        // 指定秒数にシーク（動画が短い場合は先頭）
                        const seekTime = Math.min(seekToSecond, video.duration || 0)
                        video.currentTime = seekTime
                    })
                    
                    // シーク完了時にキャプチャ
                    video.addEventListener('seeked', () => {
                        try {
                            // Canvasを作成
                            const canvas = document.createElement('canvas')
                            canvas.width = video.videoWidth
                            canvas.height = video.videoHeight
                            
                            // 動画のフレームをCanvasに描画
                            const ctx = canvas.getContext('2d')
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                            
                            // CanvasをBlobに変換
                            canvas.toBlob((blob) => {
                                if (blob) {
                                    // BlobをFileオブジェクトに変換
                                    const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' })
                                    resolve(file)
                                } else {
                                    reject(new Error('Failed to generate thumbnail blob'))
                                }
                                
                                // クリーンアップ
                                URL.revokeObjectURL(video.src)
                            }, 'image/jpeg', 0.8)
                        } catch (error) {
                            reject(error)
                        }
                    })
                    
                    // エラーハンドリング
                    video.addEventListener('error', (e) => {
                        reject(new Error('Failed to load video: ' + (video.error?.message || 'Unknown error')))
                    })
                    
                    // 動画ファイルを読み込み
                    video.src = URL.createObjectURL(videoFile)
                } catch (error) {
                    reject(error)
                }
            })
        }
        
        // 認証チェックと管理者判定
        async function checkAuthAndRole() {
            const token = getToken()  // Use getToken() from app.js
            if (!token) {
                console.warn('No token found, redirecting to login')
                window.location.href = '/login?subdomain=${subdomain}'
                return
            }
            
            try {
                // Check user data from localStorage
                const userStr = localStorage.getItem('user')
                if (!userStr) {
                    console.warn('No user found, redirecting to login')
                    window.location.href = '/login?subdomain=${subdomain}'
                    return
                }
                
                const user = JSON.parse(userStr)
                console.log('User:', user)
                
                // Build membership object from user data
                const membership = {
                    role: user.role,
                    subdomain: '${subdomain}',
                    tenant_id: user.tenantId,
                    member_number: user.memberNumber,
                    status: user.status || 'active'
                }
                console.log('Membership:', membership)
                
                // 管理者権限チェック
                const isAdmin = membership.role === 'owner' || membership.role === 'admin'
                if (!isAdmin) {
                    alert('投稿作成は管理者のみ可能です')
                    window.location.href = '/tenant/home?subdomain=${subdomain}'
                    return
                }
                
                // Check if user belongs to this tenant
                if (user.tenantId !== ${tenant.id}) {
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
                
                // ナビゲーションを更新（ログイン済みユーザー向け）
                updateNavigation(membership)
                
                console.log('Authentication check passed')
            } catch (error) {
                console.error('認証エラー:', error)
                window.location.href = '/login?subdomain=${subdomain}'
            }
        }
        
        // ナビゲーションを認証状態に応じて更新
        function updateNavigation(membership) {
            const isAdmin = membership.role === 'owner' || membership.role === 'admin'
            const desktopNav = document.getElementById('desktopNav')
            const mobileMenu = document.getElementById('mobileMenu')
            const mobileMenuToggle = document.getElementById('mobileMenuToggle')
            const bottomNav = document.getElementById('bottomNav')
            
            if (isAdmin) {
                // 管理者用ナビゲーション
                console.log('Setting up admin navigation')
                
                // デスクトップ
                if (desktopNav) {
                    desktopNav.innerHTML = \`
                        <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-home mr-2"></i>ホーム
                        </a>
                        <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-users mr-2"></i>会員管理
                        </a>
                        <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-file-alt mr-2"></i>投稿管理
                        </a>
                        <a href="/tenant/chat?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-comments mr-2"></i>チャット
                        </a>
                        <div class="relative group">
                            <button class="text-gray-600 hover:text-primary transition flex items-center">
                                <i class="fas fa-user-circle mr-2"></i>
                                \${membership.tenant_name || 'ユーザー'}
                                <i class="fas fa-chevron-down ml-2 text-xs"></i>
                            </button>
                            <div class="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                                <a href="/tenant/mypage?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                                    <i class="fas fa-user mr-2"></i>マイページ
                                </a>
                                <a href="/tenant/settings?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                                    <i class="fas fa-cog mr-2"></i>設定
                                </a>
                                <button onclick="logout()" class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                                    <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                                </button>
                            </div>
                        </div>
                    \`
                }
                
                // モバイル（ハンバーガーメニュー）
                if (mobileMenu) {
                    mobileMenu.innerHTML = \`
                        <a href="/tenant/home?subdomain=${subdomain}" class="block py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                            <i class="fas fa-home mr-2"></i>ホーム
                        </a>
                        <a href="/tenant/members?subdomain=${subdomain}" class="block py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                            <i class="fas fa-users mr-2"></i>会員管理
                        </a>
                        <a href="/tenant/posts?subdomain=${subdomain}" class="block py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                            <i class="fas fa-file-alt mr-2"></i>投稿管理
                        </a>
                        <a href="/tenant/chat?subdomain=${subdomain}" class="block py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                            <i class="fas fa-comments mr-2"></i>チャット
                        </a>
                        <a href="/tenant/mypage?subdomain=${subdomain}" class="block py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                            <i class="fas fa-user mr-2"></i>マイページ
                        </a>
                        <a href="/tenant/settings?subdomain=${subdomain}" class="block py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                            <i class="fas fa-cog mr-2"></i>設定
                        </a>
                        <button onclick="logout()" class="block w-full text-left py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                            <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                        </button>
                    \`
                }
                
                // モバイルメニューボタンを表示
                if (mobileMenuToggle) {
                    mobileMenuToggle.classList.remove('hidden')
                }
                
            } else {
                // 一般メンバー用ナビゲーション
                console.log('Setting up member navigation')
                
                // デスクトップ
                if (desktopNav) {
                    desktopNav.innerHTML = \`
                        <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-home mr-2"></i>ホーム
                        </a>
                        <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-newspaper mr-2"></i>投稿
                        </a>
                        <a href="/tenant/chat?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-comments mr-2"></i>チャット
                        </a>
                        <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-users mr-2"></i>メンバー
                        </a>
                        <div class="relative group">
                            <button class="text-gray-600 hover:text-primary transition flex items-center">
                                <i class="fas fa-user-circle mr-2"></i>
                                \${membership.tenant_name || 'ユーザー'}
                                <i class="fas fa-chevron-down ml-2 text-xs"></i>
                            </button>
                            <div class="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                                <a href="/profile" class="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                                    <i class="fas fa-user mr-2"></i>プロフィール
                                </a>
                                <button onclick="logout()" class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                                    <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                                </button>
                            </div>
                        </div>
                    \`
                }
                
                // モバイル（ボトムナビゲーション）
                if (bottomNav) {
                    bottomNav.classList.remove('hidden')
                    bottomNav.classList.add('md:hidden')
                    document.body.classList.add('has-bottom-nav')
                    
                    // 現在のページをアクティブ化
                    const currentPath = window.location.pathname
                    const bottomNavItems = bottomNav.querySelectorAll('.bottom-nav-item')
                    bottomNavItems.forEach(item => {
                        const href = item.getAttribute('href')
                        if (href && currentPath.includes(href.split('?')[0])) {
                            item.classList.add('active')
                        }
                    })
                    
                    // プロフィールドロップアップ
                    const bottomNavProfile = document.getElementById('bottomNavProfile')
                    const profileDropup = document.getElementById('profileDropup')
                    
                    if (bottomNavProfile && profileDropup) {
                        bottomNavProfile.addEventListener('click', (e) => {
                            e.preventDefault()
                            profileDropup.classList.toggle('hidden')
                        })
                        
                        // 外側クリックで閉じる
                        document.addEventListener('click', (e) => {
                            if (!bottomNavProfile.contains(e.target)) {
                                profileDropup.classList.add('hidden')
                            }
                        })
                    }
                }
            }
        }
        
        // ログアウト処理
        function logout() {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('membership')
            window.location.href = '/tenant/home?subdomain=${subdomain}'
        }
        
        // ページ読み込み時に認証チェック
        checkAuthAndRole()
        
        // DOMContentLoaded後に実行
        document.addEventListener('DOMContentLoaded', function() {
            // モバイルメニュー切替
            document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
                const menu = document.getElementById('mobileMenu')
                menu.classList.toggle('hidden')
            })
            
            // サムネイル画像選択
            const thumbnailInput = document.getElementById('thumbnail')
            // 画像選択（複数）
            const imagesInput = document.getElementById('images')
            const selectImagesBtn = document.getElementById('selectImagesBtn')
            const imagesPreviewGrid = document.getElementById('imagesPreviewGrid')
            let selectedImages = []
            
            selectImagesBtn?.addEventListener('click', () => {
                console.log('Images button clicked')
                imagesInput.click()
            })
            
            imagesInput?.addEventListener('change', (e) => {
                const files = Array.from(e.target.files || [])
                
                if (files.length === 0) return
                
                // 最大10枚まで
                if (files.length > 10) {
                    alert('画像は最大10枚まで選択できます')
                    imagesInput.value = ''
                    return
                }
                
                // ファイルサイズチェック
                const oversizedFiles = files.filter(f => f.size > 10 * 1024 * 1024)
                if (oversizedFiles.length > 0) {
                    alert('各画像のファイルサイズは10MB以下にしてください')
                    imagesInput.value = ''
                    return
                }
                
                // 選択された画像を保存
                selectedImages = files
                
                // プレビュー表示
                imagesPreviewGrid.innerHTML = ''
                imagesPreviewGrid.classList.remove('hidden')
                
                files.forEach((file, index) => {
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        const previewItem = document.createElement('div')
                        previewItem.className = 'relative group'
                        previewItem.innerHTML = \`
                            <img src="\${e.target.result}" alt="画像 \${index + 1}" class="w-full h-32 object-cover rounded-lg">
                            <div class="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">\${index + 1}</div>
                            <button type="button" onclick="removeImage(\${index})" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <i class="fas fa-times text-xs"></i>
                            </button>
                        \`
                        imagesPreviewGrid.appendChild(previewItem)
                    }
                    reader.readAsDataURL(file)
                })
            })
            
            // 画像削除関数
            window.removeImage = function(index) {
                const filesArray = Array.from(imagesInput.files)
                filesArray.splice(index, 1)
                
                // FileListを再作成（擬似的に）
                const dataTransfer = new DataTransfer()
                filesArray.forEach(file => dataTransfer.items.add(file))
                imagesInput.files = dataTransfer.files
                
                selectedImages = filesArray
                
                // プレビュー再描画
                imagesInput.dispatchEvent(new Event('change'))
            }
            
            
            // 動画選択
            const videoInput = document.getElementById('video')
            const selectVideoBtn = document.getElementById('selectVideoBtn')
            const videoPreview = document.getElementById('videoPreview')
            const videoPlayer = document.getElementById('videoPlayer')
            const videoSource = document.getElementById('videoSource')
            
            selectVideoBtn?.addEventListener('click', () => {
                console.log('Video button clicked')
                videoInput.click()
            })
            
            videoInput?.addEventListener('change', (e) => {
                const file = e.target.files[0]
                if (file) {
                    // ファイルサイズチェック（100MB）
                    if (file.size > 100 * 1024 * 1024) {
                        alert('動画ファイルサイズは100MB以下にしてください')
                        videoInput.value = ''
                        return
                    }
                    
                    // プレビュー表示
                    const url = URL.createObjectURL(file)
                    videoSource.src = url
                    videoSource.type = file.type
                    videoPlayer.load()
                    videoPreview.classList.remove('hidden')
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
            const images = imagesInput.files // 複数画像
            
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
                
                const token = getToken()
                if (!token) {
                    showToast('認証エラー：ログインしてください', 'error')
                    submitBtn.disabled = false
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>投稿する'
                    return
                }
                
                // 複数画像アップロード処理
                let imageUrls = []
                let thumbnailUrl = null
                if (images && images.length > 0) {
                    try {
                        showToast(images.length + '枚の画像をアップロード中...', 'info')
                        console.log('Starting multiple images upload, count:', images.length)
                        
                        // 並列アップロード
                        const uploadPromises = Array.from(images).map(async (imageFile, index) => {
                            const uploadFormData = new FormData()
                            uploadFormData.append('media', imageFile)
                            
                            const uploadResponse = await fetch('/api/upload/post-media', {
                                method: 'POST',
                                headers: {
                                    'Authorization': 'Bearer ' + token
                                },
                                body: uploadFormData
                            })
                            
                            const uploadData = await uploadResponse.json()
                            if (uploadData.success) {
                                console.log('Image ' + (index + 1) + ' uploaded:', uploadData.media_url)
                                return uploadData.media_url
                            } else {
                                console.warn('Image ' + (index + 1) + ' upload failed:', uploadData.error)
                                return null
                            }
                        })
                        
                        imageUrls = (await Promise.all(uploadPromises)).filter(url => url !== null)
                        
                        if (imageUrls.length > 0) {
                            // 最初の画像をサムネイルとして使用
                            thumbnailUrl = imageUrls[0]
                            showToast(imageUrls.length + '枚の画像をアップロードしました', 'success')
                        } else {
                            showToast('画像のアップロードに失敗しました', 'warning')
                        }
                    } catch (uploadError) {
                        console.error('画像アップロードエラー:', uploadError)
                        showToast('画像のアップロード中にエラーが発生しました', 'error')
                    }
                }
                
                // 動画アップロード処理
                const video = formData.get('video')
                let videoUrl = null
                if (video && video.size > 0) {
                    try {
                        console.log('Starting video upload, file size:', video.size)
                        const uploadFormData = new FormData()
                        uploadFormData.append('video', video)
                        
                        const token = getToken()
                        
                        if (!token) {
                            console.error('No token found for video upload')
                            showToast('認証エラー：動画をアップロードできません', 'error')
                        } else {
                            showToast('動画をアップロード中...', 'info')
                            const uploadResponse = await fetch('/api/upload/post-video', {
                                method: 'POST',
                                headers: {
                                    'Authorization': 'Bearer ' + token
                                },
                                body: uploadFormData
                            })
                            
                            console.log('Video upload response status:', uploadResponse.status)
                            const uploadData = await uploadResponse.json()
                            console.log('Video upload response data:', uploadData)
                            
                            if (uploadData.success) {
                                videoUrl = uploadData.video_url
                                console.log('Video uploaded successfully:', videoUrl)
                                showToast('動画をアップロードしました', 'success')
                                
                                // サムネイルが未設定の場合、動画から自動生成
                                if (!thumbnailUrl) {
                                    try {
                                        console.log('Generating thumbnail from video...')
                                        showToast('動画からサムネイルを生成中...', 'info')
                                        
                                        const generatedThumbnail = await generateVideoThumbnail(video)
                                        if (generatedThumbnail) {
                                            // サムネイルをアップロード
                                            const thumbFormData = new FormData()
                                            thumbFormData.append('media', generatedThumbnail, 'video-thumbnail.jpg')
                                            
                                            const thumbResponse = await fetch('/api/upload/post-media', {
                                                method: 'POST',
                                                headers: {
                                                    'Authorization': 'Bearer ' + token
                                                },
                                                body: thumbFormData
                                            })
                                            
                                            const thumbData = await thumbResponse.json()
                                            if (thumbData.success) {
                                                thumbnailUrl = thumbData.media_url
                                                console.log('Auto-generated thumbnail uploaded:', thumbnailUrl)
                                                showToast('サムネイルを自動生成しました', 'success')
                                            }
                                        }
                                    } catch (thumbError) {
                                        console.error('サムネイル自動生成エラー:', thumbError)
                                        // サムネイル生成失敗は警告のみ（投稿は続行）
                                    }
                                }
                            } else {
                                console.warn('動画アップロード失敗:', uploadData.error)
                                showToast('動画のアップロードに失敗しました：' + (uploadData.error || '不明なエラー'), 'warning')
                            }
                        }
                    } catch (uploadError) {
                        console.error('動画アップロードエラー:', uploadError)
                        showToast('動画のアップロード中にエラーが発生しました', 'error')
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
                    video_url: videoUrl,
                    image_urls: imageUrls, // 複数画像URL
                    visibility: visibility
                }
                
                console.log('Submitting post data:', postData)
                console.log('Thumbnail URL in post data:', thumbnailUrl)
                console.log('Video URL in post data:', videoUrl)
                console.log('Image URLs in post data:', imageUrls)
                
                const response = await apiRequest('/api/posts', {
                    method: 'POST',
                    body: JSON.stringify(postData)
                })
                
                console.log('Post creation response:', response)
                
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
        
        }) // End of DOMContentLoaded
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
      const thumbnailUrl = String(post.thumbnail_url || '')
      const videoUrl = String(post.video_url || '')
      
      // サムネイル画像の表示
      let thumbnailHTML = ''
      if (thumbnailUrl) {
        // 動画がある場合は再生アイコンを重ねて表示
        const videoOverlay = videoUrl ? `
          <div class="absolute inset-0 flex items-center justify-center bg-black/30">
            <div class="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <i class="fas fa-play text-blue-600 text-2xl ml-1"></i>
            </div>
          </div>
        ` : ''
        
        thumbnailHTML = `
          <div class="w-full h-48 rounded-t-lg overflow-hidden relative">
            <img src="${thumbnailUrl}" alt="${postTitle}" class="w-full h-full object-cover">
            ${videoOverlay}
          </div>
        `
      } else {
        // サムネイルなし：動画があれば動画アイコン、なければ通常アイコン
        const icon = videoUrl ? 'fa-video' : 'fa-file-alt'
        thumbnailHTML = `
          <div class="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 rounded-t-lg flex items-center justify-center">
            <i class="fas ${icon} text-6xl text-white opacity-50"></i>
          </div>
        `
      }
      
      return `
        <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            ${thumbnailHTML}
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
                   class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-center transition-colors"
                   data-subdomain="${subdomain}"
                   data-post-id="${post.id}">
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
            const token = localStorage.getItem('token')
            if (!token) return

            try {
                const response = await fetch('/api/notifications/unread-count', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                
                // 認証エラーの場合はトークンをクリア
                if (response.status === 401) {
                    console.warn('認証トークンが無効です。ログアウトします。')
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    localStorage.removeItem('membership')
                    return
                }
                
                // その他のエラーは静かに無視
                if (!response.ok) {
                    console.warn('通知取得失敗:', response.status)
                    return
                }
                
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
                // エラーは静かに無視（通知は必須機能ではないため）
                console.warn('未読数取得エラー:', error.message)
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
                    
                    // 管理者の場合は投稿管理ページへ、それ以外は投稿一覧へ
                    const memberData = JSON.parse(localStorage.getItem('membership') || '{}')
                    const isAdmin = memberData.role === 'admin' || memberData.role === 'owner'
                    
                    setTimeout(() => {
                        if (isAdmin) {
                            window.location.href = '/posts-admin'
                        } else {
                            window.location.href = '/tenant/posts?subdomain=${subdomain}'
                        }
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
                    <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
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
                <a href="/tenant/members?subdomain=${subdomain}" class="block py-2 text-gray-600 hover:text-primary transition">
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
            ` : post.video_url ? `
            <div class="w-full bg-black flex items-center justify-center">
                <video controls class="w-full max-h-96">
                    <source src="${post.video_url}" type="video/mp4">
                    お使いのブラウザは動画タグをサポートしていません。
                </video>
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
                const token = localStorage.getItem('token')
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
                const token = localStorage.getItem('token')
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
                    <a href="/tenant/members?subdomain=${subdomain}" class="text-primary font-semibold">
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
                <a href="/tenant/members?subdomain=${subdomain}" class="block py-2 text-primary font-semibold">
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
        // ページ読み込み時に認証チェック
        const subdomain = '${subdomain}'
        const token = getToken()
        
        if (!token) {
            // ログインしていない場合はログインページへリダイレクト
            window.location.href = '/login?subdomain=' + subdomain
        }
        
        // 認証チェック後、会員情報を確認
        const membership = localStorage.getItem('membership')
        if (membership) {
            try {
                const memberData = JSON.parse(membership)
                if (memberData.subdomain !== subdomain) {
                    // 別のコミュニティの会員の場合
                    alert('このコミュニティのメンバーではありません')
                    window.location.href = '/tenant/home?subdomain=' + subdomain
                }
                if (memberData.status !== 'active') {
                    // 承認待ちまたは停止中の場合
                    alert('メンバー一覧を閲覧する権限がありません')
                    window.location.href = '/tenant/home?subdomain=' + subdomain
                }
            } catch (e) {
                console.error('会員情報の解析に失敗:', e)
                window.location.href = '/login?subdomain=' + subdomain
            }
        } else {
            // 会員情報がない場合
            window.location.href = '/login?subdomain=' + subdomain
        }
        
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
                          const token = localStorage.getItem('token')
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
                          
                          const token = localStorage.getItem('token')
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
    '<script src="/static/app.js"></script>' +
    '<script>' +
    'const subdomain = "' + subdomain + '";' +
    'const token = getToken();' +
    'if (!token) {' +
    '  window.location.href = "/login?subdomain=" + subdomain;' +
    '} else {' +
    '  const membership = localStorage.getItem("membership");' +
    '  if (membership) {' +
    '    try {' +
    '      const memberData = JSON.parse(membership);' +
    '      if (memberData.subdomain !== subdomain) {' +
    '        alert("このコミュニティのメンバーではありません");' +
    '        window.location.href = "/tenant/home?subdomain=" + subdomain;' +
    '      }' +
    '      if (memberData.status !== "active") {' +
    '        alert("メンバー詳細を閲覧する権限がありません");' +
    '        window.location.href = "/tenant/home?subdomain=" + subdomain;' +
    '      }' +
    '    } catch (e) {' +
    '      console.error("会員情報の解析に失敗:", e);' +
    '      window.location.href = "/login?subdomain=" + subdomain;' +
    '    }' +
    '  } else {' +
    '    window.location.href = "/login?subdomain=" + subdomain;' +
    '  }' +
    '}' +
    '</script>' +
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
  
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first() as any
  
  if (!tenant) {
    return c.text('Tenant not found', 404)
  }
  
  // クライアント側で認証チェックと投稿取得を行うため、
  // サーバー側では空のテンプレートを返す
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
    <!-- ローディング画面 -->
    <div id="loading" class="fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
        <div class="text-center">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-gray-600">読み込み中...</p>
        </div>
    </div>
    
    <!-- ログインが必要 -->
    <div id="needLogin" class="hidden fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
        <div class="text-center">
            <h1 class="text-3xl font-bold text-gray-900 mb-4">ログインが必要です</h1>
            <p class="text-gray-600 mb-6">マイページにアクセスするにはログインしてください</p>
            <a href="/login?subdomain=${subdomain}" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                ログインページへ
            </a>
        </div>
    </div>
    
    <!-- ヘッダー -->
    <header class="bg-white shadow-sm sticky top-0 z-40">
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
        
        <!-- 会員証 -->
        <div class="mb-8">
            <div id="memberCard" class="max-w-2xl mx-auto bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl shadow-2xl overflow-hidden">
                <div class="p-8 text-white">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h2 class="text-2xl font-bold mb-1">${tenant.name}</h2>
                            <p class="text-blue-100 text-sm">会員証 / Member Card</p>
                        </div>
                        <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <i class="fas fa-id-card text-4xl"></i>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <!-- ユーザー情報 -->
                        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                            <div class="flex items-center gap-4">
                                <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm text-blue-100 mb-1">会員名</p>
                                    <p id="cardNickname" class="text-2xl font-bold">読み込み中...</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p class="text-sm text-blue-100 mb-1">会員番号</p>
                                <p id="cardMemberNumber" class="text-xl font-bold font-mono">----</p>
                            </div>
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p class="text-sm text-blue-100 mb-1">役割</p>
                                <p id="cardRole" class="text-xl font-bold">----</p>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p class="text-sm text-blue-100 mb-1">入会日</p>
                                <p id="cardJoinedAt" class="text-lg font-semibold">----</p>
                            </div>
                            <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p class="text-sm text-blue-100 mb-1">有効期限</p>
                                <p id="cardExpiresAt" class="text-lg font-semibold">----</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-6 flex items-center justify-between">
                        <div class="text-xs text-blue-100 font-mono">
                            ID: <span id="cardUserId">----</span>
                        </div>
                        <div class="w-16 h-16 bg-white/90 rounded-lg flex items-center justify-center">
                            <i class="fas fa-qrcode text-3xl text-blue-600"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white/10 backdrop-blur-sm px-8 py-3 flex items-center justify-between text-sm">
                    <span class="text-blue-100">
                        <i class="fas fa-shield-alt mr-2"></i>会員認証済み
                    </span>
                    <span class="text-blue-100 font-mono">
                        Commons Platform
                    </span>
                </div>
            </div>
        </div>
        
        <!-- 統計カード -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                <div id="totalPosts" class="text-3xl font-bold text-blue-600 mb-1">0</div>
                <div class="text-sm text-gray-600">総投稿数</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                <div id="publishedPosts" class="text-3xl font-bold text-green-600 mb-1">0</div>
                <div class="text-sm text-gray-600">公開中</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
                <div id="draftPosts" class="text-3xl font-bold text-yellow-600 mb-1">0</div>
                <div class="text-sm text-gray-600">下書き</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
                <div id="totalViews" class="text-3xl font-bold text-purple-600 mb-1">0</div>
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
                </nav>
            </div>
        </div>
        
        <!-- 投稿一覧 -->
        <div id="postsList" class="space-y-4">
            <div class="text-center py-12 text-gray-600">読み込み中...</div>
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
        const subdomain = '${subdomain}'
        
        // 認証チェック
        async function checkAuth() {
            const token = localStorage.getItem('token')
            const user = JSON.parse(localStorage.getItem('user') || 'null')
            
            if (!token || !user) {
                document.getElementById('loading').classList.add('hidden')
                document.getElementById('needLogin').classList.remove('hidden')
                return false
            }
            
            return true
        }
        
        // 会員証情報を更新
        function updateMemberCard() {
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            
            // membership を user から構築
            const membership = {
                role: user.role,
                member_number: user.memberNumber,
                joined_at: user.joinedAt || user.created_at
            }
            
            document.getElementById('cardNickname').textContent = user.nickname || '未設定'
            
            const memberNumber = membership.member_number || '00000'
            
            // 会員番号の表示ロジック（5桁固定フォーマット）
            let displayNumber = '00000'
            if (memberNumber === '00000' || memberNumber === '0') {
                // オーナーは「Owner」と表示
                displayNumber = 'Owner'
            } else {
                // 一般会員は5桁で表示（00001-99999）
                displayNumber = String(memberNumber).padStart(5, '0')
            }
            document.getElementById('cardMemberNumber').textContent = displayNumber
            
            const roleMap = {
                'owner': 'オーナー',
                'admin': '管理者',
                'member': '一般会員'
            }
            document.getElementById('cardRole').textContent = roleMap[membership.role] || '会員'
            
            if (membership.joined_at) {
                const joinedDate = new Date(membership.joined_at)
                document.getElementById('cardJoinedAt').textContent = joinedDate.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
            }
            
            const cardExpiresAt = document.getElementById('cardExpiresAt')
            if (membership.expires_at) {
                const expiresDate = new Date(membership.expires_at)
                cardExpiresAt.textContent = expiresDate.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
            } else {
                cardExpiresAt.textContent = '無期限'
            }
            
            document.getElementById('cardUserId').textContent = user.id || '----'
        }
        
        // 投稿を読み込み
        async function loadPosts() {
            try {
                const token = localStorage.getItem('token')
                const user = JSON.parse(localStorage.getItem('user') || '{}')
                
                const response = await axios.get('/api/posts/my-posts', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                
                if (response.data.success) {
                    const posts = response.data.posts || []
                    
                    // 統計を更新
                    const totalPosts = posts.length
                    const publishedPosts = posts.filter(p => p.status === 'published').length
                    const draftPosts = posts.filter(p => p.status === 'draft').length
                    const totalViews = posts.reduce((sum, p) => sum + (p.view_count || 0), 0)
                    
                    document.getElementById('totalPosts').textContent = totalPosts
                    document.getElementById('publishedPosts').textContent = publishedPosts
                    document.getElementById('draftPosts').textContent = draftPosts
                    document.getElementById('totalViews').textContent = totalViews
                    
                    // 投稿一覧を表示
                    const postsList = document.getElementById('postsList')
                    if (posts.length === 0) {
                        postsList.innerHTML = '<div class="text-center py-12 text-gray-600">まだ投稿がありません</div>'
                    } else {
                        postsList.innerHTML = posts.map(post => {
                            const statusBadge = post.status === 'published' 
                                ? '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">公開中</span>'
                                : '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">下書き</span>'
                            
                            const createdDate = new Date(post.created_at).toLocaleDateString('ja-JP')
                            
                            return \`
                                <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                    <div class="flex items-start justify-between mb-3">
                                        <h3 class="text-xl font-bold text-gray-900 flex-1">\${post.title}</h3>
                                        \${statusBadge}
                                    </div>
                                    <p class="text-gray-600 mb-4">\${(post.excerpt || post.content || '').substring(0, 100)}...</p>
                                    <div class="flex items-center justify-between text-sm text-gray-500">
                                        <div class="flex items-center gap-4">
                                            <span><i class="fas fa-eye mr-1"></i>\${post.view_count || 0} 閲覧</span>
                                            <span><i class="fas fa-calendar mr-1"></i>\${createdDate}</span>
                                        </div>
                                        <a href="/tenant/posts/\${post.id}?subdomain=\${subdomain}" 
                                           class="text-blue-600 hover:text-blue-700 font-semibold">
                                            詳細を見る <i class="fas fa-arrow-right ml-1"></i>
                                        </a>
                                    </div>
                                </div>
                            \`
                        }).join('')
                    }
                }
            } catch (error) {
                console.error('投稿読み込みエラー:', error)
                document.getElementById('postsList').innerHTML = '<div class="text-center py-12 text-red-600">投稿の読み込みに失敗しました</div>'
            }
        }
        
        // 初期化
        async function init() {
            const isAuth = await checkAuth()
            if (isAuth) {
                updateMemberCard()
                await loadPosts()
                document.getElementById('loading').classList.add('hidden')
            }
        }
        
        init()
    </script>
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


/**
 * GET /tenant/subscription
 * サブスクリプション管理ページ（オーナーのみ）
 */
tenantPublic.get('/subscription', async (c) => {
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.html(`<!DOCTYPE html><html><body>?subdomain=your-subdomain を追加してください</body></html>`)
  }

  const tenant = await c.env.DB
    .prepare('SELECT * FROM tenants WHERE subdomain = ? AND status = ?')
    .bind(subdomain, 'active')
    .first<any>()

  if (!tenant) {
    return c.html(`<!DOCTYPE html><html><body>コミュニティが見つかりません</body></html>`)
  }

  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>サブスクリプション管理 - ${tenant.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <!-- ヘッダー -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-bold text-gray-900">
                    <i class="fas fa-credit-card mr-2"></i>サブスクリプション管理
                </h1>
                <div class="flex gap-3">
                    <a href="/tenant/plans?subdomain=${subdomain}" class="btn-ghost">
                        <i class="fas fa-tags mr-2"></i>
                        <span class="hidden sm:inline">プラン管理</span>
                    </a>
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-arrow-left mr-2"></i>ホームに戻る
                    </a>
                </div>
            </div>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="max-w-7xl mx-auto px-4 py-8">
        <!-- ローディング -->
        <div id="loading" class="text-center py-12">
            <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
            <p class="mt-4 text-gray-600">読み込み中...</p>
        </div>

        <!-- エラー -->
        <div id="error" class="hidden">
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <i class="fas fa-exclamation-circle text-3xl text-red-600 mb-4"></i>
                <p id="errorMessage" class="text-red-800"></p>
            </div>
        </div>

        <!-- コンテンツ -->
        <div id="content" class="hidden space-y-6">
            <!-- 現在のプラン -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-bold mb-4 flex items-center">
                    <i class="fas fa-star text-yellow-500 mr-2"></i>現在のプラン
                </h2>
                <div class="grid md:grid-cols-3 gap-4">
                    <div>
                        <p class="text-sm text-gray-600">プラン</p>
                        <p id="currentPlan" class="text-2xl font-bold text-blue-600">-</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">ステータス</p>
                        <p id="currentStatus" class="text-lg font-semibold">-</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">次回更新日</p>
                        <p id="nextBilling" class="text-lg">-</p>
                    </div>
                </div>
                <div id="cancelNotice" class="hidden mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-800">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        <span id="cancelMessage"></span>
                    </p>
                </div>
            </div>

            <!-- 使用状況 -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-bold mb-4">
                    <i class="fas fa-chart-bar mr-2"></i>使用状況
                </h2>
                <div class="grid md:grid-cols-3 gap-4">
                    <div>
                        <p class="text-sm text-gray-600">メンバー数</p>
                        <p id="memberCount" class="text-2xl font-bold">0</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">ストレージ使用量</p>
                        <div class="flex items-baseline gap-2">
                            <p id="storageUsed" class="text-2xl font-bold">0</p>
                            <p class="text-gray-600">/ <span id="storageLimit">0</span> MB</p>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div id="storageBar" class="bg-blue-600 h-2 rounded-full" style="width: 0%"></div>
                        </div>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">ストレージ使用率</p>
                        <p id="storagePercent" class="text-2xl font-bold">0%</p>
                    </div>
                </div>
            </div>

            <!-- プラン変更 -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-bold mb-4">
                    <i class="fas fa-exchange-alt mr-2"></i>プラン変更
                </h2>
                <div class="grid md:grid-cols-3 gap-4">
                    <!-- Free -->
                    <div class="border rounded-lg p-4 hover:shadow-lg transition">
                        <h3 class="text-lg font-bold">Free</h3>
                        <p class="text-3xl font-bold my-2">¥0<span class="text-sm text-gray-600">/月</span></p>
                        <ul class="text-sm text-gray-600 space-y-1 mb-4">
                            <li><i class="fas fa-check text-green-600 mr-2"></i>メンバー 50人まで</li>
                            <li><i class="fas fa-check text-green-600 mr-2"></i>1GB ストレージ</li>
                        </ul>
                        <button onclick="changePlan('free')" class="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700">
                            ダウングレード
                        </button>
                    </div>
                    
                    <!-- Starter -->
                    <div class="border-2 border-blue-500 rounded-lg p-4 hover:shadow-lg transition">
                        <h3 class="text-lg font-bold text-blue-600">Starter</h3>
                        <p class="text-3xl font-bold my-2">¥980<span class="text-sm text-gray-600">/月</span></p>
                        <ul class="text-sm text-gray-600 space-y-1 mb-4">
                            <li><i class="fas fa-check text-green-600 mr-2"></i>メンバー 500人まで</li>
                            <li><i class="fas fa-check text-green-600 mr-2"></i>10GB ストレージ</li>
                        </ul>
                        <button onclick="changePlan('starter')" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                            選択
                        </button>
                    </div>
                    
                    <!-- Pro -->
                    <div class="border rounded-lg p-4 hover:shadow-lg transition">
                        <h3 class="text-lg font-bold">Pro</h3>
                        <p class="text-3xl font-bold my-2">¥2,980<span class="text-sm text-gray-600">/月</span></p>
                        <ul class="text-sm text-gray-600 space-y-1 mb-4">
                            <li><i class="fas fa-check text-green-600 mr-2"></i>無制限メンバー</li>
                            <li><i class="fas fa-check text-green-600 mr-2"></i>100GB ストレージ</li>
                        </ul>
                        <button onclick="changePlan('pro')" class="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700">
                            選択
                        </button>
                    </div>
                </div>
            </div>

            <!-- アクション -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-bold mb-4">
                    <i class="fas fa-cog mr-2"></i>サブスクリプション管理
                </h2>
                <div class="space-y-3">
                    <button id="reactivateBtn" onclick="reactivate()" class="hidden w-full md:w-auto bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
                        <i class="fas fa-redo mr-2"></i>キャンセルを取り消す
                    </button>
                    <button id="cancelBtn" onclick="cancelSubscription()" class="hidden w-full md:w-auto bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700">
                        <i class="fas fa-times-circle mr-2"></i>サブスクリプションをキャンセル
                    </button>
                </div>
            </div>

            <!-- 請求履歴 -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-bold mb-4">
                    <i class="fas fa-file-invoice mr-2"></i>請求履歴
                </h2>
                <div id="invoicesList" class="space-y-2">
                    <p class="text-gray-600">読み込み中...</p>
                </div>
            </div>
        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        const subdomain = '${subdomain}'
        let subscriptionData = null

        async function loadSubscription() {
            try {
                const token = getToken()
                if (!token) {
                    window.location.href = '/login?subdomain=' + subdomain
                    return
                }

                const response = await axios.get('/api/subscription/status', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })

                if (response.data.success) {
                    subscriptionData = response.data.subscription
                    updateUI()
                    loadInvoices()
                }
            } catch (error) {
                console.error('Load error:', error)
                document.getElementById('loading').classList.add('hidden')
                document.getElementById('error').classList.remove('hidden')
                document.getElementById('errorMessage').textContent = error.response?.data?.error || 'データの読み込みに失敗しました'
            }
        }

        function updateUI() {
            document.getElementById('loading').classList.add('hidden')
            document.getElementById('content').classList.remove('hidden')

            const plan = subscriptionData.plan || 'free'
            const status = subscriptionData.subscription_status || 'inactive'
            
            document.getElementById('currentPlan').textContent = plan.toUpperCase()
            document.getElementById('currentStatus').textContent = getStatusLabel(status)
            document.getElementById('currentStatus').className = 'text-lg font-semibold ' + getStatusColor(status)

            if (subscriptionData.current_period_end) {
                document.getElementById('nextBilling').textContent = new Date(subscriptionData.current_period_end).toLocaleDateString('ja-JP')
            }

            if (subscriptionData.cancel_at) {
                document.getElementById('cancelNotice').classList.remove('hidden')
                document.getElementById('cancelMessage').textContent = new Date(subscriptionData.cancel_at).toLocaleDateString('ja-JP') + ' にキャンセルされます'
                document.getElementById('reactivateBtn').classList.remove('hidden')
                document.getElementById('cancelBtn').classList.add('hidden')
            } else if (plan !== 'free') {
                document.getElementById('cancelBtn').classList.remove('hidden')
            }

            document.getElementById('memberCount').textContent = subscriptionData.usage.member_count
            document.getElementById('storageUsed').textContent = subscriptionData.usage.storage_used_mb
            document.getElementById('storageLimit').textContent = subscriptionData.usage.storage_limit_mb
            
            const percent = Math.round((subscriptionData.usage.storage_used / subscriptionData.usage.storage_limit) * 100)
            document.getElementById('storagePercent').textContent = percent + '%'
            document.getElementById('storageBar').style.width = percent + '%'
        }

        async function loadInvoices() {
            try {
                const token = getToken()
                const response = await axios.get('/api/subscription/invoices', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })

                if (response.data.success) {
                    const list = document.getElementById('invoicesList')
                    if (response.data.invoices.length === 0) {
                        list.innerHTML = '<p class="text-gray-600">請求履歴がありません</p>'
                    } else {
                        list.innerHTML = response.data.invoices.map(inv => \`
                            <div class="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                                <div>
                                    <p class="font-semibold">\${inv.number || inv.id}</p>
                                    <p class="text-sm text-gray-600">\${new Date(inv.created * 1000).toLocaleDateString('ja-JP')}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-bold">¥\${(inv.amount_paid / 100).toLocaleString()}</p>
                                    <a href="\${inv.invoice_pdf}" target="_blank" class="text-sm text-blue-600 hover:underline">
                                        <i class="fas fa-download mr-1"></i>PDF
                                    </a>
                                </div>
                            </div>
                        \`).join('')
                    }
                }
            } catch (error) {
                console.error('Invoices error:', error)
            }
        }

        async function changePlan(plan) {
            if (!confirm(\`プランを \${plan.toUpperCase()} に変更しますか？\`)) return

            try {
                const token = getToken()
                const response = await axios.post('/api/subscription/change-plan', 
                    { plan },
                    { headers: { 'Authorization': 'Bearer ' + token }}
                )

                if (response.data.success) {
                    if (response.data.checkout_url) {
                        window.location.href = response.data.checkout_url
                    } else {
                        alert(response.data.message)
                        loadSubscription()
                    }
                }
            } catch (error) {
                alert(error.response?.data?.error || 'エラーが発生しました')
            }
        }

        async function cancelSubscription() {
            if (!confirm('サブスクリプションをキャンセルしますか？\\n\\n現在の請求期間終了時にキャンセルされます。')) return

            try {
                const token = getToken()
                const response = await axios.post('/api/subscription/cancel',
                    { immediate: false },
                    { headers: { 'Authorization': 'Bearer ' + token }}
                )

                if (response.data.success) {
                    alert(response.data.message)
                    loadSubscription()
                }
            } catch (error) {
                alert(error.response?.data?.error || 'エラーが発生しました')
            }
        }

        async function reactivate() {
            if (!confirm('キャンセルを取り消しますか？')) return

            try {
                const token = getToken()
                const response = await axios.post('/api/subscription/reactivate', {},
                    { headers: { 'Authorization': 'Bearer ' + token }}
                )

                if (response.data.success) {
                    alert(response.data.message)
                    loadSubscription()
                }
            } catch (error) {
                alert(error.response?.data?.error || 'エラーが発生しました')
            }
        }

        function getStatusLabel(status) {
            const labels = {
                'active': 'アクティブ',
                'past_due': '支払い遅延',
                'canceled': 'キャンセル済み',
                'incomplete': '未完了',
                'trialing': 'トライアル中',
                'inactive': '無効'
            }
            return labels[status] || status
        }

        function getStatusColor(status) {
            if (status === 'active') return 'text-green-600'
            if (status === 'past_due') return 'text-yellow-600'
            if (status === 'canceled') return 'text-red-600'
            return 'text-gray-600'
        }

        loadSubscription()
    </script>
</body>
</html>
  `)
})


// ============================================
// プラン管理ページ（オーナー専用）
// ============================================
tenantPublic.get('/plans', async (c) => {
  const subdomain = c.req.query('subdomain')

  if (!subdomain) {
    return c.html(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>プラン管理 - Commons</title>
          <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 p-8">
          <div class="max-w-4xl mx-auto text-center">
              <h1 class="text-2xl font-bold text-gray-800 mb-4">プラン管理</h1>
              <p class="text-gray-600">サブドメインを指定してください: ?subdomain=your-subdomain</p>
          </div>
      </body>
      </html>
    `)
  }

  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>プラン管理 - Commons</title>
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
                        <i class="fas fa-tags mr-2"></i>
                        プラン管理
                    </h1>
                    <a href="/tenant/subscription?subdomain=${subdomain}" class="btn-ghost">
                        <i class="fas fa-arrow-left mr-2"></i>
                        戻る
                    </a>
                </div>
            </div>
        </header>

        <!-- メインコンテンツ -->
        <main class="container-custom section-spacing">
            <!-- 説明 -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div class="flex items-start gap-3">
                    <i class="fas fa-info-circle text-blue-600 text-xl mt-1"></i>
                    <div class="flex-1">
                        <h3 class="font-bold text-blue-900 mb-2">プラン設定について</h3>
                        <ul class="text-sm text-blue-800 space-y-1">
                            <li>• コミュニティのメンバー向けに独自のプランを作成できます</li>
                            <li>• 決済はプラットフォームが代行し、<strong>手数料20%を差し引いた金額</strong>がテナント収益となります</li>
                            <li>• 最低入金額（デフォルト¥10,000）に達すると入金処理が可能になります</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- プラン一覧 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold">
                        <i class="fas fa-list mr-2"></i>現在のプラン
                    </h2>
                    <button onclick="openCreateModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>新規プラン作成
                    </button>
                </div>

                <div id="plansList" class="space-y-4">
                    <p class="text-gray-600 text-center py-8">読み込み中...</p>
                </div>
            </div>
        </main>
    </div>

    <!-- プラン作成/編集モーダル -->
    <div id="planModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6 border-b border-gray-200">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-tag mr-2 text-primary-500"></i>
                        <span id="modalTitle">新規プラン作成</span>
                    </h2>
                    <button onclick="closePlanModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
            </div>
            
            <form id="planForm" class="p-6 space-y-4">
                <input type="hidden" id="planId" />
                
                <!-- プラン名 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        プラン名 <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="planName" required
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="例: ベーシック、プレミアム">
                </div>

                <!-- 説明 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        説明
                    </label>
                    <textarea id="planDescription" rows="3"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="プランの説明を入力してください"></textarea>
                </div>

                <!-- 月額料金 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        月額料金（円） <span class="text-red-500">*</span>
                    </label>
                    <input type="number" id="planPrice" required min="0"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="例: 980">
                    <p class="text-xs text-gray-500 mt-1">
                        <i class="fas fa-info-circle mr-1"></i>
                        テナント収益: <span id="tenantRevenue">¥0</span>（手数料20%差し引き後）
                    </p>
                </div>

                <!-- メンバー数上限 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        メンバー数上限
                    </label>
                    <input type="number" id="planMemberLimit" min="1"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="例: 100（空欄の場合は無制限）">
                </div>

                <!-- ストレージ上限 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        ストレージ上限（GB）
                    </label>
                    <input type="number" id="planStorageLimit" min="1"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="例: 10">
                </div>

                <!-- ボタン -->
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="closePlanModal()" class="flex-1 btn-ghost">
                        キャンセル
                    </button>
                    <button type="submit" class="flex-1 btn-primary">
                        <i class="fas fa-save mr-2"></i>
                        <span id="submitText">作成</span>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        const subdomain = '${subdomain}'
        let plans = []
        let currentEditingPlan = null

        // プラン一覧読み込み
        async function loadPlans() {
            try {
                const token = localStorage.getItem('token')
                const response = await axios.get('/api/tenant-plans', {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })

                if (response.data.success) {
                    plans = response.data.plans
                    renderPlans()
                }
            } catch (error) {
                console.error('Failed to load plans:', error)
                showToast('プラン一覧の読み込みに失敗しました', 'error')
            }
        }

        // プラン一覧表示
        function renderPlans() {
            const plansList = document.getElementById('plansList')
            
            if (plans.length === 0) {
                plansList.innerHTML = \`
                    <div class="text-center py-8">
                        <i class="fas fa-inbox text-gray-300 text-5xl mb-4"></i>
                        <p class="text-gray-600">まだプランがありません</p>
                        <p class="text-sm text-gray-500 mt-2">「新規プラン作成」ボタンから最初のプランを作成しましょう</p>
                    </div>
                \`
                return
            }

            plansList.innerHTML = plans.map(plan => {
                const price = plan.price || 0
                const tenantRevenue = Math.floor(price * 0.8)
                const platformFee = price - tenantRevenue
                
                return \`
                    <div class="border rounded-lg p-4 \${plan.is_active ? 'bg-white' : 'bg-gray-50'}">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <h3 class="text-lg font-bold">\${plan.name}</h3>
                                    <span class="badge \${plan.is_active ? 'badge-success' : 'badge-secondary'}">
                                        \${plan.is_active ? '有効' : '無効'}
                                    </span>
                                </div>
                                
                                \${plan.description ? \`<p class="text-sm text-gray-600 mb-3">\${plan.description}</p>\` : ''}
                                
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                    <div>
                                        <p class="text-xs text-gray-500">月額料金</p>
                                        <p class="font-bold text-primary-600">¥\${price.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-gray-500">テナント収益</p>
                                        <p class="font-bold text-green-600">¥\${tenantRevenue.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-gray-500">メンバー上限</p>
                                        <p class="font-bold">\${plan.member_limit || '無制限'}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-gray-500">ストレージ</p>
                                        <p class="font-bold">\${plan.storage_limit ? Math.round(plan.storage_limit / 1024 / 1024 / 1024) + 'GB' : '-'}</p>
                                    </div>
                                </div>
                                
                                <p class="text-xs text-gray-500">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    プラットフォーム手数料: ¥\${platformFee.toLocaleString()} (20%)
                                </p>
                            </div>
                            
                            <div class="flex gap-2 ml-4">
                                <button onclick="editPlan(\${plan.id})" class="btn-ghost p-2" title="編集">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="togglePlan(\${plan.id}, \${!plan.is_active})" 
                                    class="btn-ghost p-2" 
                                    title="\${plan.is_active ? '無効化' : '有効化'}">
                                    <i class="fas fa-\${plan.is_active ? 'eye-slash' : 'eye'}"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                \`
            }).join('')
        }

        // プラン作成モーダルを開く
        function openCreateModal() {
            currentEditingPlan = null
            document.getElementById('modalTitle').textContent = '新規プラン作成'
            document.getElementById('submitText').textContent = '作成'
            document.getElementById('planForm').reset()
            document.getElementById('planId').value = ''
            document.getElementById('tenantRevenue').textContent = '¥0'
            document.getElementById('planModal').classList.remove('hidden')
        }

        // プラン編集モーダルを開く
        function editPlan(planId) {
            const plan = plans.find(p => p.id === planId)
            if (!plan) return

            currentEditingPlan = plan
            document.getElementById('modalTitle').textContent = 'プラン編集'
            document.getElementById('submitText').textContent = '更新'
            document.getElementById('planId').value = plan.id
            document.getElementById('planName').value = plan.name
            document.getElementById('planDescription').value = plan.description || ''
            document.getElementById('planPrice').value = plan.price
            document.getElementById('planMemberLimit').value = plan.member_limit || ''
            document.getElementById('planStorageLimit').value = plan.storage_limit ? Math.round(plan.storage_limit / 1024 / 1024 / 1024) : ''
            
            updateTenantRevenue(plan.price)
            document.getElementById('planModal').classList.remove('hidden')
        }

        // モーダルを閉じる
        function closePlanModal() {
            document.getElementById('planModal').classList.add('hidden')
            currentEditingPlan = null
        }

        // テナント収益を計算して表示
        document.getElementById('planPrice').addEventListener('input', (e) => {
            updateTenantRevenue(parseInt(e.target.value) || 0)
        })

        function updateTenantRevenue(price) {
            const revenue = Math.floor(price * 0.8)
            document.getElementById('tenantRevenue').textContent = \`¥\${revenue.toLocaleString()}\`
        }

        // プラン作成/更新
        document.getElementById('planForm').addEventListener('submit', async (e) => {
            e.preventDefault()

            const planId = document.getElementById('planId').value
            const name = document.getElementById('planName').value
            const description = document.getElementById('planDescription').value
            const price = parseInt(document.getElementById('planPrice').value)
            const memberLimit = document.getElementById('planMemberLimit').value
            const storageLimit = document.getElementById('planStorageLimit').value

            const data = {
                name,
                description: description || null,
                price,
                member_limit: memberLimit ? parseInt(memberLimit) : null,
                storage_limit: storageLimit ? parseInt(storageLimit) * 1024 * 1024 * 1024 : null
            }

            try {
                const token = localStorage.getItem('token')
                let response

                if (planId) {
                    // 更新
                    response = await axios.patch(\`/api/tenant-plans/\${planId}\`, data, {
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    })
                    showToast('プランを更新しました', 'success')
                } else {
                    // 作成
                    response = await axios.post('/api/tenant-plans', data, {
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    })
                    showToast('プランを作成しました', 'success')
                }

                if (response.data.success) {
                    closePlanModal()
                    loadPlans()
                }
            } catch (error) {
                console.error('Plan save error:', error)
                showToast(error.response?.data?.error || 'プランの保存に失敗しました', 'error')
            }
        })

        // プラン有効/無効切り替え
        async function togglePlan(planId, isActive) {
            const action = isActive ? '有効化' : '無効化'
            if (!confirm(\`このプランを\${action}しますか？\`)) return

            try {
                const token = localStorage.getItem('token')
                const response = await axios.patch(\`/api/tenant-plans/\${planId}\`, {
                    is_active: isActive ? 1 : 0
                }, {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })

                if (response.data.success) {
                    showToast(\`プランを\${action}しました\`, 'success')
                    loadPlans()
                }
            } catch (error) {
                console.error('Toggle plan error:', error)
                showToast(\`プランの\${action}に失敗しました\`, 'error')
            }
        }

        // 初期化
        loadPlans()
    </script>
</body>
</html>
  `)
})

/**
 * GET /chat
 * チャットルーム一覧ページ
 */
tenantPublic.get('/chat', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.text('Subdomain required', 400)
  }
  
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first()
  
  if (!tenant) {
    return c.text('Tenant not found', 404)
  }

  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>チャット - ${tenant.name}</title>
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
                    <a href="/tenant/home?subdomain=${subdomain}" class="text-xl md:text-2xl font-bold text-primary">
                        ${tenant.name}
                    </a>
                </div>
                
                <nav id="desktopNav" class="hidden md:flex items-center space-x-6">
                    <!-- JavaScriptで動的に生成 -->
                </nav>
                
                <button id="mobileMenuToggle" class="md:hidden text-gray-600 hover:text-primary">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            
            <nav id="mobileMenu" class="md:hidden mt-4 pb-4 space-y-2 hidden">
                <!-- JavaScriptで動的に生成 -->
            </nav>
        </div>
    </header>
    
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold text-gray-900">
                <i class="fas fa-comments mr-3 text-primary"></i>
                チャット
            </h1>
            <button id="createRoomBtn" class="hidden px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-semibold shadow-md">
                <i class="fas fa-plus mr-2"></i>ルーム作成
            </button>
        </div>
        
        <!-- ローディング -->
        <div id="loading" class="text-center py-12">
            <i class="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
            <p class="text-gray-600">読み込み中...</p>
        </div>
        
        <!-- チャットルーム一覧 -->
        <div id="roomsList" class="hidden grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- JavaScriptで動的に生成 -->
        </div>
        
        <!-- 空の状態 -->
        <div id="emptyState" class="hidden text-center py-12">
            <i class="fas fa-comments text-6xl text-gray-300 mb-4"></i>
            <p class="text-xl text-gray-600 mb-2">チャットルームがありません</p>
            <p class="text-gray-500" id="emptyMessage">管理者がチャットルームを作成するとここに表示されます</p>
        </div>
    </div>
    
    <!-- チャットルーム作成モーダル -->
    <div id="createRoomModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6 border-b border-gray-200">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-plus-circle mr-2 text-primary"></i>
                        チャットルーム作成
                    </h2>
                    <button onclick="closeCreateRoomModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
            </div>
            
            <form id="createRoomForm" class="p-6 space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        ルーム名 <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="roomName" required maxlength="100"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        説明
                    </label>
                    <textarea id="roomDescription" rows="3" maxlength="500"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"></textarea>
                </div>
                
                <div>
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" id="isPrivate" checked class="w-4 h-4 text-primary">
                        <span class="text-sm text-gray-700">プライベート（招待されたメンバーのみ）</span>
                    </label>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        メンバーを招待
                    </label>
                    <div id="membersList" class="space-y-2 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-4">
                        <!-- JavaScriptで動的に生成 -->
                    </div>
                </div>
                
                <div class="flex gap-4 pt-4">
                    <button type="submit" class="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-semibold">
                        <i class="fas fa-check mr-2"></i>作成する
                    </button>
                    <button type="button" onclick="closeCreateRoomModal()" class="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
                        キャンセル
                    </button>
                </div>
            </form>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        let currentUser = null
        let allMembers = []
        
        // 認証チェック
        async function checkAuth() {
            const token = getToken()
            const user = JSON.parse(localStorage.getItem('user') || 'null')
            
            if (!token || !user) {
                window.location.href = '/login?subdomain=${subdomain}'
                return false
            }
            
            currentUser = user
            
            // 管理者の場合は作成ボタンを表示
            if (user.role === 'owner' || user.role === 'admin') {
                document.getElementById('createRoomBtn').classList.remove('hidden')
                document.getElementById('emptyMessage').textContent = 'ルーム作成ボタンから新しいチャットルームを作成できます'
            }
            
            // ナビゲーション更新
            updateNavigation(user)
            
            return true
        }
        
        // ナビゲーション更新
        function updateNavigation(user) {
            const isAdmin = user.role === 'owner' || user.role === 'admin'
            const desktopNav = document.getElementById('desktopNav')
            const mobileMenu = document.getElementById('mobileMenu')
            
            const navHTML = isAdmin ? \`
                <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-home mr-2"></i>ホーム
                </a>
                <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-users mr-2"></i>会員管理
                </a>
                <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-file-alt mr-2"></i>投稿管理
                </a>
                <a href="/tenant/chat?subdomain=${subdomain}" class="text-primary font-semibold">
                    <i class="fas fa-comments mr-2"></i>チャット
                </a>
                <button onclick="handleLogout()" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                </button>
            \` : \`
                <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-home mr-2"></i>ホーム
                </a>
                <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-newspaper mr-2"></i>投稿
                </a>
                <a href="/tenant/chat?subdomain=${subdomain}" class="text-primary font-semibold">
                    <i class="fas fa-comments mr-2"></i>チャット
                </a>
                <button onclick="handleLogout()" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                </button>
            \`
            
            if (desktopNav) desktopNav.innerHTML = navHTML
            if (mobileMenu) mobileMenu.innerHTML = navHTML.replace(/md:flex/g, 'block py-3')
        }
        
        // チャットルーム一覧読み込み
        async function loadRooms() {
            try {
                const token = getToken()
                const response = await axios.get('/api/chat/rooms', {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })
                
                document.getElementById('loading').classList.add('hidden')
                
                if (response.data.success && response.data.rooms.length > 0) {
                    renderRooms(response.data.rooms)
                    document.getElementById('roomsList').classList.remove('hidden')
                } else {
                    document.getElementById('emptyState').classList.remove('hidden')
                }
            } catch (error) {
                console.error('Failed to load rooms:', error)
                document.getElementById('loading').classList.add('hidden')
                document.getElementById('emptyState').classList.remove('hidden')
            }
        }
        
        // チャットルーム一覧描画
        function renderRooms(rooms) {
            const container = document.getElementById('roomsList')
            container.innerHTML = rooms.map(room => {
                const lastMessage = room.last_message ? room.last_message.substring(0, 50) + (room.last_message.length > 50 ? '...' : '') : 'メッセージはまだありません'
                const lastMessageTime = room.last_message_at ? new Date(room.last_message_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
                
                return \`
                    <a href="/tenant/chat/room?id=\${room.id}&subdomain=${subdomain}" 
                       class="block bg-white rounded-lg shadow-md hover:shadow-xl transition p-6 border-l-4 border-primary">
                        <div class="flex items-start justify-between mb-3">
                            <h3 class="text-xl font-bold text-gray-900 flex-1">
                                <i class="fas fa-comments text-primary mr-2"></i>
                                \${room.name}
                            </h3>
                            \${room.is_private ? '<span class="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full"><i class="fas fa-lock mr-1"></i>プライベート</span>' : ''}
                        </div>
                        
                        <p class="text-gray-600 text-sm mb-4 line-clamp-2">\${room.description || 'チャットルーム'}</p>
                        
                        <div class="flex items-center justify-between text-sm text-gray-500">
                            <div class="flex items-center space-x-4">
                                <span><i class="fas fa-users mr-1"></i>\${room.member_count}人</span>
                                <span><i class="fas fa-user mr-1"></i>\${room.creator_name}</span>
                            </div>
                            <span class="text-xs">\${lastMessageTime}</span>
                        </div>
                        
                        <div class="mt-3 pt-3 border-t border-gray-200">
                            <p class="text-sm text-gray-600 italic">\${lastMessage}</p>
                        </div>
                    </a>
                \`
            }).join('')
        }
        
        // チャットルーム作成モーダルを開く
        async function openCreateRoomModal() {
            document.getElementById('createRoomModal').classList.remove('hidden')
            await loadMembers()
        }
        
        // チャットルーム作成モーダルを閉じる
        function closeCreateRoomModal() {
            document.getElementById('createRoomModal').classList.add('hidden')
            document.getElementById('createRoomForm').reset()
        }
        
        // メンバー一覧読み込み
        async function loadMembers() {
            try {
                const token = getToken()
                const response = await axios.get('/api/admin/members?status=active', {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })
                
                if (response.data.success) {
                    allMembers = response.data.members
                    renderMembersList()
                }
            } catch (error) {
                console.error('Failed to load members:', error)
            }
        }
        
        // メンバー一覧描画
        function renderMembersList() {
            const container = document.getElementById('membersList')
            container.innerHTML = allMembers.map(member => \`
                <label class="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" name="memberIds" value="\${member.id}" class="w-4 h-4 text-primary">
                    <div class="flex items-center space-x-2 flex-1">
                        <img src="\${member.avatar_url || '/static/default-avatar.png'}" 
                             class="w-8 h-8 rounded-full" alt="">
                        <div>
                            <div class="font-medium text-gray-900">\${member.nickname}</div>
                            <div class="text-xs text-gray-500">\${member.email}</div>
                        </div>
                    </div>
                    <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">\${member.role === 'owner' ? 'オーナー' : member.role === 'admin' ? '管理者' : '一般'}</span>
                </label>
            \`).join('')
        }
        
        // チャットルーム作成フォーム送信
        document.getElementById('createRoomForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const name = document.getElementById('roomName').value
            const description = document.getElementById('roomDescription').value
            const isPrivate = document.getElementById('isPrivate').checked
            const memberCheckboxes = document.querySelectorAll('input[name="memberIds"]:checked')
            const memberIds = Array.from(memberCheckboxes).map(cb => parseInt(cb.value))
            
            try {
                const token = getToken()
                const response = await axios.post('/api/chat/rooms', {
                    name,
                    description,
                    isPrivate,
                    memberIds
                }, {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                })
                
                if (response.data.success) {
                    showToast('チャットルームを作成しました', 'success')
                    closeCreateRoomModal()
                    
                    // 一覧を再読み込み
                    document.getElementById('roomsList').classList.add('hidden')
                    document.getElementById('emptyState').classList.add('hidden')
                    document.getElementById('loading').classList.remove('hidden')
                    await loadRooms()
                }
            } catch (error) {
                console.error('Failed to create room:', error)
                showToast('チャットルームの作成に失敗しました', 'error')
            }
        })
        
        // イベントリスナー
        document.getElementById('createRoomBtn').addEventListener('click', openCreateRoomModal)
        
        document.getElementById('mobileMenuToggle').addEventListener('click', () => {
            document.getElementById('mobileMenu').classList.toggle('hidden')
        })
        
        // 初期化
        async function init() {
            const authOk = await checkAuth()
            if (authOk) {
                await loadRooms()
            }
        }
        
        init()
    </script>
</body>
</html>
  `)
})

/**
 * GET /forgot-password
 * パスワード忘れページ
 */

export default tenantPublic
