// ============================================
// テナント公開ページルート（Phase 3）
// 会員がアクセスするコミュニティページ
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'

const tenantPublic = new Hono<AppContext>()

// ============================================
// 共通ヘッダー・フッターのヘルパー関数
// ============================================

/**
 * 共通HTMLヘッド（CDNライブラリ）を生成
 */
function renderCommonScripts(): string {
  return `
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  `
}

/**
 * 統一ヘッダーHTMLを生成
 * @param tenantName - テナント名
 * @param subdomain - サブドメイン
 * @param activePage - アクティブなページ (home|posts|events|members|shop)
 */
function renderCommonHeader(tenantName: string, subdomain: string, activePage: string = ''): string {
  const isActive = (page: string) => activePage === page ? 'active' : ''
  
  return `
    <header class="commons-header">
        <div class="commons-header-inner">
            <a href="/tenant/home?subdomain=${subdomain}" class="commons-logo">
                <i class="fas fa-users"></i>
                <span>${tenantName}</span>
            </a>
            
            <nav class="commons-nav hidden md:flex">
                <a href="/tenant/home?subdomain=${subdomain}" class="commons-nav-link ${isActive('home')}">
                    <i class="fas fa-home mr-2"></i>ホーム
                </a>
                <a href="/tenant/posts?subdomain=${subdomain}" class="commons-nav-link ${isActive('posts')}">
                    <i class="fas fa-newspaper mr-2"></i>投稿
                </a>
                <a href="/tenant/events?subdomain=${subdomain}" class="commons-nav-link ${isActive('events')}">
                    <i class="fas fa-calendar-alt mr-2"></i>イベント
                </a>
                <a href="/tenant/members?subdomain=${subdomain}" class="commons-nav-link ${isActive('members')}">
                    <i class="fas fa-users mr-2"></i>メンバー
                </a>
                <a href="/tenant/chat?subdomain=${subdomain}" class="commons-nav-link ${isActive('chat')}">
                    <i class="fas fa-comments mr-2"></i>チャット
                </a>
                <a href="/tenant/shop?subdomain=${subdomain}" class="commons-nav-link ${isActive('shop')}">
                    <i class="fas fa-shopping-bag mr-2"></i>ショップ
                </a>
            </nav>
            
            <div class="commons-header-actions">
                <div class="relative" id="notificationMenuContainer">
                    <button id="notificationBtn" class="relative p-2 hover:bg-gray-100 rounded-full transition">
                        <i class="fas fa-bell text-xl" style="color: var(--commons-text-secondary);"></i>
                        <span id="notificationBadge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"></span>
                    </button>
                    <div id="notificationDropdown" class="hidden absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-100 z-50" style="max-height: 500px; overflow-y: auto;">
                        <div class="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                            <h3 class="font-bold" style="color: var(--commons-text-primary);">
                                <i class="fas fa-bell mr-2" style="color: var(--commons-primary);"></i>通知
                            </h3>
                            <a href="/tenant/notifications?subdomain=${subdomain}" class="text-sm" style="color: var(--commons-primary);">すべて見る</a>
                        </div>
                        <div id="notificationList" class="divide-y divide-gray-100">
                            <div class="p-8 text-center">
                                <i class="fas fa-spinner fa-spin text-2xl" style="color: var(--commons-text-secondary);"></i>
                                <p class="mt-2" style="color: var(--commons-text-secondary);">読み込み中...</p>
                            </div>
                        </div>
                    </div>
                </div>
                <button id="commonsMobileMenuBtn" class="commons-mobile-menu-btn md:hidden">
                    <i class="fas fa-bars"></i>
                </button>
                <a href="/login?subdomain=${subdomain}" class="hidden md:block px-6 py-2 rounded-full font-semibold transition" 
                   style="background: var(--commons-primary); color: white;">
                    ログイン
                </a>
            </div>
        </div>
    </header>

    <!-- モバイルメニュー -->
    <div id="commonsMobileMenuOverlay" class="commons-mobile-menu-overlay"></div>
    <div id="commonsMobileMenu" class="commons-mobile-menu">
        <div class="commons-mobile-menu-header">
            <h2 style="font-weight: var(--font-weight-bold); color: var(--commons-text-primary);">${tenantName}</h2>
            <button id="commonsMobileMenuClose" class="commons-mobile-menu-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <nav class="commons-mobile-nav">
            <a href="/tenant/home?subdomain=${subdomain}" class="commons-mobile-nav-link ${isActive('home')}">
                <i class="fas fa-home"></i>
                <span>ホーム</span>
            </a>
            <a href="/tenant/posts?subdomain=${subdomain}" class="commons-mobile-nav-link ${isActive('posts')}">
                <i class="fas fa-newspaper"></i>
                <span>投稿</span>
            </a>
            <a href="/tenant/events?subdomain=${subdomain}" class="commons-mobile-nav-link ${isActive('events')}">
                <i class="fas fa-calendar-alt"></i>
                <span>イベント</span>
            </a>
            <a href="/tenant/members?subdomain=${subdomain}" class="commons-mobile-nav-link ${isActive('members')}">
                <i class="fas fa-users"></i>
                <span>メンバー</span>
            </a>
            <a href="/tenant/chat?subdomain=${subdomain}" class="commons-mobile-nav-link ${isActive('chat')}">
                <i class="fas fa-comments"></i>
                <span>チャット</span>
            </a>
            <a href="/tenant/shop?subdomain=${subdomain}" class="commons-mobile-nav-link ${isActive('shop')}">
                <i class="fas fa-shopping-bag"></i>
                <span>ショップ</span>
            </a>
            <a href="/login?subdomain=${subdomain}" class="commons-mobile-nav-link" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--commons-border-light);">
                <i class="fas fa-sign-in-alt"></i>
                <span>ログイン</span>
            </a>
        </nav>
    </div>
  `
}

/**
 * 統一フッターHTMLを生成
 * @param tenantName - テナント名
 * @param subdomain - サブドメイン
 */
