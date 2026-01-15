// ============================================
// イベント管理画面
// ============================================

let currentEvent = null;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
  // 認証チェック
  checkAuth();
  
  // イベント一覧を読み込み
  loadEvents();
  
  // フォームイベント
  document.getElementById('eventForm').addEventListener('submit', saveEvent);
  
  // 開催形式変更時のフィールド表示切り替え
  document.getElementById('locationType').addEventListener('change', (e) => {
    const type = e.target.value;
    const locationFields = document.getElementById('locationFields');
    const onlineFields = document.getElementById('onlineFields');
    
    if (type === 'online') {
      locationFields.classList.add('hidden');
      onlineFields.classList.remove('hidden');
    } else if (type === 'physical') {
      locationFields.classList.remove('hidden');
      onlineFields.classList.add('hidden');
    } else { // hybrid
      locationFields.classList.remove('hidden');
      onlineFields.classList.remove('hidden');
    }
  });
});

// 認証チェック
function checkAuth() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    window.location.href = '/login';
    return;
  }
  
  const user = JSON.parse(userStr);
  if (user.role !== 'admin' && user.role !== 'owner') {
    showToast('管理者権限が必要です', 'error');
    window.location.href = '/dashboard';
    return;
  }
}

// イベント一覧を読み込み
async function loadEvents() {
  const token = getToken();
  if (!token) return;
  
  try {
    const response = await axios.get('/api/events', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      renderEvents(response.data.events);
    } else {
      showToast('イベントの読み込みに失敗しました', 'error');
    }
  } catch (error) {
    console.error('Error loading events:', error);
    showToast('イベントの読み込みに失敗しました', 'error');
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      showToast('認証に失敗しました', 'error');
      setTimeout(() => window.location.href = '/login', 2000);
    }
  }
}

