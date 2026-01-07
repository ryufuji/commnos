# クーポン機能 UI実装ガイド

## 概要

コミュニティ管理者がクーポンコードを入力することで、月額費用を免除または割引できる機能です。

---

## 1. テナント作成時のクーポン入力

### 新規登録ページ (`/register`) にクーポン入力フィールドを追加

```html
<!-- 既存の登録フォームに追加 -->
<div class="mb-4">
  <label for="couponCode" class="block text-sm font-medium text-gray-700 mb-2">
    クーポンコード（任意）
  </label>
  <input 
    type="text" 
    id="couponCode" 
    name="couponCode"
    placeholder="PARTNER-PREMIUM"
    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
  >
  <p class="mt-1 text-xs text-gray-500">
    クーポンをお持ちの場合は入力してください
  </p>
  
  <!-- クーポン検証結果の表示エリア -->
  <div id="couponValidation" class="mt-2 hidden">
    <div id="couponSuccess" class="flex items-center text-green-600 text-sm hidden">
      <i class="fas fa-check-circle mr-2"></i>
      <span id="couponSuccessMessage"></span>
    </div>
    <div id="couponError" class="flex items-center text-red-600 text-sm hidden">
      <i class="fas fa-times-circle mr-2"></i>
      <span id="couponErrorMessage"></span>
    </div>
  </div>
</div>

<script>
// リアルタイムクーポン検証
const couponInput = document.getElementById('couponCode');
let validationTimeout;

couponInput.addEventListener('input', async (e) => {
  clearTimeout(validationTimeout);
  const code = e.target.value.trim();
  
  if (!code) {
    document.getElementById('couponValidation').classList.add('hidden');
    return;
  }
  
  validationTimeout = setTimeout(async () => {
    try {
      const response = await axios.post('/api/coupons/validate', { code });
      
      if (response.data.success) {
        document.getElementById('couponValidation').classList.remove('hidden');
        document.getElementById('couponSuccess').classList.remove('hidden');
        document.getElementById('couponError').classList.add('hidden');
        document.getElementById('couponSuccessMessage').textContent = 
          `${response.data.coupon.name} - ${response.data.coupon.description}`;
      }
    } catch (error) {
      document.getElementById('couponValidation').classList.remove('hidden');
      document.getElementById('couponSuccess').classList.add('hidden');
      document.getElementById('couponError').classList.remove('hidden');
      document.getElementById('couponErrorMessage').textContent = 
        error.response?.data?.message || 'クーポンコードが無効です';
    }
  }, 500);
});

// 登録フォーム送信時にクーポンを含める
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    subdomain: document.getElementById('subdomain').value,
    communityName: document.getElementById('communityName').value,
    couponCode: document.getElementById('couponCode').value.trim() || null
  };
  
  // ... 既存の登録処理
});
</script>
```

---

## 2. 既存テナントへのクーポン適用

### ダッシュボード (`/dashboard`) にクーポン管理セクションを追加