function renderCommonFooter(tenantName: string, subdomain: string): string {
  return `
    <footer style="background: var(--commons-text-primary); color: white; padding: 64px 24px 32px; margin-top: 96px;">
        <div style="max-width: 1280px; margin: 0 auto; text-align: center;">
            <h2 style="font-size: var(--font-size-large); font-weight: var(--font-weight-bold); margin-bottom: 16px;">${tenantName}</h2>
            <div style="display: flex; justify-content: center; gap: 32px; margin-bottom: 32px; flex-wrap: wrap;">
                <a href="/tenant/home?subdomain=${subdomain}" style="color: rgba(255,255,255,0.7); text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='var(--commons-primary)'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">ホーム</a>
                <a href="/tenant/posts?subdomain=${subdomain}" style="color: rgba(255,255,255,0.7); text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='var(--commons-primary)'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">投稿</a>
                <a href="/tenant/events?subdomain=${subdomain}" style="color: rgba(255,255,255,0.7); text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='var(--commons-primary)'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">イベント</a>
                <a href="/tenant/members?subdomain=${subdomain}" style="color: rgba(255,255,255,0.7); text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='var(--commons-primary)'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">メンバー</a>
                <a href="/tenant/shop?subdomain=${subdomain}" style="color: rgba(255,255,255,0.7); text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='var(--commons-primary)'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">ショップ</a>
            </div>
            <p style="color: rgba(255,255,255,0.5); font-size: var(--font-size-small); margin-top: 32px;">
                &copy; ${new Date().getFullYear()} ${tenantName}. All rights reserved.
            </p>
            <p style="color: rgba(255,255,255,0.3); font-size: var(--font-size-xsmall); margin-top: 8px;">
                Powered by <span style="color: var(--commons-primary); font-weight: var(--font-weight-bold);">Commons</span>
            </p>
        </div>
    </footer>
  `
}

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
        <script src="/static/tailwind-config.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/commons-theme.css" rel="stylesheet">
        <link href="/static/commons-components.css" rel="stylesheet">
        <style>
            .auth-container {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }
            
            .auth-card {
                background: white;
                border-radius: 24px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                padding: 48px;
                max-width: 480px;
                width: 100%;
                margin: 24px;
                position: relative;
                z-index: 10;
                animation: fadeInUp 0.6s ease-out;
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .auth-header {
                text-align: center;
                margin-bottom: 32px;
            }
            
            .auth-logo {
                width: 80px;
                height: 80px;
                margin: 0 auto 24px;
                background: var(--commons-primary);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                color: white;
                box-shadow: 0 8px 24px rgba(0, 188, 212, 0.3);
            }
            
            .auth-title {
                font-size: 32px;
                font-weight: 700;
                color: var(--commons-text-primary);
                margin-bottom: 8px;
            }
            
            .auth-subtitle {
                font-size: 16px;
                color: var(--commons-text-secondary);
            }
            
            .form-group {
                margin-bottom: 24px;
            }
            
            .form-label {
                display: block;
                font-size: 14px;
                font-weight: 600;
                color: var(--commons-text-primary);
                margin-bottom: 8px;
            }
            
            .form-input {
                width: 100%;
                padding: 14px 16px;
                border: 2px solid var(--commons-border-light);
                border-radius: 12px;
                font-size: 16px;
                transition: all 0.3s ease;
                background: white;
            }
            
            .form-input:focus {
                outline: none;
                border-color: var(--commons-primary);
                box-shadow: 0 0 0 4px rgba(0, 188, 212, 0.1);
            }
            
            .btn-primary {
                width: 100%;
                padding: 16px;
                background: var(--commons-primary);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
            }
            
            .btn-primary:hover {
                background: #00a5bb;
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 188, 212, 0.4);
            }
            
            .btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            .btn-secondary {
                width: 100%;
                padding: 16px;
                background: white;
                color: var(--commons-primary);
                border: 2px solid var(--commons-primary);
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
                text-align: center;
            }
            
            .btn-secondary:hover {
                background: var(--commons-bg-secondary);
            }
            
            .divider {
                position: relative;
                text-align: center;
                margin: 32px 0;
            }
            
            .divider::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: 1px;
                background: var(--commons-border-light);
            }
            
            .divider span {
                position: relative;
                background: white;
                padding: 0 16px;
                color: var(--commons-text-secondary);
                font-size: 14px;
            }
            
            .checkbox-wrapper {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 24px;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                font-size: 14px;
                color: var(--commons-text-secondary);
            }
            
            .checkbox-label input {
                margin-right: 8px;
            }
            
            .link {
                color: var(--commons-primary);
                text-decoration: none;
                font-size: 14px;
                transition: color 0.3s ease;
            }
            
            .link:hover {
                color: #00a5bb;
            }
            
            .back-link {
                text-align: center;
                margin-top: 24px;
            }
            
            /* Background shapes */
            .bg-shape {
                position: absolute;
                border-radius: 50%;
                opacity: 0.15;
                z-index: 1;
                animation: float 20s infinite ease-in-out;
            }
            
            .bg-shape-1 {
                width: 400px;
                height: 400px;
                background: var(--commons-accent-purple);
                top: -100px;
                left: -100px;
            }
            
            .bg-shape-2 {
                width: 300px;
                height: 300px;
                background: var(--commons-accent-terracotta);
                bottom: -80px;
                left: -80px;
                animation-delay: -5s;
            }
            
            .bg-shape-3 {
                width: 350px;
                height: 350px;
                background: var(--commons-accent-cyan);
                top: -120px;
                right: -120px;
                animation-delay: -10s;
            }
            
            .bg-shape-4 {
                width: 280px;
                height: 280px;
                background: var(--commons-accent-lime);
                bottom: -100px;
                right: -100px;
                animation-delay: -15s;
            }
            
            @keyframes float {
                0%, 100% {
                    transform: translate(0, 0) scale(1);
                }
                25% {
                    transform: translate(10px, -10px) scale(1.05);
                }
                50% {
                    transform: translate(-10px, 10px) scale(0.95);
                }
                75% {
                    transform: translate(10px, 10px) scale(1.02);
                }
            }
            
            @media (max-width: 768px) {
                .auth-card {
                    padding: 32px 24px;
                }
                
                .auth-title {
                    font-size: 28px;
                }
                
                .bg-shape {
                    display: none;
                }
            }
        </style>
    </head>
    <body>
        <div class="auth-container">
            <!-- Background shapes -->
            <div class="bg-shape bg-shape-1"></div>
            <div class="bg-shape bg-shape-2"></div>
            <div class="bg-shape bg-shape-3"></div>
            <div class="bg-shape bg-shape-4"></div>
            
            <!-- Login Card -->
            <div class="auth-card">
                    <div class="auth-header">
                        <div class="auth-logo">
                            <i class="fas fa-sign-in-alt"></i>
                        </div>
                        <h1 class="auth-title">ログイン</h1>
                        <p class="auth-subtitle">${tenant.name}へようこそ</p>
                    </div>

                    <!-- Login Form -->
                    <form id="loginForm" onsubmit="return false;">
                        <div class="form-group">
                            <label for="email" class="form-label">
                                <i class="fas fa-envelope mr-1"></i> メールアドレス
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                class="form-input"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div class="form-group">
                            <label for="password" class="form-label">
                                <i class="fas fa-lock mr-1"></i> パスワード
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                required
                                minlength="8"
                                class="form-input"
                                placeholder="••••••••"
                            />
                        </div>

                        <div class="checkbox-wrapper">
                            <label class="checkbox-label">
                                <input type="checkbox" id="remember" name="remember">
                                <span>ログイン状態を保持</span>
                            </label>
                            <a href="/forgot-password" class="link">
                                パスワードを忘れた場合
                            </a>
                        </div>

                        <button
                            type="submit"
                            id="loginBtn"
                            class="btn-primary"
                        >
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            ログイン
                        </button>
                    </form>

                    <div class="divider">
                        <span>または</span>
                    </div>

                    <div style="text-align: center; margin-bottom: 16px;">
                        <p style="color: var(--commons-text-secondary); margin-bottom: 16px;">まだアカウントをお持ちでない方</p>
                        <a href="/register?subdomain=${subdomain}" class="btn-secondary">
                            <i class="fas fa-user-plus mr-2"></i>
                            新規登録
                        </a>
                    </div>
                    
                    <div class="back-link">
                        <a href="/home?subdomain=${subdomain}" class="link">
                            <i class="fas fa-arrow-left mr-1"></i>
                            ホームに戻る
                        </a>
                    </div>
                </div>
        </div>

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
            const loginForm = document.getElementById('loginForm');
            console.log('[Login Page] Login form element:', loginForm);
            console.log('[Login Page] Registering submit event listener...');
            
            loginForm.addEventListener('submit', async (e) => {
                console.log('[Login Page] ===== FORM SUBMIT EVENT FIRED =====');
                console.log('[Login Page] Event:', e);
                e.preventDefault();
                console.log('[Login Page] Default prevented');

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
                        console.log('[Login] ===== LOGIN SUCCESS =====');
                        console.log('[Login] Full response data:', response.data);
                        console.log('[Login] User object:', response.data.user);
                        console.log('[Login] Membership object:', response.data.membership);
                        
                        // Store token and user data
                        localStorage.setItem('token', response.data.token);
                        localStorage.setItem('user', JSON.stringify(response.data.user));
                        
                        // Store membership data if available
                        if (response.data.membership) {
                            localStorage.setItem('membership', JSON.stringify(response.data.membership));
                            console.log('[Login] Stored membership data:', response.data.membership);
                        }

                        // 役割に応じてリダイレクト
                        const user = response.data.user;
                        const membership = response.data.membership;
                        const userRole = user.role || membership?.role;
                        
                        console.log('[Login] user.role:', user.role);
                        console.log('[Login] membership.role:', membership?.role);
                        console.log('[Login] Final determined userRole:', userRole);
                        console.log('[Login] Type of userRole:', typeof userRole);
                        console.log('[Login] userRole === "owner":', userRole === 'owner');
                        console.log('[Login] userRole === "admin":', userRole === 'admin');
                        
                        // トーストを表示
                        showToast('ログインに成功しました', 'success');
                        
                        // 役割チェックとリダイレクト
                        if (userRole === 'owner') {
                            console.log('[Login] ✅ User is OWNER - Redirecting to /dashboard');
                            console.log('[Login] About to execute: window.location.href = "/dashboard"');
                            window.location.href = '/dashboard';
                            console.log('[Login] Redirect command executed');
                        } else if (userRole === 'admin') {
                            console.log('[Login] ✅ User is ADMIN - Redirecting to /dashboard');
                            console.log('[Login] About to execute: window.location.href = "/dashboard"');
                            window.location.href = '/dashboard';
                            console.log('[Login] Redirect command executed');
                        } else {
                            console.log('[Login] ❌ User is MEMBER - Redirecting to /tenant/home');
                            console.log('[Login] About to execute: window.location.href = "/tenant/home?subdomain=" + subdomain');
                            window.location.href = '/tenant/home?subdomain=' + subdomain;
                            console.log('[Login] Redirect command executed');
                        }
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
            
            console.log('[Login Page] Event listener registered successfully');
            console.log('[Login Page] Page initialization complete');
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">コミュニティが見つかりません</h1>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  
  // アクティブな入会時アンケートを取得
  const survey = await c.env.DB.prepare(`
    SELECT * FROM surveys 
    WHERE tenant_id = ? AND survey_type = 'join' AND is_active = 1
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(tenant.id).first()
  
  let surveyQuestions: any[] = []
  if (survey) {
    const questions = await c.env.DB.prepare(`
      SELECT * FROM survey_questions 
      WHERE survey_id = ? 
      ORDER BY question_order ASC
    `).bind(survey.id).all()
    surveyQuestions = questions.results || []
  }
  
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>会員登録 - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
    <style>
        .auth-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        .auth-card {
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            padding: 48px;
            max-width: 520px;
            width: 100%;
            margin: 24px;
            position: relative;
            z-index: 10;
            animation: fadeInUp 0.6s ease-out;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .auth-header {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .auth-logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
            background: var(--commons-primary);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            color: white;
            box-shadow: 0 8px 24px rgba(0, 188, 212, 0.3);
        }
        
        .auth-title {
            font-size: 32px;
            font-weight: 700;
            color: var(--commons-text-primary);
            margin-bottom: 8px;
        }
        
        .auth-subtitle {
            font-size: 16px;
            color: var(--commons-text-secondary);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: var(--commons-text-primary);
            margin-bottom: 8px;
        }
        
        .form-input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid var(--commons-border-light);
            border-radius: 12px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: white;
        }
        
        .form-input:focus {
            outline: none;
            border-color: var(--commons-primary);
            box-shadow: 0 0 0 4px rgba(0, 188, 212, 0.1);
        }
        
        .btn-primary {
            width: 100%;
            padding: 16px;
            background: var(--commons-primary);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
            margin-top: 24px;
        }
        
        .btn-primary:hover {
            background: #00a5bb;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 188, 212, 0.4);
        }
        
        .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .divider {
            position: relative;
            text-align: center;
            margin: 24px 0;
        }
        
        .divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: var(--commons-border-light);
        }
        
        .divider span {
            position: relative;
            background: white;
            padding: 0 16px;
            color: var(--commons-text-secondary);
            font-size: 14px;
        }
        
        .link {
            color: var(--commons-primary);
            text-decoration: none;
            font-size: 14px;
            transition: color 0.3s ease;
        }
        
        .link:hover {
            color: #00a5bb;
        }
        
        .back-link {
            text-align: center;
            margin-top: 24px;
        }
        
        /* Background shapes */
        .bg-shape {
            position: absolute;
            border-radius: 50%;
            opacity: 0.15;
            z-index: 1;
            animation: float 20s infinite ease-in-out;
        }
        
        .bg-shape-1 {
            width: 400px;
            height: 400px;
            background: var(--commons-accent-purple);
            top: -100px;
            left: -100px;
        }
        
        .bg-shape-2 {
            width: 300px;
            height: 300px;
            background: var(--commons-accent-terracotta);
            bottom: -80px;
            left: -80px;
            animation-delay: -5s;
        }
        
        .bg-shape-3 {
            width: 350px;
            height: 350px;
            background: var(--commons-accent-cyan);
            top: -120px;
            right: -120px;
            animation-delay: -10s;
        }
        
        .bg-shape-4 {
            width: 280px;
            height: 280px;
            background: var(--commons-accent-lime);
            bottom: -100px;
            right: -100px;
            animation-delay: -15s;
        }
        
        @keyframes float {
            0%, 100% {
                transform: translate(0, 0) scale(1);
            }
            25% {
                transform: translate(10px, -10px) scale(1.05);
            }
            50% {
                transform: translate(-10px, 10px) scale(0.95);
            }
            75% {
                transform: translate(10px, 10px) scale(1.02);
            }
        }
        
        @media (max-width: 768px) {
            .auth-card {
                padding: 32px 24px;
            }
            
            .auth-title {
                font-size: 28px;
            }
            
            .bg-shape {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <!-- Background shapes -->
        <div class="bg-shape bg-shape-1"></div>
        <div class="bg-shape bg-shape-2"></div>
        <div class="bg-shape bg-shape-3"></div>
        <div class="bg-shape bg-shape-4"></div>
        
        <!-- Register Card -->
        <div class="auth-card">
            <div class="auth-header">
                <div class="auth-logo">
                    <i class="fas fa-user-plus"></i>
                </div>
                <h1 class="auth-title">会員登録</h1>
                <p class="auth-subtitle">${tenantName}に参加しましょう</p>
            </div>

            <form id="registerForm">
                <div class="form-group">
                    <label for="nickname" class="form-label">
                        <i class="fas fa-user mr-1"></i> ニックネーム <span style="color: #ef4444;">*</span>
                    </label>
                    <input 
                        type="text" 
                        id="nickname" 
                        name="nickname" 
                        required
                        maxlength="50"
                        class="form-input"
                        placeholder="山田太郎"
                    >
                </div>

                <div class="form-group">
                    <label for="email" class="form-label">
                        <i class="fas fa-envelope mr-1"></i> メールアドレス <span style="color: #ef4444;">*</span>
                    </label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        required
                        class="form-input"
                        placeholder="your@example.com"
                    >
                </div>

                <div class="form-group">
                    <label for="password" class="form-label">
                        <i class="fas fa-lock mr-1"></i> パスワード <span style="color: #ef4444;">*</span>
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required
                        minlength="8"
                        class="form-input"
                        placeholder="••••••••"
                    >
                    <p style="font-size: 12px; color: var(--commons-text-secondary); margin-top: 4px;">8文字以上</p>
                </div>

                <div class="form-group">
                    <label for="passwordConfirm" class="form-label">
                        <i class="fas fa-lock mr-1"></i> パスワード（確認） <span style="color: #ef4444;">*</span>
                    </label>
                    <input 
                        type="password" 
                        id="passwordConfirm" 
                        name="passwordConfirm" 
                        required
                        minlength="8"
                        class="form-input"
                        placeholder="••••••••"
                    >
                </div>

                <div class="form-group">
                    <label for="bio" class="form-label">
                        <i class="fas fa-comment mr-1"></i> 自己紹介（任意）
                    </label>
                    <textarea 
                        id="bio" 
                        name="bio"
                        rows="3"
                        maxlength="500"
                        class="form-input"
                        style="resize: vertical;"
                        placeholder="簡単な自己紹介をお願いします"
                    ></textarea>
                    <p style="font-size: 12px; color: var(--commons-text-secondary); margin-top: 4px;">最大500文字</p>
                </div>

                ${surveyQuestions.length > 0 ? `
                    <!-- アンケート -->
                    <div style="margin-top: 32px; padding-top: 32px; border-top: 2px solid var(--commons-border-light);">
                        <h3 style="font-size: 18px; font-weight: 700; color: var(--commons-text-primary); margin-bottom: 16px;">
                            <i class="fas fa-clipboard-list mr-2"></i>${survey.title || 'アンケート'}
                        </h3>
                        ${survey.description ? `
                            <p style="font-size: 14px; color: var(--commons-text-secondary); margin-bottom: 24px;">
                                ${survey.description}
                            </p>
                        ` : ''}
                        
                        ${surveyQuestions.map((q: any) => {
                            const requiredMark = q.is_required ? '<span style="color: #ef4444;">*</span>' : ''
                            const questionId = `survey_q_${q.id}`
                            
                            if (q.question_type === 'text') {
                                return `
                                    <div class="form-group">
                                        <label for="${questionId}" class="form-label">
                                            ${q.question_text} ${requiredMark}
                                        </label>
                                        <input 
                                            type="text" 
                                            id="${questionId}" 
                                            name="${questionId}"
                                            ${q.is_required ? 'required' : ''}
                                            class="form-input"
                                            placeholder="${q.placeholder || ''}"
                                        >
                                    </div>
                                `
                            } else if (q.question_type === 'textarea') {
                                return `
                                    <div class="form-group">
                                        <label for="${questionId}" class="form-label">
                                            ${q.question_text} ${requiredMark}
                                        </label>
                                        <textarea 
                                            id="${questionId}" 
                                            name="${questionId}"
                                            rows="3"
                                            ${q.is_required ? 'required' : ''}
                                            class="form-input"
                                            style="resize: vertical;"
                                            placeholder="${q.placeholder || ''}"
                                        ></textarea>
                                    </div>
                                `
                            } else if (q.question_type === 'radio') {
                                const options = q.options ? JSON.parse(q.options) : []
                                return `
                                    <div class="form-group">
                                        <label class="form-label">
                                            ${q.question_text} ${requiredMark}
                                        </label>
                                        <div style="margin-top: 8px;">
                                            ${options.map((opt: string, idx: number) => `
                                                <div style="margin-bottom: 8px;">
                                                    <label style="display: flex; align-items: center; cursor: pointer;">
                                                        <input 
                                                            type="radio" 
                                                            name="${questionId}" 
                                                            value="${opt}"
                                                            ${q.is_required ? 'required' : ''}
                                                            style="margin-right: 8px;"
                                                        >
                                                        <span style="color: var(--commons-text-primary);">${opt}</span>
                                                    </label>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `
                            } else if (q.question_type === 'checkbox') {
                                const options = q.options ? JSON.parse(q.options) : []
                                return `
                                    <div class="form-group">
                                        <label class="form-label">
                                            ${q.question_text} ${requiredMark}
                                        </label>
                                        <div style="margin-top: 8px;">
                                            ${options.map((opt: string, idx: number) => `
                                                <div style="margin-bottom: 8px;">
                                                    <label style="display: flex; align-items: center; cursor: pointer;">
                                                        <input 
                                                            type="checkbox" 
                                                            name="${questionId}" 
                                                            value="${opt}"
                                                            ${q.is_required && idx === 0 ? 'required' : ''}
                                                            style="margin-right: 8px;"
                                                        >
                                                        <span style="color: var(--commons-text-primary);">${opt}</span>
                                                    </label>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `
                            } else if (q.question_type === 'scale') {
                                const scaleMin = q.scale_min || 1
                                const scaleMax = q.scale_max || 5
                                const scaleOptions = Array.from({length: scaleMax - scaleMin + 1}, (_, i) => scaleMin + i)
                                return `
                                    <div class="form-group">
                                        <label class="form-label">
                                            ${q.question_text} ${requiredMark}
                                        </label>
                                        <div style="margin-top: 8px; display: flex; gap: 12px; flex-wrap: wrap;">
                                            ${scaleOptions.map((val: number) => `
                                                <label style="display: flex; align-items: center; cursor: pointer;">
                                                    <input 
                                                        type="radio" 
                                                        name="${questionId}" 
                                                        value="${val}"
                                                        ${q.is_required ? 'required' : ''}
                                                        style="margin-right: 4px;"
                                                    >
                                                    <span style="color: var(--commons-text-primary);">${val}</span>
                                                </label>
                                            `).join('')}
                                        </div>
                                        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: var(--commons-text-secondary);">
                                            <span>${q.scale_label_min || ''}</span>
                                            <span>${q.scale_label_max || ''}</span>
                                        </div>
                                    </div>
                                `
                            }
                            return ''
                        }).join('')}
                    </div>
                ` : ''}

                <button 
                    type="submit" 
                    id="submitBtn"
                    class="btn-primary"
                >
                    <i class="fas fa-user-plus mr-2"></i>会員申請を送信
                </button>
            </form>

            <div class="divider">
                <span>または</span>
            </div>

            <div style="text-align: center; margin-bottom: 16px;">
                <p style="color: var(--commons-text-secondary); margin-bottom: 8px;">
                    すでにアカウントをお持ちですか？
                </p>
                <a href="/login?subdomain=${subdomain}" class="link" style="font-weight: 600; font-size: 16px;">
                    ログイン
                </a>
            </div>

            <div class="back-link">
                <a href="/tenant/home?subdomain=${subdomain}" class="link">
                    <i class="fas fa-arrow-left mr-1"></i>ホームに戻る
                </a>
            </div>
            
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--commons-border-light); text-align: center;">
                <p style="font-size: 13px; color: var(--commons-text-secondary); margin-bottom: 4px;">会員申請後、管理者の承認をお待ちください。</p>
                <p style="font-size: 13px; color: var(--commons-text-secondary);">承認されるとメールでお知らせします。</p>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        const registerForm = document.getElementById('registerForm')
        const submitBtn = document.getElementById('submitBtn')
        
        // Survey data
        const surveyId = ${survey ? survey.id : 'null'}
        const surveyQuestions = ${JSON.stringify(surveyQuestions)}
        
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
            
            // アンケート回答を収集
            let surveyResponses = []
            if (surveyId && surveyQuestions.length > 0) {
                for (const question of surveyQuestions) {
                    const questionId = 'survey_q_' + question.id
                    let answer = null
                    
                    if (question.question_type === 'checkbox') {
                        // チェックボックス: 複数選択
                        const checkboxes = document.querySelectorAll('input[name="' + questionId + '"]:checked')
                        const values = Array.from(checkboxes).map(cb => cb.value)
                        answer = values.join(', ')
                    } else {
                        // その他: 単一値
                        const element = document.querySelector('input[name="' + questionId + '"], textarea[name="' + questionId + '"]')
                        answer = element ? element.value : null
                    }
                    
                    // 必須チェック
                    if (question.is_required && (!answer || answer.trim() === '')) {
                        showToast('アンケートの必須項目を入力してください: ' + question.question_text, 'error')
                        return
                    }
                    
                    surveyResponses.push({
                        question_id: question.id,
                        answer: answer
                    })
                }
            }
            
            try {
                submitBtn.disabled = true
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>送信中...'
                
                const response = await axios.post('/api/tenant/register', {
                    subdomain: '${subdomain}',
                    nickname: nickname.trim(),
                    email: email.trim(),
                    password: password,
                    bio: bio?.trim() || null,
                    survey_responses: surveyResponses
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>承認待ち - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
// テナントホームページ（統一デザイン適用）
// --------------------------------------------
tenantPublic.get('/home', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.text('Subdomain is required', 400)
  }
  
  // テナント情報を取得
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first() as any
  
  if (!tenant) {
    return c.text('Tenant not found', 404)
  }
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  
  // 最新投稿を取得（6件）
  const postsResult = await DB.prepare(`
    SELECT p.*, u.nickname as author_name,
           (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.tenant_id = ? AND p.status = ?
    ORDER BY p.created_at DESC
    LIMIT 6
  `).bind(tenant.id, 'published').all()
  
  const posts = postsResult.results || []
  
  // 今後のイベントを取得（3件）
  const eventsResult = await DB.prepare(`
    SELECT *
    FROM events
    WHERE tenant_id = ? AND is_published = 1
    AND start_datetime >= datetime('now')
    ORDER BY start_datetime ASC
    LIMIT 3
  `).bind(tenant.id).all()
  
  const events = eventsResult.results || []
  
  // 統計情報を取得
  const memberResult = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM tenant_memberships
    WHERE tenant_id = ? AND status = ?
  `).bind(tenant.id, 'active').first()
  
  const memberCount = Number(memberResult?.count || 0)
  
  const postCountResult = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM posts
    WHERE tenant_id = ? AND status = ?
  `).bind(tenant.id, 'published').first()
  
  const postCount = Number(postCountResult?.count || 0)
  
  const eventCountResult = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM events
    WHERE tenant_id = ? AND is_published = 1 AND start_datetime >= datetime('now')
  `).bind(tenant.id).first()
  
  const eventCount = Number(eventCountResult?.count || 0)
  
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tenantName} - ホーム</title>
    ${renderCommonScripts()}
</head>
<body style="background: var(--commons-bg-light);">
    <!-- ヘッダー -->
    ${renderCommonHeader(tenantName, subdomain, 'home')}

    <!-- ヒーローセクション -->
    <section style="background: linear-gradient(135deg, var(--commons-primary) 0%, var(--commons-primary-dark) 100%); color: white; padding: 40px 24px 32px;">
        <div style="max-width: 1280px; margin: 0 auto;">
            <h1 style="font-size: var(--font-size-hero); font-weight: var(--font-weight-bold); line-height: var(--line-height-tight); margin-bottom: 12px;">
                ${tenantName}
            </h1>
            ${tenantSubtitle ? `<p style="font-size: var(--font-size-medium); color: rgba(255,255,255,0.9);">${tenantSubtitle}</p>` : ''}
        </div>
    </section>

    <!-- メインコンテンツ -->
    <main style="max-width: 1280px; margin: 0 auto; padding: 64px 24px;">
        <!-- 最新投稿セクション -->
        <section style="margin-bottom: 96px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px;">
                <div>
                    <h2 style="font-size: var(--font-size-large); font-weight: var(--font-weight-bold); color: var(--commons-text-primary); margin-bottom: 8px;">
                        <i class="fas fa-fire" style="color: var(--commons-accent-yellow); margin-right: 12px;"></i>
                        最新投稿
                    </h2>
                    <p style="color: var(--commons-text-secondary); font-size: var(--font-size-small);">コミュニティの新着コンテンツ</p>
                </div>
                <a href="/tenant/posts?subdomain=${subdomain}" 
                   style="color: var(--commons-primary); font-weight: var(--font-weight-semibold); text-decoration: none; display: flex; align-items: center; gap: 8px;">
                    すべて見る
                    <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 32px;">
                ${posts.length === 0 ? `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 80px 24px; background: white; border-radius: var(--radius-lg);">
                        <i class="fas fa-inbox" style="font-size: 64px; color: var(--commons-text-tertiary); margin-bottom: 24px;"></i>
                        <p style="color: var(--commons-text-secondary); font-size: var(--font-size-medium);">まだ投稿がありません</p>
                    </div>
                ` : posts.map((post: any) => {
                    const postTitle = String(post.title || '')
                    const postContent = String(post.content || '')
                    const postExcerpt = String(post.excerpt || postContent.substring(0, 120))
                    const authorName = String(post.author_name || '不明')
                    const thumbnailUrl = String(post.thumbnail_url || '')
                    const likeCount = Number(post.like_count || 0)
                    const viewCount = Number(post.view_count || 0)
                    const createdDate = new Date(String(post.created_at))
                    const now = new Date()
                    const diffHours = Math.floor((now.getTime() - createdDate.getTime()) / 3600000)
                    const isNew = diffHours < 24
                    
                    return `
                        <a href="/tenant/posts/${post.id}?subdomain=${subdomain}" 
                           style="display: block; background: white; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-soft); transition: all var(--transition-normal); text-decoration: none; position: relative;"
                           onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='var(--shadow-card)'"
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-soft)'">
                            ${isNew ? '<div style="position: absolute; top: 16px; right: 16px; background: var(--commons-accent-yellow); color: white; padding: 6px 16px; border-radius: var(--radius-full); font-size: var(--font-size-xsmall); font-weight: var(--font-weight-bold); z-index: 10;">NEW</div>' : ''}
                            
                            ${thumbnailUrl ? `
                                <div style="width: 100%; height: 240px; overflow: hidden;">
                                    <img data-src="${thumbnailUrl}" 
                                         alt="${postTitle}" 
                                         style="width: 100%; height: 100%; object-fit: cover; transition: transform var(--transition-slow);"
                                         onmouseover="this.style.transform='scale(1.05)'"
                                         onmouseout="this.style.transform='scale(1)'"
                                         loading="lazy">
                                </div>
                            ` : `
                                <div style="width: 100%; height: 240px; background: linear-gradient(135deg, var(--commons-bg-cyan) 0%, var(--commons-primary) 100%); display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-file-alt" style="font-size: 80px; color: rgba(255,255,255,0.3);"></i>
                                </div>
                            `}
                            
                            <div style="padding: 24px;">
                                <h3 style="font-size: var(--font-size-medium); font-weight: var(--font-weight-bold); color: var(--commons-text-primary); margin-bottom: 12px; line-height: var(--line-height-tight); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                    ${postTitle}
                                </h3>
                                <p style="color: var(--commons-text-secondary); font-size: var(--font-size-small); line-height: var(--line-height-normal); margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                                    ${postExcerpt}
                                </p>
                                
                                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--commons-border-light);">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--commons-primary-light); display: flex; align-items: center; justify-content: center; color: var(--commons-primary); font-weight: var(--font-weight-bold); font-size: var(--font-size-small);">
                                            ${authorName.charAt(0).toUpperCase()}
                                        </div>
                                        <span style="color: var(--commons-text-secondary); font-size: var(--font-size-small);">${authorName}</span>
                                    </div>
                                    <div style="display: flex; gap: 16px; color: var(--commons-text-tertiary); font-size: var(--font-size-small);">
                                        <span><i class="far fa-heart" style="margin-right: 4px;"></i>${likeCount}</span>
                                        <span><i class="far fa-eye" style="margin-right: 4px;"></i>${viewCount}</span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    `
                }).join('')}
            </div>
        </section>

        <!-- 今後のイベントセクション -->
        ${events.length > 0 ? `
        <section style="margin-bottom: 96px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px;">
                <div>
                    <h2 style="font-size: var(--font-size-large); font-weight: var(--font-weight-bold); color: var(--commons-text-primary); margin-bottom: 8px;">
                        <i class="fas fa-calendar-alt" style="color: var(--commons-primary); margin-right: 12px;"></i>
                        今後のイベント
                    </h2>
                    <p style="color: var(--commons-text-secondary); font-size: var(--font-size-small);">参加予定のイベント</p>
                </div>
                <a href="/tenant/events?subdomain=${subdomain}" 
                   style="color: var(--commons-primary); font-weight: var(--font-weight-semibold); text-decoration: none; display: flex; align-items: center; gap: 8px;">
                    すべて見る
                    <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            
            <div style="display: grid; gap: 24px;">
                ${events.map((event: any) => {
                    const eventTitle = String(event.title || '')
                    const eventDescription = String(event.description || '')
                    const locationName = String(event.location_name || '')
                    const startDate = new Date(String(event.start_datetime))
                    const formattedDate = startDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    
                    return `
                        <a href="/tenant/events?subdomain=${subdomain}" 
                           style="display: flex; gap: 24px; background: white; padding: 32px; border-radius: var(--radius-lg); box-shadow: var(--shadow-soft); transition: all var(--transition-normal); text-decoration: none;"
                           onmouseover="this.style.transform='translateX(8px)'; this.style.boxShadow='var(--shadow-medium)'"
                           onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='var(--shadow-soft)'">
                            <div style="flex-shrink: 0; width: 120px; height: 120px; background: linear-gradient(135deg, var(--commons-primary) 0%, var(--commons-bg-cyan) 100%); border-radius: var(--radius-md); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;">
                                <div style="font-size: 40px; font-weight: var(--font-weight-bold); line-height: 1;">${startDate.getDate()}</div>
                                <div style="font-size: var(--font-size-small); opacity: 0.9; margin-top: 4px;">${startDate.toLocaleDateString('ja-JP', { month: 'short' })}</div>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <h3 style="font-size: var(--font-size-medium); font-weight: var(--font-weight-bold); color: var(--commons-text-primary); margin-bottom: 8px;">
                                    ${eventTitle}
                                </h3>
                                <p style="color: var(--commons-text-secondary); font-size: var(--font-size-small); margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                    ${eventDescription}
                                </p>
                                <div style="display: flex; gap: 24px; color: var(--commons-text-tertiary); font-size: var(--font-size-small);">
                                    <span><i class="far fa-clock" style="color: var(--commons-primary); margin-right: 8px;"></i>${formattedDate}</span>
                                    ${locationName ? `<span><i class="fas fa-map-marker-alt" style="color: var(--commons-primary); margin-right: 8px;"></i>${locationName}</span>` : ''}
                                </div>
                            </div>
                        </a>
                    `
                }).join('')}
            </div>
        </section>
        ` : ''}
        
        <!-- CTAセクション（ログインしていない場合のみ表示） -->
        <section id="ctaSection" style="background: linear-gradient(135deg, var(--commons-primary-light) 0%, rgba(0, 212, 224, 0.2) 100%); padding: 80px 48px; border-radius: var(--radius-xl); text-align: center;">
            <h2 style="font-size: var(--font-size-xlarge); font-weight: var(--font-weight-bold); color: var(--commons-text-primary); margin-bottom: 24px;">
                コミュニティに参加しよう
            </h2>
            <p style="font-size: var(--font-size-medium); color: var(--commons-text-secondary); margin-bottom: 48px; max-width: 600px; margin-left: auto; margin-right: auto;">
                ${tenantName}で新しいつながりを見つけ、充実した時間を過ごしませんか？
            </p>
            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                <a href="/login?subdomain=${subdomain}" 
                   style="display: inline-block; padding: 16px 48px; background: var(--commons-primary); color: white; border-radius: var(--radius-full); font-size: var(--font-size-medium); font-weight: var(--font-weight-semibold); text-decoration: none; transition: all var(--transition-normal); box-shadow: var(--shadow-medium);"
                   onmouseover="this.style.background='var(--commons-primary-dark)'; this.style.transform='translateY(-4px)'; this.style.boxShadow='var(--shadow-strong)'"
                   onmouseout="this.style.background='var(--commons-primary)'; this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-medium)'">
                    <i class="fas fa-sign-in-alt" style="margin-right: 12px;"></i>
                    ログイン
                </a>
                <a href="/tenant/posts?subdomain=${subdomain}" 
                   style="display: inline-block; padding: 16px 48px; background: white; color: var(--commons-primary); border-radius: var(--radius-full); font-size: var(--font-size-medium); font-weight: var(--font-weight-semibold); text-decoration: none; transition: all var(--transition-normal); box-shadow: var(--shadow-soft);"
                   onmouseover="this.style.boxShadow='var(--shadow-medium)'; this.style.transform='translateY(-4px)'"
                   onmouseout="this.style.boxShadow='var(--shadow-soft)'; this.style.transform='translateY(0)'">
                    <i class="fas fa-newspaper" style="margin-right: 12px;"></i>
                    投稿を見る
                </a>
            </div>
        </section>
    </main>

    <!-- フッター -->
    <footer style="background: var(--commons-text-primary); color: white; padding: 64px 24px 32px;">
        <div style="max-width: 1280px; margin: 0 auto;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 48px; margin-bottom: 48px;">
                <div>
                    <h3 style="font-size: var(--font-size-medium); font-weight: var(--font-weight-bold); margin-bottom: 16px;">${tenantName}</h3>
                    ${tenantSubtitle ? `<p style="color: rgba(255,255,255,0.7); font-size: var(--font-size-small); line-height: var(--line-height-relaxed);">${tenantSubtitle}</p>` : ''}
                </div>
                <div>
                    <h4 style="font-size: var(--font-size-small); font-weight: var(--font-weight-bold); margin-bottom: 16px; opacity: 0.9;">ナビゲーション</h4>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <a href="/tenant/posts?subdomain=${subdomain}" style="color: rgba(255,255,255,0.7); text-decoration: none; font-size: var(--font-size-small); transition: color var(--transition-fast);" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">投稿</a>
                        <a href="/tenant/events?subdomain=${subdomain}" style="color: rgba(255,255,255,0.7); text-decoration: none; font-size: var(--font-size-small); transition: color var(--transition-fast);" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">イベント</a>
                        <a href="/tenant/members?subdomain=${subdomain}" style="color: rgba(255,255,255,0.7); text-decoration: none; font-size: var(--font-size-small); transition: color var(--transition-fast);" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">メンバー</a>
                        <a href="/tenant/shop?subdomain=${subdomain}" style="color: rgba(255,255,255,0.7); text-decoration: none; font-size: var(--font-size-small); transition: color var(--transition-fast);" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">ショップ</a>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="color: rgba(255,255,255,0.5); font-size: var(--font-size-small);">
                    &copy; ${new Date().getFullYear()} ${tenantName}. All rights reserved.
                </p>
                <p style="color: rgba(255,255,255,0.3); font-size: var(--font-size-xsmall); margin-top: 8px;">
                    Powered by <span style="color: var(--commons-primary); font-weight: var(--font-weight-bold);">Commons</span>
                </p>
            </div>
        </div>
    </footer>

    <script src="/static/app.js"></script>
</body>
</html>
  `)
})

// --------------------------------------------
// 投稿作成ページ（認証必須）
// --------------------------------------------
tenantPublic.get('/posts/new', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">コミュニティが見つかりません</h1>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  // クライアントサイドで管理者判定を行う（JavaScriptでAPIから取得）
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投稿作成 - ${tenant.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
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
                    <a href="/profile?subdomain=${subdomain}" class="block px-4 py-3 text-gray-700 hover:bg-gray-50 transition">
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

                <!-- 公開範囲 -->
                <div id="visibilityField" style="display: none;">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        公開範囲
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
                    <div class="space-y-3">
                        <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                            <input 
                                type="radio" 
                                name="status" 
                                value="published" 
                                checked
                                class="mr-3 w-4 h-4 text-primary"
                                id="statusPublished"
                            >
                            <div>
                                <span class="font-medium text-gray-700">すぐに公開する</span>
                                <p class="text-sm text-gray-500">投稿後すぐに公開されます</p>
                            </div>
                        </label>
                        <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                            <input 
                                type="radio" 
                                name="status" 
                                value="scheduled"
                                class="mr-3 w-4 h-4 text-primary"
                                id="statusScheduled"
                            >
                            <div>
                                <span class="font-medium text-gray-700">予約投稿</span>
                                <p class="text-sm text-gray-500">指定した日時に自動的に公開されます</p>
                            </div>
                        </label>
                        <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                            <input 
                                type="radio" 
                                name="status" 
                                value="draft"
                                class="mr-3 w-4 h-4 text-primary"
                                id="statusDraft"
                            >
                            <div>
                                <span class="font-medium text-gray-700">下書きとして保存</span>
                                <p class="text-sm text-gray-500">公開せずに保存します</p>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- 予約投稿日時 -->
                <div id="scheduledDateTimeField" style="display: none;">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        公開日時 <span class="text-red-500">*</span>
                    </label>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label for="scheduledDate" class="block text-sm text-gray-600 mb-1">日付</label>
                            <input 
                                type="date" 
                                id="scheduledDate" 
                                name="scheduledDate"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                        </div>
                        <div>
                            <label for="scheduledTime" class="block text-sm text-gray-600 mb-1">時刻</label>
                            <input 
                                type="time" 
                                id="scheduledTime" 
                                name="scheduledTime"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                        </div>
                    </div>
                    <p class="text-sm text-gray-500 mt-2">
                        <i class="fas fa-info-circle mr-1"></i>
                        過去の日時は選択できません。指定した日時になると自動的に公開されます。
                    </p>
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
                    <h1 id="previewTitle" class="text-3xl font-bold mb-4" style="color: var(--commons-text-primary);"></h1>
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
                
                // 管理者権限チェック（投稿作成は管理者のみ）
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
            const mobileMenuBtn = document.getElementById('mobileMenuBtn')
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
                if (mobileMenuBtn) {
                    mobileMenuBtn.classList.remove('hidden')
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
                                <a href="/profile?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
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
            // 予約投稿UI制御
            const statusRadios = document.querySelectorAll('input[name="status"]')
            const scheduledField = document.getElementById('scheduledDateTimeField')
            const scheduledDateInput = document.getElementById('scheduledDate')
            const scheduledTimeInput = document.getElementById('scheduledTime')
            
            // 現在時刻を取得して最小値を設定
            function updateMinDateTime() {
                const now = new Date()
                const year = now.getFullYear()
                const month = String(now.getMonth() + 1).padStart(2, '0')
                const day = String(now.getDate()).padStart(2, '0')
                const hours = String(now.getHours()).padStart(2, '0')
                const minutes = String(now.getMinutes()).padStart(2, '0')
                
                const today = \`\${year}-\${month}-\${day}\`
                const currentTime = \`\${hours}:\${minutes}\`
                
                // 日付の最小値を今日に設定
                scheduledDateInput.min = today
                
                // 今日が選択されている場合、時刻の最小値を現在時刻に設定
                if (scheduledDateInput.value === today) {
                    scheduledTimeInput.min = currentTime
                } else {
                    scheduledTimeInput.min = ''
                }
            }
            
            // ステータス変更時の処理
            statusRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.value === 'scheduled') {
                        scheduledField.style.display = 'block'
                        updateMinDateTime()
                        scheduledDateInput.required = true
                        scheduledTimeInput.required = true
                    } else {
                        scheduledField.style.display = 'none'
                        scheduledDateInput.required = false
                        scheduledTimeInput.required = false
                    }
                })
            })
            
            // 日付変更時に時刻の最小値を更新
            scheduledDateInput?.addEventListener('change', updateMinDateTime)
            
            // 初期値設定
            updateMinDateTime()
            
            // モバイルメニュー切替
            document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
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
                
                // 予約投稿の日時を取得
                let scheduledAt = null
                if (status === 'scheduled') {
                    const scheduledDate = document.getElementById('scheduledDate').value
                    const scheduledTime = document.getElementById('scheduledTime').value
                    
                    if (!scheduledDate || !scheduledTime) {
                        showToast('予約投稿には日付と時刻を入力してください', 'error')
                        submitBtn.disabled = false
                        submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>投稿する'
                        return
                    }
                    
                    // ISO 8601形式に変換
                    scheduledAt = \`\${scheduledDate}T\${scheduledTime}:00\`
                    
                    // 過去の日時チェック
                    const scheduledDateTime = new Date(scheduledAt)
                    const now = new Date()
                    if (scheduledDateTime <= now) {
                        showToast('予約日時は現在より未来の日時を選択してください', 'error')
                        submitBtn.disabled = false
                        submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>投稿する'
                        return
                    }
                }
                
                const postData = {
                    title: title.trim(),
                    content: content.trim(),
                    category: category || null,
                    status: status,
                    scheduled_at: scheduledAt,
                    thumbnail_url: thumbnailUrl,
                    video_url: videoUrl,
                    image_urls: imageUrls, // 複数画像URL
                    visibility: visibility
                }
                
                console.log('Submitting post data:', postData)
                console.log('Thumbnail URL in post data:', thumbnailUrl)
                console.log('Video URL in post data:', videoUrl)
                console.log('Image URLs in post data:', imageUrls)
                console.log('Scheduled at:', scheduledAt)
                
                const response = await apiRequest('/api/posts', {
                    method: 'POST',
                    body: JSON.stringify(postData)
                })
                
                console.log('Post creation response:', response)
                
                if (response.success) {
                    const message = status === 'draft' ? '下書きを保存しました' : 
                                   status === 'scheduled' ? '予約投稿を設定しました' : 
                                   '投稿を公開しました'
                    showToast(response.message || message, 'success')
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
  
  // 投稿カードのHTML生成（新しいファンクラブUIデザイン）
  let postsHTML = ''
  if (posts.length === 0) {
    postsHTML = `
      <div class="text-center py-16 bg-white rounded-2xl shadow-sm">
        <div class="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <i class="fas fa-inbox text-4xl text-gray-400"></i>
        </div>
        <p class="text-gray-600 text-lg font-semibold mb-2">まだ投稿がありません</p>
        <p class="text-gray-500 text-sm">最初の投稿を楽しみにしています！</p>
      </div>
    `
  } else {
    postsHTML = posts.map((post: any, index: number) => {
      const postTitle = String(post.title || '')
      const postContent = String(post.content || '')
      const postExcerpt = String(post.excerpt || postContent.substring(0, 120))
      const authorName = String(post.author_name || '不明')
      const createdDate = new Date(String(post.created_at))
      const now = new Date()
      const diffMs = now.getTime() - createdDate.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      let timeAgo = ''
      if (diffMins < 60) {
        timeAgo = `${diffMins}分前`
      } else if (diffHours < 24) {
        timeAgo = `${diffHours}時間前`
      } else if (diffDays < 7) {
        timeAgo = `${diffDays}日前`
      } else {
        timeAgo = createdDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      }
      
      const likeCount = Number(post.like_count || 0)
      const viewCount = Number(post.view_count || 0)
      const thumbnailUrl = String(post.thumbnail_url || '')
      const videoUrl = String(post.video_url || '')
      
      // 新着バッジ（24時間以内）
      const isNew = diffHours < 24
      const newBadge = isNew ? '<span class="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">NEW</span>' : ''
      
      // サムネイル画像の表示
      let thumbnailHTML = ''
      if (thumbnailUrl) {
        const videoOverlay = videoUrl ? `
          <div class="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition">
            <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition">
              <i class="fas fa-play text-2xl ml-1" style="color: var(--commons-primary);"></i>
            </div>
          </div>
        ` : ''
        
        thumbnailHTML = `
          <div class="relative w-full h-72 overflow-hidden rounded-t-2xl">
            <img data-src="${thumbnailUrl}" 
                 alt="${postTitle}" 
                 class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500"
                 loading="lazy">
            ${videoOverlay}
            ${newBadge}
            <div class="absolute bottom-4 left-4 text-white text-sm px-3 py-1 rounded-full" style="background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);">
              <i class="far fa-clock mr-1"></i>${timeAgo}
            </div>
          </div>
        `
      } else {
        const icon = videoUrl ? 'fa-video' : 'fa-image'
        thumbnailHTML = `
          <div class="relative w-full h-72 rounded-t-2xl flex items-center justify-center" style="background: linear-gradient(135deg, var(--commons-primary) 0%, var(--commons-primary-dark) 100%);">
            <i class="fas ${icon} text-8xl text-white opacity-30"></i>
            ${newBadge}
            <div class="absolute bottom-4 left-4 text-white text-sm px-3 py-1 rounded-full" style="background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);">
              <i class="far fa-clock mr-1"></i>${timeAgo}
            </div>
          </div>
        `
      }
      
      return `
        <div class="post-card bg-white rounded-2xl shadow-md hover:shadow-2xl overflow-hidden group">
          <a href="/tenant/posts/${post.id}?subdomain=${subdomain}" class="block">
            ${thumbnailHTML}
            <div class="p-6">
              <h3 class="text-xl font-bold mb-3 line-clamp-2 transition" style="color: var(--commons-text-primary);">
                ${postTitle}
              </h3>
              <p class="text-gray-600 mb-4 line-clamp-3 text-sm leading-relaxed">
                ${postExcerpt}${postExcerpt.length >= 120 ? '...' : ''}
              </p>
              
              <!-- 投稿者情報 -->
              <div class="flex items-center mb-4 pb-4 border-b border-gray-100">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  ${authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div class="font-semibold text-sm" style="color: var(--commons-text-primary);">${authorName}</div>
                  <div class="text-gray-500 text-xs">${timeAgo}</div>
                </div>
              </div>
              
              <!-- エンゲージメント -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <button class="engagement-icon flex items-center gap-1 text-gray-600 hover:text-red-500 transition">
                    <i class="far fa-heart text-lg"></i>
                    <span class="text-sm font-semibold">${likeCount}</span>
                  </button>
                  <div class="flex items-center gap-1 text-gray-600">
                    <i class="far fa-eye text-lg"></i>
                    <span class="text-sm font-semibold">${viewCount}</span>
                  </div>
                </div>
                <div class="style="color: var(--commons-primary)" font-semibold text-sm group-hover:translate-x-1 transition">
                  続きを読む <i class="fas fa-arrow-right ml-1"></i>
                </div>
              </div>
            </div>
          </a>
        </div>
      `
    }).join('')
  }
  
  // 人気投稿HTMLを生成（新しいデザイン）
  let popularPostsHTML = ''
  if (popularPosts.length > 0) {
    popularPostsHTML = popularPosts.map((post: any, index: number) => {
      const postTitle = String(post.title || '')
      const authorName = String(post.author_name || '不明')
      const likeCount = Number(post.like_count || 0)
      const viewCount = Number(post.view_count || 0)
      
      // ランキングバッジのデザイン
      let badgeHTML = ''
      if (index === 0) {
        badgeHTML = '<div class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">🥇</div>'
      } else if (index === 1) {
        badgeHTML = '<div class="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">🥈</div>'
      } else if (index === 2) {
        badgeHTML = '<div class="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">🥉</div>'
      } else {
        badgeHTML = `<div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow">${index + 1}</div>`
      }
      
      return `
        <a href="/tenant/posts/${post.id}?subdomain=${subdomain}" 
           class="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-md transition group">
            ${badgeHTML}
            <div class="flex-grow min-w-0">
                <h4 class="font-semibold  transition truncate text-sm mb-1" style="color: var(--commons-text-primary);">
                  ${postTitle}
                </h4>
                <div class="flex items-center gap-3 text-xs text-gray-500">
                    <span><i class="fas fa-user mr-1"></i>${authorName}</span>
                    <span><i class="fas fa-heart text-red-500 mr-1"></i>${likeCount}</span>
                    <span><i class="fas fa-eye mr-1"></i>${viewCount}</span>
                </div>
            </div>
            <i class="fas fa-chevron-right text-gray-400 group-hover:style="color: var(--commons-primary)" transition"></i>
        </a>
      `
    }).join('')
  }
  
  // ページネーションHTML生成（新しいデザイン）
  let paginationHTML = ''
  if (totalPages > 1) {
    const pages = []
    
    // 前へボタン
    if (page > 1) {
      pages.push(`<a href="/tenant/posts?subdomain=${subdomain}&page=${page - 1}" 
                    class="px-5 py-3 bg-white font-semibold border-2 rounded-xl transition shadow-sm" 
                    style="color: var(--commons-primary); border-color: var(--commons-primary-light); background: white;"
                    onmouseover="this.style.background='var(--commons-primary-light)'; this.style.borderColor='var(--commons-primary)';"
                    onmouseout="this.style.background='white'; this.style.borderColor='var(--commons-primary-light)';">
                    <i class="fas fa-chevron-left mr-2"></i>前へ
                 </a>`)
    } else {
      pages.push(`<span class="px-5 py-3 bg-gray-100 text-gray-400 border-2 border-gray-200 rounded-xl cursor-not-allowed">
                    <i class="fas fa-chevron-left mr-2"></i>前へ
                 </span>`)
    }
    
    // ページ番号
    for (let i = 1; i <= totalPages; i++) {
      if (i === page) {
        pages.push(`<span class="px-5 py-3 text-white rounded-xl font-bold shadow-lg" style="background: linear-gradient(135deg, var(--commons-primary) 0%, var(--commons-primary-dark) 100%);">${i}</span>`)
      } else if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
        pages.push(`<a href="/tenant/posts?subdomain=${subdomain}&page=${i}" 
                      class="px-5 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-purple-300 transition shadow-sm font-semibold">
                      ${i}
                   </a>`)
      } else if (i === page - 3 || i === page + 3) {
        pages.push(`<span class="px-3 py-3 text-gray-500">...</span>`)
      }
    }
    
    // 次へボタン
    if (page < totalPages) {
      pages.push(`<a href="/tenant/posts?subdomain=${subdomain}&page=${page + 1}" 
                    class="px-5 py-3 bg-white font-semibold border-2 rounded-xl transition shadow-sm"
                    style="color: var(--commons-primary); border-color: var(--commons-primary-light); background: white;"
                    onmouseover="this.style.background='var(--commons-primary-light)'; this.style.borderColor='var(--commons-primary)';"
                    onmouseout="this.style.background='white'; this.style.borderColor='var(--commons-primary-light)';">
                    次へ<i class="fas fa-chevron-right ml-2"></i>
                 </a>`)
    } else {
      pages.push(`<span class="px-5 py-3 bg-gray-100 text-gray-400 border-2 border-gray-200 rounded-xl cursor-not-allowed">
                    次へ<i class="fas fa-chevron-right ml-2"></i>
                 </span>`)
    }
    
    paginationHTML = `
      <div class="flex justify-center items-center gap-2 flex-wrap bg-white rounded-2xl p-6 shadow-sm">
        ${pages.join('')}
      </div>
    `
  }
  
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投稿一覧 - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
</head>
<body style="background: var(--commons-bg-light);">
    <!-- ヘッダー -->
    ${renderCommonHeader(tenantName, subdomain, 'posts')}

    <!-- ページヘッダー -->
    <section style="background: linear-gradient(135deg, var(--commons-primary) 0%, var(--commons-primary-dark) 100%); color: white; padding: 40px 24px 32px;">
        <div style="max-width: 1280px; margin: 0 auto;">
            <h1 style="font-size: var(--font-size-xlarge); font-weight: var(--font-weight-bold); margin-bottom: 12px;">
                <i class="fas fa-newspaper" style="margin-right: 16px;"></i>投稿一覧
            </h1>
            <p style="font-size: var(--font-size-medium); opacity: 0.9;">${tenantName}の最新コンテンツ</p>
        </div>
    </section>

    <!-- メインコンテンツ -->
    <main style="max-width: 1280px; margin: 0 auto; padding: 64px 24px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 32px; margin-bottom: 64px;">
            ${postsHTML}
        </div>

        <!-- ページネーション -->
        ${paginationHTML}
    </main>

    <!-- フッター -->
    ${renderCommonFooter(tenantName, subdomain)}

    <script src="/static/app.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投稿作成 - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
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
            <h2 class="text-3xl font-bold mb-6" style="color: var(--commons-text-primary);">
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">コミュニティが見つかりません</h1>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
  // 投稿を取得
  const post = await DB.prepare(`
    SELECT p.*, u.nickname as author_name, u.avatar_url as author_avatar
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.id = ? AND p.tenant_id = ? AND p.status = ?
  `).bind(postId, tenant.id, 'published').first()
  
  if (!post) {
    return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投稿が見つかりません - ${tenant.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${postTitle} - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
</head>
<body class="bg-gray-50 min-h-screen">
    ${renderCommonHeader(tenantName, subdomain, 'posts')}

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
                <h1 class="text-3xl md:text-4xl font-bold mb-4" style="color: var(--commons-text-primary);">${postTitle}</h1>
                
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
            <h2 class="text-2xl font-bold mb-6" style="color: var(--commons-text-primary);">
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
                                        <span class="font-semibold" style="color: var(--commons-text-primary);">${commentUserName}</span>
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

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        // ページ読み込み完了を待つ
        document.addEventListener('DOMContentLoaded', function() {
            console.log('[Post Detail] Page loaded, initializing like button...')
            
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
            
            console.log('[Post Detail] Like button elements:', {
                likeButton: !!likeButton,
                likeIcon: !!likeIcon,
                likeText: !!likeText,
                likeCount: !!likeCount
            })
            
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
                    // ログインしていない場合
                    if (confirm('いいね機能を利用するには会員登録が必要です。\n\n今すぐ登録しますか？')) {
                        window.location.href = '/register?subdomain=' + subdomain
                    }
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
                        // 認証エラー（トークン期限切れなど）
                        if (confirm('ログインセッションが切れました。\n\n再度ログインしますか？')) {
                            window.location.href = '/login?subdomain=' + subdomain
                        }
                    } else if (error.response && error.response.status === 500) {
                        // サーバーエラー
                        alert('申し訳ございません。サーバーでエラーが発生しました。\n\nログインしていない場合は、会員登録をお願いします。')
                        if (confirm('会員登録ページに移動しますか？')) {
                            window.location.href = '/register?subdomain=' + subdomain
                        }
                    } else {
                        alert('エラーが発生しました。もう一度お試しください。')
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
                    // ログインしていない場合
                    if (confirm('いいね機能を利用するには会員登録が必要です。\n\n今すぐ登録しますか？')) {
                        window.location.href = '/register?subdomain=' + subdomain
                    }
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
                        // 認証エラー
                        if (confirm('ログインセッションが切れました。\n\n再度ログインしますか？')) {
                            window.location.href = '/login?subdomain=' + subdomain
                        }
                    } else if (error.response && error.response.status === 500) {
                        // サーバーエラー
                        alert('申し訳ございません。サーバーでエラーが発生しました。\n\nログインしていない場合は、会員登録をお願いします。')
                        if (confirm('会員登録ページに移動しますか？')) {
                            window.location.href = '/register?subdomain=' + subdomain
                        }
                    } else {
                        alert('エラーが発生しました。もう一度お試しください。')
                    }
                } finally {
                    button.disabled = false
                }
            })
        })
    </script>
    
    ${renderCommonFooter(tenantName, subdomain)}
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">コミュニティが見つかりません</h1>
        <a href="/" class="text-blue-600 hover:underline">ホームに戻る</a>
    </div>
