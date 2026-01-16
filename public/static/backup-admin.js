// ============================================
// バックアップ管理画面
// ============================================

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
  // 認証チェック
  checkAuth();
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

// バックアップをエクスポート
async function exportBackup() {
  const token = getToken();
  if (!token) return;
  
  const exportBtn = document.getElementById('exportBtn');
  exportBtn.disabled = true;
  exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>エクスポート中...';
  
  try {
    const response = await axios.get('/api/backup/export', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      const backupData = response.data.backup;
      
      // JSONファイルとしてダウンロード
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // ファイル名：backup_テナントID_日時.json
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `backup_tenant${backupData.metadata.tenant_id}_${timestamp}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('バックアップをダウンロードしました', 'success');
    } else {
      showToast('バックアップに失敗しました', 'error');
    }
  } catch (error) {
    console.error('Export error:', error);
    showToast('バックアップに失敗しました', 'error');
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      showToast('認証に失敗しました', 'error');
      setTimeout(() => window.location.href = '/login', 2000);
    }
  } finally {
    exportBtn.disabled = false;
    exportBtn.innerHTML = '<i class="fas fa-download"></i><span>バックアップをダウンロード</span>';
  }
}

// バックアップをリストア
async function restoreBackup() {
  const fileInput = document.getElementById('backupFile');
  const file = fileInput.files[0];
  
  if (!file) {
    showToast('バックアップファイルを選択してください', 'error');
    return;
  }
  
  // 確認ダイアログ
  if (!confirm('⚠️ 警告：現在のデータは全て削除され、バックアップファイルのデータで上書きされます。\n\nこの操作は取り消せません。本当に復元しますか？')) {
    return;
  }
  
  // 再確認
  if (!confirm('本当によろしいですか？現在のデータは完全に失われます。')) {
    return;
  }
  
  const token = getToken();
  if (!token) return;
  
  const restoreBtn = document.getElementById('restoreBtn');
  restoreBtn.disabled = true;
  restoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>復元中...';
  
  try {
    // ファイルを読み込み
    const text = await file.text();
    const backupData = JSON.parse(text);
    
    // バックアップデータの検証
    if (!backupData.metadata || !backupData.metadata.tenant_id) {
      showToast('無効なバックアップファイルです', 'error');
      return;
    }
    
    // リストアAPIを呼び出し
    const response = await axios.post('/api/backup/restore', {
      backup: backupData
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      showToast('バックアップから復元しました。ページをリロードします...', 'success');
      
      // 3秒後にリロード
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      showToast(response.data.message || '復元に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Restore error:', error);
    
    if (error instanceof SyntaxError) {
      showToast('無効なJSONファイルです', 'error');
    } else if (error.response?.data?.message) {
      showToast(error.response.data.message, 'error');
    } else {
      showToast('復元に失敗しました', 'error');
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      showToast('認証に失敗しました', 'error');
      setTimeout(() => window.location.href = '/login', 2000);
    }
  } finally {
    restoreBtn.disabled = false;
    restoreBtn.innerHTML = '<i class="fas fa-upload"></i><span>バックアップから復元</span>';
    fileInput.value = ''; // ファイル選択をクリア
  }
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
