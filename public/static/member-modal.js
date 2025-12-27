// 会員詳細モーダル関連の処理

async function showMemberMenu(memberId) {
    try {
        const token = getToken()
        console.log('Token:', token ? 'exists' : 'missing')
        if (!token) {
            showToast('ログインが必要です', 'error')
            window.location.href = '/login'
            return
        }

        // 会員詳細を取得
        const response = await axios.get('/api/admin/members/' + memberId, {
            headers: { Authorization: 'Bearer ' + token }
        })

        if (response.data.success) {
            showMemberDetailModal(response.data.member)
        } else {
            showToast(response.data.error || '会員情報の取得に失敗しました', 'error')
        }
    } catch (error) {
        console.error('Get member detail error:', error)
        if (error.response && error.response.status === 401) {
            showToast('認証エラー: 再度ログインしてください', 'error')
            setTimeout(() => window.location.href = '/login', 1500)
        } else {
            showToast('会員情報の取得に失敗しました', 'error')
        }
    }
}

function showMemberDetailModal(member) {
    const currentUserRole = localStorage.getItem('userRole') || 'member'
    const isOwner = member.role === 'owner'
    const canChangeRole = currentUserRole === 'owner' && !isOwner
    const canChangeStatus = !isOwner

    // モーダルHTML構築
    const modal = document.createElement('div')
    modal.id = 'memberDetailModal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    
    let html = '<div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">'
    
    // ヘッダー
    html += '<div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">'
    html += '<h2 class="text-xl font-bold text-gray-900">会員詳細</h2>'
    html += '<button onclick="closeMemberDetailModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>'
    html += '</div>'
    
    // プロフィールヘッダー
    html += '<div class="p-6 border-b">'
    html += '<div class="flex items-start gap-6">'
    html += '<div class="w-24 h-24 bg-gradient-to-br from-success-400 to-success-600 rounded-full flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">'
    html += member.nickname.charAt(0).toUpperCase()
    html += '</div>'
    html += '<div class="flex-1">'
    html += '<div class="flex items-center gap-3 mb-2">'
    html += '<h3 class="text-2xl font-bold text-gray-900">' + member.nickname + '</h3>'
    if (member.role === 'owner') html += '<span class="badge bg-purple-100 text-purple-700">オーナー</span>'
    if (member.role === 'admin') html += '<span class="badge bg-blue-100 text-blue-700">管理者</span>'
    if (member.status === 'active') html += '<span class="badge badge-success">アクティブ</span>'
    if (member.status === 'suspended') html += '<span class="badge badge-warning">停止中</span>'
    if (member.status === 'withdrawn') html += '<span class="badge badge-error">退会済み</span>'
    html += '</div>'
    html += '<p class="text-gray-600 mb-1"><i class="fas fa-envelope mr-2"></i>' + member.email + '</p>'
    html += '<p class="text-gray-600 mb-1"><i class="fas fa-id-card mr-2"></i>会員番号: ' + (member.member_number || '未割当') + '</p>'
    html += '<p class="text-gray-600"><i class="fas fa-calendar mr-2"></i>登録日: ' + new Date(member.joined_at).toLocaleDateString('ja-JP') + '</p>'
    if (member.bio) html += '<p class="text-gray-700 mt-3">' + member.bio + '</p>'
    html += '</div></div></div>'
    
    // タブ
    html += '<div class="border-b">'
    html += '<div class="flex gap-2 px-6">'
    html += '<button id="tabBasic" onclick="switchMemberTab(\'basic\')" class="px-4 py-3 font-semibold border-b-2 border-primary-500 text-primary-600">'
    html += '<i class="fas fa-user mr-2"></i>基本情報</button>'
    html += '<button id="tabActivity" onclick="switchMemberTab(\'activity\')" class="px-4 py-3 font-semibold border-b-2 border-transparent text-gray-600 hover:text-gray-900">'
    html += '<i class="fas fa-chart-line mr-2"></i>アクティビティ</button>'
    html += '<button id="tabNotes" onclick="switchMemberTab(\'notes\', ' + member.id + ')" class="px-4 py-3 font-semibold border-b-2 border-transparent text-gray-600 hover:text-gray-900">'
    html += '<i class="fas fa-sticky-note mr-2"></i>メモ</button>'
    html += '</div></div>'
    
    // タブコンテンツ
    html += '<div class="p-6">'
    
    // 基本情報タブ
    html += '<div id="basicTab">'
    html += '<div class="grid grid-cols-3 gap-4 mb-6">'
    html += '<div class="bg-gray-50 rounded-lg p-4 text-center">'
    html += '<div class="text-3xl font-bold text-primary-600">' + member.post_count + '</div>'
    html += '<div class="text-sm text-gray-600 mt-1">投稿数</div></div>'
    html += '<div class="bg-gray-50 rounded-lg p-4 text-center">'
    html += '<div class="text-3xl font-bold text-primary-600">' + member.comment_count + '</div>'
    html += '<div class="text-sm text-gray-600 mt-1">コメント数</div></div>'
    html += '<div class="bg-gray-50 rounded-lg p-4 text-center">'
    html += '<div class="text-3xl font-bold text-primary-600">' + (member.like_count || 0) + '</div>'
    html += '<div class="text-sm text-gray-600 mt-1">いいね数</div></div></div>'
    
    if (canChangeStatus) {
        html += '<div class="mb-6 p-4 bg-gray-50 rounded-lg">'
        html += '<h4 class="font-bold text-gray-900 mb-3"><i class="fas fa-shield-alt mr-2"></i>ステータス管理</h4>'
        html += '<div class="flex gap-2">'
        html += '<button onclick="changeMemberStatus(' + member.id + ', \'active\')" class="btn btn-sm ' + (member.status === 'active' ? 'btn-success' : 'btn-outline-success') + '">'
        html += '<i class="fas fa-check-circle mr-1"></i>アクティブ</button>'
        html += '<button onclick="changeMemberStatus(' + member.id + ', \'suspended\')" class="btn btn-sm ' + (member.status === 'suspended' ? 'btn-warning' : 'btn-outline-warning') + '">'
        html += '<i class="fas fa-pause-circle mr-1"></i>停止</button>'
        html += '<button onclick="changeMemberStatus(' + member.id + ', \'withdrawn\')" class="btn btn-sm ' + (member.status === 'withdrawn' ? 'btn-error' : 'btn-outline-error') + '">'
        html += '<i class="fas fa-times-circle mr-1"></i>退会</button></div></div>'
    }
    
    if (canChangeRole) {
        html += '<div class="mb-6 p-4 bg-gray-50 rounded-lg">'
        html += '<h4 class="font-bold text-gray-900 mb-3"><i class="fas fa-user-shield mr-2"></i>役割管理</h4>'
        html += '<div class="flex gap-2">'
        html += '<button onclick="changeMemberRole(' + member.id + ', \'member\')" class="btn btn-sm ' + (member.role === 'member' ? 'btn-primary' : 'btn-outline-primary') + '">'
        html += '<i class="fas fa-user mr-1"></i>一般会員</button>'
        html += '<button onclick="changeMemberRole(' + member.id + ', \'admin\')" class="btn btn-sm ' + (member.role === 'admin' ? 'btn-primary' : 'btn-outline-primary') + '">'
        html += '<i class="fas fa-user-shield mr-1"></i>管理者</button></div></div>'
    }
    html += '</div>'
    
    // アクティビティタブ
    html += '<div id="activityTab" class="hidden">'
    
    // 最新の投稿
    html += '<div class="mb-6">'
    html += '<h4 class="font-bold text-gray-900 mb-3"><i class="fas fa-file-alt mr-2"></i>最新の投稿</h4>'
    if (member.recent_posts && member.recent_posts.length > 0) {
        html += '<div class="space-y-3">'
        member.recent_posts.forEach(post => {
            html += '<div class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">'
            html += '<div class="flex items-start justify-between">'
            html += '<div class="flex-1">'
            html += '<h5 class="font-semibold text-gray-900 mb-1">' + post.title + '</h5>'
            html += '<div class="flex items-center gap-3 text-sm text-gray-600">'
            html += '<span><i class="fas fa-eye mr-1"></i>' + post.view_count + '回閲覧</span>'
            html += '<span><i class="fas fa-calendar mr-1"></i>' + new Date(post.created_at).toLocaleDateString('ja-JP') + '</span>'
            html += '</div></div>'
            if (post.status === 'published') html += '<span class="badge badge-success">公開</span>'
            else html += '<span class="badge badge-warning">下書き</span>'
            html += '</div></div>'
        })
        html += '</div>'
    } else {
        html += '<p class="text-gray-500 text-center py-8">投稿はありません</p>'
    }
    html += '</div>'
    
    // 最新のコメント
    html += '<div class="mb-6">'
    html += '<h4 class="font-bold text-gray-900 mb-3"><i class="fas fa-comments mr-2"></i>最新のコメント</h4>'
    if (member.recent_comments && member.recent_comments.length > 0) {
        html += '<div class="space-y-3">'
        member.recent_comments.forEach(comment => {
            const commentText = comment.content.length > 100 ? comment.content.substring(0, 100) + '...' : comment.content
            html += '<div class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">'
            html += '<p class="text-gray-700 mb-2">' + commentText + '</p>'
            html += '<div class="flex items-center gap-3 text-sm text-gray-600">'
            html += '<span><i class="fas fa-file-alt mr-1"></i>' + comment.post_title + '</span>'
            html += '<span><i class="fas fa-calendar mr-1"></i>' + new Date(comment.created_at).toLocaleDateString('ja-JP') + '</span>'
            html += '</div></div>'
        })
        html += '</div>'
    } else {
        html += '<p class="text-gray-500 text-center py-8">コメントはありません</p>'
    }
    html += '</div>'
    
    html += '</div></div>'
    
    // メモタブ
    html += '<div id="notesTab" class="hidden">'
    html += '<div class="mb-6">'
    html += '<h4 class="font-bold text-gray-900 mb-3"><i class="fas fa-sticky-note mr-2"></i>管理者メモ</h4>'
    html += '<p class="text-sm text-gray-600 mb-4">この会員に関する管理者専用のメモです。会員本人には表示されません。</p>'
    
    // メモ追加フォーム
    html += '<div class="mb-4 p-4 bg-gray-50 rounded-lg">'
    html += '<textarea id="newNoteText" placeholder="メモを入力..." class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" rows="3" maxlength="1000"></textarea>'
    html += '<div class="flex justify-between items-center mt-2">'
    html += '<span class="text-sm text-gray-500"><span id="noteCharCount">0</span>/1000</span>'
    html += '<button onclick="addMemberNote(' + member.id + ')" class="btn btn-primary">'
    html += '<i class="fas fa-plus mr-1"></i>メモを追加</button>'
    html += '</div></div>'
    
    // メモ一覧
    html += '<div id="notesList">'
    html += '<div class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>読み込み中...</div>'
    html += '</div></div></div>'
    
    // フッター
    html += '<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">'
    html += '<button onclick="closeMemberDetailModal()" class="btn btn-outline-secondary">閉じる</button>'
    html += '</div></div>'
    
    modal.innerHTML = html
    document.body.appendChild(modal)
}