</body>
</html>`)
  }
  
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
      tm.role, tm.joined_at
    FROM tenant_memberships tm
    JOIN users u ON tm.user_id = u.id
    WHERE ${whereConditions}
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
      const joinedDate = new Date(String(member.joined_at)).toLocaleDateString('ja-JP')
      
      // ロールのバッジ
      let roleBadge = ''
      if (role === 'owner') {
        roleBadge = '<span class="px-2 py-1 bg-purple-100 style="color: var(--commons-primary-dark)" text-xs font-semibold rounded-full">オーナー</span>'
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
                    <img data-src="${avatarUrl}" 
                         alt="${nickname}" 
                         class="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                         loading="lazy">
                    ` : `
                    <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-4 border-gray-100">
                        <i class="fas fa-user text-3xl text-white"></i>
                    </div>
                    `}
                </div>
                
                <!-- 会員情報 -->
                <div class="mb-2 flex items-center gap-2">
                    <h3 class="text-xl font-bold" style="color: var(--commons-text-primary);">${nickname}</h3>
                    ${roleBadge}
                </div>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">${bio}</p>
                
                <!-- 統計情報 -->
                <div class="flex items-center gap-4 text-sm text-gray-500 mb-4">
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>会員一覧 - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
</head>
<body style="background: var(--commons-bg-light);">
    <!-- ヘッダー -->
    ${renderCommonHeader(tenantName, subdomain, 'members')}

    <!-- ページヘッダー -->
    <section style="background: linear-gradient(135deg, var(--commons-primary) 0%, var(--commons-primary-dark) 100%); color: white; padding: 64px 24px 48px;">
        <div style="max-width: 1280px; margin: 0 auto;">
            <h1 style="font-size: var(--font-size-xlarge); font-weight: var(--font-weight-bold); margin-bottom: 16px;">
                <i class="fas fa-users" style="margin-right: 16px;"></i>メンバー一覧
            </h1>
            <p style="font-size: var(--font-size-medium); opacity: 0.9;">${tenantName}のメンバー</p>
        </div>
    </section>

    <!-- メインコンテンツ -->
    <main style="max-width: 1280px; margin: 0 auto; padding: 64px 24px;"
                        ${tenantName}
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

    <!-- フッター -->
    ${renderCommonFooter(tenantName, subdomain)}
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
      <html lang="ja" data-theme="light">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>通知 - ${tenantName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
      u.id, u.nickname, u.email, u.avatar_url, u.bio, u.created_at, u.birthday, u.last_login_at,
      tm.role, tm.joined_at
    FROM tenant_memberships tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.tenant_id = ? AND (tm.status = ? OR tm.status = ?) AND u.id = ?
  `).bind(tenant.id, 'approved', 'active', memberId).first() as any
  
  if (!member) {
    const notFoundHTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>会員が見つかりません</title>' +
      '<script src=\"https://cdn.tailwindcss.com\"></script>' +
        '<script src=\"/static/tailwind-config.js\"></script></head>' +
      '<body class="bg-gray-50 min-h-screen flex items-center justify-center">' +
      '<div class="text-center"><h1 class="text-4xl font-bold text-gray-800 mb-4">会員が見つかりません</h1>' +
      '<a href="/tenant/members?subdomain=' + subdomain + '" class="text-blue-600 hover:underline">会員一覧に戻る</a>' +
      '</div></body></html>'
    return c.html(notFoundHTML)
  }
  
  const nickname = String(member.nickname || '不明')
  const bio = String(member.bio || 'プロフィールが設定されていません')
  const avatarUrl = member.avatar_url ? String(member.avatar_url) : ''
  const role = String(member.role || 'member')
  const birthday = member.birthday ? String(member.birthday) : null
  // 最終ログイン日時を日本語フォーマットに変換（すでにJSTで記録されている想定）
  const lastLoginAt = member.last_login_at 
    ? new Date(String(member.last_login_at)).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null
  const joinedDate = new Date(String(member.joined_at)).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  
  let roleBadgeHTML = ''
  if (role === 'owner') {
    roleBadgeHTML = '<span class="px-3 py-1 bg-purple-100 style="color: var(--commons-primary-dark)" text-sm font-semibold rounded-full">オーナー</span>'
  } else if (role === 'admin') {
    roleBadgeHTML = '<span class="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">管理者</span>'
  } else if (role === 'moderator') {
    roleBadgeHTML = '<span class="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">モデレーター</span>'
  } else {
    roleBadgeHTML = '<span class="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">メンバー</span>'
  }
  
  const avatarHTML = avatarUrl 
    ? '<img data-src="' + avatarUrl + '" alt="' + nickname + '" class="w-32 h-32 rounded-full object-cover border-4 border-blue-100" loading="lazy">'
    : '<div class="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center border-4 border-blue-200">' +
      '<i class="fas fa-user text-5xl text-blue-400"></i></div>'
  
  // 年齢計算
  let ageText = ''
  if (birthday) {
    const birthDate = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    const birthdayFormatted = birthDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    ageText = birthdayFormatted + ' (' + age + '歳)'
  }
  
  // 最終ログイン日時
  let lastLoginText = 'なし'
  if (lastLoginAt) {
    const lastLoginDate = new Date(lastLoginAt)
    lastLoginText = lastLoginDate.toLocaleString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const html = '<!DOCTYPE html>' +
    '<html lang="ja" data-theme="light"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + nickname + ' - ' + tenant.name + '</title>' +
    '<script src=\"https://cdn.tailwindcss.com\"></script>' +
    '<script src=\"/static/tailwind-config.js\"></script>' +
    '<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">' +
    '<link href="/static/commons-theme.css" rel="stylesheet">' +
    '<link href="/static/commons-components.css" rel="stylesheet">' +
    '<script src=\"https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js\"></script>' +
    '</head><body class="bg-gray-50 min-h-screen">' +
    '<header class="bg-white shadow-sm sticky top-0 z-50">' +
    '<div class="container mx-auto px-4 py-4">' +
    '<div class="flex items-center justify-between">' +
    '<a href="/tenant/home?subdomain=' + subdomain + '" class="text-2xl font-bold text-blue-600">' + tenant.name + '</a>' +
    '<nav class="hidden md:flex items-center space-x-6">' +
    '<a href="/tenant/home?subdomain=' + subdomain + '" class="text-gray-600 hover:text-blue-600"><i class="fas fa-home mr-1"></i>ホーム</a>' +
    '<a href="/tenant/posts?subdomain=' + subdomain + '" class="text-gray-600 hover:text-blue-600"><i class="fas fa-newspaper mr-1"></i>投稿</a>' +
    '<a href="/tenant/events?subdomain=' + subdomain + '" class="text-gray-600 hover:text-blue-600"><i class="fas fa-calendar-alt mr-1"></i>イベント</a>' +
    '<a href="/tenant/members?subdomain=' + subdomain + '" class="text-blue-600 font-semibold"><i class="fas fa-users mr-1"></i>メンバー</a>' +
    '<a href="/tenant/chat?subdomain=' + subdomain + '" class="text-gray-600 hover:text-blue-600"><i class="fas fa-comments mr-1"></i>チャット</a>' +
    '<a href="/login?subdomain=' + subdomain + '" id="headerLoginBtn" class="text-gray-600 hover:text-blue-600"><i class="fas fa-sign-in-alt mr-1"></i>ログイン</a>' +
    '</nav></div></div></header>' +
    '<main class="container mx-auto px-4 py-8">' +
    '<div class="bg-white rounded-lg shadow-lg p-8 mb-8">' +
    '<div class="flex flex-col md:flex-row items-center md:items-start gap-8">' +
    '<div class="flex-shrink-0">' + avatarHTML + '</div>' +
    '<div class="flex-grow text-center md:text-left">' +
    '<div class="flex flex-col md:flex-row items-center md:items-start gap-3 mb-4">' +
    '<h1 class="text-3xl font-bold" style="color: var(--commons-text-primary);">' + nickname + '</h1>' + roleBadgeHTML + '</div>' +
    '<p class="text-gray-600 mb-6 whitespace-pre-wrap">' + bio + '</p>' +
    '<div class="space-y-2 text-sm text-gray-600">' +
    (birthday ? '<div class="flex items-center"><i class="fas fa-birthday-cake mr-3 text-pink-500 w-5"></i><span>' + ageText + '</span></div>' : '') +
    '<div class="flex items-center"><i class="fas fa-user-check mr-3 text-blue-500 w-5"></i><span>' + joinedDate + 'に参加</span></div>' +
    '<div class="flex items-center"><i class="fas fa-clock mr-3 text-green-500 w-5"></i><span>最終ログイン: ' + lastLoginText + '</span></div>' +
    '</div>' +
    '</div></div></div>' +
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>マイページ - ${tenant.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
            <h1 class="text-3xl font-bold  mb-4" style="color: var(--commons-text-primary);">ログインが必要です</h1>
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
            <h1 class="text-3xl md:text-4xl font-bold mb-2" style="color: var(--commons-text-primary);">
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
                <div id="totalViews" class="text-3xl font-bold style="color: var(--commons-primary)" mb-1">0</div>
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
                                        <h3 class="text-xl font-bold  flex-1" style="color: var(--commons-text-primary);">\${post.title}</h3>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>Development - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>Community not found - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <title>Login Required - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center">
    <div class="text-center">
        <h1 class="text-3xl font-bold  mb-4" style="color: var(--commons-text-primary);">Login Required</h1>
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
                    <h3 class="text-xl font-bold  mb-2" style="color: var(--commons-text-primary);">${postTitle}</h3>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liked Posts - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
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
            <h1 class="text-3xl md:text-4xl font-bold  mb-2" style="color: var(--commons-text-primary);">
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
      <html lang="ja" data-theme="light">
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
      <html lang="ja" data-theme="light">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>コミュニティが見つかりません</title>
          <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
        '<h3 class="text-xl font-bold  flex-grow" style="color: var(--commons-text-primary);">' +
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>いいねした投稿 - ${tenant.name}</title>
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
            <h1 class="text-3xl font-bold  mb-2" style="color: var(--commons-text-primary);">
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>サブスクリプション管理 - ${tenant.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <!-- ヘッダー -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-bold " style="color: var(--commons-text-primary);">
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
                        <button onclick="changePlan('pro')" class="w-full style="background: var(--commons-primary)" text-white py-2 rounded hover:bg-purple-700">
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
      <html lang="ja" data-theme="light">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>プラン管理 - Commons</title>
          <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>プラン管理 - Commons</title>
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
                        <i class="fas fa-tags mr-2"></i>
                        プラン管理
                    </h1>
                    <a href="/dashboard" class="btn-ghost">
                        <i class="fas fa-arrow-left mr-2"></i>
                        ダッシュボードに戻る
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

            <!-- クーポン適用セクション -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <div class="flex items-center gap-3 mb-4">
                    <i class="fas fa-ticket-alt text-2xl text-green-600"></i>
                    <div>
                        <h2 class="text-xl font-bold">クーポン適用</h2>
                        <p class="text-sm text-gray-600">クーポンコードをお持ちの方はこちらから適用できます</p>
                    </div>
                </div>

                <!-- 有効なクーポン表示 -->
                <div id="activeCouponSection" class="hidden mb-4">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <i class="fas fa-check-circle text-green-600 text-xl"></i>
                            <div class="flex-1">
                                <h3 class="font-bold text-green-900 mb-1">有効なクーポン</h3>
                                <p id="activeCouponName" class="text-sm text-green-800 mb-1"></p>
                                <p id="activeCouponDescription" class="text-xs text-green-700"></p>
                                <p id="activeCouponExpiry" class="text-xs text-green-600 mt-2"></p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- クーポン入力フォーム -->
                <div id="couponFormSection">
                    <form id="couponForm" class="flex gap-3">
                        <div class="flex-1">
                            <input type="text" id="couponCode" 
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 uppercase"
                                placeholder="クーポンコードを入力（例: VIP2025）"
                                maxlength="20">
                        </div>
                        <button type="submit" class="btn-primary whitespace-nowrap">
                            <i class="fas fa-check mr-2"></i>適用
                        </button>
                    </form>
                    <p class="text-xs text-gray-500 mt-2">
                        <i class="fas fa-info-circle mr-1"></i>
                        クーポンを適用すると、プラットフォーム利用料が割引または無料になります
                    </p>
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
                    <h2 class="text-2xl font-bold " style="color: var(--commons-text-primary);">
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

        // 権限チェック（オーナーのみアクセス可能）
        function checkAccess() {
            const token = localStorage.getItem('token')
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            const membership = JSON.parse(localStorage.getItem('membership') || '{}')
            
            console.log('[Plans] Checking access - user:', user, 'membership:', membership)
            
            if (!token || !user.id) {
                console.log('[Plans] No token or user, redirecting to login')
                window.location.href = '/login?subdomain=' + subdomain
                return false
            }
            
            const userRole = user.role || membership.role
            console.log('[Plans] User role:', userRole)
            
            if (userRole !== 'owner') {
                console.log('[Plans] User is not owner, redirecting to home')
                alert('プラン管理はオーナーのみアクセスできます')
                window.location.href = '/tenant/home?subdomain=' + subdomain
                return false
            }
            
            return true
        }

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

            const data = {
                name,
                description: description || null,
                price,
                member_limit: memberLimit ? parseInt(memberLimit) : null
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

        // ============================================
        // クーポン機能
        // ============================================

        // 有効なクーポンをチェック
        async function checkActiveCoupon() {
            try {
                const token = localStorage.getItem('token')
                const response = await axios.get('/api/coupon/active', {
                    headers: { Authorization: \`Bearer \${token}\` }
                })

                if (response.data.success && response.data.has_active_coupon) {
                    const coupon = response.data.coupons[0]
                    
                    // 有効なクーポンを表示
                    document.getElementById('activeCouponName').textContent = coupon.name
                    document.getElementById('activeCouponDescription').textContent = coupon.description
                    
                    // 有効期限の表示
                    if (coupon.discount_type === 'free_forever') {
                        document.getElementById('activeCouponExpiry').textContent = '✨ 永久無料'
                    } else if (coupon.expires_at) {
                        const expiryDate = new Date(coupon.expires_at)
                        document.getElementById('activeCouponExpiry').textContent = 
                            \`有効期限: \${expiryDate.toLocaleDateString('ja-JP')}\`
                    }
                    
                    document.getElementById('activeCouponSection').classList.remove('hidden')
                    document.getElementById('couponFormSection').classList.add('hidden')
                }
            } catch (error) {
                console.error('Failed to check coupon:', error)
            }
        }

        // クーポン適用
        document.getElementById('couponForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const code = document.getElementById('couponCode').value.trim()
            
            if (!code) {
                showToast('クーポンコードを入力してください', 'error')
                return
            }

            try {
                const token = localStorage.getItem('token')
                const response = await axios.post('/api/coupon/redeem', 
                    { code },
                    { headers: { Authorization: \`Bearer \${token}\` } }
                )

                if (response.data.success) {
                    showToast(response.data.message, 'success')
                    document.getElementById('couponCode').value = ''
                    
                    // クーポン情報を再読み込み
                    setTimeout(() => {
                        checkActiveCoupon()
                    }, 1000)
                } else {
                    showToast(response.data.message, 'error')
                }
            } catch (error) {
                console.error('Failed to redeem coupon:', error)
                const message = error.response?.data?.message || 'クーポンの適用に失敗しました'
                showToast(message, 'error')
            }
        })

        // 初期化
        if (checkAccess()) {
            checkActiveCoupon()
            loadPlans()
        }
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
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>チャット - ${tenant.name}</title>
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
            <h1 class="text-3xl font-bold " style="color: var(--commons-text-primary);">
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
                    <h2 class="text-2xl font-bold " style="color: var(--commons-text-primary);">
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
                    <a href="/tenant/chat/\${room.id}?subdomain=${subdomain}" 
                       class="block bg-white rounded-lg shadow-md hover:shadow-xl transition p-6 border-l-4 border-primary">
                        <div class="flex items-start justify-between mb-3">
                            <h3 class="text-xl font-bold  flex-1" style="color: var(--commons-text-primary);">
                                <i class="fas fa-comments text-primary mr-2"></i>
                                \${room.name}
                            </h3>
                            \${room.is_private ? '<span class="px-2 py-1 bg-purple-100 style="color: var(--commons-primary-dark)" text-xs font-semibold rounded-full"><i class="fas fa-lock mr-1"></i>プライベート</span>' : ''}
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
 * GET /chat/room (旧URL - リダイレクト用)
 * 互換性のため、旧URLを新URLにリダイレクト
 */
tenantPublic.get('/chat/room', async (c) => {
  const subdomain = c.req.query('subdomain')
  const id = c.req.query('id')
  
  if (!subdomain || !id) {
    return c.redirect('/tenant/chat?subdomain=' + (subdomain || 'test'))
  }
  
  // 新しいURLにリダイレクト
  return c.redirect(`/tenant/chat/${id}?subdomain=${subdomain}`)
})

/**
 * GET /chat/:id
 * チャットルーム個別ページ
 */
tenantPublic.get('/chat/:id', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  const roomId = c.req.param('id')
  
  if (!subdomain) {
    return c.json({ error: 'Subdomain required' }, 400)
  }
  
  // テナント情報を取得
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first()
  
  if (!tenant) {
    return c.json({ error: 'Tenant not found' }, 404)
  }
  
  const tenantName = tenant.name
  const tenantSubtitle = tenant.subtitle || ''
  
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>チャット - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #3B82F6;
        }
        .has-bottom-nav {
            padding-bottom: 80px;
        }
        #messagesContainer {
            height: calc(100vh - 300px);
            min-height: 400px;
        }
        .message-bubble {
            max-width: 70%;
        }
        .message-own {
            background: var(--primary-color);
            color: white;
            border-radius: 18px 18px 4px 18px;
        }
        .message-other {
            background: #F3F4F6;
            color: #1F2937;
            border-radius: 18px 18px 18px 4px;
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- ヘッダー -->
    <header class="bg-white shadow-sm sticky top-0 z-40">
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
                </nav>
                <!-- モバイルメニューボタン -->
                <button id="mobileMenuBtn" class="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            <!-- モバイルメニュー (動的に更新される) -->
            <div id="mobileMenu" class="hidden md:hidden mt-4 space-y-2">
                <!-- 認証後に updateNavigation() で内容が設定されます -->
            </div>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="max-w-5xl mx-auto px-4 py-8">
        <!-- 戻るボタンとルーム情報 -->
        <div class="mb-6">
            <a href="/tenant/chat?subdomain=${subdomain}" class="inline-flex items-center text-primary hover:underline mb-4">
                <i class="fas fa-arrow-left mr-2"></i>チャットルーム一覧に戻る
            </a>
            <div class="bg-white rounded-lg shadow-sm p-6" id="roomInfo">
                <div class="animate-pulse">
                    <div class="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div class="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
            </div>
        </div>

        <!-- メッセージ表示エリア -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div id="messagesContainer" class="overflow-y-auto space-y-4 mb-4">
                <!-- ローディング -->
                <div id="messagesLoading" class="flex justify-center py-12">
                    <div class="text-center">
                        <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-600">メッセージを読み込み中...</p>
                    </div>
                </div>
                
                <!-- メッセージリスト -->
                <div id="messagesList" class="hidden space-y-4">
                    <!-- JavaScriptで動的に生成 -->
                </div>
                
                <!-- 空の状態 -->
                <div id="messagesEmpty" class="hidden text-center py-12">
                    <i class="fas fa-comment-slash text-6xl text-gray-300 mb-4"></i>
                    <p class="text-xl text-gray-600">まだメッセージがありません</p>
                    <p class="text-gray-500">最初のメッセージを送信しましょう</p>
                </div>
            </div>

            <!-- メッセージ送信フォーム -->
            <form id="messageForm" class="flex gap-2">
                <input
                    type="text"
                    id="messageInput"
                    placeholder="メッセージを入力..."
                    class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                />
                <button
                    type="submit"
                    id="sendBtn"
                    class="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                    <i class="fas fa-paper-plane"></i>
                    <span class="hidden sm:inline">送信</span>
                </button>
            </form>
        </div>
    </main>

    <script src="/static/app.js"></script>
    <script>
        const subdomain = '${subdomain}'
        const roomId = '${roomId}'
        let currentUser = null
        let pollingInterval = null
        
        console.log('[Chat Room] subdomain:', subdomain)
        console.log('[Chat Room] roomId:', roomId)
        console.log('[Chat Room] Current URL:', window.location.href)

        // ナビゲーションを更新
        function updateNavigation(user) {
            const isAdmin = user.role === 'owner' || user.role === 'admin'
            const desktopNav = document.getElementById('desktopNav')
            const mobileMenu = document.getElementById('mobileMenu')
            
            if (isAdmin) {
                if (desktopNav) {
                    desktopNav.innerHTML = \`
                        <a href="/tenant/home?subdomain=\${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-home mr-2"></i>ホーム
                        </a>
                        <a href="/tenant/members?subdomain=\${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-users mr-2"></i>会員管理
                        </a>
                        <a href="/posts-admin" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-file-alt mr-2"></i>投稿管理
                        </a>
                        <a href="/tenant/chat?subdomain=\${subdomain}" class="text-primary font-semibold">
                            <i class="fas fa-comments mr-2"></i>チャット
                        </a>
                        <div class="relative">
                            <button id="chatAdminMenuBtn" class="text-gray-600 hover:text-primary transition flex items-center">
                                <i class="fas fa-user-circle mr-2"></i>
                                \${user.nickname || 'ユーザー'}
                                <i class="fas fa-chevron-down ml-2 text-xs"></i>
                            </button>
                            <div id="chatAdminDropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                                <a href="/tenant/mypage?subdomain=\${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                                    <i class="fas fa-user mr-2"></i>マイページ
                                </a>
                                <a href="/tenant/settings?subdomain=\${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                                    <i class="fas fa-cog mr-2"></i>設定
                                </a>
                                <button onclick="logout()" class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                                    <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                                </button>
                            </div>
                        </div>
                    \`
                }
            } else {
                if (desktopNav) {
                    desktopNav.innerHTML = \`
                        <a href="/tenant/home?subdomain=\${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-home mr-2"></i>ホーム
                        </a>
                        <a href="/tenant/posts?subdomain=\${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-newspaper mr-2"></i>投稿
                        </a>
                        <a href="/tenant/chat?subdomain=\${subdomain}" class="text-primary font-semibold">
                            <i class="fas fa-comments mr-2"></i>チャット
                        </a>
                        <a href="/tenant/members?subdomain=\${subdomain}" class="text-gray-600 hover:text-primary transition">
                            <i class="fas fa-users mr-2"></i>メンバー
                        </a>
                        <div class="relative">
                            <button id="chatMemberMenuBtn" class="text-gray-600 hover:text-primary transition flex items-center">
                                <i class="fas fa-user-circle mr-2"></i>
                                \${user.nickname || 'ユーザー'}
                                <i class="fas fa-chevron-down ml-2 text-xs"></i>
                            </button>
                            <div id="chatMemberDropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                                <a href="/profile?subdomain=${subdomain}" class="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                                    <i class="fas fa-user mr-2"></i>プロフィール
                                </a>
                                <button onclick="logout()" class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                                    <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                                </button>
                            </div>
                        </div>
                    \`
                }
            }
            
            // ドロップダウンメニューの設定
            setTimeout(() => {
                setupChatDropdowns()
            }, 100)
        }
        
        // チャットページ用ドロップダウン設定
        function setupChatDropdowns() {
            // 管理者用
            const adminBtn = document.getElementById('chatAdminMenuBtn')
            const adminDropdown = document.getElementById('chatAdminDropdown')
            
            if (adminBtn && adminDropdown) {
                adminBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    adminDropdown.classList.toggle('hidden')
                })
                
                document.addEventListener('click', (e) => {
                    if (!adminDropdown.contains(e.target) && e.target !== adminBtn) {
                        adminDropdown.classList.add('hidden')
                    }
                })
            }
            
            // 一般メンバー用
            const memberBtn = document.getElementById('chatMemberMenuBtn')
            const memberDropdown = document.getElementById('chatMemberDropdown')
            
            if (memberBtn && memberDropdown) {
                memberBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    memberDropdown.classList.toggle('hidden')
                })
                
                document.addEventListener('click', (e) => {
                    if (!memberDropdown.contains(e.target) && e.target !== memberBtn) {
                        memberDropdown.classList.add('hidden')
                    }
                })
            }
        }
        }

        window.logout = function() {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('membership')
            window.location.href = '/tenant/home?subdomain=' + subdomain
        }

        // モバイルメニュー切り替え
        const mobileMenuBtn = document.getElementById('mobileMenuBtn')
        const mobileMenu = document.getElementById('mobileMenu')
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden')
            })
        }

        // 認証チェック
        async function checkAuth() {
            const token = getToken()
            if (!token) {
                window.location.href = '/login?subdomain=' + subdomain
                return false
            }

            const userStr = localStorage.getItem('user')
            if (!userStr) {
                window.location.href = '/login?subdomain=' + subdomain
                return false
            }

            currentUser = JSON.parse(userStr)
            updateNavigation(currentUser)
            return true
        }

        // ルーム情報を取得
        async function loadRoomInfo() {
            const token = getToken()
            try {
                const response = await fetch('/api/chat/rooms/' + roomId, {
                    headers: { 'Authorization': 'Bearer ' + token }
                })

                if (!response.ok) {
                    if (response.status === 403) {
                        showToast('このチャットルームにアクセスする権限がありません', 'error')
                        setTimeout(() => {
                            window.location.href = '/tenant/chat?subdomain=' + subdomain
                        }, 2000)
                        return
                    }
                    throw new Error('Failed to load room info')
                }

                const data = await response.json()
                if (data.success) {
                    const room = data.room
                    document.getElementById('roomInfo').innerHTML = \`
                        <div class="flex items-start justify-between">
                            <div>
                                <h2 class="text-2xl font-bold  mb-2" style="color: var(--commons-text-primary);">
                                    <i class="fas fa-comments mr-2 text-primary"></i>
                                    \${room.name}
                                </h2>
                                \${room.description ? \`<p class="text-gray-600 mb-4">\${room.description}</p>\` : ''}
                                <div class="flex items-center gap-4 text-sm text-gray-500">
                                    <span>
                                        <i class="fas fa-users mr-1"></i>
                                        \${room.members?.length || 0}人のメンバー
                                    </span>
                                    \${room.is_private ? '<span class="px-2 py-1 bg-purple-100 style="color: var(--commons-primary-dark)" rounded text-xs font-semibold"><i class="fas fa-lock mr-1"></i>非公開</span>' : '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold"><i class="fas fa-globe mr-1"></i>公開</span>'}
                                </div>
                            </div>
                        </div>
                    \`
                }
            } catch (error) {
                console.error('Failed to load room info:', error)
                showToast('ルーム情報の取得に失敗しました', 'error')
            }
        }

        // メッセージを取得
        async function loadMessages() {
            const token = getToken()
            try {
                const response = await fetch('/api/chat/rooms/' + roomId + '/messages?page=1&limit=50', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })

                if (!response.ok) throw new Error('Failed to load messages')

                const data = await response.json()
                document.getElementById('messagesLoading').classList.add('hidden')

                if (data.success && data.messages.length > 0) {
                    document.getElementById('messagesList').classList.remove('hidden')
                    document.getElementById('messagesEmpty').classList.add('hidden')
                    renderMessages(data.messages)
                } else {
                    document.getElementById('messagesList').classList.add('hidden')
                    document.getElementById('messagesEmpty').classList.remove('hidden')
                }
            } catch (error) {
                console.error('Failed to load messages:', error)
                document.getElementById('messagesLoading').classList.add('hidden')
                document.getElementById('messagesEmpty').classList.remove('hidden')
            }
        }

        // メッセージをレンダリング（LINE風UI）
        function renderMessages(messages) {
            const messagesList = document.getElementById('messagesList')
            messagesList.innerHTML = messages.map(msg => {
                const isOwn = msg.user_id === currentUser.id
                const time = new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                const avatarUrl = msg.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(msg.nickname || 'User') + '&background=random'
                
                // 既読状態の計算
                const readCount = msg.read_count || 0
                const totalMembers = msg.total_members || 1
                const isRead = readCount >= totalMembers - 1 // 自分以外全員が既読
                
                // 1分以内かチェック
                const createdAt = new Date(msg.created_at).getTime()
                const now = Date.now()
                const canDelete = isOwn && (now - createdAt < 60000)

                if (isOwn) {
                    // 自分のメッセージ（右側）
                    return \`
                        <div class="flex justify-end items-end gap-2 group">
                            <div class="flex flex-col items-end">
                                <div class="flex items-end gap-2">
                                    <div class="flex flex-col items-end text-xs text-gray-500">
                                        <span>\${time}</span>
                                        \${isRead ? '<span class="text-blue-500">既読</span>' : '<span class="text-gray-400">未読</span>'}
                                    </div>
                                    <div class="message-bubble message-own px-4 py-2 max-w-md relative">
                                        <p class="whitespace-pre-wrap break-words">\${msg.message}</p>
                                        \${canDelete ? \`
                                            <button 
                                                onclick="deleteMessage(\${msg.id})" 
                                                class="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                                title="削除"
                                            >
                                                <i class="fas fa-times text-xs"></i>
                                            </button>
                                        \` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`
                } else {
                    // 相手のメッセージ（左側、アイコン付き）
                    return \`
                        <div class="flex items-start gap-2">
                            <img 
                                src="\${avatarUrl}" 
                                alt="\${msg.nickname}" 
                                class="w-10 h-10 rounded-full flex-shrink-0"
                            />
                            <div class="flex flex-col">
                                <p class="text-xs font-semibold text-gray-700 mb-1 ml-1">\${msg.nickname || 'ユーザー'}</p>
                                <div class="flex items-end gap-2">
                                    <div class="message-bubble message-other px-4 py-2 max-w-md">
                                        <p class="whitespace-pre-wrap break-words">\${msg.message}</p>
                                    </div>
                                    <span class="text-xs text-gray-500">\${time}</span>
                                </div>
                            </div>
                        </div>
                    \`
                }
            }).join('')

            // 最下部にスクロール
            const container = document.getElementById('messagesContainer')
            container.scrollTop = container.scrollHeight
            
            // 未読メッセージを既読にする
            markMessagesAsRead(messages)
        }
        
        // メッセージを既読にする
        async function markMessagesAsRead(messages) {
            const token = getToken()
            const unreadMessages = messages.filter(msg => msg.user_id !== currentUser.id)
            
            for (const msg of unreadMessages) {
                try {
                    await fetch('/api/chat/messages/' + msg.id + '/read', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token }
                    })
                } catch (error) {
                    console.error('Failed to mark message as read:', error)
                }
            }
        }
        
        // メッセージを削除
        window.deleteMessage = async function(messageId) {
            if (!confirm('このメッセージを削除しますか？')) return
            
            const token = getToken()
            try {
                const response = await fetch('/api/chat/messages/' + messageId, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                
                const data = await response.json()
                if (data.success) {
                    showToast('メッセージを削除しました', 'success')
                    loadMessages() // 再読み込み
                } else {
                    showToast(data.error || 'メッセージの削除に失敗しました', 'error')
                }
            } catch (error) {
                console.error('Failed to delete message:', error)
                showToast('メッセージの削除に失敗しました', 'error')
            }
        }

        // メッセージを送信
        document.getElementById('messageForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            const messageInput = document.getElementById('messageInput')
            const sendBtn = document.getElementById('sendBtn')
            const message = messageInput.value.trim()

            if (!message) return

            sendBtn.disabled = true
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'

            try {
                const token = getToken()
                const response = await fetch('/api/chat/rooms/' + roomId + '/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ message })
                })

                if (!response.ok) throw new Error('Failed to send message')

                const data = await response.json()
                if (data.success) {
                    messageInput.value = ''
                    loadMessages() // 再読み込み
                }
            } catch (error) {
                console.error('Failed to send message:', error)
                showToast('メッセージの送信に失敗しました', 'error')
            } finally {
                sendBtn.disabled = false
                sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span class="hidden sm:inline">送信</span>'
            }
        })

        // ポーリングでメッセージを更新（5秒ごと）
        function startPolling() {
            pollingInterval = setInterval(() => {
                loadMessages()
            }, 5000)
        }

        // 初期化
        async function init() {
            const authenticated = await checkAuth()
            if (authenticated) {
                await loadRoomInfo()
                await loadMessages()
                startPolling()
            }
        }

        init()

        // ページを離れるときにポーリングを停止
        window.addEventListener('beforeunload', () => {
            if (pollingInterval) {
                clearInterval(pollingInterval)
            }
        })
    </script>
</body>
</html>
  `)
})

