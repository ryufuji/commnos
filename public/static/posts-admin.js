// 投稿管理ページ専用スクリプト
console.log('Posts admin script loaded from external file')

// 管理者権限チェック（ページ読み込み時）
function checkAdminAccess() {
    const token = getToken()
    if (!token) {
        console.warn('No token found, redirecting to home')
        window.location.href = '/'
        return false
    }
    
    const userStr = localStorage.getItem('user')
    if (!userStr) {
        console.warn('No user found, redirecting to home')
        window.location.href = '/'
        return false
    }
    
    const user = JSON.parse(userStr)
    const role = user.role
    
    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
        console.warn('Not admin, redirecting to home')
        alert('このページは管理者のみアクセスできます')
        window.location.href = '/'
        return false
    }
    
    console.log('Admin access granted:', role)
    return true
}

// ページ読み込み時に認証チェック
if (!checkAdminAccess()) {
    // アクセス権限がない場合は処理を停止
    throw new Error('Access denied')
}

let currentPage = 1
let currentStatus = 'all'
let currentPost = null
let allPosts = []

// goToTenantPostNew - 投稿作成ページへ遷移
window.goToTenantPostNew = function(event) {
    if (event) event.preventDefault()
    
    // membershipからsubdomainを取得
    const membership = JSON.parse(localStorage.getItem('membership') || '{}')
    const subdomain = membership.subdomain || ''
    
    if (!subdomain) {
        console.error('No subdomain found in membership')
        showToast('サブドメインが見つかりません', 'error')
        return
    }
    
    // テナント投稿作成ページへ遷移
    window.location.href = `/tenant/posts/new?subdomain=${subdomain}`
}

// loadPosts 関数
async function loadPosts() {
    console.log('Loading posts... page:', currentPage, 'status:', currentStatus)
    try {
        const token = getToken()
        console.log('Token exists:', !!token)
        
        const response = await axios.get('/api/admin/posts', {
            params: { page: currentPage, limit: 20, status: currentStatus },
            headers: { 'Authorization': `Bearer ${token}` }
        })

        console.log('API Response:', response.data)

        if (response.data.success) {
            allPosts = response.data.posts
            console.log('Posts loaded:', allPosts.length)
            renderPosts(response.data.posts)
            renderPagination(response.data.pagination)
            document.getElementById('totalCount').textContent = '全 ' + response.data.pagination.total + ' 件'
        } else {
            console.error('API returned success=false')
            document.getElementById('postsList').innerHTML = '<div class="text-center py-12"><p class="text-red-600">データの取得に失敗しました</p></div>'
        }
    } catch (error) {
        console.error('Error loading posts:', error)
        document.getElementById('postsList').innerHTML = '<div class="text-center py-12"><i class="fas fa-exclamation-circle text-4xl text-red-400 mb-4"></i><p class="text-red-600">投稿の読み込みに失敗しました</p></div>'
        
        showToast('投稿の読み込みに失敗しました', 'error')
        if (error.response?.status === 401 || error.response?.status === 403) {
            showToast('管理者権限が必要です', 'error')
            setTimeout(() => window.location.href = '/dashboard', 2000)
        }
    }
}