function switchMemberTab(tab, memberId) {
    const tabBasic = document.getElementById('tabBasic')
    const tabActivity = document.getElementById('tabActivity')
    const tabNotes = document.getElementById('tabNotes')
    const basicTab = document.getElementById('basicTab')
    const activityTab = document.getElementById('activityTab')
    const notesTab = document.getElementById('notesTab')
    
    // すべてのタブをリセット
    tabBasic.className = 'px-4 py-3 font-semibold border-b-2 border-transparent text-gray-600 hover:text-gray-900'
    tabActivity.className = 'px-4 py-3 font-semibold border-b-2 border-transparent text-gray-600 hover:text-gray-900'
    tabNotes.className = 'px-4 py-3 font-semibold border-b-2 border-transparent text-gray-600 hover:text-gray-900'
    basicTab.classList.add('hidden')
    activityTab.classList.add('hidden')
    notesTab.classList.add('hidden')
    
    if (tab === 'basic') {
        tabBasic.className = 'px-4 py-3 font-semibold border-b-2 border-primary-500 text-primary-600'
        basicTab.classList.remove('hidden')
    } else if (tab === 'activity') {
        tabActivity.className = 'px-4 py-3 font-semibold border-b-2 border-primary-500 text-primary-600'
        activityTab.classList.remove('hidden')
    } else if (tab === 'notes') {
        tabNotes.className = 'px-4 py-3 font-semibold border-b-2 border-primary-500 text-primary-600'
        notesTab.classList.remove('hidden')
        // メモタブに切り替えたら、メモを読み込み
        loadMemberNotes(memberId)
        
        // 文字数カウント
        const textarea = document.getElementById('newNoteText')
        const charCount = document.getElementById('noteCharCount')
        if (textarea && charCount) {
            textarea.addEventListener('input', () => {
                charCount.textContent = textarea.value.length
            })
        }
    }
}

