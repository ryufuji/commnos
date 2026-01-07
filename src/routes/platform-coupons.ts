// ============================================
// プラットフォーム管理 - クーポン管理ページ
// /platform/coupons
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'

const platformCoupons = new Hono<AppContext>()

/**
 * GET /platform/coupons
 * クーポン管理ページ
 */
platformCoupons.get('/', async (c) => {
  const subdomain = c.req.query('subdomain')
  
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>クーポン管理 - Platform Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
  <!-- ヘッダー -->
  <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <a href="/platform/dashboard" class="text-2xl font-bold text-indigo-600">
            <i class="fas fa-shield-alt mr-2"></i>
            Platform Admin
          </a>
          <nav class="hidden md:flex items-center gap-6 ml-8">
            <a href="/platform/dashboard" class="text-gray-600 hover:text-gray-900">
              <i class="fas fa-chart-line mr-2"></i>
              ダッシュボード
            </a>
            <a href="/platform/tenants" class="text-gray-600 hover:text-gray-900">
              <i class="fas fa-building mr-2"></i>
              テナント管理
            </a>
            <a href="/platform/coupons" class="text-indigo-600 font-semibold">
              <i class="fas fa-ticket-alt mr-2"></i>
              クーポン管理
            </a>
          </nav>
        </div>
        <button id="logoutBtn" class="text-gray-600 hover:text-gray-900">
          <i class="fas fa-sign-out-alt mr-2"></i>
          ログアウト
        </button>
      </div>
    </div>
  </header>

  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- ページヘッダー -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          <i class="fas fa-ticket-alt text-indigo-600 mr-3"></i>
          クーポン管理
        </h1>
        <p class="text-gray-600 mt-2">コミュニティ管理者向けのクーポンを作成・管理します</p>
      </div>
      <button id="createCouponBtn" class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
        <i class="fas fa-plus mr-2"></i>
        新規クーポン作成
      </button>
    </div>
    
    <!-- 統計カード -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm">総クーポン数</p>
            <p class="text-3xl font-bold text-gray-900 mt-2" id="totalCoupons">0</p>
          </div>
          <div class="p-4 bg-indigo-100 rounded-full">
            <i class="fas fa-ticket-alt text-2xl text-indigo-600"></i>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm">有効なクーポン</p>
            <p class="text-3xl font-bold text-green-600 mt-2" id="activeCoupons">0</p>
          </div>
          <div class="p-4 bg-green-100 rounded-full">
            <i class="fas fa-check-circle text-2xl text-green-600"></i>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm">使用中</p>
            <p class="text-3xl font-bold text-blue-600 mt-2" id="usedCoupons">0</p>
          </div>
          <div class="p-4 bg-blue-100 rounded-full">
            <i class="fas fa-users text-2xl text-blue-600"></i>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm">無効・期限切れ</p>
            <p class="text-3xl font-bold text-gray-600 mt-2" id="inactiveCoupons">0</p>
          </div>
          <div class="p-4 bg-gray-100 rounded-full">
            <i class="fas fa-times-circle text-2xl text-gray-600"></i>
          </div>
        </div>
      </div>
    </div>
    
    <!-- クーポン一覧テーブル -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">クーポン一覧</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">コード</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">割引タイプ</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">割引値</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">使用状況</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">有効期限</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody id="couponTableBody" class="bg-white divide-y divide-gray-200">
            <!-- JavaScriptで動的に生成 -->
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- クーポン作成モーダル -->
    <div id="createCouponModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-900">新規クーポン作成</h2>
          <button id="closeModalBtn" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form id="createCouponForm" class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                クーポンコード <span class="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="code" 
                required 
                placeholder="PARTNER-2025"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
              <p class="text-xs text-gray-500 mt-1">半角英数字とハイフン（例: LAUNCH2025）</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                クーポン名 <span class="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="name" 
                required 
                placeholder="パートナー特典"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">説明</label>
            <textarea 
              name="description" 
              rows="3" 
              placeholder="このクーポンの説明を入力してください"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                割引タイプ <span class="text-red-500">*</span>
              </label>
              <select 
                name="discount_type" 
                id="discountType"
                required 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="free_forever">永久無料</option>
                <option value="free_months">期間限定無料</option>
                <option value="percent_off">パーセント割引</option>
                <option value="amount_off">金額割引</option>
              </select>
            </div>
            <div id="discountValueContainer">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                割引値 <span class="text-red-500">*</span>
              </label>
              <input 
                type="number" 
                name="discount_value" 
                id="discountValue"
                min="0"
                placeholder="0"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
              <p class="text-xs text-gray-500 mt-1" id="discountValueHint">永久無料の場合は0</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">最大使用回数</label>
              <input 
                type="number" 
                name="max_uses" 
                value="-1" 
                min="-1"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
              <p class="text-xs text-gray-500 mt-1">-1 で無制限</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">有効期限</label>
              <input 
                type="date" 
                name="valid_until"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
              <p class="text-xs text-gray-500 mt-1">未設定で無期限</p>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">適用可能プラン</label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="checkbox" name="applicable_plans" value="all" checked class="mr-2">
                <span class="text-sm">全プラン</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" name="applicable_plans" value="free" class="mr-2">
                <span class="text-sm">フリー</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" name="applicable_plans" value="starter" class="mr-2">
                <span class="text-sm">スターター</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" name="applicable_plans" value="growth" class="mr-2">
                <span class="text-sm">成長</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" name="applicable_plans" value="enterprise" class="mr-2">
                <span class="text-sm">エンタープライズ</span>
              </label>
            </div>
          </div>
          
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button 
              type="button" 
              id="cancelCreateBtn" 
              class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
            <button 
              type="submit" 
              class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <i class="fas fa-plus mr-2"></i>
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Toast通知 -->
    <div id="toast" class="hidden fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div class="flex items-center">
        <div id="toastIcon" class="mr-3"></div>
        <div id="toastMessage" class="text-gray-900"></div>
      </div>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    // Toast通知
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      const toastIcon = document.getElementById('toastIcon');
      const toastMessage = document.getElementById('toastMessage');
      
      if (type === 'success') {
        toastIcon.innerHTML = '<i class="fas fa-check-circle text-2xl text-green-600"></i>';
      } else {
        toastIcon.innerHTML = '<i class="fas fa-times-circle text-2xl text-red-600"></i>';
      }
      
      toastMessage.textContent = message;
      toast.classList.remove('hidden');
      
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }
    
    // クーポン一覧読み込み
    async function loadCoupons() {
      try {
        const token = localStorage.getItem('platform_token');
        if (!token) {
          window.location.href = '/platform/login';
          return;
        }
        
        const response = await axios.get('/api/coupons/admin/list', {
          headers: {
            'Authorization': \`Bearer \${token}\`
          }
        });
        
        if (response.data.success) {
          renderCoupons(response.data.coupons);
          updateStats(response.data.coupons);
        }
      } catch (error) {
        console.error('Failed to load coupons:', error);
        if (error.response?.status === 401) {
          window.location.href = '/platform/login';
        }
      }
    }
    
    // 統計更新
    function updateStats(coupons) {
      const total = coupons.length;
      const active = coupons.filter(c => c.is_active === 1).length;
      const used = coupons.filter(c => c.usage_count > 0).length;
      const inactive = total - active;
      
      document.getElementById('totalCoupons').textContent = total;
      document.getElementById('activeCoupons').textContent = active;
      document.getElementById('usedCoupons').textContent = used;
      document.getElementById('inactiveCoupons').textContent = inactive;
    }
    
    // クーポン一覧表示
    function renderCoupons(coupons) {
      const tbody = document.getElementById('couponTableBody');
      
      if (coupons.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="8" class="px-6 py-12 text-center text-gray-500">
              <i class="fas fa-ticket-alt text-4xl text-gray-300 mb-4"></i>
              <p>まだクーポンがありません</p>
            </td>
          </tr>
        \`;
        return;
      }
      
      tbody.innerHTML = coupons.map(coupon => \`
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4">
            <span class="font-mono text-sm font-semibold text-indigo-600">\${coupon.code}</span>
          </td>
          <td class="px-6 py-4">
            <div>
              <p class="font-medium text-gray-900">\${coupon.name}</p>
              <p class="text-xs text-gray-500">\${coupon.description || ''}</p>
            </div>
          </td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 text-xs rounded-full \${getDiscountTypeColor(coupon.discount_type)}">
              \${getDiscountTypeLabel(coupon.discount_type)}
            </span>
          </td>
          <td class="px-6 py-4 text-sm text-gray-900">
            \${getDiscountValueText(coupon.discount_type, coupon.discount_value)}
          </td>
          <td class="px-6 py-4 text-sm text-gray-900">
            \${coupon.usage_count} / \${coupon.max_uses === -1 ? '無制限' : coupon.max_uses}
          </td>
          <td class="px-6 py-4 text-sm text-gray-600">
            \${coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString('ja-JP') : '無期限'}
          </td>
          <td class="px-6 py-4">
            \${coupon.is_active ? 
              '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">有効</span>' : 
              '<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">無効</span>'
            }
          </td>
          <td class="px-6 py-4">
            <button 
              onclick="toggleCouponStatus(\${coupon.id}, \${coupon.is_active})"
              class="text-sm text-indigo-600 hover:text-indigo-800"
            >
              <i class="fas \${coupon.is_active ? 'fa-ban' : 'fa-check-circle'} mr-1"></i>
              \${coupon.is_active ? '無効化' : '有効化'}
            </button>
          </td>
        </tr>
      \`).join('');
    }
    
    function getDiscountTypeLabel(type) {
      const labels = {
        'free_forever': '永久無料',
        'free_months': '期間限定無料',
        'percent_off': 'パーセント割引',
        'amount_off': '金額割引'
      };
      return labels[type] || type;
    }
    
    function getDiscountTypeColor(type) {
      const colors = {
        'free_forever': 'bg-purple-100 text-purple-800',
        'free_months': 'bg-blue-100 text-blue-800',
        'percent_off': 'bg-green-100 text-green-800',
        'amount_off': 'bg-yellow-100 text-yellow-800'
      };
      return colors[type] || 'bg-gray-100 text-gray-800';
    }
    
    function getDiscountValueText(type, value) {
      switch(type) {
        case 'free_forever':
          return '永久無料';
        case 'free_months':
          return \`\${value}ヶ月\`;
        case 'percent_off':
          return \`\${value}%\`;
        case 'amount_off':
          return \`¥\${value.toLocaleString()}\`;
        default:
          return '-';
      }
    }
    
    // モーダル開閉
    document.getElementById('createCouponBtn').addEventListener('click', () => {
      document.getElementById('createCouponModal').classList.remove('hidden');
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
      document.getElementById('createCouponModal').classList.add('hidden');
    });
    
    document.getElementById('cancelCreateBtn').addEventListener('click', () => {
      document.getElementById('createCouponModal').classList.add('hidden');
    });
    
    // 割引タイプ変更時のヒント更新
    document.getElementById('discountType').addEventListener('change', (e) => {
      const type = e.target.value;
      const hint = document.getElementById('discountValueHint');
      const valueInput = document.getElementById('discountValue');
      
      switch(type) {
        case 'free_forever':
          hint.textContent = '永久無料の場合は0';
          valueInput.value = '0';
          break;
        case 'free_months':
          hint.textContent = '無料期間の月数（例: 6）';
          valueInput.value = '';
          break;
        case 'percent_off':
          hint.textContent = '割引率（例: 50 = 50%割引）';
          valueInput.value = '';
          break;
        case 'amount_off':
          hint.textContent = '割引金額（円）';
          valueInput.value = '';
          break;
      }
    });
    
    // クーポン作成
    document.getElementById('createCouponForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = {
        code: formData.get('code'),
        name: formData.get('name'),
        description: formData.get('description'),
        discount_type: formData.get('discount_type'),
        discount_value: parseInt(formData.get('discount_value')) || 0,
        max_uses: parseInt(formData.get('max_uses')) || -1,
        valid_until: formData.get('valid_until') || null
      };
      
      // 適用可能プラン
      const planCheckboxes = document.querySelectorAll('input[name="applicable_plans"]:checked');
      const plans = Array.from(planCheckboxes).map(cb => cb.value);
      if (plans.includes('all')) {
        data.applicable_plans = null;
      } else {
        data.applicable_plans = plans.filter(p => p !== 'all');
      }
      
      try {
        const token = localStorage.getItem('platform_token');
        const response = await axios.post('/api/coupons/admin/create', data, {
          headers: {
            'Authorization': \`Bearer \${token}\`
          }
        });
        
        if (response.data.success) {
          showToast('クーポンを作成しました', 'success');
          document.getElementById('createCouponModal').classList.add('hidden');
          e.target.reset();
          loadCoupons();
        }
      } catch (error) {
        console.error('Failed to create coupon:', error);
        showToast(error.response?.data?.message || 'クーポンの作成に失敗しました', 'error');
      }
    });
    
    // ページロード時
    loadCoupons();
    
    // ログアウト
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('platform_token');
      window.location.href = '/platform/login';
    });
  </script>
</body>
</html>
  `)
})

export { platformCoupons }