// renderPosts 関数
function renderPosts(posts) {
    const container = document.getElementById('postsList')
    
    if (posts.length === 0) {
        container.innerHTML = '<div class="text-center py-12"><i class="fas fa-inbox text-4xl text-gray-300 mb-4"></i><p class="text-gray-500">投稿がありません</p></div>'
        return
    }
    
    container.innerHTML = posts.map(post => {
        let statusBadge = ''
        if (post.status === 'published') {
            statusBadge = '<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">公開</span>'
        } else if (post.status === 'scheduled') {
            const scheduledDate = post.scheduled_at ? new Date(post.scheduled_at).toLocaleString('ja-JP', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
            }) : '日時未設定'
            statusBadge = '<span class="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full" title="' + scheduledDate + '">予約: ' + scheduledDate + '</span>'
        } else {
            statusBadge = '<span class="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">下書き</span>'
        }
        
        let visibilityBadge = post.visibility === 'public'
            ? '<span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">パブリック</span>'
            : '<span class="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">会員限定</span>'

        let mediaBadges = []
        if (post.thumbnail_url) mediaBadges.push('<i class="fas fa-image text-blue-500" title="画像あり"></i>')
        if (post.video_url) mediaBadges.push('<i class="fas fa-video text-blue-500" title="動画あり"></i>')
        let mediaBadgesHtml = mediaBadges.join(' ')

        let title = String(post.title || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;')
        
        return '<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">' +
            '<div class="flex items-start justify-between gap-4">' +
                '<div class="flex-1 min-w-0">' +
                    '<div class="flex items-center gap-2 mb-2 flex-wrap">' +
                        statusBadge +
                        visibilityBadge +
                        mediaBadgesHtml +
                    '</div>' +
                    '<h3 class="text-xl font-bold text-gray-900 mb-2 truncate">' + post.title + '</h3>' +
                    '<p class="text-gray-600 mb-4 line-clamp-2">' + (post.excerpt || '') + '</p>' +
                    '<div class="flex items-center gap-4 text-sm text-gray-500 flex-wrap">' +
                        '<span><i class="fas fa-user mr-1"></i>' + (post.author_name || '不明') + '</span>' +
                        '<span><i class="fas fa-eye mr-1"></i>' + (post.view_count || 0) + '</span>' +
                        '<span><i class="fas fa-heart mr-1"></i>' + (post.like_count || 0) + '</span>' +
                        '<span><i class="fas fa-comment mr-1"></i>' + (post.comment_count || 0) + '</span>' +
                        '<span><i class="fas fa-calendar mr-1"></i>' + new Date(post.created_at).toLocaleDateString('ja-JP') + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="flex flex-col gap-2">' +
                    '<button onclick="previewPost(' + post.id + ')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm whitespace-nowrap">' +
                        '<i class="fas fa-eye mr-1"></i>プレビュー' +
                    '</button>' +
                    '<button onclick="editPost(' + post.id + ')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm whitespace-nowrap">' +
                        '<i class="fas fa-edit mr-1"></i>編集' +
                    '</button>' +
                    '<button onclick="deletePost(' + post.id + ', \'' + title + '\')" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm whitespace-nowrap">' +
                        '<i class="fas fa-trash mr-1"></i>削除' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>'
    }).join('')
}

// renderPagination 関数
function renderPagination(pagination) {
    const container = document.getElementById('pagination')
    if (pagination.totalPages <= 1) {
        container.innerHTML = ''
        return
    }

    let html = '<div class="flex items-center justify-center gap-2">'
    
    if (pagination.page > 1) {
        html += '<button onclick="changePage(' + (pagination.page - 1) + ')" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">前へ</button>'
    }
    
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === pagination.page) {
            html += '<button class="px-4 py-2 bg-blue-600 text-white rounded-lg">' + i + '</button>'
        } else {
            html += '<button onclick="changePage(' + i + ')" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">' + i + '</button>'
        }
    }
    
    if (pagination.page < pagination.totalPages) {
        html += '<button onclick="changePage(' + (pagination.page + 1) + ')" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">次へ</button>'
    }
    
    html += '</div>'
    container.innerHTML = html
}

