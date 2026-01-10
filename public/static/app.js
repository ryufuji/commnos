// ============================================
// Commons Platform - フロントエンド JavaScript
// ============================================

// ============================================
// デバッグログ設定
// ============================================
const DEBUG = true; // デバッグモードを有効化

function debugLog(category, message, data = null) {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const style = 'color: #00BCD4; font-weight: bold;';
  
  console.group(`%c[${category}] ${timestamp}`, style);
  console.log(message);
  if (data !== null) {
    console.log('Data:', data);
  }
  console.trace('Stack trace:');
  console.groupEnd();
}

/**
 * テナント公開ページでオーナー/管理者をダッシュボードにリダイレクト
 * テナントホーム、メンバー一覧、投稿一覧などの公開ページで使用
 */
function redirectOwnerToDashboard() {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  const membershipStr = localStorage.getItem('membership')
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr)
      const membership = membershipStr ? JSON.parse(membershipStr) : null
      
      // user.role または membership.role をチェック
      const role = user.role || membership?.role
      
      // オーナーまたは管理者の場合はダッシュボードにリダイレクト
      if (role === 'owner' || role === 'admin') {
        debugLog('REDIRECT', 'Owner/Admin accessing public page, redirecting to dashboard', {
          userRole: user.role,
          membershipRole: membership?.role,
          finalRole: role,
          currentUrl: window.location.href
        })
        window.location.href = '/dashboard'
        return true
      }
    } catch (error) {
      debugLog('ERROR', 'Failed to parse user data for redirect check', error)
    }
  }
  
  return false
}

// グローバル状態管理
const AppState = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  tenant: JSON.parse(localStorage.getItem('tenant') || 'null'),
  // membership は localStorage から直接取得、または user オブジェクトから取得
  get membership() {
    const membershipStr = localStorage.getItem('membership')
    if (membershipStr) {
      try {
        return JSON.parse(membershipStr)
      } catch (e) {
        debugLog('ERROR', 'Failed to parse membership from localStorage', e)
      }
    }
    // フォールバック: user オブジェクトから membership を構築
    return this.user ? {
      role: this.user.role,
      tenantId: this.user.tenantId,
      memberNumber: this.user.memberNumber
    } : null
  }
}

// 初期状態をログ出力
debugLog('INIT', 'Application initialized', {
  token: AppState.token ? 'Present' : 'None',
  user: AppState.user,
  tenant: AppState.tenant,
  membership: AppState.membership,
  url: window.location.href,
  userAgent: navigator.userAgent
});

// ============================================
// ユーティリティ関数
// ============================================

/**
 * API リクエストヘルパー
 */
async function apiRequest(url, options = {}) {
  debugLog('API_REQUEST', `Starting request to ${url}`, {
    method: options.method || 'GET',
    hasToken: !!AppState.token,
    options
  });

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  }

  // トークンがある場合は Authorization ヘッダーを追加
  if (AppState.token) {
    defaultOptions.headers['Authorization'] = `Bearer ${AppState.token}`
    debugLog('API_REQUEST', 'Authorization header added');
  }

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  })

  debugLog('API_RESPONSE', `Response received from ${url}`, {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries())
  });

  const data = await response.json()
  
  debugLog('API_RESPONSE', `Data parsed from ${url}`, data);

  if (!response.ok) {
    debugLog('API_ERROR', `Request failed: ${url}`, {
      status: response.status,
      error: data.error || 'Request failed',
      data
    });
    throw new Error(data.error || 'Request failed')
  }

  return data
}

/**
 * トースト通知表示
 */