// メモ一覧を読み込み
async function loadMemberNotes(memberId) {
    try {
        const token = getToken()
        if (!token) {
            window.location.href = '/login'
            return
        }

        const response = await axios.get('/api/admin/members/' + memberId + '/notes', {
            headers: { Authorization: 'Bearer ' + token }
        })

        if (response.data.success) {
            renderMemberNotes(response.data.notes, memberId)
        } else {
            showToast(response.data.error || 'メモの取得に失敗しました', 'error')
        }
    } catch (error) {
        console.error('Load member notes error:', error)
        showToast('メモの取得に失敗しました', 'error')
    }
}

// メモ一覧を表示
function renderMemberNotes(notes, memberId) {
    const notesList = document.getElementById('notesList')
    
    if (notes.length === 0) {
        notesList.innerHTML = '<p class="text-gray-500 text-center py-8">メモはまだありません</p>'
        return
    }
    
    let html = '<div class="space-y-3">'
    notes.forEach(note => {
        html += '<div class="p-4 bg-white border border-gray-200 rounded-lg">'
        html += '<div class="flex items-start justify-between mb-2">'
        html += '<div class="flex items-center gap-2">'
        html += '<span class="font-semibold text-gray-900">' + note.admin_name + '</span>'
        html += '<span class="text-sm text-gray-500">' + new Date(note.created_at).toLocaleString('ja-JP') + '</span>'
        html += '</div>'
        html += '<button onclick="deleteMemberNote(' + memberId + ', ' + note.id + ')" class="text-red-500 hover:text-red-700">'
        html += '<i class="fas fa-trash"></i></button>'
        html += '</div>'
        html += '<p class="text-gray-700 whitespace-pre-wrap">' + note.note + '</p>'
        html += '</div>'
    })
    html += '</div>'
    
    notesList.innerHTML = html
}