// changePage 関数
function changePage(page) {
    currentPage = page
    loadPosts()
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

// previewPost 関数
async function previewPost(postId) {
    const post = allPosts.find(p => p.id === postId)
    if (!post) {
        showToast('投稿が見つかりません', 'error')
        return
    }

    // プレビューモーダルを表示
    const modal = document.getElementById('previewModal')
    if (!modal) {
        console.error('previewModal not found')
        return
    }

    // Markdown を HTML に変換（marked.js を使用）
    let contentHtml = post.content
    if (typeof marked !== 'undefined') {
        contentHtml = marked.parse(post.content)
    } else {
        // marked.js がない場合は改行を<br>に変換
        contentHtml = post.content.replace(/\n/g, '<br>')
    }

    // サムネイル画像
    let thumbnailHtml = ''
    if (post.thumbnail_url) {
        thumbnailHtml = '<img src="' + post.thumbnail_url + '" alt="' + post.title + '" class="w-full h-auto object-contain rounded-lg mb-6 max-h-[600px] mx-auto cursor-pointer hover:opacity-90 transition" onclick="showImageModal(\'' + post.thumbnail_url + '\')" title="クリックで拡大表示">'
    }

    // 動画
    let videoHtml = ''
    if (post.video_url) {
        videoHtml = '<video controls class="w-full rounded-lg mb-6"><source src="' + post.video_url + '" type="video/mp4">お使いのブラウザは動画タグをサポートしていません。</video>'
    }

    // ステータスバッジ
    let statusBadge = post.status === 'published'
        ? '<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">公開</span>'
        : '<span class="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">下書き</span>'

    // 公開範囲バッジ
    let visibilityBadge = post.visibility === 'public'
        ? '<span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">パブリック</span>'
        : '<span class="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">会員限定</span>'

    // プレビュー内容を設定
    document.getElementById('previewContent').innerHTML = 
        '<article class="prose prose-lg max-w-none">' +
            '<div class="flex items-center gap-2 mb-4">' +
                statusBadge +
                visibilityBadge +
            '</div>' +
            '<h1 class="text-3xl font-bold text-gray-900 mb-4">' + post.title + '</h1>' +
            '<div class="flex items-center gap-4 text-sm text-gray-500 mb-6">' +
                '<span><i class="fas fa-user mr-1"></i>' + (post.author_name || '不明') + '</span>' +
                '<span><i class="fas fa-calendar mr-1"></i>' + new Date(post.created_at).toLocaleDateString('ja-JP') + '</span>' +
                '<span><i class="fas fa-eye mr-1"></i>' + (post.view_count || 0) + ' 閲覧</span>' +
                '<span><i class="fas fa-heart mr-1"></i>' + (post.like_count || 0) + ' いいね</span>' +
                '<span><i class="fas fa-comment mr-1"></i>' + (post.comment_count || 0) + ' コメント</span>' +
            '</div>' +
            thumbnailHtml +
            videoHtml +
            '<div class="text-gray-800 leading-relaxed">' + contentHtml + '</div>' +
        '</article>'

    modal.classList.remove('hidden')
}

// closePreviewModal 関数
function closePreviewModal() {
    document.getElementById('previewModal').classList.add('hidden')
}

// showImageModal 関数
function showImageModal(imageUrl) {
    const modal = document.getElementById('imageModal')
    if (!modal) {
        console.error('imageModal not found')
        return
    }
    
    document.getElementById('modalImage').src = imageUrl
    modal.classList.remove('hidden')
}

// closeImageModal 関数
function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden')
}

