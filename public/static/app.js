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
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr)
      
      // オーナーまたは管理者の場合はダッシュボードにリダイレクト
      if (user.role === 'owner' || user.role === 'admin') {
        debugLog('REDIRECT', 'Owner/Admin accessing public page, redirecting to dashboard', {
          role: user.role,
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
  // membership は user オブジェクトから取得
  get membership() {
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

  // モバイルメニューの初期化
  initMobileMenu();
});

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
});