function showToast(message, type = 'info') {
  debugLog('TOAST', `Showing toast: ${type}`, { message });

  const toast = document.createElement('div')
  // error を danger に変換（CSS クラス名に合わせる）
  const toastType = type === 'error' ? 'danger' : type
  toast.className = `toast toast-${toastType}`
  toast.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <i class="fas fa-${toastType === 'success' ? 'check-circle' : toastType === 'danger' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-500 hover:text-gray-700">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `

  document.body.appendChild(toast)

  // 5秒後に自動削除
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove()
    }
  }, 5000)
}

/**
 * ローディング表示
 */
function showLoading(element) {
  const originalContent = element.innerHTML
  element.dataset.originalContent = originalContent
  element.innerHTML = '<div class="spinner mx-auto"></div>'
  element.disabled = true
}

function hideLoading(element) {
  element.innerHTML = element.dataset.originalContent || ''
  element.disabled = false
}

/**
 * ログイン状態チェック
 */
function isLoggedIn() {
  return !!AppState.token
}

/**
 * トークン取得
 */
function getToken() {
  return AppState.token || localStorage.getItem('token')
}

/**
 * ログアウト
 */
async function handleLogout() {
  debugLog('AUTH', 'Logout initiated');

  try {
    await apiRequest('/api/auth/logout', { method: 'POST' })
    debugLog('AUTH', 'Logout API call successful');
  } catch (error) {
    debugLog('AUTH', 'Logout API call failed', error);
    console.error('Logout error:', error)
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('tenant')
    localStorage.removeItem('membership')
    AppState.token = null
    AppState.user = null
    AppState.tenant = null
    AppState.membership = null
    
    debugLog('AUTH', 'Local storage cleared', {
      token: AppState.token,
      user: AppState.user,
      tenant: AppState.tenant
    });

    showToast('ログアウトしました', 'success')
    setTimeout(() => {
      debugLog('AUTH', 'Redirecting to home page');
      window.location.href = '/'
    }, 1000)
  }
}

// 後方互換性のため
async function logout() {
  return handleLogout()
}

/**
 * 現在のテナント取得（サブドメインから）
 */
function getCurrentTenant() {
  const host = window.location.hostname
  const parts = host.split('.')
  
  // localhost の場合
  if (host === 'localhost' || host.startsWith('127.0.0.1')) {
    return null
  }
  
  // サブドメインがある場合（例: golf-club.commons.com）
  if (parts.length >= 3) {
    return parts[0]
  }
  
  return null
}

// ============================================
// 認証関連
// ============================================

/**
 * 登録処理
 */
async function handleRegister(formData) {
  debugLog('AUTH', 'Registration started', formData);

  try {
    const response = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData)
    })

    debugLog('AUTH', 'Registration successful', {
      user: response.user,
      tenant: response.tenant,
      hasToken: !!response.token
    });

    // トークンとユーザー情報を保存
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
    localStorage.setItem('tenant', JSON.stringify(response.tenant))
    
    AppState.token = response.token
    AppState.user = response.user
    AppState.tenant = response.tenant

    showToast('登録が完了しました！', 'success')

    // テナントページにリダイレクト（本番環境用）
    // 開発環境では /dashboard にリダイレクト
    setTimeout(() => {
      const isProduction = window.location.hostname.includes('commons.com')
      const redirectUrl = isProduction 
        ? `https://${response.tenant.subdomain}.commons.com`
        : '/dashboard';
      
      debugLog('AUTH', 'Redirecting after registration', {
        isProduction,
        redirectUrl,
        hostname: window.location.hostname
      });

      window.location.href = redirectUrl;
    }, 1500)

    return response
  } catch (error) {
    debugLog('AUTH', 'Registration failed', error);
    showToast(error.message, 'error')
    throw error
  }
}

/**
 * ログイン処理
 */
async function handleLogin(email, password) {
  debugLog('AUTH', 'Login started', { email });

  try {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })

    debugLog('AUTH', 'Login successful', {
      user: response.user,
      membership: response.membership,
      hasToken: !!response.token
    });

    // トークンとユーザー情報を保存
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
    localStorage.setItem('membership', JSON.stringify(response.membership))
    
    AppState.token = response.token
    AppState.user = response.user
    AppState.membership = response.membership

    showToast('ログインしました！', 'success')

    // 役割に応じて即座にリダイレクト（遅延なし）
    const membership = response.membership
    const subdomain = membership.subdomain
    
    let redirectUrl;
    // 管理者（owner/admin）はダッシュボードへ
    if (membership.role === 'owner' || membership.role === 'admin') {
      redirectUrl = '/dashboard';
    } else {
      // 一般メンバーはテナントホームへ
      redirectUrl = `/tenant/home?subdomain=${subdomain}`;
    }

    debugLog('AUTH', 'Redirecting after login', {
      role: membership.role,
      subdomain,
      redirectUrl
    });

    window.location.href = redirectUrl;

    return response
  } catch (error) {
    debugLog('AUTH', 'Login failed', error);
    showToast(error.message, 'error')
    throw error
  }
}