// editPost 関数
async function editPost(postId) {
    console.log('=== editPost called ===')
    console.log('postId:', postId)
    console.log('allPosts length:', allPosts.length)
    console.log('allPosts:', allPosts)
    
    const post = allPosts.find(p => p.id === postId)
    console.log('Found post:', post)
    
    if (!post) {
        showToast('投稿が見つかりません', 'error')
        return
    }

    currentPost = post
    console.log('Setting form values...')
    console.log('post.id:', post.id)
    console.log('post.title:', post.title)
    console.log('post.content:', post.content)
    console.log('post.status:', post.status)
    console.log('post.visibility:', post.visibility)
    
    const editPostIdEl = document.getElementById('editPostId')
    const editTitleEl = document.getElementById('editTitle')
    const editContentEl = document.getElementById('editContent')
    const editStatusEl = document.getElementById('editStatus')
    const editVisibilityEl = document.getElementById('editVisibility')
    
    console.log('Form elements found:')
    console.log('editPostId:', !!editPostIdEl)
    console.log('editTitle:', !!editTitleEl)
    console.log('editContent:', !!editContentEl)
    console.log('editStatus:', !!editStatusEl)
    console.log('editVisibility:', !!editVisibilityEl)
    
    if (editPostIdEl) editPostIdEl.value = post.id
    if (editTitleEl) editTitleEl.value = post.title || ''
    if (editContentEl) editContentEl.value = post.content || ''
    if (editStatusEl) editStatusEl.value = post.status || 'draft'
    if (editVisibilityEl) editVisibilityEl.value = post.visibility || 'public'
    
    // scheduled_atの処理
    const editScheduledFields = document.getElementById('editScheduledDateTimeField')
    const editScheduledDateEl = document.getElementById('editScheduledDate')
    const editScheduledTimeEl = document.getElementById('editScheduledTime')
    
    // statusがscheduledの場合、日時フィールドを表示して値をセット
    if (post.status === 'scheduled' && post.scheduled_at) {
        // scheduled_atはローカル時刻（JST）として保存されている
        // ISO 8601形式: "2026-01-15T23:30:00" (タイムゾーン情報なし)
        const dateTimeStr = post.scheduled_at.replace('Z', '').replace('.000', '')
        const [dateStr, timeStr] = dateTimeStr.split('T')
        
        if (editScheduledDateEl) editScheduledDateEl.value = dateStr
        if (editScheduledTimeEl) editScheduledTimeEl.value = timeStr.substring(0, 5) // "HH:MM" 形式
        if (editScheduledFields) editScheduledFields.style.display = 'block'
    } else {
        if (editScheduledFields) editScheduledFields.style.display = 'none'
    }
    
    console.log('Form values after setting:')
    console.log('editTitle.value:', editTitleEl?.value)
    console.log('editContent.value:', editContentEl?.value)
    console.log('editStatus.value:', editStatusEl?.value)
    console.log('scheduled_at:', post.scheduled_at)

    // 現在のメディア情報を表示（削除ボタン付き）
    let mediaInfo = '<div class="space-y-2">'
    if (post.thumbnail_url) {
        mediaInfo += '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">'
        mediaInfo += '<div class="flex items-center gap-2">'
        mediaInfo += '<i class="fas fa-image text-blue-500"></i>'
        mediaInfo += '<span class="text-sm text-gray-600">現在の画像：</span>'
        mediaInfo += '<a href="#" class="text-sm text-blue-600 hover:underline" onclick="event.preventDefault(); showImageModal(\'' + post.thumbnail_url + '\')">プレビュー</a>'
        mediaInfo += '</div>'
        mediaInfo += '<button type="button" onclick="removeCurrentThumbnail()" class="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors">'
        mediaInfo += '<i class="fas fa-times mr-1"></i>削除'
        mediaInfo += '</button>'
        mediaInfo += '</div>'
    }
    if (post.video_url) {
        mediaInfo += '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">'
        mediaInfo += '<div class="flex items-center gap-2">'
        mediaInfo += '<i class="fas fa-video text-blue-500"></i>'
        mediaInfo += '<span class="text-sm text-gray-600">現在の動画：</span>'
        mediaInfo += '<a href="' + post.video_url + '" target="_blank" class="text-sm text-blue-600 hover:underline">表示</a>'
        mediaInfo += '</div>'
        mediaInfo += '<button type="button" onclick="removeCurrentVideo()" class="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors">'
        mediaInfo += '<i class="fas fa-times mr-1"></i>削除'
        mediaInfo += '</button>'
        mediaInfo += '</div>'
    }
    if (!post.thumbnail_url && !post.video_url) {
        mediaInfo += '<div class="text-sm text-gray-500">メディアなし</div>'
    }
    mediaInfo += '</div>'
    document.getElementById('mediaInfo').innerHTML = mediaInfo

    // 新しいメディアのプレビューをリセット
    document.getElementById('editThumbnail').value = ''
    document.getElementById('editVideo').value = ''
    document.getElementById('editThumbnailPreview').classList.add('hidden')
    document.getElementById('editVideoPreview').classList.add('hidden')
    document.getElementById('editRemoveThumbnailBtn').classList.add('hidden')
    document.getElementById('editRemoveVideoBtn').classList.add('hidden')

    document.getElementById('editModal').classList.remove('hidden')
}