/**
 * GET /profile
 * ユーザープロフィールページ
 */
tenantPublic.get('/profile', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>プロフィール - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <!-- ヘッダー -->
    <header class="bg-white shadow-sm sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold " style="color: var(--commons-text-primary);">
                    <i class="fas fa-user-circle mr-2 text-primary"></i>
                    プロフィール
                </h1>
                <a href="javascript:history.back()" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-times text-xl"></i>
                </a>
            </div>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="max-w-4xl mx-auto px-4 py-8">
        <!-- ローディング -->
        <div id="loading" class="flex justify-center py-12">
            <div class="text-center">
                <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600">読み込み中...</p>
            </div>
        </div>

        <!-- プロフィール表示 -->
        <div id="profileContent" class="hidden">
            <!-- アバターセクション -->
            <div class="bg-white rounded-lg shadow-sm p-8 mb-6">
                <div class="flex flex-col items-center">
                    <div class="relative mb-4">
                        <img 
                            id="avatarPreview" 
                            src="" 
                            alt="アバター" 
                            class="w-32 h-32 rounded-full object-cover border-4 border-primary"
                        />
                        <button 
                            id="changeAvatarBtn"
                            class="absolute bottom-0 right-0 bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-700 transition shadow-lg"
                        >
                            <i class="fas fa-camera"></i>
                        </button>
                        <input type="file" id="avatarInput" accept="image/*" class="hidden" />
                    </div>
                    <h2 id="userName" class="text-2xl font-bold  mb-2" style="color: var(--commons-text-primary);"></h2>
                    <p id="userEmail" class="text-gray-600 mb-4"></p>
                    <div class="flex gap-2">
                        <span id="userRole" class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold"></span>
                        <span id="userStatus" class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold"></span>
                    </div>
                </div>
            </div>

            <!-- プロフィール編集フォーム -->
            <div class="bg-white rounded-lg shadow-sm p-8">
                <h3 class="text-xl font-bold  mb-6" style="color: var(--commons-text-primary);">
                    <i class="fas fa-edit mr-2 text-primary"></i>
                    プロフィール編集
                </h3>
                
                <form id="profileForm" class="space-y-6">
                    <!-- ニックネーム -->
                    <div>
                        <label for="nickname" class="block text-sm font-semibold text-gray-700 mb-2">
                            ニックネーム <span class="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="nickname"
                            name="nickname"
                            required
                            maxlength="50"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="ニックネームを入力"
                        />
                        <p class="text-xs text-gray-500 mt-1">最大50文字</p>
                    </div>

                    <!-- 自己紹介 -->
                    <div>
                        <label for="bio" class="block text-sm font-semibold text-gray-700 mb-2">
                            自己紹介
                        </label>
                        <textarea
                            id="bio"
                            name="bio"
                            rows="5"
                            maxlength="500"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="自己紹介を入力"
                        ></textarea>
                        <p class="text-xs text-gray-500 mt-1">最大500文字</p>
                    </div>

                    <!-- アカウント情報 -->
                    <div class="pt-6 border-t border-gray-200">
                        <h4 class="text-lg font-bold text-gray-900 mb-4">アカウント情報</h4>
                        <div class="space-y-3 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">メールアドレス:</span>
                                <span id="emailDisplay" class="font-medium text-gray-900"></span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">登録日:</span>
                                <span id="createdAt" class="font-medium text-gray-900"></span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">最終ログイン:</span>
                                <span id="lastLogin" class="font-medium text-gray-900"></span>
                            </div>
                        </div>
                    </div>

                    <!-- ボタン -->
                    <div class="flex gap-4 pt-6">
                        <button
                            type="submit"
                            id="saveBtn"
                            class="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                        >
                            <i class="fas fa-save mr-2"></i>
                            保存
                        </button>
                        <button
                            type="button"
                            onclick="history.back()"
                            class="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                        >
                            <i class="fas fa-times mr-2"></i>
                            キャンセル
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <script src="/static/app.js"></script>
    <script>
        let currentUser = null

        // プロフィールを読み込み
        async function loadProfile() {
            const token = getToken()
            if (!token) {
                window.location.href = '/login'
                return
            }

            try {
                const response = await fetch('/api/profile', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })

                if (!response.ok) throw new Error('Failed to load profile')

                const data = await response.json()
                if (data.success) {
                    currentUser = data.user
                    displayProfile(data.user)
                }
            } catch (error) {
                console.error('Failed to load profile:', error)
                showToast('プロフィールの読み込みに失敗しました', 'error')
            } finally {
                document.getElementById('loading').classList.add('hidden')
                document.getElementById('profileContent').classList.remove('hidden')
            }
        }

        // プロフィールを表示
        function displayProfile(user) {
            // アバター
            const avatarUrl = user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.nickname || user.email) + '&background=random&size=256'
            document.getElementById('avatarPreview').src = avatarUrl

            // 基本情報
            document.getElementById('userName').textContent = user.nickname || 'ユーザー'
            document.getElementById('userEmail').textContent = user.email

            // ロールとステータス
            const roleMap = {
                'owner': 'オーナー',
                'admin': '管理者',
                'member': 'メンバー'
            }
            document.getElementById('userRole').textContent = roleMap[user.role] || user.role

            const statusMap = {
                'active': 'アクティブ',
                'pending': '承認待ち',
                'suspended': '停止中'
            }
            document.getElementById('userStatus').textContent = statusMap[user.status] || user.status

            // フォーム
            document.getElementById('nickname').value = user.nickname || ''
            document.getElementById('bio').value = user.bio || ''
            document.getElementById('emailDisplay').textContent = user.email

            // 日時
            if (user.created_at) {
                document.getElementById('createdAt').textContent = new Date(user.created_at).toLocaleDateString('ja-JP')
            }
            if (user.last_login_at) {
                document.getElementById('lastLogin').textContent = new Date(user.last_login_at).toLocaleString('ja-JP')
            }
        }

        // プロフィール更新
        document.getElementById('profileForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            const saveBtn = document.getElementById('saveBtn')
            const nickname = document.getElementById('nickname').value.trim()
            const bio = document.getElementById('bio').value.trim()

            if (!nickname) {
                showToast('ニックネームを入力してください', 'error')
                return
            }

            saveBtn.disabled = true
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中...'

            try {
                const token = getToken()
                const response = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ nickname, bio })
                })

                const data = await response.json()
                if (data.success) {
                    showToast('プロフィールを更新しました', 'success')
                    
                    // localStorageのユーザー情報も更新
                    const userStr = localStorage.getItem('user')
                    if (userStr) {
                        const user = JSON.parse(userStr)
                        user.nickname = nickname
                        localStorage.setItem('user', JSON.stringify(user))
                    }
                    
                    // 再読み込み
                    setTimeout(() => loadProfile(), 1000)
                } else {
                    showToast(data.error || 'プロフィールの更新に失敗しました', 'error')
                }
            } catch (error) {
                console.error('Failed to update profile:', error)
                showToast('プロフィールの更新に失敗しました', 'error')
            } finally {
                saveBtn.disabled = false
                saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>保存'
            }
        })

        // アバター変更
        document.getElementById('changeAvatarBtn').addEventListener('click', () => {
            document.getElementById('avatarInput').click()
        })

        document.getElementById('avatarInput').addEventListener('change', async (e) => {
            const file = e.target.files[0]
            if (!file) return

            // 5MB制限
            if (file.size > 5 * 1024 * 1024) {
                showToast('画像サイズは5MB以下にしてください', 'error')
                return
            }

            // プレビュー表示
            const reader = new FileReader()
            reader.onload = (e) => {
                document.getElementById('avatarPreview').src = e.target.result
            }
            reader.readAsDataURL(file)

            // アップロード
            try {
                const token = getToken()
                const formData = new FormData()
                formData.append('avatar', file)

                const response = await fetch('/api/profile/avatar', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token
                    },
                    body: formData
                })

                const data = await response.json()
                if (data.success) {
                    showToast('アバターを更新しました', 'success')
                    loadProfile() // 再読み込み
                } else {
                    showToast(data.error || 'アバターの更新に失敗しました', 'error')
                }
            } catch (error) {
                console.error('Failed to upload avatar:', error)
                showToast('アバターの更新に失敗しました', 'error')
            }
        })

        // 初期化
        loadProfile()
    </script>