// ============================================
// グローバルエラーハンドラ
// ============================================

// 未処理のエラーをキャッチ
window.addEventListener('error', (event) => {
  debugLog('ERROR', 'Unhandled error occurred', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Promise のリジェクションをキャッチ
window.addEventListener('unhandledrejection', (event) => {
  debugLog('ERROR', 'Unhandled promise rejection', {
    reason: event.reason,
    promise: event.promise
  });
});

// ページロードイベント
window.addEventListener('DOMContentLoaded', () => {
  debugLog('PAGE', 'DOM Content Loaded', {
    url: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    readyState: document.readyState,
    title: document.title
  });

  // ヘッダーのログイン状態を更新
  updateHeaderLoginState();
  
  // モバイルメニューの初期化
  initMobileMenu();
});

// ============================================
// ヘッダーのログイン状態管理
// ============================================
function updateHeaderLoginState() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const membershipStr = localStorage.getItem('membership');
  
  debugLog('HEADER_UPDATE', 'Updating header login state', {
    hasToken: !!token,
    hasUser: !!userStr,
    hasMembership: !!membershipStr
  });

  if (!token || !userStr) {
    debugLog('HEADER_UPDATE', 'User not logged in, keeping login button');
    return;
  }

  try {
    const user = JSON.parse(userStr);
    const membership = membershipStr ? JSON.parse(membershipStr) : null;
    const role = user.role || membership?.role;
    const nickname = user.nickname || user.email?.split('@')[0] || 'ユーザー';

    debugLog('HEADER_UPDATE', 'User logged in, updating UI', {
      nickname,
      role,
      userId: user.id
    });

    // URLSearchParams から subdomain を取得
    const urlParams = new URLSearchParams(window.location.search);
    const subdomain = urlParams.get('subdomain') || 'test';

    // デスクトップのログインボタンを置き換え
    const desktopLoginBtn = document.querySelector('.commons-header-actions a[href*="/login"]');
    if (desktopLoginBtn && desktopLoginBtn.textContent.includes('ログイン')) {
      const userMenuHtml = `
        <div class="relative" id="userMenuContainer">
          <button id="userMenuBtn" class="flex items-center gap-2 px-4 py-2 rounded-full transition hover:bg-gray-100" style="color: var(--commons-text-primary);">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: var(--commons-primary); color: white;">
              <i class="fas fa-user"></i>
            </div>
            <span class="hidden md:inline font-semibold">${nickname}</span>
            <i class="fas fa-chevron-down text-sm"></i>
          </button>
          <div id="userMenuDropdown" class="hidden absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
            <div class="px-4 py-3 border-b border-gray-100">
              <p class="font-semibold" style="color: var(--commons-text-primary);">${nickname}</p>
              <p class="text-sm" style="color: var(--commons-text-secondary);">${user.email || ''}</p>
              ${role === 'owner' || role === 'admin' ? `<span class="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded" style="background: var(--commons-accent-yellow); color: var(--commons-text-primary);">${role === 'owner' ? 'オーナー' : '管理者'}</span>` : ''}
            </div>
            <a href="/tenant/mypage?subdomain=${subdomain}" class="block px-4 py-2 hover:bg-gray-50 transition" style="color: var(--commons-text-primary);">
              <i class="fas fa-user mr-2" style="color: var(--commons-primary);"></i>マイページ
            </a>
            <a href="/tenant/notifications?subdomain=${subdomain}" class="block px-4 py-2 hover:bg-gray-50 transition" style="color: var(--commons-text-primary);">
              <i class="fas fa-bell mr-2" style="color: var(--commons-primary);"></i>通知
            </a>
            ${role === 'owner' || role === 'admin' ? `
            <a href="/dashboard" class="block px-4 py-2 hover:bg-gray-50 transition" style="color: var(--commons-text-primary);">
              <i class="fas fa-tachometer-alt mr-2" style="color: var(--commons-primary);"></i>ダッシュボード
            </a>
            ` : ''}
            <div class="border-t border-gray-100 my-2"></div>
            <button id="logoutBtn" class="w-full text-left px-4 py-2 hover:bg-gray-50 transition" style="color: var(--commons-text-secondary);">
              <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
            </button>
          </div>
        </div>
      `;
      
      desktopLoginBtn.outerHTML = userMenuHtml;
      
      // ユーザーメニューのトグル機能を追加
      setTimeout(() => {
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userMenuDropdown = document.getElementById('userMenuDropdown');
        
        if (userMenuBtn && userMenuDropdown) {
          userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenuDropdown.classList.toggle('hidden');
          });
          
          // 外側クリックでメニューを閉じる
          document.addEventListener('click', (e) => {
            const container = document.getElementById('userMenuContainer');
            if (container && !container.contains(e.target)) {
              userMenuDropdown.classList.add('hidden');
            }
          });
          
          // ログアウト機能
          const logoutBtn = document.getElementById('logoutBtn');
          if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('membership');
              localStorage.removeItem('tenant');
              window.location.href = `/tenant/home?subdomain=${subdomain}`;
            });
          }
        }
      }, 100);
    }

    // モバイルメニューのログインボタンを置き換え
    const mobileLoginLink = document.querySelector('.commons-mobile-nav a[href*="/login"]');
    if (mobileLoginLink && mobileLoginLink.textContent.includes('ログイン')) {
      const mobileUserMenuHtml = `
        <div class="border-t border-gray-100 mt-4 pt-4">
          <div class="px-4 py-3 bg-gray-50 rounded-lg mb-2">
            <p class="font-semibold" style="color: var(--commons-text-primary);">${nickname}</p>
            <p class="text-sm" style="color: var(--commons-text-secondary);">${user.email || ''}</p>
            ${role === 'owner' || role === 'admin' ? `<span class="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded" style="background: var(--commons-accent-yellow); color: var(--commons-text-primary);">${role === 'owner' ? 'オーナー' : '管理者'}</span>` : ''}
          </div>
          <a href="/tenant/mypage?subdomain=${subdomain}" class="commons-mobile-nav-link">
            <i class="fas fa-user"></i>
            <span>マイページ</span>
          </a>
          ${role === 'owner' || role === 'admin' ? `
          <a href="/dashboard" class="commons-mobile-nav-link">
            <i class="fas fa-tachometer-alt"></i>
            <span>ダッシュボード</span>
          </a>
          ` : ''}
          <button id="mobileLogoutBtn" class="commons-mobile-nav-link w-full text-left" style="color: var(--commons-text-secondary);">
            <i class="fas fa-sign-out-alt"></i>
            <span>ログアウト</span>
          </button>
        </div>
      `;
      
      mobileLoginLink.outerHTML = mobileUserMenuHtml;
      
      // モバイルログアウト機能
      setTimeout(() => {
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        if (mobileLogoutBtn) {
          mobileLogoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('membership');
            localStorage.removeItem('tenant');
            window.location.href = `/tenant/home?subdomain=${subdomain}`;
          });
        }
      }, 100);
    }
    
    debugLog('HEADER_UPDATE', 'Header updated successfully with user menu');
  } catch (error) {
    debugLog('ERROR', 'Failed to update header login state', error);
  }
}