// savePost 関数
async function savePost() {
    const postId = document.getElementById('editPostId').value
    const token = getToken()

    const saveBtn = document.querySelector('#editForm button[type="submit"]')
    saveBtn.disabled = true
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>更新中...'

    try {
        // 新しい画像・動画をアップロード
        let thumbnailUrl = currentPost.thumbnail_url
        let videoUrl = currentPost.video_url

        const thumbnailFile = document.getElementById('editThumbnail').files[0]
        const videoFile = document.getElementById('editVideo').files[0]

        // 画像アップロード
        if (thumbnailFile) {
            const formData = new FormData()
            formData.append('media', thumbnailFile)

            const uploadResponse = await axios.post('/api/upload/post-media', formData, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'multipart/form-data'
                }
            })

            if (uploadResponse.data.success) {
                thumbnailUrl = uploadResponse.data.media_url
            }
        }

        // 動画アップロード
        if (videoFile) {
            const formData = new FormData()
            formData.append('media', videoFile)

            const uploadResponse = await axios.post('/api/upload/post-media', formData, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'multipart/form-data'
                }
            })

            if (uploadResponse.data.success) {
                videoUrl = uploadResponse.data.media_url
            }
        }

        const data = {
            title: document.getElementById('editTitle').value,
            content: document.getElementById('editContent').value,
            status: document.getElementById('editStatus').value,
            visibility: document.getElementById('editVisibility').value,
            thumbnail_url: thumbnailUrl,
            video_url: videoUrl
        }

        // scheduled_atの処理
        const statusValue = document.getElementById('editStatus').value
        if (statusValue === 'scheduled') {
            const scheduledDate = document.getElementById('editScheduledDate').value
            const scheduledTime = document.getElementById('editScheduledTime').value
            
            if (scheduledDate && scheduledTime) {
                // ユーザー入力を日本時間（JST）として扱う
                const scheduledDateTime = scheduledDate + 'T' + scheduledTime + ':00'
                const scheduledDateObj = new Date(scheduledDateTime)
                const now = new Date()
                
                // 過去の日時チェック
                if (scheduledDateObj <= now) {
                    showToast('過去の日時は選択できません。未来の日時を指定してください。', 'error')
                    saveBtn.disabled = false
                    saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>更新する'
                    return
                }
                
                // ISO 8601形式で保存（タイムゾーン情報なし = ローカル時刻として扱われる）
                data.scheduled_at = scheduledDateTime
            } else {
                showToast('予約投稿には日時の指定が必要です', 'error')
                return
            }
        } else {
            data.scheduled_at = null
        }

        const response = await axios.put('/api/admin/posts/' + postId, data, {
            headers: { 'Authorization': 'Bearer ' + token }
        })

        if (response.data.success) {
            showToast('投稿を更新しました', 'success')
            closeEditModal()
            loadPosts()
        }
    } catch (error) {
        console.error('Error saving post:', error)
        showToast('投稿の更新に失敗しました', 'error')
    } finally {
        saveBtn.disabled = false
        saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>更新する'
    }
}

// closeEditModal 関数
function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden')
    currentPost = null
}

// removeCurrentThumbnail 関数
function removeCurrentThumbnail() {
    if (currentPost) {
        currentPost.thumbnail_url = null
        // メディア情報を再描画
        let mediaInfo = '<div class="space-y-2">'
        if (currentPost.video_url) {
            mediaInfo += '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">'
            mediaInfo += '<div class="flex items-center gap-2">'
            mediaInfo += '<i class="fas fa-video text-blue-500"></i>'
            mediaInfo += '<span class="text-sm text-gray-600">現在の動画：</span>'
            mediaInfo += '<a href="' + currentPost.video_url + '" target="_blank" class="text-sm text-blue-600 hover:underline">表示</a>'
            mediaInfo += '</div>'
            mediaInfo += '<button type="button" onclick="removeCurrentVideo()" class="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors">'
            mediaInfo += '<i class="fas fa-times mr-1"></i>削除'
            mediaInfo += '</button>'
            mediaInfo += '</div>'
        }
        if (!currentPost.thumbnail_url && !currentPost.video_url) {
            mediaInfo += '<div class="text-sm text-gray-500">メディアなし</div>'
        }
        mediaInfo += '</div>'
        document.getElementById('mediaInfo').innerHTML = mediaInfo
        showToast('画像を削除しました（保存後に反映されます）', 'info')
    }
}

// removeCurrentVideo 関数
function removeCurrentVideo() {
    if (currentPost) {
        currentPost.video_url = null
        // メディア情報を再描画
        let mediaInfo = '<div class="space-y-2">'
        if (currentPost.thumbnail_url) {
            mediaInfo += '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">'
            mediaInfo += '<div class="flex items-center gap-2">'
            mediaInfo += '<i class="fas fa-image text-blue-500"></i>'
            mediaInfo += '<span class="text-sm text-gray-600">現在の画像：</span>'
            mediaInfo += '<a href="#" class="text-sm text-blue-600 hover:underline" onclick="event.preventDefault(); showImageModal(\'' + currentPost.thumbnail_url + '\')">プレビュー</a>'
            mediaInfo += '</div>'
            mediaInfo += '<button type="button" onclick="removeCurrentThumbnail()" class="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors">'
            mediaInfo += '<i class="fas fa-times mr-1"></i>削除'
            mediaInfo += '</button>'
            mediaInfo += '</div>'
        }
        if (!currentPost.thumbnail_url && !currentPost.video_url) {
            mediaInfo += '<div class="text-sm text-gray-500">メディアなし</div>'
        }
        mediaInfo += '</div>'
        document.getElementById('mediaInfo').innerHTML = mediaInfo
        showToast('動画を削除しました（保存後に反映されます）', 'info')
    }
}

