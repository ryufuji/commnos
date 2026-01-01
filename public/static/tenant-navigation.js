// テナント公開ページ共通ナビゲーション

// ナビゲーションを認証状態に応じて更新
function updateTenantNavigation(membership, subdomain) {
    const isAdmin = membership && (membership.role === 'owner' || membership.role === 'admin')
    const desktopNav = document.getElementById('desktopNav')
    const mobileMenu = document.getElementById('mobileMenu')
    const mobileMenuToggle = document.getElementById('mobileMenuToggle')
    const bottomNav = document.getElementById('bottomNav')
    
    if (isAdmin) {
        // 管理者用ナビゲーション
        console.log('Setting up admin navigation')
        
        // デスクトップ
        if (desktopNav) {
            desktopNav.innerHTML = `
                <a href="/dashboard" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-tachometer-alt mr-2"></i>ダッシュボード
                </a>
                <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-eye mr-2"></i>公開ページ
                </a>
                <div class="relative group">
                    <button class="text-gray-600 hover:text-primary transition flex items-center">
                        <i class="fas fa-user-circle mr-2"></i>
                        ${membership.tenant_name || 'ユーザー'}
                        <i class="fas fa-chevron-down ml-2 text-xs"></i>
                    </button>
                    <div class="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                        <a href="/profile" class="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                            <i class="fas fa-user mr-2"></i>プロフィール
                        </a>
                        <button onclick="logoutTenant('${subdomain}')" class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                            <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                        </button>
                    </div>
                </div>
            `
        }
        
        // モバイル（ハンバーガーメニュー）
        if (mobileMenu) {
            mobileMenu.innerHTML = `
                <a href="/dashboard" class="block py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                    <i class="fas fa-tachometer-alt mr-2"></i>ダッシュボード
                </a>
                <a href="/tenant/home?subdomain=${subdomain}" class="block py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                    <i class="fas fa-eye mr-2"></i>公開ページ
                </a>
                <a href="/profile" class="block py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                    <i class="fas fa-user mr-2"></i>プロフィール
                </a>
                <button onclick="logoutTenant('${subdomain}')" class="block w-full text-left py-3 text-gray-700 hover:bg-gray-50 transition rounded">
                    <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                </button>
            `
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
            const userName = membership ? (membership.tenant_name || 'ユーザー') : 'ゲスト'
            desktopNav.innerHTML = `
                <a href="/tenant/home?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-home mr-2"></i>ホーム
                </a>
                <a href="/tenant/posts?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-newspaper mr-2"></i>投稿
                </a>
                <a href="/tenant/posts/new?subdomain=${subdomain}" class="text-green-600 hover:text-green-700 transition font-semibold">
                    <i class="fas fa-plus-circle mr-2"></i>投稿作成
                </a>
                <a href="/tenant/members?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-users mr-2"></i>メンバー
                </a>
                ${membership ? `
                <div class="relative group">
                    <button class="text-gray-600 hover:text-primary transition flex items-center">
                        <i class="fas fa-user-circle mr-2"></i>
                        ${userName}
                        <i class="fas fa-chevron-down ml-2 text-xs"></i>
                    </button>
                    <div class="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                        <a href="/profile" class="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                            <i class="fas fa-user mr-2"></i>プロフィール
                        </a>
                        <button onclick="logoutTenant('${subdomain}')" class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition">
                            <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
                        </button>
                    </div>
                </div>
                ` : `
                <a href="/login?subdomain=${subdomain}" class="text-gray-600 hover:text-primary transition">
                    <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                </a>
                `}
            `
        }
        
        // モバイル（ボトムナビゲーション）
        if (bottomNav && membership) {
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
    
    // モバイルメニュートグル
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden')
        })
    }
}

// ログアウト処理
function logoutTenant(subdomain) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('membership')
    window.location.href = `/tenant/home?subdomain=${subdomain}`
}

// ページ読み込み時にナビゲーション初期化
function initTenantNavigation(subdomain) {
    const membershipStr = localStorage.getItem('membership')
    if (membershipStr) {
        try {
            const membership = JSON.parse(membershipStr)
            updateTenantNavigation(membership, subdomain)
        } catch (e) {
            console.error('Failed to parse membership:', e)
            updateTenantNavigation(null, subdomain)
        }
    } else {
        updateTenantNavigation(null, subdomain)
    }
}