// ============================================
// モバイルメニュー管理
// ============================================
function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('commonsMobileMenuBtn');
  const mobileMenu = document.getElementById('commonsMobileMenu');
  const mobileMenuOverlay = document.getElementById('commonsMobileMenuOverlay');
  const mobileMenuClose = document.getElementById('commonsMobileMenuClose');

  if (!mobileMenuBtn || !mobileMenu || !mobileMenuOverlay) {
    debugLog('MOBILE_MENU', 'Mobile menu elements not found');
    return;
  }

  debugLog('MOBILE_MENU', 'Mobile menu initialized', {
    hasBtn: !!mobileMenuBtn,
    hasMenu: !!mobileMenu,
    hasOverlay: !!mobileMenuOverlay,
    hasClose: !!mobileMenuClose
  });

  // メニューを開く
  mobileMenuBtn.addEventListener('click', () => {
    debugLog('MOBILE_MENU', 'Open button clicked');
    mobileMenu.classList.add('open');
    mobileMenuOverlay.classList.add('open');
    document.body.style.overflow = 'hidden'; // スクロール無効化
  });

  // メニューを閉じる関数
  const closeMobileMenu = () => {
    debugLog('MOBILE_MENU', 'Closing menu');
    mobileMenu.classList.remove('open');
    mobileMenuOverlay.classList.remove('open');
    document.body.style.overflow = ''; // スクロール有効化
  };

  // 閉じるボタン
  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', closeMobileMenu);
  }

  // オーバーレイクリック
  mobileMenuOverlay.addEventListener('click', closeMobileMenu);

  // メニュー内のリンククリック時に閉じる
  const mobileNavLinks = mobileMenu.querySelectorAll('.commons-mobile-nav-link');
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      debugLog('MOBILE_MENU', 'Nav link clicked, closing menu');
      closeMobileMenu();
    });
  });
}

