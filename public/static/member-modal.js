// 会員詳細モーダル関連の処理

async function showMemberMenu(memberId) {
    try {
        const token = localStorage.getItem('authToken')
        if (!token) {
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
        showToast('会員情報の取得に失敗しました', 'error')
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
    
    // プロフィール部分
    let html = '<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">'
    html += '<div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">'
    html += '<h2 class="text-xl font-bold text-gray-900">会員詳細</h2>'
    html += '<button onclick="closeMemberDetailModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>'
    html += '</div>'
    
    html += '<div class="p-6">'
    html += '<div class="flex items-start gap-6 mb-6 pb-6 border-b">'
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
    html += '</div></div>'
    
    // アクティビティ統計
    html += '<div class="grid grid-cols-2 gap-4 mb-6">'
    html += '<div class="bg-gray-50 rounded-lg p-4 text-center">'
    html += '<div class="text-3xl font-bold text-primary-600">' + member.post_count + '</div>'
    html += '<div class="text-sm text-gray-600 mt-1">投稿数</div>'
    html += '</div>'
    html += '<div class="bg-gray-50 rounded-lg p-4 text-center">'
    html += '<div class="text-3xl font-bold text-primary-600">' + member.comment_count + '</div>'
    html += '<div class="text-sm text-gray-600 mt-1">コメント数</div>'
    html += '</div></div>'
    
    // ステータス変更（オーナー以外）
    if (canChangeStatus) {
        html += '<div class="mb-6 p-4 bg-gray-50 rounded-lg">'
        html += '<h4 class="font-bold text-gray-900 mb-3"><i class="fas fa-shield-alt mr-2"></i>ステータス管理</h4>'
        html += '<div class="flex gap-2">'
        html += '<button onclick="changeMemberStatus(' + member.id + ', \'active\')" class="btn btn-sm ' + (member.status === 'active' ? 'btn-success' : 'btn-outline-success') + '">'
        html += '<i class="fas fa-check-circle mr-1"></i>アクティブ</button>'
        html += '<button onclick="changeMemberStatus(' + member.id + ', \'suspended\')" class="btn btn-sm ' + (member.status === 'suspended' ? 'btn-warning' : 'btn-outline-warning') + '">'
        html += '<i class="fas fa-pause-circle mr-1"></i>停止</button>'
        html += '<button onclick="changeMemberStatus(' + member.id + ', \'withdrawn\')" class="btn btn-sm ' + (member.status === 'withdrawn' ? 'btn-error' : 'btn-outline-error') + '">'
        html += '<i class="fas fa-times-circle mr-1"></i>退会</button>'
        html += '</div></div>'
    }
    
    // 役割変更（オーナーのみ）
    if (canChangeRole) {
        html += '<div class="mb-6 p-4 bg-gray-50 rounded-lg">'
        html += '<h4 class="font-bold text-gray-900 mb-3"><i class="fas fa-user-shield mr-2"></i>役割管理</h4>'
        html += '<div class="flex gap-2">'
        html += '<button onclick="changeMemberRole(' + member.id + ', \'member\')" class="btn btn-sm ' + (member.role === 'member' ? 'btn-primary' : 'btn-outline-primary') + '">'
        html += '<i class="fas fa-user mr-1"></i>一般会員</button>'
        html += '<button onclick="changeMemberRole(' + member.id + ', \'admin\')" class="btn btn-sm ' + (member.role === 'admin' ? 'btn-primary' : 'btn-outline-primary') + '">'
        html += '<i class="fas fa-user-shield mr-1"></i>管理者</button>'
        html += '</div></div>'
    }
    
    html += '</div>'
    html += '<div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">'
    html += '<button onclick="closeMemberDetailModal()" class="btn btn-outline-secondary">閉じる</button>'
    html += '</div></div>'
    
    modal.innerHTML = html
    document.body.appendChild(modal)
}

function closeMemberDetailModal() {
    const modal = document.getElementById('memberDetailModal')
    if (modal) modal.remove()
}

async function changeMemberStatus(memberId, newStatus) {
    const statusNames = { 'active': 'アクティブ', 'suspended': '停止', 'withdrawn': '退会' }
    
    if (!confirm('この会員のステータスを「' + statusNames[newStatus] + '」に変更しますか？')) return
    
    try {
        const token = localStorage.getItem('authToken')
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
        const token = localStorage.getItem('authToken')
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