```html
<!-- クーポン管理カード -->
<div class="bg-white rounded-lg shadow-md p-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-800">
      <i class="fas fa-ticket-alt text-indigo-600 mr-2"></i>
      クーポン管理
    </h3>
  </div>
  
  <!-- クーポン未適用時 -->
  <div id="noCouponSection">
    <p class="text-gray-600 mb-4">
      クーポンコードをお持ちの場合、月額費用が割引または無料になります。
    </p>
    
    <div class="flex gap-2">
      <input 
        type="text" 
        id="dashboardCouponCode" 
        placeholder="クーポンコードを入力"
        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
      >
      <button 
        id="applyCouponBtn"
        class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        <i class="fas fa-check mr-2"></i>
        適用
      </button>
    </div>
    
    <div id="dashboardCouponValidation" class="mt-2 hidden">
      <div id="dashboardCouponError" class="flex items-center text-red-600 text-sm">
        <i class="fas fa-times-circle mr-2"></i>
        <span id="dashboardCouponErrorMessage"></span>
      </div>
    </div>
  </div>
  
  <!-- クーポン適用済み時 -->
  <div id="hasCouponSection" class="hidden">
    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div class="flex items-start justify-between">
        <div>
          <h4 class="font-semibold text-green-800 mb-1" id="couponName"></h4>
          <p class="text-sm text-green-700" id="couponDescription"></p>
          <p class="text-xs text-green-600 mt-2" id="couponExpiry"></p>
        </div>
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <i class="fas fa-check-circle mr-1"></i>
          適用中
        </span>
      </div>
    </div>
    
    <button 
      id="removeCouponBtn"
      class="text-sm text-red-600 hover:text-red-700"
    >
      <i class="fas fa-times mr-1"></i>
      クーポンを削除
    </button>
  </div>
</div>

<script>
// クーポン適用
document.getElementById('applyCouponBtn').addEventListener('click', async () => {
  const code = document.getElementById('dashboardCouponCode').value.trim();
  
  if (!code) {
    return;
  }
  
  try {
    const response = await axios.post('/api/coupons/apply', {
      code: code,
      tenant_id: currentUser.tenantId
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.data.success) {
      showToast('クーポンを適用しました！', 'success');
      loadCouponStatus();  // クーポン状態を再読み込み
    }
  } catch (error) {
    document.getElementById('dashboardCouponValidation').classList.remove('hidden');
    document.getElementById('dashboardCouponErrorMessage').textContent = 
      error.response?.data?.message || 'クーポンの適用に失敗しました';
  }
});

// クーポン削除
document.getElementById('removeCouponBtn').addEventListener('click', async () => {
  if (!confirm('クーポンを削除してもよろしいですか？')) {
    return;
  }
  
  try {
    await axios.delete(`/api/coupons/${currentUser.tenantId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    showToast('クーポンを削除しました', 'success');
    loadCouponStatus();
  } catch (error) {
    showToast('クーポンの削除に失敗しました', 'error');
  }
});

// クーポン状態の読み込み
async function loadCouponStatus() {
  try {
    const response = await axios.get(`/api/tenants/${currentUser.tenantId}/coupon-status`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.data.has_coupon) {
      document.getElementById('noCouponSection').classList.add('hidden');
      document.getElementById('hasCouponSection').classList.remove('hidden');
      
      document.getElementById('couponName').textContent = response.data.coupon_name;
      document.getElementById('couponDescription').textContent = response.data.coupon_description;
      
      if (response.data.coupon_expires_at) {
        const expiryDate = new Date(response.data.coupon_expires_at);
        document.getElementById('couponExpiry').textContent = 
          `有効期限: ${expiryDate.toLocaleDateString('ja-JP')}`;
      } else {
        document.getElementById('couponExpiry').textContent = '有効期限: 無期限';
      }
    } else {
      document.getElementById('noCouponSection').classList.remove('hidden');
      document.getElementById('hasCouponSection').classList.add('hidden');
    }
  } catch (error) {
    console.error('Failed to load coupon status:', error);
  }
}

