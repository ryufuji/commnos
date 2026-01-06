// ============================================
// パスワードリセットページ（UI）
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'

const passwordResetPages = new Hono<AppContext>()

/**
 * GET /forgot-password
 * パスワード忘れページ
 */
passwordResetPages.get('/forgot-password', async (c) => {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>パスワードをお忘れですか？ - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-purple-50 to-indigo-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full">
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold gradient-text mb-2">
                <i class="fas fa-lock-open mr-2"></i>パスワードリセット
            </h1>
            <p class="text-gray-600">Commons コミュニティプラットフォーム</p>
        </div>

        <div class="bg-white rounded-2xl shadow-2xl p-8">
            <div id="formSection">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">パスワードをお忘れですか？</h2>
                <p class="text-gray-600 mb-6">
                    登録されているメールアドレスを入力してください。<br>
                    パスワードリセット用のリンクをお送りします。
                </p>

                <form id="forgotPasswordForm">
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-envelope mr-1"></i>メールアドレス
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            placeholder="your@email.com"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        type="submit"
                        id="submitBtn"
                        class="w-full gradient-bg text-white py-3 rounded-lg font-semibold hover:opacity-90 transition transform hover:scale-105"
                    >
                        <i class="fas fa-paper-plane mr-2"></i>
                        リセットリンクを送信
                    </button>
                </form>
            </div>

            <div id="successSection" class="hidden text-center">
                <div class="text-green-500 text-6xl mb-4">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-4">メールを送信しました</h3>
                <p class="text-gray-600 mb-6">
                    パスワードリセット用のリンクをメールでお送りしました。<br>
                    メールボックスをご確認ください。
                </p>
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 text-left">
                    <p class="text-sm text-yellow-700">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        <strong>注意事項</strong>
                    </p>
                    <ul class="text-sm text-yellow-700 mt-2 ml-6 list-disc">
                        <li>リンクは24時間のみ有効です</li>
                        <li>メールが届かない場合は、迷惑メールフォルダもご確認ください</li>
                    </ul>
                </div>
            </div>

            <div class="mt-6 text-center">
                <a href="#" id="backToLogin" class="text-purple-600 hover:text-purple-700 text-sm">
                    <i class="fas fa-arrow-left mr-1"></i>
                    ログインページに戻る
                </a>
            </div>
        </div>
    </div>

    <div id="toast" class="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg hidden">
        <span id="toastMessage"></span>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
        const form = document.getElementById('forgotPasswordForm')
        const submitBtn = document.getElementById('submitBtn')
        const formSection = document.getElementById('formSection')
        const successSection = document.getElementById('successSection')

        form.addEventListener('submit', async (e) => {
            e.preventDefault()

            const email = document.getElementById('email').value

            submitBtn.disabled = true
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>送信中...'

            try {
                const response = await axios.post('/api/auth/forgot-password', { email })

                if (response.data.success) {
                    formSection.classList.add('hidden')
                    successSection.classList.remove('hidden')
                } else {
                    showToast(response.data.error || 'エラーが発生しました', 'error')
                    submitBtn.disabled = false
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>リセットリンクを送信'
                }
            } catch (error) {
                console.error('Error:', error)
                showToast(error.response?.data?.error || 'エラーが発生しました', 'error')
                submitBtn.disabled = false
                submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>リセットリンクを送信'
            }
        })

        function showToast(message, type) {
            const toast = document.getElementById('toast')
            const toastMessage = document.getElementById('toastMessage')
            
            toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg ' + 
                (type === 'success' ? 'bg-green-500' : 'bg-red-500') + 
                ' text-white'
            
            toastMessage.textContent = message
            toast.classList.remove('hidden')
            
            setTimeout(function() {
                toast.classList.add('hidden')
            }, 5000)
        }
        
        // 戻るリンクの処理 - URLパラメータからsubdomainを取得
        const urlParams = new URLSearchParams(window.location.search)
        const subdomain = urlParams.get('subdomain') || 'test'
        document.getElementById('backToLogin').href = '/login?subdomain=' + subdomain
    </script>
</body>
</html>`

  return c.html(html)
})

/**
 * GET /reset-password
 * パスワードリセットページ
 */
passwordResetPages.get('/reset-password', async (c) => {
  const token = c.req.query('token')

  if (!token) {
    const errorHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>エラー - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-purple-50 to-indigo-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div class="text-red-500 text-6xl mb-4">
            <i class="fas fa-exclamation-circle"></i>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-4">無効なリンクです</h2>
        <p class="text-gray-600 mb-6">
            パスワードリセットリンクが無効です。<br>
            再度パスワードリセットを申請してください。
        </p>
        <a href="/forgot-password" class="inline-block gradient-bg text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90">
            <i class="fas fa-redo mr-2"></i>再申請する
        </a>
    </div>
</body>
</html>`

    return c.html(errorHtml)
  }

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>新しいパスワードを設定 - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="/static/styles.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-purple-50 to-indigo-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full">
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold gradient-text mb-2">
                <i class="fas fa-key mr-2"></i>新しいパスワード
            </h1>
            <p class="text-gray-600">Commons コミュニティプラットフォーム</p>
        </div>

        <div class="bg-white rounded-2xl shadow-2xl p-8">
            <div id="loadingSection" class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-4xl text-purple-500"></i>
                <p class="text-gray-600 mt-4">トークンを検証中...</p>
            </div>

            <div id="formSection" class="hidden">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">新しいパスワードを設定</h2>
                <p class="text-gray-600 mb-6">
                    <i class="fas fa-user-circle mr-1"></i>
                    <span id="userEmail" class="font-semibold"></span>
                </p>

                <form id="resetPasswordForm">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-lock mr-1"></i>新しいパスワード
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            minlength="8"
                            placeholder="8文字以上"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-lock mr-1"></i>パスワード確認
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            required
                            minlength="8"
                            placeholder="もう一度入力してください"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        type="submit"
                        id="submitBtn"
                        class="w-full gradient-bg text-white py-3 rounded-lg font-semibold hover:opacity-90 transition transform hover:scale-105"
                    >
                        <i class="fas fa-check mr-2"></i>
                        パスワードを変更
                    </button>
                </form>
            </div>

            <div id="successSection" class="hidden text-center">
                <div class="text-green-500 text-6xl mb-4">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-4">パスワードを変更しました</h3>
                <p class="text-gray-600 mb-6">
                    新しいパスワードでログインできます。
                </p>
                <a href="#" id="loginLink" class="inline-block gradient-bg text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90">
                    <i class="fas fa-sign-in-alt mr-2"></i>ログインする
                </a>
            </div>

            <div id="errorSection" class="hidden text-center">
                <div class="text-red-500 text-6xl mb-4">
                    <i class="fas fa-times-circle"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-4">エラー</h3>
                <p id="errorMessage" class="text-gray-600 mb-6"></p>
                <a href="/forgot-password" class="inline-block gradient-bg text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90">
                    <i class="fas fa-redo mr-2"></i>再申請する
                </a>
            </div>
        </div>
    </div>

    <div id="toast" class="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg hidden">
        <span id="toastMessage"></span>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')

        const loadingSection = document.getElementById('loadingSection')
        const formSection = document.getElementById('formSection')
        const successSection = document.getElementById('successSection')
        const errorSection = document.getElementById('errorSection')
        const form = document.getElementById('resetPasswordForm')
        const submitBtn = document.getElementById('submitBtn')

        async function verifyToken() {
            try {
                const response = await axios.get('/api/auth/verify-reset-token?token=' + token)

                if (response.data.success) {
                    document.getElementById('userEmail').textContent = response.data.email
                    loadingSection.classList.add('hidden')
                    formSection.classList.remove('hidden')
                } else {
                    showError(response.data.error)
                }
            } catch (error) {
                console.error('Error:', error)
                showError(error.response?.data?.error || 'トークンの検証に失敗しました')
            }
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault()

            const password = document.getElementById('password').value
            const confirmPassword = document.getElementById('confirmPassword').value

            if (password !== confirmPassword) {
                showToast('パスワードが一致しません', 'error')
                return
            }

            submitBtn.disabled = true
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>変更中...'

            try {
                const response = await axios.post('/api/auth/reset-password', {
                    token: token,
                    password: password
                })

                if (response.data.success) {
                    formSection.classList.add('hidden')
                    successSection.classList.remove('hidden')
                } else {
                    showToast(response.data.error || 'エラーが発生しました', 'error')
                    submitBtn.disabled = false
                    submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i>パスワードを変更'
                }
            } catch (error) {
                console.error('Error:', error)
                showToast(error.response?.data?.error || 'エラーが発生しました', 'error')
                submitBtn.disabled = false
                submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i>パスワードを変更'
            }
        })

        function showError(message) {
            loadingSection.classList.add('hidden')
            errorSection.classList.remove('hidden')
            document.getElementById('errorMessage').textContent = message
        }

        function showToast(message, type) {
            const toast = document.getElementById('toast')
            const toastMessage = document.getElementById('toastMessage')
            
            toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg ' + 
                (type === 'success' ? 'bg-green-500' : 'bg-red-500') + 
                ' text-white'
            
            toastMessage.textContent = message
            toast.classList.remove('hidden')
            
            setTimeout(function() {
                toast.classList.add('hidden')
            }, 5000)
        }

        // ログインリンクの処理 - URLパラメータからsubdomainを取得
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')
        const subdomain = urlParams.get('subdomain') || 'test'
        document.getElementById('loginLink').href = '/login?subdomain=' + subdomain

        verifyToken()
    </script>
</body>
</html>`

  return c.html(html)
})

export default passwordResetPages