// イベント一覧を描画
function renderEvents(events) {
  const eventsList = document.getElementById('eventsList');
  
  if (events.length === 0) {
    eventsList.innerHTML = `
      <div class="text-center py-12 bg-white rounded-lg shadow-md">
        <i class="fas fa-calendar-times text-6xl text-gray-300 mb-4"></i>
        <p class="text-gray-600">イベントがまだ登録されていません</p>
        <button onclick="openCreateModal()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <i class="fas fa-plus mr-2"></i>最初のイベントを作成
        </button>
      </div>
    `;
    return;
  }
  
  eventsList.innerHTML = events.map(event => {
    const startDate = new Date(event.start_datetime);
    const endDate = event.end_datetime ? new Date(event.end_datetime) : null;
    const now = new Date();
    
    // イベント状態の判定
    let statusBadge = '';
    let statusClass = '';
    if (endDate && endDate < now) {
      statusBadge = '終了';
      statusClass = 'bg-gray-500 text-white';
    } else if (startDate > now) {
      statusBadge = '開催予定';
      statusClass = 'bg-blue-500 text-white';
    } else {
      statusBadge = '開催中';
      statusClass = 'bg-green-500 text-white';
    }
    
    // 公開状態
    const publishBadge = event.is_published 
      ? '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">公開</span>'
      : '<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">非公開</span>';
    
    // 会員限定バッジ
    const memberBadge = event.is_member_only
      ? '<span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full ml-2">会員限定</span>'
      : '';
    
    // 定員表示
    const participantInfo = event.max_participants
      ? `<span class="text-sm text-gray-600">定員: ${event.participant_count || 0}/${event.max_participants}人</span>`
      : `<span class="text-sm text-gray-600">参加者: ${event.participant_count || 0}人</span>`;
    
    return `
      <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
        <div class="flex justify-between items-start mb-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="px-3 py-1 ${statusClass} text-sm font-medium rounded-full">
                ${statusBadge}
              </span>
              ${publishBadge}
              ${memberBadge}
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">${escapeHtml(event.title)}</h3>
            ${event.description ? `<p class="text-gray-600 mb-4">${escapeHtml(event.description).substring(0, 150)}${event.description.length > 150 ? '...' : ''}</p>` : ''}
          </div>
        </div>
        
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="flex items-center text-gray-700">
            <i class="fas fa-calendar mr-2 text-blue-600"></i>
            <div>
              <div class="font-medium">開始: ${formatDateTime(startDate)}</div>
              ${endDate ? `<div class="text-sm text-gray-500">終了: ${formatDateTime(endDate)}</div>` : ''}
            </div>
          </div>
          <div class="flex items-center text-gray-700">
            <i class="fas fa-${event.location_type === 'online' ? 'video' : event.location_type === 'hybrid' ? 'globe' : 'map-marker-alt'} mr-2 text-blue-600"></i>
            <div>
              <div class="font-medium">${event.location_type === 'online' ? 'オンライン' : event.location_type === 'hybrid' ? 'ハイブリッド' : '対面開催'}</div>
              ${event.location_name ? `<div class="text-sm text-gray-500">${escapeHtml(event.location_name)}</div>` : ''}
            </div>
          </div>
        </div>
        
        <div class="flex items-center justify-between pt-4 border-t border-gray-200">
          <div class="flex items-center gap-4">
            <div class="flex items-center text-gray-600">
              <i class="fas fa-users mr-2"></i>
              ${participantInfo}
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="editEvent(${event.id})" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <i class="fas fa-edit mr-1"></i>編集
            </button>
            <button onclick="deleteEvent(${event.id})" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              <i class="fas fa-trash mr-1"></i>削除
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 日時フォーマット
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 作成モーダルを開く
function openCreateModal() {
  currentEvent = null;
  document.getElementById('modalTitle').innerHTML = '<i class="fas fa-calendar-plus mr-2 text-blue-600"></i>イベント作成';
  document.getElementById('eventForm').reset();
  document.getElementById('eventId').value = '';
  document.getElementById('eventModal').classList.remove('hidden');
  
  // 開催形式をデフォルトに戻す
  document.getElementById('locationFields').classList.remove('hidden');
  document.getElementById('onlineFields').classList.add('hidden');
}

// 編集モーダルを開く
async function editEvent(eventId) {
  const token = getToken();
  if (!token) return;
  
  try {
    const response = await axios.get(`/api/events/${eventId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      const event = response.data.event;
      currentEvent = event;
      
      document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit mr-2 text-blue-600"></i>イベント編集';
      document.getElementById('eventId').value = event.id;
      document.getElementById('title').value = event.title;
      document.getElementById('description').value = event.description || '';
      
      // 日時を分割
      const startDate = new Date(event.start_datetime);
      document.getElementById('startDate').value = formatDateForInput(startDate);
      document.getElementById('startTime').value = formatTimeForInput(startDate);
      
      if (event.end_datetime) {
        const endDate = new Date(event.end_datetime);
        document.getElementById('endDate').value = formatDateForInput(endDate);
        document.getElementById('endTime').value = formatTimeForInput(endDate);
      }
      
      document.getElementById('locationType').value = event.location_type || 'physical';
      document.getElementById('locationName').value = event.location_name || '';
      document.getElementById('locationAddress').value = event.location_address || '';
      document.getElementById('locationUrl').value = event.location_url || '';
      document.getElementById('maxParticipants').value = event.max_participants || '';
      document.getElementById('isPublished').value = event.is_published ? '1' : '0';
      document.getElementById('isMemberOnly').value = event.is_member_only ? '1' : '0';
      
      // 開催形式に応じたフィールド表示
      const type = event.location_type;
      const locationFields = document.getElementById('locationFields');
      const onlineFields = document.getElementById('onlineFields');
      
      if (type === 'online') {
        locationFields.classList.add('hidden');
        onlineFields.classList.remove('hidden');
      } else if (type === 'physical') {
        locationFields.classList.remove('hidden');
        onlineFields.classList.add('hidden');
      } else {
        locationFields.classList.remove('hidden');
        onlineFields.classList.remove('hidden');
      }
      
      document.getElementById('eventModal').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error loading event:', error);
    showToast('イベントの読み込みに失敗しました', 'error');
  }
}

// 日付をinput[type=date]用にフォーマット
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 時刻をinput[type=time]用にフォーマット
function formatTimeForInput(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// モーダルを閉じる
function closeEventModal() {
  document.getElementById('eventModal').classList.add('hidden');
  currentEvent = null;
}

// イベント保存
async function saveEvent(e) {
  e.preventDefault();
  
  const token = getToken();
  if (!token) return;
  
  const eventId = document.getElementById('eventId').value;
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const startDate = document.getElementById('startDate').value;
  const startTime = document.getElementById('startTime').value;
  const endDate = document.getElementById('endDate').value;
  const endTime = document.getElementById('endTime').value;
  const locationType = document.getElementById('locationType').value;
  const locationName = document.getElementById('locationName').value.trim();
  const locationAddress = document.getElementById('locationAddress').value.trim();
  const locationUrl = document.getElementById('locationUrl').value.trim();
  const maxParticipants = document.getElementById('maxParticipants').value;
  const isPublished = document.getElementById('isPublished').value === '1';
  const isMemberOnly = document.getElementById('isMemberOnly').value === '1';
  
  // バリデーション
  if (!title) {
    showToast('イベント名を入力してください', 'error');
    return;
  }
  
  if (!startDate || !startTime) {
    showToast('開始日時を入力してください', 'error');
    return;
  }
  
  // 日時を組み立て（JST）
  const startDatetime = `${startDate}T${startTime}:00`;
  let endDatetime = null;
  if (endDate && endTime) {
    endDatetime = `${endDate}T${endTime}:00`;
  }
  
  // ボタンを無効化
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中...';
  
  try {
    const data = {
      title,
      description,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      location_type: locationType,
      location_name: locationName,
      location_address: locationAddress,
      location_url: locationUrl,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      is_published: isPublished,
      is_member_only: isMemberOnly
    };
    
    let response;
    if (eventId) {
      // 更新
      response = await axios.put(`/api/events/${eventId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } else {
      // 新規作成
      response = await axios.post('/api/events', data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    if (response.data.success) {
      showToast(response.data.message || 'イベントを保存しました', 'success');
      closeEventModal();
      loadEvents();
    } else {
      showToast('イベントの保存に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Error saving event:', error);
    showToast('イベントの保存に失敗しました', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i><span>保存する</span>';
  }
}

// イベント削除
async function deleteEvent(eventId) {
  if (!confirm('本当にこのイベントを削除しますか？')) {
    return;
  }
  
  const token = getToken();
  if (!token) return;
  
  try {
    const response = await axios.delete(`/api/events/${eventId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      showToast('イベントを削除しました', 'success');
      loadEvents();
    } else {
      showToast('イベントの削除に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    showToast('イベントの削除に失敗しました', 'error');
  }
}

// HTML エスケープ
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// トークン取得
function getToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return null;
  }
  return token;
}
