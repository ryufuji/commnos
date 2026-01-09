// ========================================
// Commons HTMLテンプレート生成関数
// TypeScript/JavaScript用
// ========================================

/**
 * 共通ヘッダーHTMLを生成
 */
export function generateCommonsHeader(subdomain: string, activePage?: string): string {
  return `
    <header class="commons-header">
      <div class="commons-header-inner">
        <!-- ロゴ -->
        <a href="/tenant/home?subdomain=${subdomain}" class="commons-logo">
          <i class="fas fa-users"></i>
          <span>Commons</span>
        </a>
        
        <!-- ナビゲーション（デスクトップ） -->
        <nav class="commons-nav">
          <a href="/tenant/home?subdomain=${subdomain}" class="commons-nav-link ${activePage === 'home' ? 'active' : ''}">
            <i class="fas fa-home"></i> ホーム
          </a>
          <a href="/tenant/posts?subdomain=${subdomain}" class="commons-nav-link ${activePage === 'posts' ? 'active' : ''}">
            <i class="fas fa-newspaper"></i> 投稿
          </a>
          <a href="/tenant/members?subdomain=${subdomain}" class="commons-nav-link ${activePage === 'members' ? 'active' : ''}">
            <i class="fas fa-users"></i> メンバー
          </a>
          <a href="/tenant/member-plans-premium?subdomain=${subdomain}" class="commons-nav-link ${activePage === 'plans' ? 'active' : ''}">
            <i class="fas fa-crown"></i> プラン
          </a>
        </nav>
        
        <!-- ヘッダーアクション -->
        <div class="commons-header-actions">
          <!-- ユーザーメニュー -->
          <div id="commons-user-menu" class="commons-user-menu" style="display: none;">
            <div id="commons-user-avatar" class="commons-user-avatar">U</div>
            <span id="commons-user-name" style="font-size: 14px; font-weight: 500;">ユーザー</span>
            <i class="fas fa-chevron-down" style="font-size: 12px; opacity: 0.6;"></i>
          </div>
          
          <!-- ログインボタン -->
          <a href="/login?subdomain=${subdomain}" id="commons-login-btn" class="btn-commons-primary" style="display: none;">
            <i class="fas fa-sign-in-alt"></i>
            <span>ログイン</span>
          </a>
          
          <!-- モバイルメニューボタン -->
          <button id="commons-mobile-menu-btn" class="commons-mobile-menu-btn">
            <i class="fas fa-bars"></i>
          </button>
        </div>
      </div>
    </header>
    
    <!-- モバイルメニュー -->
    <div id="commons-mobile-menu-overlay" class="commons-mobile-menu-overlay"></div>
    <div id="commons-mobile-menu" class="commons-mobile-menu">
      <div class="commons-mobile-menu-header">
        <span style="font-weight: 700; font-size: 18px;">メニュー</span>
        <button id="commons-mobile-menu-close" class="commons-mobile-menu-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <nav class="commons-mobile-nav">
        <a href="/tenant/home?subdomain=${subdomain}" class="commons-mobile-nav-link ${activePage === 'home' ? 'active' : ''}">
          <i class="fas fa-home"></i> ホーム
        </a>
        <a href="/tenant/posts?subdomain=${subdomain}" class="commons-mobile-nav-link ${activePage === 'posts' ? 'active' : ''}">
          <i class="fas fa-newspaper"></i> 投稿
        </a>
        <a href="/tenant/members?subdomain=${subdomain}" class="commons-mobile-nav-link ${activePage === 'members' ? 'active' : ''}">
          <i class="fas fa-users"></i> メンバー
        </a>
        <a href="/tenant/member-plans-premium?subdomain=${subdomain}" class="commons-mobile-nav-link ${activePage === 'plans' ? 'active' : ''}">
          <i class="fas fa-crown"></i> プラン
        </a>
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--commons-border-light);"></div>
        <a href="/login?subdomain=${subdomain}" class="commons-mobile-nav-link">
          <i class="fas fa-sign-in-alt"></i> ログイン
        </a>
        <button onclick="logout()" class="commons-mobile-nav-link" style="width: 100%; text-align: left; border: none; background: none; font-family: inherit;">
          <i class="fas fa-sign-out-alt"></i> ログアウト
        </button>
      </nav>
    </div>
  `
}

