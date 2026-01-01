// ============================================
// Commons Platform - フロントエンド JavaScript
// ============================================

// グローバル状態管理
const AppState = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  tenant: JSON.parse(localStorage.getItem('tenant') || 'null'),
  membership: JSON.parse(localStorage.getItem('membership') || 'null')
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

    // 役割に応じてリダイレクト
    setTimeout(() => {
      const membership = response.membership
      const subdomain = membership.subdomain
      
      // 管理者（owner/admin）はダッシュボードへ
      if (membership.role === 'owner' || membership.role === 'admin') {
        window.location.href = '/dashboard'
      } else {
        // 一般メンバーはテナントホームへ
        window.location.href = `/tenant/home?subdomain=${subdomain}`
      }
    }, 1500)

    return response
  } catch (error) {
    showToast(error.message, 'error')
    throw error
  }
}

// ============================================
// テーマ管理 (Week 11-12)
// ============================================

/**
 * テーマを設定する
 * @param {string} theme - テーマ名 ('modern-business' | 'wellness-nature' | 'creative-studio' | 'tech-innovation')
 */
function setTheme(theme) {
  const validThemes = ['modern-business', 'wellness-nature', 'creative-studio', 'tech-innovation']
  
  if (!validThemes.includes(theme)) {
    console.warn(`Invalid theme: ${theme}. Falling back to modern-business.`)
    theme = 'modern-business'
  }
  
  // HTML要素にテーマを設定
  document.documentElement.setAttribute('data-theme', theme)
  
  // LocalStorageに保存
  localStorage.setItem('theme', theme)
  
  console.log(`Theme set to: ${theme}`)
}

/**
 * 保存されたテーマを読み込む
 */
function loadTheme() {
  // LocalStorageからテーマを取得
  const savedTheme = localStorage.getItem('theme')
  
  // ユーザー情報からテーマを取得（優先度高）
  const user = AppState.user
  if (user && user.theme) {
    setTheme(user.theme)
    return
  }
  
  // 保存されたテーマがあれば適用
  if (savedTheme) {
    setTheme(savedTheme)
    return
  }
  
  // デフォルトテーマ
  setTheme('modern-business')
}

/**
 * テーマを切り替える
 * @param {string} theme - テーマ名
 */
async function switchTheme(theme) {
  try {
    setTheme(theme)
    
    // ログイン済みの場合はサーバーに保存
    if (isLoggedIn()) {
      // TODO: API実装後に有効化
      // await apiRequest('/api/settings/theme', {
      //   method: 'PUT',
      //   body: JSON.stringify({ theme })
      // })
      
      // AppStateを更新
      if (AppState.user) {
        AppState.user.theme = theme
        localStorage.setItem('user', JSON.stringify(AppState.user))
      }
    }
    
    showToast(`テーマを「${getThemeName(theme)}」に変更しました`, 'success')
  } catch (error) {
    console.error('Theme switch error:', error)
    showToast('テーマの変更に失敗しました', 'error')
  }
}

/**
 * テーマ名を日本語で取得
 */
function getThemeName(theme) {
  const themeNames = {
    'modern-business': 'Modern Business',
    'wellness-nature': 'Wellness Nature',
    'creative-studio': 'Creative Studio',
    'tech-innovation': 'Tech Innovation'
  }
  return themeNames[theme] || theme
}

// ============================================
// ダークモード管理 (Week 11-12)
// ============================================

/**
 * ダークモードを設定する
 * @param {boolean} enabled - ダークモードを有効にするか
 */
function setDarkMode(enabled) {
  if (enabled) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  
  // LocalStorageに保存
  localStorage.setItem('darkMode', enabled ? 'true' : 'false')
  
  console.log(`Dark mode: ${enabled ? 'enabled' : 'disabled'}`)
}

/**
 * 保存されたダークモード設定を読み込む
 */
function loadDarkMode() {
  // LocalStorageから設定を取得
  const savedDarkMode = localStorage.getItem('darkMode')
  
  if (savedDarkMode !== null) {
    setDarkMode(savedDarkMode === 'true')
    return
  }
  
  // システム設定を確認
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setDarkMode(true)
    return
  }
  
  // デフォルトはライトモード
  setDarkMode(false)
}

/**
 * ダークモードを切り替える
 */
function toggleDarkMode() {
  const isDark = document.documentElement.classList.contains('dark')
  const newMode = !isDark
  
  setDarkMode(newMode)
  
  // ログイン済みの場合はサーバーに保存
  if (isLoggedIn()) {
    // TODO: API実装後に有効化
    // await apiRequest('/api/settings/dark-mode', {
    //   method: 'PUT',
    //   body: JSON.stringify({ darkMode: newMode })
    // })
    
    // AppStateを更新
    if (AppState.user) {
      AppState.user.darkMode = newMode
      localStorage.setItem('user', JSON.stringify(AppState.user))
    }
  }
  
  showToast(`${newMode ? 'ダークモード' : 'ライトモード'}に変更しました`, 'success')
  
  // アイコンを更新
  updateDarkModeIcon()
  
  return newMode
}

/**
 * 現在のダークモード状態を取得
 */
function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

/**
 * ダークモードアイコンを更新
 */
function updateDarkModeIcon() {
  const darkModeButtons = document.querySelectorAll('[onclick="toggleDarkMode()"]')
  darkModeButtons.forEach(btn => {
    const icon = btn.querySelector('i')
    if (icon) {
      if (isDarkMode()) {
        icon.className = 'fas fa-sun text-xl text-yellow-400'
      } else {
        icon.className = 'fas fa-moon text-xl text-gray-700'
      }
    }
  })
}

// システムのカラースキーム変更を監視
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // ユーザーが手動設定していない場合のみ自動追従
    if (localStorage.getItem('darkMode') === null) {
      setDarkMode(e.matches)
    }
  })
}

// ============================================
// ページロード時の初期化
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // テーマを読み込む
  loadTheme()
  
  // ダークモードを読み込む
  loadDarkMode()
  
  // ダークモードアイコンを更新
  updateDarkModeIcon()
  
  // テーマメニューを閉じる（外側クリック時）
  document.addEventListener('click', (e) => {
    const themeMenu = document.getElementById('themeMenu')
    if (themeMenu && !e.target.closest('[onclick*="themeMenu"]') && !e.target.closest('#themeMenu')) {
      themeMenu.classList.add('hidden')
    }
  })
  
  // ログイン状態に応じてUIを更新
  if (isLoggedIn()) {
    // ログイン済みの場合の処理
    console.log('User logged in:', AppState.user)
  }

  // 現在のテナントを取得
  const currentTenant = getCurrentTenant()
  if (currentTenant) {
    console.log('Current tenant:', currentTenant)
  }
})

// グローバルに公開
window.AppState = AppState
window.apiRequest = apiRequest
window.showToast = showToast
window.showLoading = showLoading
window.hideLoading = hideLoading
window.isLoggedIn = isLoggedIn
window.getToken = getToken
window.logout = logout
window.handleLogout = handleLogout
window.handleRegister = handleRegister
window.handleLogin = handleLogin
window.getCurrentTenant = getCurrentTenant
window.setTheme = setTheme
window.loadTheme = loadTheme
window.switchTheme = switchTheme
window.getThemeName = getThemeName
window.setDarkMode = setDarkMode
window.loadDarkMode = loadDarkMode
window.toggleDarkMode = toggleDarkMode
window.isDarkMode = isDarkMode
window.updateDarkModeIcon = updateDarkModeIcon