window.addEventListener('load', () => {
  debugLog('PAGE', 'Page Fully Loaded', {
    url: window.location.href,
    performance: {
      navigation: performance.navigation.type,
      timing: {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        responseTime: performance.timing.responseEnd - performance.timing.requestStart
      }
    }
  });
});

// ページ遷移前
window.addEventListener('beforeunload', () => {
  debugLog('PAGE', 'Page Unloading', {
    url: window.location.href
  });
});
// ============================================
// DOM 操作デバッグ
// ============================================

// フォーム送信をトレース
document.addEventListener('submit', (event) => {
  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  debugLog('FORM', 'Form submission', {
    formId: form.id,
    formAction: form.action,
    formMethod: form.method,
    data: data
  });
});

// ボタンクリックをトレース
document.addEventListener('click', (event) => {
  const target = event.target;
  if (target.tagName === 'BUTTON' || target.tagName === 'A') {
    debugLog('UI', 'Button/Link clicked', {
      tagName: target.tagName,
      id: target.id,
      className: target.className,
      textContent: target.textContent?.substring(0, 50),
      href: target.href,
      type: target.type
    });
  }
});

// LocalStorage の変更をトレース
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  debugLog('STORAGE', 'LocalStorage set', { key, value: value?.substring(0, 100) });
  originalSetItem.apply(this, arguments);
};

const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function(key) {
  debugLog('STORAGE', 'LocalStorage remove', { key });
  originalRemoveItem.apply(this, arguments);
};

// Fetch APIをトレース（apiRequest以外のfetchも）
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const options = args[1] || {};
  
  debugLog('FETCH', 'Native fetch called', {
    url,
    method: options.method || 'GET',
    headers: options.headers
  });
  
  return originalFetch.apply(this, args).then(response => {
    debugLog('FETCH', 'Native fetch response', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    return response;
  }).catch(error => {
    debugLog('FETCH', 'Native fetch error', {
      url,
      error: error.message
    });
    throw error;
  });
};

debugLog('DEBUG', 'Debug logging system initialized', {
  version: '1.0.0',
  timestamp: new Date().toISOString()
});

// ============================================
// デザイン診断機能（URLパラメータで自動実行）
// ============================================
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // ?debug=design が付いている場合、診断スクリプトを読み込む
  if (urlParams.get('debug') === 'design') {
    console.log('%c🔍 デザイン診断モード起動', 'color: #FDB714; font-size: 16px; font-weight: bold;');
    const script = document.createElement('script');
    script.src = '/static/debug-design.js';
    script.onload = () => {
      console.log('✅ 診断スクリプト読み込み完了');
    };
    script.onerror = () => {
      console.error('❌ 診断スクリプトの読み込みに失敗しました');
    };
    document.head.appendChild(script);
  }
  
  // デザイン簡易チェック（常に実行）
  if (DEBUG) {
    setTimeout(() => {
      const checks = {
        'commons-theme.css': false,
        'commons-components.css': false,
        'tailwindcss': false,
        'data-theme': document.documentElement.getAttribute('data-theme'),
        'CSS変数': getComputedStyle(document.documentElement).getPropertyValue('--commons-primary').trim()
      };
      
      // CSSファイルチェック
      Array.from(document.styleSheets).forEach(sheet => {
        if (sheet.href) {
          if (sheet.href.includes('commons-theme.css')) checks['commons-theme.css'] = true;
          if (sheet.href.includes('commons-components.css')) checks['commons-components.css'] = true;
          if (sheet.href.includes('tailwindcss')) checks['tailwindcss'] = true;
        }
      });
      
      console.group('🎨 デザインシステム簡易チェック');
      console.log('commons-theme.css:', checks['commons-theme.css'] ? '✅' : '❌');
      console.log('commons-components.css:', checks['commons-components.css'] ? '✅' : '❌');
      console.log('Tailwind CSS:', checks['tailwindcss'] ? '✅' : '❌');
      console.log('data-theme:', checks['data-theme'] === 'light' ? '✅' : `❌ (${checks['data-theme']})`);
      console.log('CSS変数:', checks['CSS変数'] ? `✅ (${checks['CSS変数']})` : '❌');
      
      // 問題があれば警告
      if (!checks['commons-theme.css'] || !checks['CSS変数']) {
        console.warn('%c⚠️ デザインシステムに問題があります', 'color: #FDB714; font-weight: bold;');
        console.log('%c詳細診断: URLに ?debug=design を追加してください', 'color: #00BCD4;');
        console.log('例: ' + window.location.pathname + '?debug=design');
      } else {
        console.log('✅ デザインシステム正常');
      }
      console.groupEnd();
    }, 500); // DOMとCSSの読み込み完了を待つ
  }
})

