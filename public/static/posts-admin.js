// 投稿管理ページ専用スクリプト
console.log('Posts admin script loaded from external file')

let currentPage = 1
let currentStatus = 'all'
let currentPost = null
let allPosts = []

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
        let statusBadge = post.status === 'published'
            ? '<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">公開</span>'
            : '<span class="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">下書き</span>'
        
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

// editPost 関数
async function editPost(postId) {
    const post = allPosts.find(p => p.id === postId)
    if (!post) {
        showToast('投稿が見つかりません', 'error')
        return
    }

    currentPost = post
    document.getElementById('editPostId').value = post.id
    document.getElementById('editTitle').value = post.title
    document.getElementById('editContent').value = post.content
    document.getElementById('editStatus').value = post.status
    document.getElementById('editVisibility').value = post.visibility

    let mediaInfo = '<div class="text-sm text-gray-600">添付メディア：'
    if (post.thumbnail_url) mediaInfo += '<i class="fas fa-image text-blue-500 ml-2"></i>'
    if (post.video_url) mediaInfo += '<i class="fas fa-video text-blue-500 ml-2"></i>'
    if (!post.thumbnail_url && !post.video_url) mediaInfo += 'メディアなし'
    mediaInfo += '</div>'
    document.getElementById('mediaInfo').innerHTML = mediaInfo

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
        const data = {
            title: document.getElementById('editTitle').value,
            content: document.getElementById('editContent').value,
            status: document.getElementById('editStatus').value,
            visibility: document.getElementById('editVisibility').value,
            thumbnail_url: currentPost.thumbnail_url,
            video_url: currentPost.video_url
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

    const memberData = JSON.parse(localStorage.getItem('membership') || '{}')
    console.log('Member data:', memberData)
    const isAdmin = memberData.role === 'admin' || memberData.role === 'owner'
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
window.editPost = editPost
window.deletePost = deletePost
window.changePage = changePage

// ページ読み込み後に実行
console.log('Document ready state:', document.readyState)
if (document.readyState === 'loading') {
    console.log('Waiting for DOMContentLoaded...')
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired!')
        initPostsAdmin()
    })
} else {
    console.log('DOM already loaded, initializing immediately')
    initPostsAdmin()
}
