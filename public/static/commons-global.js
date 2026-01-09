// ========================================
// Commons グローバル JavaScript
// 全ページ共通の機能
// ========================================

// グローバル変数
window.CommonsGlobal = {
  subdomain: null,
  token: null,
  user: null,
  tenant: null
}

// ========================================
// 初期化
// ========================================

function initializeCommons(subdomain) {
  CommonsGlobal.subdomain = subdomain
  CommonsGlobal.token = localStorage.getItem('token')
  
  // ユーザー情報を取得
  if (CommonsGlobal.token) {
    loadUserInfo()
  }
  
  // モバイルメニューを初期化
  initMobileMenu()
  
  // スクロールアニメーションを初期化
  initScrollAnimations()
  
  // ナビゲーションのアクティブ状態を更新
  updateActiveNavigation()
}

// ========================================
// ユーザー情報読み込み
// ========================================

async function loadUserInfo() {
  try {
    const response = await axios.get('/api/profile', {
      headers: { 'Authorization': `Bearer ${CommonsGlobal.token}` }
    })
    
    if (response.data.success) {
      CommonsGlobal.user = response.data.profile
      updateUserMenu()
    }
  } catch (error) {
    console.error('Failed to load user info:', error)
    // トークンが無効な場合はクリア
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      CommonsGlobal.token = null
    }
  }
}

// ========================================
// ユーザーメニュー更新
// ========================================

function updateUserMenu() {
  const userMenuEl = document.getElementById('commons-user-menu')
  const userAvatarEl = document.getElementById('commons-user-avatar')
  const userNameEl = document.getElementById('commons-user-name')
  
  if (CommonsGlobal.user && userMenuEl) {
    if (userAvatarEl) {
      if (CommonsGlobal.user.avatar_url) {
        userAvatarEl.innerHTML = `<img src="${CommonsGlobal.user.avatar_url}" alt="${CommonsGlobal.user.nickname}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
      } else {
        const initial = (CommonsGlobal.user.nickname || 'U').charAt(0).toUpperCase()
        userAvatarEl.textContent = initial
      }
    }
    
    if (userNameEl) {
      userNameEl.textContent = CommonsGlobal.user.nickname || 'ユーザー'
    }
  }
}

// ========================================
// モバイルメニュー
// ========================================

function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('commons-mobile-menu-btn')
  const mobileMenu = document.getElementById('commons-mobile-menu')
  const mobileMenuOverlay = document.getElementById('commons-mobile-menu-overlay')
  const mobileMenuClose = document.getElementById('commons-mobile-menu-close')
  
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu?.classList.add('open')
      mobileMenuOverlay?.classList.add('open')
      document.body.style.overflow = 'hidden'
    })
  }
  
  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', closeMobileMenu)
  }
  
  if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener('click', closeMobileMenu)
  }
}

function closeMobileMenu() {
  const mobileMenu = document.getElementById('commons-mobile-menu')
  const mobileMenuOverlay = document.getElementById('commons-mobile-menu-overlay')
  
  mobileMenu?.classList.remove('open')
  mobileMenuOverlay?.classList.remove('open')
  document.body.style.overflow = 'auto'
}

// ========================================
// ナビゲーションのアクティブ状態
// ========================================

function updateActiveNavigation() {
  const currentPath = window.location.pathname
  const navLinks = document.querySelectorAll('.commons-nav-link, .commons-mobile-nav-link')
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href')
    if (href && currentPath.includes(href.split('?')[0])) {
      link.classList.add('active')
    } else {
      link.classList.remove('active')
    }
  })
}

// ========================================
// スクロールアニメーション
// ========================================

function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in')
      }
    })
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  })
  
  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el)
  })
}

// ========================================
// トースト通知
// ========================================

function showCommonsToast(message, type = 'info') {
  const existingToast = document.getElementById('commons-toast')
  if (existingToast) {
    existingToast.remove()
  }
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle'
  }
  
  const colors = {
    success: 'var(--commons-primary)',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  }
  
  const toast = document.createElement('div')
  toast.id = 'commons-toast'
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    max-width: 400px;
    border-left: 4px solid ${colors[type]};
  `
  
  toast.innerHTML = `
    <i class="fas ${icons[type]}" style="font-size: 20px; color: ${colors[type]};"></i>
    <span style="font-size: 14px; color: var(--commons-text-primary); flex: 1;">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; color: var(--commons-text-tertiary); font-size: 18px;">
      <i class="fas fa-times"></i>
    </button>
  `
  
  document.body.appendChild(toast)
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slideOutRight 0.3s ease'
      setTimeout(() => toast.remove(), 300)
    }
  }, 3000)
}

// ========================================
// ローディングスピナー
// ========================================

function showCommonsLoading() {
  const existingLoader = document.getElementById('commons-loader')
  if (existingLoader) return
  
  const loader = document.createElement('div')
  loader.id = 'commons-loader'
  loader.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `
  
  loader.innerHTML = `
    <div style="background: white; padding: 32px; border-radius: 16px; text-align: center;">
      <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: var(--commons-primary); margin-bottom: 16px;"></i>
      <p style="font-size: 16px; color: var(--commons-text-primary); font-weight: 500;">読み込み中...</p>
    </div>
  `
  
  document.body.appendChild(loader)
}

function hideCommonsLoading() {
  const loader = document.getElementById('commons-loader')
  if (loader) {
    loader.remove()
  }
}

// ========================================
// ユーティリティ関数
// ========================================

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '今'
  if (minutes < 60) return `${minutes}分前`
  if (hours < 24) return `${hours}時間前`
  if (days < 7) return `${days}日前`
  
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// ========================================
// ログアウト
// ========================================

function logout() {
  localStorage.removeItem('token')
  CommonsGlobal.token = null
  CommonsGlobal.user = null
  
  showCommonsToast('ログアウトしました', 'success')
  
  setTimeout(() => {
    window.location.href = `/login?subdomain=${CommonsGlobal.subdomain}`
  }, 1000)
}

// ========================================
// スムーススクロール
// ========================================

function smoothScrollTo(elementId) {
  const element = document.getElementById(elementId)
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}

// ========================================
// クリップボードにコピー
// ========================================

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    showCommonsToast('コピーしました', 'success')
  } catch (error) {
    console.error('Failed to copy:', error)
    showCommonsToast('コピーに失敗しました', 'error')
  }
}

// ========================================
// 画像プレビュー
// ========================================

function previewImage(input, previewElementId) {
  const file = input.files[0]
  const preview = document.getElementById(previewElementId)
  
  if (file && preview) {
    const reader = new FileReader()
    reader.onload = (e) => {
      preview.src = e.target.result
      preview.style.display = 'block'
    }
    reader.readAsDataURL(file)
  }
}

// ========================================
// デバウンス関数
// ========================================

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// ========================================
// アニメーションCSS追加
// ========================================

const commonsAnimationStyles = document.createElement('style')
commonsAnimationStyles.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
  
  .animate-on-scroll {
    opacity: 0;
    transform: translateY(40px);
    transition: all 0.6s ease;
  }
  
  .animate-on-scroll.animate-in {
    opacity: 1;
    transform: translateY(0);
  }
`
document.head.appendChild(commonsAnimationStyles)

// ========================================
// ページビジビリティAPI
// ========================================

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Page hidden')
  } else {
    console.log('Page visible')
    // ページが表示された時にデータを更新
    if (CommonsGlobal.token) {
      loadUserInfo()
    }
  }
})