</body>
</html>
  `)
})

/**
 * GET /forgot-password
 * パスワード忘れページ
 */

/**
 * GET /tenant/member-plans
 * 一般会員向けプラン選択・変更ページ
 */
tenantPublic.get('/member-plans', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')

  if (!subdomain) {
    return c.text('Subdomain required', 400)
  }

  // テナント情報取得
  const tenant = await DB.prepare(`
    SELECT * FROM tenants WHERE subdomain = ?
  `).bind(subdomain).first()

  if (!tenant) {
    return c.text('Tenant not found', 404)
  }

  return c.html(`
<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>プラン選択 - ${(tenant as any).name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
</head>
<body class="bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- ヘッダー -->
    <header class="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div class="container mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <h1 class="text-xl md:text-2xl font-bold text-gradient">
                    <i class="fas fa-tags mr-2"></i>
                    プラン選択
                </h1>
                <a href="/tenant/home?subdomain=${subdomain}" class="btn-ghost">
                    <i class="fas fa-arrow-left mr-2"></i>
                    ホームに戻る
                </a>
            </div>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="container mx-auto px-4 py-8">
        <!-- 現在のプラン -->
        <div id="currentPlanSection" class="bg-white rounded-lg shadow-md p-6 mb-8 hidden">
            <h2 class="text-xl font-bold mb-4">
                <i class="fas fa-check-circle text-green-600 mr-2"></i>
                現在のプラン
            </h2>
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-bold text-green-900" id="currentPlanName"></p>
                        <p class="text-sm text-green-700" id="currentPlanDescription"></p>
                        <p class="text-xs text-green-600 mt-1" id="currentPlanExpiry"></p>
                    </div>
                    <div class="text-right">
                        <p class="text-2xl font-bold text-green-900" id="currentPlanPrice"></p>
                        <p class="text-xs text-green-600">/ 月</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- プラン一覧 -->
        <div class="mb-8">
            <h2 class="text-2xl font-bold mb-6 text-center">
                <i class="fas fa-list mr-2"></i>
                利用可能なプラン
            </h2>
            <div id="plansList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <p class="col-span-full text-gray-600 text-center py-8">読み込み中...</p>
            </div>
        </div>
    </main>

    <!-- プラン選択確認モーダル -->
    <div id="confirmModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h2 class="text-2xl font-bold mb-4">プラン変更の確認</h2>
            <div class="mb-6">
                <p class="text-gray-700 mb-2">以下のプランに変更しますか？</p>
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p class="font-bold text-gray-900" id="confirmPlanName"></p>
                    <p class="text-sm text-gray-600" id="confirmPlanDescription"></p>
                    <p class="text-2xl font-bold text-primary-600 mt-2" id="confirmPlanPrice"></p>
                </div>
            </div>
            <div class="flex gap-3">
                <button onclick="closeConfirmModal()" class="flex-1 btn-ghost">
                    キャンセル
                </button>
                <button onclick="confirmPlanChange()" class="flex-1 btn-primary">
                    <i class="fas fa-check mr-2"></i>確定
                </button>
            </div>
        </div>
    </div>

    <!-- Toast通知 -->
    <div id="toast" class="hidden fixed top-4 right-4 z-50"></div>

    <script>
        const subdomain = '${subdomain}'
        let selectedPlanId = null

        // Toast通知
        function showToast(message, type = 'info') {
            const toast = document.getElementById('toast')
            const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            toast.className = \`fixed top-4 right-4 z-50 \${bgColor} text-white px-6 py-3 rounded-lg shadow-lg\`
            toast.textContent = message
            setTimeout(() => {
                toast.classList.add('hidden')
            }, 3000)
        }

        // 認証トークン取得
        function getToken() {
            return localStorage.getItem('token')
        }

        // 現在のプラン情報を取得
        async function loadCurrentPlan() {
            try {
                const token = getToken()
                if (!token) return

                const response = await axios.get('/api/tenant/member/current-plan', {
                    headers: { Authorization: \`Bearer \${token}\` },
                    params: { subdomain }
                })

                if (response.data.success && response.data.plan) {
                    const plan = response.data.plan
                    document.getElementById('currentPlanName').textContent = plan.name
                    document.getElementById('currentPlanDescription').textContent = plan.description || ''
                    document.getElementById('currentPlanPrice').textContent = \`¥\${plan.price.toLocaleString()}\`
                    
                    if (response.data.expires_at) {
                        const expiry = new Date(response.data.expires_at)
                        document.getElementById('currentPlanExpiry').textContent = 
                            \`有効期限: \${expiry.toLocaleDateString('ja-JP')}\`
                    } else {
                        document.getElementById('currentPlanExpiry').textContent = '継続中'
                    }
                    
                    document.getElementById('currentPlanSection').classList.remove('hidden')
                }
            } catch (error) {
                console.error('Failed to load current plan:', error)
            }
        }

        // 利用可能なプラン一覧を取得
        async function loadPlans() {
            try {
                const response = await axios.get('/api/tenant/member/plans', {
                    params: { subdomain }
                })

                if (!response.data.success || !response.data.plans.length) {
                    document.getElementById('plansList').innerHTML = \`
                        <p class="col-span-full text-gray-600 text-center py-8">
                            現在利用可能なプランはありません
                        </p>
                    \`
                    return
                }

                const plansHtml = response.data.plans.map(plan => \`
                    <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                        <div class="mb-4">
                            <h3 class="text-2xl font-bold  mb-2" style="color: var(--commons-text-primary);">\${plan.name}</h3>
                            <p class="text-gray-600 text-sm mb-4">\${plan.description || ''}</p>
                            <div class="flex items-baseline">
                                <span class="text-4xl font-bold text-primary-600">¥\${plan.price.toLocaleString()}</span>
                                <span class="text-gray-600 ml-2">/ 月</span>
                            </div>
                        </div>
                        
                        \${plan.features ? \`
                            <div class="mb-6">
                                <p class="text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-star text-yellow-500 mr-1"></i>特典
                                </p>
                                <ul class="text-sm text-gray-600 space-y-1">
                                    \${JSON.parse(plan.features).map(f => \`
                                        <li><i class="fas fa-check text-green-500 mr-2"></i>\${f}</li>
                                    \`).join('')}
                                </ul>
                            </div>
                        \` : ''}
                        
                        <button onclick="selectPlan(\${plan.id}, '\${plan.name}', '\${plan.description || ''}', \${plan.price})" 
                                class="w-full btn-primary">
                            <i class="fas fa-check mr-2"></i>このプランを選択
                        </button>
                    </div>
                \`).join('')

                document.getElementById('plansList').innerHTML = plansHtml
            } catch (error) {
                console.error('Failed to load plans:', error)
                document.getElementById('plansList').innerHTML = \`
                    <p class="col-span-full text-red-600 text-center py-8">
                        プランの読み込みに失敗しました
                    </p>
                \`
            }
        }

        // プラン選択
        function selectPlan(planId, name, description, price) {
            const token = getToken()
            if (!token) {
                showToast('ログインが必要です', 'error')
                setTimeout(() => {
                    window.location.href = \`/login?subdomain=\${subdomain}\`
                }, 1000)
                return
            }

            selectedPlanId = planId
            document.getElementById('confirmPlanName').textContent = name
            document.getElementById('confirmPlanDescription').textContent = description
            document.getElementById('confirmPlanPrice').textContent = \`¥\${price.toLocaleString()} / 月\`
            document.getElementById('confirmModal').classList.remove('hidden')
        }

        // モーダルを閉じる
        function closeConfirmModal() {
            document.getElementById('confirmModal').classList.add('hidden')
            selectedPlanId = null
        }

        // プラン変更を確定
        async function confirmPlanChange() {
            if (!selectedPlanId) return

            try {
                const token = getToken()
                const response = await axios.post('/api/tenant/member/change-plan', {
                    subdomain,
                    plan_id: selectedPlanId
                }, {
                    headers: { Authorization: \`Bearer \${token}\` }
                })

                if (response.data.success) {
                    // Stripe Checkoutにリダイレクト
                    if (response.data.checkout_url) {
                        showToast('決済ページに移動します...', 'success')
                        setTimeout(() => {
                            window.location.href = response.data.checkout_url
                        }, 1000)
                    } 
                    // Stripe Portalにリダイレクト（既存サブスクリプション変更）
                    else if (response.data.redirect_url && response.data.is_portal) {
                        showToast('サブスクリプション管理ページに移動します...', 'success')
                        setTimeout(() => {
                            window.location.href = response.data.redirect_url
                        }, 1000)
                    }
                    // 直接プラン変更完了（無料プランなど）
                    else {
                        showToast(response.data.message || 'プランを変更しました！', 'success')
                        closeConfirmModal()
                        setTimeout(() => {
                            loadCurrentPlan()
                            loadPlans()
                        }, 1000)
                    }
                } else {
                    showToast(response.data.message || 'プラン変更に失敗しました', 'error')
                }
            } catch (error) {
                console.error('Failed to change plan:', error)
                const message = error.response?.data?.message || 'プラン変更に失敗しました'
                showToast(message, 'error')
            }
        }

        // 初期化
        loadCurrentPlan()
        loadPlans()

        // URL パラメーターから決済結果をチェック
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('success') === 'true') {
            showToast('決済が完了しました！プランが適用されました。', 'success')
            // URLをクリーンアップ
            window.history.replaceState({}, document.title, window.location.pathname + '?subdomain=' + subdomain)
        } else if (urlParams.get('canceled') === 'true') {
            showToast('決済がキャンセルされました。', 'error')
            // URLをクリーンアップ
            window.history.replaceState({}, document.title, window.location.pathname + '?subdomain=' + subdomain)
        }
    </script>
</body>
</html>
  `)
})