// deletePost 関数
async function deletePost(postId, title) {
    if (!confirm('「' + title + '」を削除してもよろしいですか？\n\nこの操作は取り消せません。')) {
        return
    }

    try {
        const token = getToken()
        const response = await axios.delete('/api/admin/posts/' + postId, {
            headers: { 'Authorization': 'Bearer ' + token }
        })

        if (response.data.success) {
            showToast('投稿を削除しました', 'success')
            loadPosts()
        }
    } catch (error) {
        console.error('Error deleting post:', error)
        showToast('投稿の削除に失敗しました', 'error')
    }
}

// initPostsAdmin 関数
function initPostsAdmin() {
    console.log('Initializing posts admin...')
    
    const token = getToken()
    console.log('Token check:', !!token)
    if (!token) {
        console.log('No token, redirecting to login')
        window.location.href = '/login'
        return
    }

    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    console.log('User data:', userData)
    const isAdmin = userData.role === 'admin' || userData.role === 'owner'
    console.log('Is admin:', isAdmin)
    if (!isAdmin) {
        showToast('管理者権限が必要です', 'error')
        setTimeout(() => window.location.href = '/dashboard', 2000)
        return
    }

    console.log('Starting to load posts...')
    loadPosts()
    
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        currentStatus = e.target.value
        currentPage = 1
        loadPosts()
    })

    document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault()
        await savePost()
    })
}

// グローバルスコープに公開
window.initPostsAdmin = initPostsAdmin
window.loadPosts = loadPosts
window.previewPost = previewPost
window.closePreviewModal = closePreviewModal
window.showImageModal = showImageModal
window.closeImageModal = closeImageModal
window.editPost = editPost
window.deletePost = deletePost
window.changePage = changePage
window.removeCurrentThumbnail = removeCurrentThumbnail
window.removeCurrentVideo = removeCurrentVideo

