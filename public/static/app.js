// ============================================
// Commons Platform - フロントエンド JavaScript
// ============================================

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

// ============================================
// ユーティリティ関数
// ============================================

/**
 * API リクエストヘルパー
 */
async function apiRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  }

  // トークンがある場合は Authorization ヘッダーを追加
  if (AppState.token) {
    defaultOptions.headers['Authorization'] = `Bearer ${AppState.token}`
  }

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

/**
 * トースト通知表示
 */
function showToast(message, type = 'info') {
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
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' })
  } catch (error) {
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
    showToast('ログアウトしました', 'success')
    setTimeout(() => {
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
  try {
    const response = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData)
    })

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
      if (isProduction) {
        window.location.href = `https://${response.tenant.subdomain}.commons.com`
      } else {
        // 開発環境・サンドボックスでは /dashboard にリダイレクト
        window.location.href = '/dashboard'
      }
    }, 1500)

    return response
  } catch (error) {
    showToast(error.message, 'error')
    throw error
  }
}

/**
 * ログイン処理
 */
async function handleLogin(email, password) {
  try {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })

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
    
    // 管理者（owner/admin）はダッシュボードへ
    if (membership.role === 'owner' || membership.role === 'admin') {
      window.location.href = '/dashboard'
    } else {
      // 一般メンバーはテナントホームへ
      window.location.href = `/tenant/home?subdomain=${subdomain}`
    }

    return response
  } catch (error) {
    showToast(error.message, 'error')
    throw error
  }
}

// ============================================\n// ダークモード管理 \(Week 11-12\)\n// ============================================