// ============================================
// 画像遅延読み込み（Lazy Loading）
// ============================================

/**
 * Intersection Observer を使った画像遅延読み込み
 * data-src 属性を持つ画像を自動的に遅延読み込み
 */
class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: options.rootMargin || '50px', // ビューポートから50px手前で読み込み開始
      threshold: options.threshold || 0.01,
      placeholderClass: options.placeholderClass || 'lazy-loading',
      loadedClass: options.loadedClass || 'lazy-loaded',
      errorClass: options.errorClass || 'lazy-error',
      enableProgressiveLoad: options.enableProgressiveLoad || false,
      fadeInDuration: options.fadeInDuration || 300
    }
    
    this.observer = null
    this.images = new Set()
    this.stats = {
      total: 0,
      loaded: 0,
      failed: 0,
      cached: 0
    }
    
    this.init()
  }
  
  init() {
    // Intersection Observer が使えない場合は即座に全画像を読み込む
    if (!('IntersectionObserver' in window)) {
      debugLog('LAZY_LOAD', 'IntersectionObserver not supported, loading all images immediately')
      this.loadAllImages()
      return
    }
    
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    )
    
    this.observeImages()
    
    debugLog('LAZY_LOAD', 'LazyImageLoader initialized', {
      options: this.options,
      imageCount: this.images.size
    })
  }
  
  observeImages() {
    // data-src 属性を持つすべての画像を監視
    const lazyImages = document.querySelectorAll('img[data-src]:not([data-lazy-observed])')
    
    lazyImages.forEach(img => {
      // 重複監視を防ぐ
      img.setAttribute('data-lazy-observed', 'true')
      
      // プレースホルダークラスを追加
      img.classList.add(this.options.placeholderClass)
      
      // 統計に追加
      this.images.add(img)
      this.stats.total++
      
      // 監視開始
      this.observer.observe(img)
    })
    
    if (lazyImages.length > 0) {
      debugLog('LAZY_LOAD', `Observing ${lazyImages.length} images`, {
        total: this.stats.total
      })
    }
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        this.loadImage(img)
        this.observer.unobserve(img)
      }
    })
  }
  
  loadImage(img) {
    const src = img.getAttribute('data-src')
    const srcset = img.getAttribute('data-srcset')
    
    if (!src) {
      debugLog('LAZY_LOAD', 'No data-src found', { img })
      return
    }
    
    debugLog('LAZY_LOAD', 'Loading image', {
      src,
      srcset,
      width: img.getAttribute('width'),
      height: img.getAttribute('height')
    })
    
    // プログレッシブ読み込み用の低解像度プレビュー
    if (this.options.enableProgressiveLoad && img.hasAttribute('data-src-preview')) {
      const previewSrc = img.getAttribute('data-src-preview')
      this.loadPreview(img, previewSrc)
    }
    
    // 画像の読み込み開始時刻を記録（キャッシュ判定用）
    const startTime = performance.now()
    
    // 実際の画像読み込み
    const loadPromise = new Promise((resolve, reject) => {
      img.onload = () => {
        const loadTime = performance.now() - startTime
        
        // キャッシュから読み込まれた場合（5ms以下）
        if (loadTime < 5) {
          this.stats.cached++
        }
        
        this.stats.loaded++
        img.classList.remove(this.options.placeholderClass)
        img.classList.add(this.options.loadedClass)
        
        // フェードイン効果
        img.style.opacity = '0'
        img.style.transition = `opacity ${this.options.fadeInDuration}ms ease-in`
        setTimeout(() => {
          img.style.opacity = '1'
        }, 10)
        
        debugLog('LAZY_LOAD', 'Image loaded successfully', {
          src,
          loadTime: `${loadTime.toFixed(2)}ms`,
          cached: loadTime < 5,
          stats: this.stats
        })
        
        resolve()
      }
      
      img.onerror = (error) => {
        this.stats.failed++
        img.classList.remove(this.options.placeholderClass)
        img.classList.add(this.options.errorClass)
        
        debugLog('LAZY_LOAD', 'Image load failed', {
          src,
          error,
          stats: this.stats
        })
        
        // エラー時のフォールバック画像
        if (img.hasAttribute('data-fallback-src')) {
          img.src = img.getAttribute('data-fallback-src')
        }
        
        reject(error)
      }
    })
    
    // srcset がある場合は設定
    if (srcset) {
      img.srcset = srcset
    }
    
    // src を設定して読み込み開始
    img.src = src
    
    return loadPromise
  }
  
  loadPreview(img, previewSrc) {
    const preview = new Image()
    preview.onload = () => {
      img.src = previewSrc
      img.style.filter = 'blur(10px)'
      img.style.transition = 'filter 300ms ease-out'
    }
    preview.src = previewSrc
  }
  
  loadAllImages() {
    const lazyImages = document.querySelectorAll('img[data-src]')
    lazyImages.forEach(img => {
      const src = img.getAttribute('data-src')
      if (src) {
        img.src = src
        
        const srcset = img.getAttribute('data-srcset')
        if (srcset) {
          img.srcset = srcset
        }
      }
    })
  }
  
  // 動的に追加された画像を監視対象に追加
  refresh() {
    this.observeImages()
  }
  
  // 統計情報を取得
  getStats() {
    return {
      ...this.stats,
      pending: this.stats.total - this.stats.loaded - this.stats.failed,
      successRate: this.stats.total > 0 
        ? ((this.stats.loaded / this.stats.total) * 100).toFixed(1) + '%'
        : '0%',
      cacheRate: this.stats.loaded > 0
        ? ((this.stats.cached / this.stats.loaded) * 100).toFixed(1) + '%'
        : '0%'
    }
  }
  
  // 監視を破棄
  destroy() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.images.clear()
    debugLog('LAZY_LOAD', 'LazyImageLoader destroyed', this.getStats())
  }
}