// ============================================
// プラン選択ページ - プレミアムデザイン版
// Vivoo風のビジュアルデザインを適用
// ============================================
tenantPublic.get('/member-plans-premium', async (c) => {
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.html(`
      <!DOCTYPE html>
      <html lang="ja" data-theme="light">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>プラン選択 - Commons</title>
      </head>
      <body>
        <p>サブドメインを指定してください: /tenant/member-plans-premium?subdomain=your-subdomain</p>
      </body>
      </html>
    `)
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja" data-theme="light">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>プラン選択 - Commons</title>
      <script src="https://cdn.tailwindcss.com"></script>
        <script src="/static/tailwind-config.js"></script>
      <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      <link href="/static/commons-theme.css" rel="stylesheet">
      <link href="/static/plan-selection.css" rel="stylesheet">
    </head>
    <body class="bg-white overflow-x-hidden">
      
      <!-- 背景装飾要素（有機的シェイプ） -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden" style="z-index: 0;">
        <div class="organic-shape shape-purple"></div>
        <div class="organic-shape shape-terracotta"></div>
        <div class="organic-shape shape-cyan"></div>
        <div class="organic-shape shape-lime"></div>
      </div>

      <!-- メインコンテンツ -->
      <div class="relative" style="z-index: 10;">
        
        <!-- ヘッダー -->
        <header class="header-container">
          <div class="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
            <!-- ロゴ -->
            <a href="/tenant/home?subdomain=${subdomain}" class="commons-logo">
              <i class="fas fa-users"></i>
              <span>Commons</span>
            </a>
            
            <!-- ナビゲーション -->
            <nav class="header-nav">
              <a href="/tenant/home?subdomain=${subdomain}">ホーム</a>
              <a href="/tenant/posts?subdomain=${subdomain}">投稿</a>
              <a href="/tenant/members?subdomain=${subdomain}">メンバー</a>
              <a href="/tenant/member-plans-premium?subdomain=${subdomain}" class="active">プラン</a>
            </nav>
            
            <!-- CTAボタン -->
            <button onclick="scrollToPlans()" class="cta-button">
              <i class="fas fa-crown"></i>
              <span>プランを選ぶ</span>
            </button>
          </div>
        </header>

        <!-- ヒーローセクション -->
        <section class="hero-section">
          <div class="max-w-7xl mx-auto px-8 py-20">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              <!-- 左側：キャッチコピー -->
              <div class="hero-content fade-in-left">
                <h1 class="hero-headline">
                  あなたに合った<br>
                  プランで、<br>
                  もっと楽しく。
                </h1>
                <div class="hero-divider"></div>
                <p class="hero-subheadline">
                  プランによって楽しめるコンテンツが変わります
                </p>
                <p class="hero-description">
                  無料から始めて、必要に応じてアップグレード。<br>
                  あなたのペースで、コミュニティを楽しもう。
                </p>
              </div>

              <!-- 右側：ビジュアル -->
              <div class="hero-visual fade-in-right">
                <!-- メインシェイプ（黄色の有機的図形） -->
                <div class="main-shape">
                  <div class="shape-overlay-text">
                    Choose<br>
                    Your<br>
                    Perfect Plan
                  </div>
                  
                  <!-- イラスト: 会員キャラクター -->
                  <div class="character character-1">
                    <i class="fas fa-user-circle"></i>
                  </div>
                  <div class="character character-2">
                    <i class="fas fa-crown"></i>
                  </div>
                  <div class="character character-3">
                    <i class="fas fa-star"></i>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- プラン一覧セクション -->
        <section class="plans-section" id="plans-section">
          <div class="max-w-7xl mx-auto px-8 py-20">
            
            <!-- セクションタイトル -->
            <div class="text-center mb-16 fade-in-up">
              <h2 class="section-title">プランを選択</h2>
              <p class="section-description">
                全てのプランで基本機能が使えます。上位プランでより多くのコンテンツにアクセスできます。
              </p>
            </div>

            <!-- プランカードグリッド -->
            <div id="plans-grid" class="plans-grid">
              <div style="text-align: center; padding: 40px; color: var(--commons-text-tertiary);">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 16px;"></i>
                <p>プランを読み込み中...</p>
              </div>
            </div>

            <!-- 現在のプラン表示 -->
            <div id="current-plan-banner" class="current-plan-banner" style="display: none;">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <i class="fas fa-info-circle" style="font-size: 24px;"></i>
                  <div>
                    <p style="font-weight: 600;">現在のプラン</p>
                    <p id="current-plan-name" style="font-size: 14px; opacity: 0.9;"></p>
                  </div>
                </div>
                <button onclick="showUpgradeOptions()" class="upgrade-button">
                  <i class="fas fa-arrow-up"></i>
                  アップグレード
                </button>
              </div>
            </div>

          </div>
        </section>

        <!-- 機能比較セクション -->
        <section class="comparison-section">
          <div class="max-w-7xl mx-auto px-8 py-20">
            <div class="text-center mb-16 fade-in-up">
              <h2 class="section-title">プラン比較</h2>
              <p class="section-description">
                各プランで利用できる機能を比較してください
              </p>
            </div>

            <!-- 比較テーブル -->
            <div class="comparison-table-container">
              <table class="comparison-table" id="comparison-table">
                <tr>
                  <td colspan="4" style="text-align: center; padding: 40px; color: var(--commons-text-tertiary);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i>
                    <p style="margin-top: 12px;">比較表を読み込み中...</p>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </section>

      </div>

      <!-- プラン確認モーダル -->
      <div id="plan-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">プランを確認</h3>
            <button onclick="closePlanModal()" class="modal-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div id="modal-plan-details">
              <!-- JavaScript で動的に生成 -->
            </div>
          </div>
          <div class="modal-footer">
            <button onclick="closePlanModal()" class="btn-secondary">
              キャンセル
            </button>
            <button onclick="confirmPlanSelection()" class="btn-primary">
              <i class="fas fa-check"></i>
              このプランを選択
            </button>
          </div>
        </div>
      </div>

      <!-- JavaScript -->
      <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
      <script>
        const subdomain = '${subdomain}'
      </script>
      <script src="/static/plan-selection.js"></script>

    </body>
    </html>
  `)
})

// ============================================
// イベントカレンダーページ（一般会員向け）
// ============================================
tenantPublic.get('/events', async (c) => {
  const { DB } = c.env
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.text('Subdomain is required', 400)
  }
  
  // テナント情報を取得
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first() as any
  
  if (!tenant) {
    return c.text('Tenant not found', 404)
  }
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  
  // 今月の開始日と終了日を計算
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // 今月以降のイベントを取得
  const eventsResult = await DB.prepare(`
    SELECT *
    FROM events
    WHERE tenant_id = ? AND is_published = 1
    AND start_datetime >= datetime('now')
    ORDER BY start_datetime ASC
    LIMIT 50
  `).bind(tenant.id).all()
  
  const events = eventsResult.results || []
  
  // 注目イベントを取得
  const featuredResult = await DB.prepare(`
    SELECT *
    FROM events
    WHERE tenant_id = ? AND is_published = 1 AND is_featured = 1
    AND start_datetime >= datetime('now')
    ORDER BY start_datetime ASC
    LIMIT 3
  `).bind(tenant.id).all()
  
  const featuredEvents = featuredResult.results || []
  
  return c.html(`<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>イベントカレンダー - ${tenantName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/commons-theme.css" rel="stylesheet">
    <link href="/static/commons-components.css" rel="stylesheet">
</head>
<body style="background: var(--commons-bg-light);">
    <!-- ヘッダー -->
    ${renderCommonHeader(tenantName, subdomain, 'events')}

    <!-- ページヘッダー -->
    <section style="background: linear-gradient(135deg, var(--commons-primary) 0%, var(--commons-primary-dark) 100%); color: white; padding: 64px 24px 48px;">
        <div style="max-width: 1280px; margin: 0 auto;">
            <h1 style="font-size: var(--font-size-xlarge); font-weight: var(--font-weight-bold); margin-bottom: 16px;">
                <i class="fas fa-calendar-alt" style="margin-right: 16px;"></i>イベントカレンダー
            </h1>
            <p style="font-size: var(--font-size-medium); opacity: 0.9;">${tenantName}の今後のイベント</p>
        </div>
    </section>

    <!-- メインコンテンツ -->
    <main style="max-width: 1280px; margin: 0 auto; padding: 48px 24px;">
        <div class="space-y-6">
            ${featuredEvents.length > 0 ? `
                <!-- 注目イベント -->
                <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-sm p-6">
                    <h2 class="text-2xl font-bold  mb-4 flex items-center" style="color: var(--commons-text-primary);">
                        <span class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-star text-white"></i>
                        </span>
                        注目イベント
                    </h2>
                    <div class="space-y-4" id="featuredEvents">
                        <!-- JavaScriptで生成 -->
                    </div>
                </div>
                ` : ''}
                
                <!-- イベント一覧 -->
                <div class="bg-white rounded-2xl shadow-sm p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-2xl font-bold  flex items-center" style="color: var(--commons-text-primary);">
                            <i class="fas fa-calendar-day style="color: var(--commons-primary)" mr-3"></i>
                            今後のイベント
                        </h2>
                        <div class="flex gap-2">
                            <button id="listViewBtn" class="px-4 py-2 style="background: var(--commons-primary)" text-white rounded-lg font-semibold">
                                <i class="fas fa-list mr-2"></i>リスト
                            </button>
                            <button id="calendarViewBtn" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                                <i class="fas fa-calendar mr-2"></i>カレンダー
                            </button>
                        </div>
                    </div>
                    
                    <!-- リストビュー -->
                    <div id="listView" class="space-y-4">
                        <!-- JavaScriptで生成 -->
                    </div>
                    
                    <!-- カレンダービュー -->
                    <div id="calendarView" class="hidden">
                        <div class="flex items-center justify-between mb-4">
                            <button id="prevMonth" class="p-2 hover:bg-gray-100 rounded-lg transition">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <h3 id="currentMonth" class="text-xl font-bold"></h3>
                            <button id="nextMonth" class="p-2 hover:bg-gray-100 rounded-lg transition">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        <div class="grid grid-cols-7 gap-2" id="calendar">
                            <!-- JavaScriptで生成 -->
                        </div>
                    </div>
                </div>
        </div>
    </main>

    ${renderCommonFooter(tenantName)}

    <!-- イベント詳細モーダル -->
    <div id="eventModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div id="modalContent">
                <!-- JavaScriptで動的に生成 -->
            </div>
        </div>
    </div>

    <script src="/static/app.js"></script>
    <script>
        const subdomain = '${subdomain}'
        const eventsData = ${JSON.stringify(events)}
        const featuredEventsData = ${JSON.stringify(featuredEvents)}
        
        // イベントタイプの色を取得
        function getEventTypeColor(type) {
            switch(type) {
                case 'live': return 'bg-red-500'
                case 'online': return 'bg-blue-500'
                case 'meetup': return 'bg-green-500'
                default: return 'bg-purple-500'
            }
        }
        
        // イベントタイプのラベルを取得
        function getEventTypeLabel(type) {
            switch(type) {
                case 'live': return 'ライブ'
                case 'online': return 'オンライン'
                case 'meetup': return 'ミートアップ'
                default: return 'イベント'
            }
        }
        
        // 日時をフォーマット
        function formatEventDate(datetime) {
            const date = new Date(datetime)
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        }
        
        // 注目イベントを表示
        function renderFeaturedEvents() {
            const container = document.getElementById('featuredEvents')
            if (!container || featuredEventsData.length === 0) return
            
            container.innerHTML = featuredEventsData.map(event => {
                const typeColor = getEventTypeColor(event.event_type)
                const typeLabel = getEventTypeLabel(event.event_type)
                
                return \`
                    <div class="event-card bg-white rounded-xl p-4 cursor-pointer hover:shadow-lg transition" onclick="showEventDetail(\${event.id})">
                        <div class="flex gap-4">
                            \${event.thumbnail_url ? \`
                                <img src="\${event.thumbnail_url}" alt="\${event.title}" class="w-24 h-24 rounded-lg object-cover">
                            \` : \`
                                <div class="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-calendar-star text-3xl text-white"></i>
                                </div>
                            \`}
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="\${typeColor} text-white text-xs px-2 py-1 rounded-full">\${typeLabel}</span>
                                    \${event.is_member_only ? '<span class="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">会員限定</span>' : ''}
                                </div>
                                <h3 class="font-bold  mb-1 truncate" style="color: var(--commons-text-primary);">\${event.title}</h3>
                                <p class="text-sm text-gray-600">
                                    <i class="far fa-calendar mr-1"></i>\${formatEventDate(event.start_datetime)}
                                </p>
                                \${event.location_name ? \`<p class="text-sm text-gray-600 mt-1"><i class="fas fa-map-marker-alt mr-1"></i>\${event.location_name}</p>\` : ''}
                            </div>
                        </div>
                    </div>
                \`
            }).join('')
        }
        
        // イベントリストを表示
        function renderEventsList() {
            const container = document.getElementById('listView')
            if (!container) return
            
            if (eventsData.length === 0) {
                container.innerHTML = \`
                    <div class="text-center py-12">
                        <div class="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <i class="fas fa-calendar-times text-3xl text-gray-400"></i>
                        </div>
                        <p class="text-gray-600">今後のイベントはありません</p>
                    </div>
                \`
                return
            }
            
            container.innerHTML = eventsData.map(event => {
                const typeColor = getEventTypeColor(event.event_type)
                const typeLabel = getEventTypeLabel(event.event_type)
                
                return \`
                    <div class="event-card bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 cursor-pointer hover:shadow-lg transition" onclick="showEventDetail(\${event.id})">
                        <div class="flex gap-4">
                            \${event.thumbnail_url ? \`
                                <img src="\${event.thumbnail_url}" alt="\${event.title}" class="w-32 h-32 rounded-lg object-cover">
                            \` : \`
                                <div class="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-calendar-day text-4xl text-white"></i>
                                </div>
                            \`}
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="\${typeColor} text-white text-xs px-3 py-1 rounded-full font-semibold">\${typeLabel}</span>
                                    \${event.is_featured ? '<span class="bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-semibold"><i class="fas fa-star mr-1"></i>注目</span>' : ''}
                                    \${event.is_member_only ? '<span class="bg-purple-500 text-white text-xs px-3 py-1 rounded-full font-semibold">会員限定</span>' : ''}
                                </div>
                                <h3 class="text-xl font-bold  mb-2" style="color: var(--commons-text-primary);">\${event.title}</h3>
                                <p class="text-gray-600 mb-3 line-clamp-2">\${event.description || ''}</p>
                                <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                                    <div><i class="far fa-calendar style="color: var(--commons-primary)" mr-2"></i>\${formatEventDate(event.start_datetime)}</div>
                                    \${event.location_name ? \`<div><i class="fas fa-map-marker-alt text-red-600 mr-2"></i>\${event.location_name}</div>\` : ''}
                                    \${event.max_participants ? \`<div><i class="fas fa-users text-blue-600 mr-2"></i>定員 \${event.max_participants}名</div>\` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                \`
            }).join('')
        }
        
        // イベント詳細を表示
        function showEventDetail(eventId) {
            const event = eventsData.find(e => e.id === eventId) || featuredEventsData.find(e => e.id === eventId)
            if (!event) return
            
            const modal = document.getElementById('eventModal')
            const content = document.getElementById('modalContent')
            const typeColor = getEventTypeColor(event.event_type)
            const typeLabel = getEventTypeLabel(event.event_type)
            
            content.innerHTML = \`
                <div class="relative">
                    \${event.thumbnail_url ? \`
                        <img src="\${event.thumbnail_url}" alt="\${event.title}" class="w-full h-64 object-cover rounded-t-2xl">
                    \` : \`
                        <div class="w-full h-64 bg-gradient-to-br from-purple-400 to-pink-500 rounded-t-2xl flex items-center justify-center">
                            <i class="fas fa-calendar-star text-8xl text-white opacity-50"></i>
                        </div>
                    \`}
                    <button onclick="closeEventModal()" class="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur text-white rounded-full hover:bg-black/70 transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="p-8">
                    <div class="flex flex-wrap gap-2 mb-4">
                        <span class="\${typeColor} text-white text-sm px-4 py-2 rounded-full font-semibold">\${typeLabel}</span>
                        \${event.is_featured ? '<span class="bg-yellow-500 text-white text-sm px-4 py-2 rounded-full font-semibold"><i class="fas fa-star mr-1"></i>注目</span>' : ''}
                        \${event.is_member_only ? '<span class="bg-purple-500 text-white text-sm px-4 py-2 rounded-full font-semibold">会員限定</span>' : ''}
                    </div>
                    
                    <h2 class="text-3xl font-bold  mb-4" style="color: var(--commons-text-primary);">\${event.title}</h2>
                    
                    <div class="space-y-4 mb-6">
                        <div class="flex items-start gap-3">
                            <i class="far fa-calendar style="color: var(--commons-primary)" text-xl mt-1"></i>
                            <div>
                                <div class="font-semibold text-gray-900">開始</div>
                                <div class="text-gray-600">\${formatEventDate(event.start_datetime)}</div>
                            </div>
                        </div>
                        
                        \${event.end_datetime ? \`
                            <div class="flex items-start gap-3">
                                <i class="far fa-calendar-check text-green-600 text-xl mt-1"></i>
                                <div>
                                    <div class="font-semibold text-gray-900">終了</div>
                                    <div class="text-gray-600">\${formatEventDate(event.end_datetime)}</div>
                                </div>
                            </div>
                        \` : ''}
                        
                        \${event.location_name ? \`
                            <div class="flex items-start gap-3">
                                <i class="fas fa-map-marker-alt text-red-600 text-xl mt-1"></i>
                                <div>
                                    <div class="font-semibold text-gray-900">場所</div>
                                    <div class="text-gray-600">\${event.location_name}</div>
                                    \${event.location_address ? \`<div class="text-sm text-gray-500 mt-1">\${event.location_address}</div>\` : ''}
                                </div>
                            </div>
                        \` : ''}
                        
                        \${event.location_url ? \`
                            <div class="flex items-start gap-3">
                                <i class="fas fa-link text-blue-600 text-xl mt-1"></i>
                                <div>
                                    <div class="font-semibold text-gray-900">オンライン参加</div>
                                    <a href="\${event.location_url}" target="_blank" class="text-blue-600 hover:underline">\${event.location_url}</a>
                                </div>
                            </div>
                        \` : ''}
                        
                        \${event.max_participants ? \`
                            <div class="flex items-start gap-3">
                                <i class="fas fa-users text-blue-600 text-xl mt-1"></i>
                                <div>
                                    <div class="font-semibold text-gray-900">定員</div>
                                    <div class="text-gray-600">\${event.max_participants}名</div>
                                </div>
                            </div>
                        \` : ''}
                        
                        \${event.requires_ticket && event.ticket_price > 0 ? \`
                            <div class="flex items-start gap-3">
                                <i class="fas fa-ticket-alt text-green-600 text-xl mt-1"></i>
                                <div>
                                    <div class="font-semibold text-gray-900">参加費</div>
                                    <div class="text-gray-600">¥\${event.ticket_price.toLocaleString()}</div>
                                </div>
                            </div>
                        \` : ''}
                    </div>
                    
                    \${event.description ? \`
                        <div class="mb-6">
                            <h3 class="text-xl font-bold  mb-3" style="color: var(--commons-text-primary);">詳細</h3>
                            <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">\${event.description}</p>
                        </div>
                    \` : ''}
                    
                    <div class="flex gap-3">
                        \${event.ticket_url ? \`
                            <a href="\${event.ticket_url}" target="_blank" class="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-lg transition text-center">
                                <i class="fas fa-ticket-alt mr-2"></i>チケットを購入
                            </a>
                        \` : \`
                            <button class="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-lg transition">
                                <i class="fas fa-calendar-check mr-2"></i>参加登録
                            </button>
                        \`}
                        <button onclick="shareEvent(\${event.id})" class="px-6 py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            \`
            
            modal.classList.remove('hidden')
        }
        
        function closeEventModal() {
            document.getElementById('eventModal').classList.add('hidden')
        }
        
        function shareEvent(eventId) {
            const url = window.location.origin + '/tenant/events?subdomain=' + subdomain + '#event-' + eventId
            if (navigator.share) {
                navigator.share({ url })
            } else {
                navigator.clipboard.writeText(url)
                showToast('リンクをコピーしました', 'success')
            }
        }
        
        // ビュー切り替え
        document.getElementById('listViewBtn')?.addEventListener('click', () => {
            document.getElementById('listView').classList.remove('hidden')
            document.getElementById('calendarView').classList.add('hidden')
            document.getElementById('listViewBtn').className = 'px-4 py-2 style="background: var(--commons-primary)" text-white rounded-lg font-semibold'
            document.getElementById('calendarViewBtn').className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition'
        })
        
        document.getElementById('calendarViewBtn')?.addEventListener('click', () => {
            document.getElementById('listView').classList.add('hidden')
            document.getElementById('calendarView').classList.remove('hidden')
            document.getElementById('listViewBtn').className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition'
            document.getElementById('calendarViewBtn').className = 'px-4 py-2 style="background: var(--commons-primary)" text-white rounded-lg font-semibold'
            renderCalendar()
        })
        
        // カレンダー表示（簡易版）
        let currentCalendarDate = new Date()
        
        function renderCalendar() {
            const year = currentCalendarDate.getFullYear()
            const month = currentCalendarDate.getMonth()
            
            document.getElementById('currentMonth').textContent = \`\${year}年\${month + 1}月\`
            
            const firstDay = new Date(year, month, 1).getDay()
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            
            const calendar = document.getElementById('calendar')
            calendar.innerHTML = ''
            
            // 曜日ヘッダー
            ['日', '月', '火', '水', '木', '金', '土'].forEach(day => {
                const dayHeader = document.createElement('div')
                dayHeader.className = 'text-center font-semibold text-gray-600 py-2'
                dayHeader.textContent = day
                calendar.appendChild(dayHeader)
            })
            
            // 空白セル
            for (let i = 0; i < firstDay; i++) {
                calendar.appendChild(document.createElement('div'))
            }
            
            // 日付セル
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`
                const hasEvent = eventsData.some(e => e.start_datetime.startsWith(dateStr))
                
                const dayCell = document.createElement('div')
                dayCell.className = \`calendar-day flex items-center justify-center rounded-lg cursor-pointer font-semibold \${hasEvent ? 'has-event' : 'bg-white'}\`
                dayCell.textContent = day
                
                if (hasEvent) {
                    dayCell.onclick = () => {
                        const dayEvents = eventsData.filter(e => e.start_datetime.startsWith(dateStr))
                        if (dayEvents.length > 0) {
                            showEventDetail(dayEvents[0].id)
                        }
                    }
                }
                
                calendar.appendChild(dayCell)
            }
        }
        
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)
            renderCalendar()
        })
        
        document.getElementById('nextMonth')?.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)
            renderCalendar()
        })
        
        // 今月のイベント数を計算
        function updateStats() {
            const now = new Date()
            const thisMonth = eventsData.filter(e => {
                const eventDate = new Date(e.start_datetime)
                return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()
            }).length
            
            const thisMonthEl = document.getElementById('thisMonthEvents')
            if (thisMonthEl) thisMonthEl.textContent = thisMonth
        }
        
        // 初期化
        renderFeaturedEvents()
        renderEventsList()
        updateStats()
    </script>

    <!-- フッター -->
    ${renderCommonFooter(tenantName, subdomain)}
</body>
</html>
  `)
})

export default tenantPublic