// メモを追加
async function addMemberNote(memberId) {
    const textarea = document.getElementById('newNoteText')
    const note = textarea.value.trim()
    
    if (!note) {
        showToast('メモを入力してください', 'error')
        return
    }
    
    try {
        const token = getToken()
        if (!token) {
            window.location.href = '/login'
            return
        }

        const response = await axios.post('/api/admin/members/' + memberId + '/notes', 
            { note },
            { headers: { Authorization: 'Bearer ' + token } }
        )

        if (response.data.success) {
            showToast('メモを追加しました', 'success')
            textarea.value = ''
            document.getElementById('noteCharCount').textContent = '0'
            // メモ一覧を再読み込み
            loadMemberNotes(memberId)
        } else {
            showToast(response.data.error || 'メモの追加に失敗しました', 'error')
        }
    } catch (error) {
        console.error('Add member note error:', error)
        showToast(error.response?.data?.error || 'メモの追加に失敗しました', 'error')
    }
}

// メモを削除
async function deleteMemberNote(memberId, noteId) {
    if (!confirm('このメモを削除しますか？')) return
    
    try {
        const token = getToken()
        if (!token) {
            window.location.href = '/login'
            return
        }

        const response = await axios.delete('/api/admin/members/' + memberId + '/notes/' + noteId, {
            headers: { Authorization: 'Bearer ' + token }
        })

        if (response.data.success) {
            showToast('メモを削除しました', 'success')
            // メモ一覧を再読み込み
            loadMemberNotes(memberId)
        } else {
            showToast(response.data.error || 'メモの削除に失敗しました', 'error')
        }
    } catch (error) {
        console.error('Delete member note error:', error)
        showToast(error.response?.data?.error || 'メモの削除に失敗しました', 'error')
    }
}

function closeMemberDetailModal() {
    const modal = document.getElementById('memberDetailModal')
    if (modal) modal.remove()
}

async function changeMemberStatus(memberId, newStatus) {
    const statusNames = { 'active': 'アクティブ', 'suspended': '停止', 'withdrawn': '退会' }
    
    if (!confirm('この会員のステータスを「' + statusNames[newStatus] + '」に変更しますか？')) return
    
    try {
        const token = getToken()
        if (!token) {
            window.location.href = '/login'
            return
        }

        const response = await axios.patch('/api/admin/members/' + memberId + '/status', 
            { status: newStatus },
            { headers: { Authorization: 'Bearer ' + token } }
        )

        if (response.data.success) {
            showToast('ステータスを「' + statusNames[newStatus] + '」に変更しました', 'success')
            closeMemberDetailModal()
            setTimeout(() => loadActiveMembers(), 500)
        } else {
            showToast(response.data.error || 'ステータス変更に失敗しました', 'error')
        }
    } catch (error) {
        console.error('Change status error:', error)
        showToast(error.response?.data?.error || 'ステータス変更に失敗しました', 'error')
    }
}

async function changeMemberRole(memberId, newRole) {
    const roleNames = { 'member': '一般会員', 'admin': '管理者' }
    
    if (!confirm('この会員の役割を「' + roleNames[newRole] + '」に変更しますか？')) return
    
    try {
        const token = getToken()
        if (!token) {
            window.location.href = '/login'
            return
        }

        const response = await axios.patch('/api/admin/members/' + memberId + '/role', 
            { role: newRole },
            { headers: { Authorization: 'Bearer ' + token } }
        )

        if (response.data.success) {
            showToast('役割を「' + roleNames[newRole] + '」に変更しました', 'success')
            closeMemberDetailModal()
            setTimeout(() => loadActiveMembers(), 500)
        } else {
            showToast(response.data.error || '役割変更に失敗しました', 'error')
        }
    } catch (error) {
        console.error('Change role error:', error)
        showToast(error.response?.data?.error || '役割変更に失敗しました', 'error')
    }
}