// グローバルインスタンスを作成
window.lazyImageLoader = new LazyImageLoader({
  rootMargin: '100px',      // ビューポートから100px手前で読み込み開始
  threshold: 0.01,          // 1%表示されたら読み込み
  fadeInDuration: 400,      // 400msでフェードイン
  enableProgressiveLoad: false  // プログレッシブ読み込みは無効（必要に応じて有効化）
})

// ページ読み込み時と動的コンテンツ追加時に監視を更新
document.addEventListener('DOMContentLoaded', () => {
  window.lazyImageLoader.refresh()
})

// MutationObserver で動的に追加された画像を監視
if ('MutationObserver' in window) {
  const mutationObserver = new MutationObserver((mutations) => {
    let hasNewImages = false
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          // 追加されたノードが画像か、または画像を含むか確認
          if (node.tagName === 'IMG' && node.hasAttribute('data-src')) {
            hasNewImages = true
          } else if (node.querySelectorAll) {
            const images = node.querySelectorAll('img[data-src]')
            if (images.length > 0) {
              hasNewImages = true
            }
          }
        }
      })
    })
    
    // 新しい画像が追加された場合は監視を更新
    if (hasNewImages) {
      debugLog('LAZY_LOAD', 'New images detected, refreshing observer')
      window.lazyImageLoader.refresh()
    }
  })
  
  // body 要素の変更を監視
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// デバッグ用：統計情報を5秒ごとにログ出力
if (DEBUG) {
  setInterval(() => {
    const stats = window.lazyImageLoader.getStats()
    if (stats.total > 0) {
      debugLog('LAZY_LOAD_STATS', 'Current statistics', stats)
    }
  }, 5000)
};