// ページ読み込み後に実行
console.log('Document ready state:', document.readyState)
if (document.readyState === 'loading') {
    console.log('Waiting for DOMContentLoaded...')
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired!')
        initPostsAdmin()
        
        // 編集モーダルのステータス変更イベント
        const editStatusEl = document.getElementById('editStatus')
        const editScheduledDateField = document.getElementById('editScheduledDateTimeField')
        const editScheduledDateEl = document.getElementById('editScheduledDate')
        const editScheduledTimeEl = document.getElementById('editScheduledTime')
        
        if (editStatusEl && editScheduledDateField) {
            editStatusEl.addEventListener('change', function() {
                if (this.value === 'scheduled') {
                    editScheduledDateField.style.display = 'block'
                    // 現在時刻より未来の時刻を最小値に設定
                    const now = new Date()
                    const year = now.getFullYear()
                    const month = String(now.getMonth() + 1).padStart(2, '0')
                    const day = String(now.getDate()).padStart(2, '0')
                    const hours = String(now.getHours()).padStart(2, '0')
                    const minutes = String(now.getMinutes()).padStart(2, '0')
                    
                    if (editScheduledDateEl) editScheduledDateEl.min = year + '-' + month + '-' + day
                    
                    // 今日が選択されている場合、時刻の最小値を現在時刻に設定
                    if (editScheduledDateEl && editScheduledDateEl.value === year + '-' + month + '-' + day) {
                        if (editScheduledTimeEl) editScheduledTimeEl.min = hours + ':' + minutes
                    } else {
                        if (editScheduledTimeEl) editScheduledTimeEl.min = ''
                    }
                } else {
                    editScheduledDateField.style.display = 'none'
                }
            })
            
            // 日付変更時に時刻の最小値を更新
            if (editScheduledDateEl) {
                editScheduledDateEl.addEventListener('change', function() {
                    const now = new Date()
                    const year = now.getFullYear()
                    const month = String(now.getMonth() + 1).padStart(2, '0')
                    const day = String(now.getDate()).padStart(2, '0')
                    const hours = String(now.getHours()).padStart(2, '0')
                    const minutes = String(now.getMinutes()).padStart(2, '0')
                    const today = year + '-' + month + '-' + day
                    
                    if (this.value === today && editScheduledTimeEl) {
                        editScheduledTimeEl.min = hours + ':' + minutes
                    } else if (editScheduledTimeEl) {
                        editScheduledTimeEl.min = ''
                    }
                })
            }
        }
        
        // 編集モーダルの画像選択
        const editSelectThumbnailBtn = document.getElementById('editSelectThumbnailBtn')
        const editThumbnail = document.getElementById('editThumbnail')
        const editThumbnailPreview = document.getElementById('editThumbnailPreview')
        const editThumbnailImg = document.getElementById('editThumbnailImg')
        const editRemoveThumbnailBtn = document.getElementById('editRemoveThumbnailBtn')
        
        if (editSelectThumbnailBtn) {
            editSelectThumbnailBtn.addEventListener('click', () => {
                editThumbnail.click()
            })
        }
        
        if (editThumbnail) {
            editThumbnail.addEventListener('change', (e) => {
                const file = e.target.files[0]
                if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                        alert('ファイルサイズは10MB以下にしてください')
                        editThumbnail.value = ''
                        return
                    }
                    
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        editThumbnailImg.src = e.target.result
                        editThumbnailPreview.classList.remove('hidden')
                        editRemoveThumbnailBtn.classList.remove('hidden')
                    }
                    reader.readAsDataURL(file)
                }
            })
        }
        
        if (editRemoveThumbnailBtn) {
            editRemoveThumbnailBtn.addEventListener('click', () => {
                editThumbnail.value = ''
                editThumbnailPreview.classList.add('hidden')
                editRemoveThumbnailBtn.classList.add('hidden')
            })
        }
        
        // 編集モーダルの動画選択
        const editSelectVideoBtn = document.getElementById('editSelectVideoBtn')
        const editVideo = document.getElementById('editVideo')
        const editVideoPreview = document.getElementById('editVideoPreview')
        const editVideoPlayer = document.getElementById('editVideoPlayer')
        const editRemoveVideoBtn = document.getElementById('editRemoveVideoBtn')
        
        if (editSelectVideoBtn) {
            editSelectVideoBtn.addEventListener('click', () => {
                editVideo.click()
            })
        }
        
        if (editVideo) {
            editVideo.addEventListener('change', (e) => {
                const file = e.target.files[0]
                if (file) {
                    if (file.size > 100 * 1024 * 1024) {
                        alert('ファイルサイズは100MB以下にしてください')
                        editVideo.value = ''
                        return
                    }
                    
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        editVideoPlayer.src = e.target.result
                        editVideoPreview.classList.remove('hidden')
                        editRemoveVideoBtn.classList.remove('hidden')
                    }
                    reader.readAsDataURL(file)
                }
            })
        }
        
        if (editRemoveVideoBtn) {
            editRemoveVideoBtn.addEventListener('click', () => {
                editVideo.value = ''
                editVideoPreview.classList.add('hidden')
                editRemoveVideoBtn.classList.add('hidden')
            })
        }

        // 編集モーダルのステータス変更で予約フィールドの表示/非表示
        const editStatusField = document.getElementById('editStatus')
        if (editStatusField) {
            editStatusField.addEventListener('change', function() {
                const scheduledFields = document.getElementById('editScheduledDateTimeField')
                if (scheduledFields) {
                    scheduledFields.style.display = this.value === 'scheduled' ? 'block' : 'none'
                }
            })
        }

        // 編集モーダルの予約日時の過去チェック
        const editScheduledDate = document.getElementById('editScheduledDate')
        const editScheduledTime = document.getElementById('editScheduledTime')
        
        if (editScheduledDate) {
            const now = new Date()
            const today = now.toISOString().split('T')[0]
            editScheduledDate.setAttribute('min', today)
            
            editScheduledDate.addEventListener('change', function() {
                if (this.value === today && editScheduledTime) {
                    const currentTime = now.toTimeString().slice(0, 5)
                    editScheduledTime.setAttribute('min', currentTime)
                    if (editScheduledTime.value && editScheduledTime.value < currentTime) {
                        editScheduledTime.value = currentTime
                    }
                } else if (editScheduledTime) {
                    editScheduledTime.removeAttribute('min')
                }
            })
        }
    })
} else {
    console.log('DOM already loaded, initializing immediately')
    initPostsAdmin()
}