/**
 * 共通フッターHTMLを生成
 */
export function generateCommonsFooter(subdomain: string): string {
  const currentYear = new Date().getFullYear()
  
  return `
    <footer class="commons-footer">
      <div class="commons-footer-inner">
        <div class="commons-footer-content">
          <div class="commons-footer-section">
            <h3>Commons</h3>
            <p style="font-size: 14px; opacity: 0.8; line-height: 1.6;">
              あなたのコミュニティを、<br>
              もっと楽しく、もっと価値あるものに。
            </p>
          </div>
          
          <div class="commons-footer-section">
            <h3>コミュニティ</h3>
            <div class="commons-footer-links">
              <a href="/tenant/home?subdomain=${subdomain}" class="commons-footer-link">ホーム</a>
              <a href="/tenant/posts?subdomain=${subdomain}" class="commons-footer-link">投稿一覧</a>
              <a href="/tenant/members?subdomain=${subdomain}" class="commons-footer-link">メンバー</a>
              <a href="/tenant/member-plans-premium?subdomain=${subdomain}" class="commons-footer-link">プラン</a>
            </div>
          </div>
          
          <div class="commons-footer-section">
            <h3>サポート</h3>
            <div class="commons-footer-links">
              <a href="#" class="commons-footer-link">ヘルプセンター</a>
              <a href="#" class="commons-footer-link">利用規約</a>
              <a href="#" class="commons-footer-link">プライバシーポリシー</a>
              <a href="#" class="commons-footer-link">お問い合わせ</a>
            </div>
          </div>
        </div>
        
        <div class="commons-footer-bottom">
          <div class="commons-footer-copyright">
            © ${currentYear} Commons. All rights reserved.
          </div>
          <div class="commons-footer-social">
            <a href="#" class="commons-footer-social-link" aria-label="Twitter">
              <i class="fab fa-twitter"></i>
            </a>
            <a href="#" class="commons-footer-social-link" aria-label="Facebook">
              <i class="fab fa-facebook-f"></i>
            </a>
            <a href="#" class="commons-footer-social-link" aria-label="Instagram">
              <i class="fab fa-instagram"></i>
            </a>
            <a href="#" class="commons-footer-social-link" aria-label="LinkedIn">
              <i class="fab fa-linkedin-in"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  `
}

/**
 * ページ全体のHTMLラッパーを生成
 */
export function generateCommonsPageWrapper(options: {
  subdomain: string
  title: string
  activePage?: string
  content: string
  additionalCSS?: string[]
  additionalJS?: string[]
}): string {
  const { subdomain, title, activePage, content, additionalCSS = [], additionalJS = [] } = options
  
  const cssLinks = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
    '/static/commons-theme.css',
    '/static/commons-components.css',
    ...additionalCSS
  ].map(href => {
    if (href.startsWith('http') || href.includes('tailwind')) {
      return `<script src="${href}"></script>`
    }
    return `<link href="${href}" rel="stylesheet">`
  }).join('\n      ')
  
  const jsScripts = [
    'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js',
    '/static/commons-global.js',
    ...additionalJS
  ].map(src => `<script src="${src}"></script>`).join('\n      ')
  
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Commons</title>
  ${cssLinks}
</head>
<body>
  <div class="commons-page-container">
    ${generateCommonsHeader(subdomain, activePage)}
    
    <main class="commons-main-content">
      ${content}
    </main>
    
    ${generateCommonsFooter(subdomain)}
  </div>
  
  ${jsScripts}
  
  <script>
    // ページ初期化
    document.addEventListener('DOMContentLoaded', () => {
      initializeCommons('${subdomain}')
      
      // ログイン状態によってボタンを表示/非表示
      const token = localStorage.getItem('token')
      const userMenu = document.getElementById('commons-user-menu')
      const loginBtn = document.getElementById('commons-login-btn')
      
      if (token && userMenu) {
        userMenu.style.display = 'flex'
        if (loginBtn) loginBtn.style.display = 'none'
      } else if (loginBtn) {
        loginBtn.style.display = 'inline-flex'
        if (userMenu) userMenu.style.display = 'none'
      }
    })
  </script>
</body>
</html>
  `
}