// ページロード時に実行
loadCouponStatus();
</script>
```

---

## 3. プラットフォーム管理者用クーポン管理画面

### `/platform/coupons` ページ

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>クーポン管理 - Platform Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900">
        <i class="fas fa-ticket-alt text-indigo-600 mr-3"></i>
        クーポン管理
      </h1>
      <button id="createCouponBtn" class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
        <i class="fas fa-plus mr-2"></i>
        新規クーポン作成
      </button>
    </div>
    
    <!-- クーポン一覧テーブル -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">コード</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名前</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">割引タイプ</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">使用状況</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">有効期限</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
          </tr>
        </thead>
        <tbody id="couponTableBody">
          <!-- JavaScriptで動的に生成 -->
        </tbody>
      </table>
    </div>
    
    <!-- クーポン作成モーダル -->
    <div id="createCouponModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-2xl w-full">
        <h2 class="text-2xl font-bold mb-6">新規クーポン作成</h2>
        
        <form id="createCouponForm">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">コード</label>
              <input type="text" name="code" required class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">名前</label>
              <input type="text" name="name" required class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">説明</label>
            <textarea name="description" rows="3" class="w-full px-4 py-2 border rounded-lg"></textarea>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">割引タイプ</label>
              <select name="discount_type" required class="w-full px-4 py-2 border rounded-lg">
                <option value="free_forever">永久無料</option>
                <option value="free_months">期間限定無料</option>
                <option value="percent_off">パーセント割引</option>
                <option value="amount_off">金額割引</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">割引値</label>
              <input type="number" name="discount_value" class="w-full px-4 py-2 border rounded-lg">
            </div>
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">最大使用回数（-1で無制限）</label>
            <input type="number" name="max_uses" value="-1" class="w-full px-4 py-2 border rounded-lg">
          </div>
          
          <div class="flex justify-end gap-3">
            <button type="button" id="cancelCreateBtn" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              キャンセル
            </button>
            <button type="submit" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    // クーポン一覧読み込み
    async function loadCoupons() {
      const response = await axios.get('/api/coupons/admin/list');
      const tbody = document.getElementById('couponTableBody');
      
      tbody.innerHTML = response.data.coupons.map(coupon => `
        <tr class="border-t">
          <td class="px-6 py-4 font-mono text-sm">${coupon.code}</td>
          <td class="px-6 py-4">${coupon.name}</td>
          <td class="px-6 py-4">${getDiscountTypeLabel(coupon.discount_type)}</td>
          <td class="px-6 py-4">${coupon.usage_count} / ${coupon.max_uses === -1 ? '無制限' : coupon.max_uses}</td>
          <td class="px-6 py-4">${coupon.valid_until || '無期限'}</td>
          <td class="px-6 py-4">
            ${coupon.is_active ? '<span class="text-green-600">有効</span>' : '<span class="text-gray-400">無効</span>'}
          </td>
        </tr>
      `).join('');
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
    
    loadCoupons();
  </script>
</body>
</html>
```

---

## 4. サブスクリプション管理画面での表示

既存の `/tenant/subscription` または `/subscription/platform` ページに、クーポン適用状態を表示：

```html
<!-- 現在のプラン表示 -->
<div class="bg-white rounded-lg shadow-md p-6">
  <h3 class="text-xl font-semibold mb-4">現在のプラン</h3>
  
  <div class="flex justify-between items-center mb-2">
    <span class="text-gray-600">プラン名</span>
    <span class="font-semibold" id="currentPlanName">スターター</span>
  </div>
  
  <div class="flex justify-between items-center mb-2">
    <span class="text-gray-600">月額料金</span>
    <div>
      <span id="originalPrice" class="line-through text-gray-400">¥3,000</span>
      <span id="discountedPrice" class="font-semibold text-green-600 ml-2">¥0</span>
    </div>
  </div>
  
  <!-- クーポン適用中の表示 -->
  <div id="couponAppliedBanner" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 hidden">
    <div class="flex items-center text-green-800 text-sm">
      <i class="fas fa-ticket-alt mr-2"></i>
      <span>クーポン適用中: <strong id="appliedCouponName"></strong></span>
    </div>
  </div>
</div>
```

---

## まとめ

### 実装箇所
1. ✅ 新規登録時のクーポン入力
2. ✅ ダッシュボードでのクーポン管理
3. ✅ プラットフォーム管理者用クーポン管理画面
4. ✅ サブスクリプション管理画面での表示

### クーポンタイプ
- **free_forever**: 永久無料
- **free_months**: N ヶ月間無料
- **percent_off**: N% 割引
- **amount_off**: N円 割引
