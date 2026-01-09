// ========================================
// Commons プラン選択ページ JavaScript
// ========================================

// グローバル変数
let currentPlan = null
let selectedPlanId = null
let allPlans = []

// ========================================
// プラン読み込み
// ========================================

async function loadPlans() {
  try {
    const response = await axios.get(`/api/tenant/member/plans?subdomain=${subdomain}`)
    
    if (response.data.success) {
      allPlans = response.data.plans
      renderPlans(allPlans)
      renderComparisonTable(allPlans)
    } else {
      showToast('プランの読み込みに失敗しました', 'error')
    }
  } catch (error) {
    console.error('Load plans error:', error)
    showToast('プランの読み込みに失敗しました', 'error')
  }
}

// ========================================
// 現在のプラン読み込み
// ========================================

async function loadCurrentPlan() {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const response = await axios.get(`/api/tenant/member/current-plan?subdomain=${subdomain}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (response.data.success && response.data.plan) {
      currentPlan = response.data.plan
      showCurrentPlanBanner()
    }
  } catch (error) {
    console.error('Load current plan error:', error)
  }
}

// ========================================
// プランカード描画
// ========================================

function renderPlans(plans) {
  const grid = document.getElementById('plans-grid')
  
  if (!grid) return
  
  grid.innerHTML = plans.map((plan, index) => {
    const isCurrent = currentPlan && currentPlan.id === plan.id
    const isFeatured = index === Math.floor(plans.length / 2) // 中央のプランを推奨
    const features = plan.features ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) : []
    
    return `
      <div class="plan-card ${isFeatured ? 'featured' : ''} fade-in-up" style="animation-delay: ${index * 0.1}s; opacity: 0;">
        ${isFeatured ? '<span class="plan-badge"><i class="fas fa-star"></i> おすすめ</span>' : ''}
        
        <div class="plan-level">レベル ${plan.plan_level || 0}</div>
        <h3 class="plan-name">${escapeHtml(plan.name)}</h3>
        
        <div class="plan-price">
          ¥${plan.price.toLocaleString()}
          <span>/月</span>
        </div>
        
        <p class="plan-description">${escapeHtml(plan.description || '')}</p>
        
        ${Array.isArray(features) && features.length > 0 ? `
          <ul class="plan-features">
            ${features.map(feature => `
              <li>
                <i class="fas fa-check-circle"></i>
                <span>${escapeHtml(feature)}</span>
              </li>
            `).join('')}
          </ul>
        ` : ''}
        
        <button 
          onclick="selectPlan(${plan.id}, '${escapeHtml(plan.name)}', '${escapeHtml(plan.description || '')}', ${plan.price})"
          class="plan-select-button ${isCurrent ? 'current' : ''}"
          ${isCurrent ? 'disabled' : ''}
        >
          ${isCurrent ? 
            '<i class="fas fa-check"></i><span>現在のプラン</span>' : 
            '<i class="fas fa-arrow-right"></i><span>このプランを選ぶ</span>'
          }
        </button>
      </div>
    `
  }).join('')
  
  // アニメーションを開始
  setTimeout(() => {
    document.querySelectorAll('.fade-in-up').forEach(el => {
      el.style.opacity = '1'
    })
  }, 100)
}

// ========================================
// 比較テーブル描画
// ========================================

function renderComparisonTable(plans) {
  const table = document.getElementById('comparison-table')
  
  if (!table) return
  
  // 機能リスト（プランレベルに応じて表示）
  const features = [
    { name: '投稿閲覧', levels: [0, 1, 2, 3] },
    { name: 'コメント投稿', levels: [0, 1, 2, 3] },
    { name: 'プレミアム記事', levels: [1, 2, 3] },
    { name: '動画コンテンツ', levels: [2, 3] },
    { name: '限定イベント参加', levels: [2, 3] },
    { name: 'ダウンロード機能', levels: [3] },
    { name: '個別サポート', levels: [3] }
  ]
  
  const headerRow = `
    <tr>
      <th class="feature-name">機能</th>
      ${plans.map(plan => `
        <th>
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">${escapeHtml(plan.name)}</div>
          <div style="font-size: 14px; opacity: 0.8;">¥${plan.price.toLocaleString()}/月</div>
        </th>
      `).join('')}
    </tr>
  `
  
  const featureRows = features.map(feature => `
    <tr>
      <td class="feature-name">${feature.name}</td>
      ${plans.map(plan => {
        const hasFeature = feature.levels.includes(plan.plan_level || 0)
        return `
          <td>
            ${hasFeature ? 
              '<i class="fas fa-check-circle check-icon"></i>' : 
              '<i class="fas fa-times-circle times-icon"></i>'
            }
          </td>
        `
      }).join('')}
    </tr>
  `).join('')
  
  table.innerHTML = headerRow + featureRows
}

// ========================================
// プラン選択
// ========================================

function selectPlan(planId, planName, planDescription, planPrice) {
  selectedPlanId = planId
  
  const modalDetails = document.getElementById('modal-plan-details')
  if (!modalDetails) return
  
  modalDetails.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, var(--commons-primary), var(--commons-accent-yellow)); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <i class="fas fa-crown" style="font-size: 36px; color: white;"></i>
      </div>
      
      <h3 style="font-size: 28px; font-weight: 700; margin-bottom: 12px; color: var(--commons-text-primary);">${planName}</h3>
      <p style="color: var(--commons-text-secondary); margin-bottom: 20px;">${planDescription}</p>
      
      <div style="font-size: 48px; font-weight: 700; color: var(--commons-primary); margin-bottom: 8px;">
        ¥${planPrice.toLocaleString()}
        <span style="font-size: 18px; color: var(--commons-text-secondary);">/月</span>
      </div>
      
      <p style="font-size: 14px; color: var(--commons-text-tertiary); margin-top: 20px; line-height: 1.6;">
        <i class="fas fa-info-circle"></i> このプランを選択して、Stripe決済ページに進みます
      </p>
    </div>
  `
  
  const modal = document.getElementById('plan-modal')
  if (modal) {
    modal.style.display = 'flex'
    document.body.style.overflow = 'hidden'
  }
}

// ========================================
// プラン選択確定
// ========================================

async function confirmPlanSelection() {
  const token = localStorage.getItem('token')
  
  if (!token) {
    showToast('ログインが必要です', 'info')
    setTimeout(() => {
      window.location.href = `/login?subdomain=${subdomain}&redirect=/tenant/member-plans-premium?subdomain=${subdomain}`
    }, 1000)
    return
  }
  
  try {
    showToast('処理中...', 'info')
    
    const response = await axios.post('/api/tenant/member/change-plan', {
      subdomain: subdomain,
      plan_id: selectedPlanId
    }, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.data.success && response.data.checkout_url) {
      showToast('Stripe決済ページに移動します...', 'success')
      setTimeout(() => {
        window.location.href = response.data.checkout_url
      }, 1000)
    } else if (response.data.success) {
      showToast('プランを変更しました', 'success')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } else {
      showToast(response.data.error || 'プランの変更に失敗しました', 'error')
    }
  } catch (error) {
    console.error('Plan change error:', error)
    const errorMessage = error.response?.data?.error || 'プランの変更に失敗しました'
    showToast(errorMessage, 'error')
  }
}

// ========================================
// モーダル操作
// ========================================

function closePlanModal() {
  const modal = document.getElementById('plan-modal')
  if (modal) {
    modal.style.display = 'none'
    document.body.style.overflow = 'auto'
  }
}

// モーダル外クリックで閉じる
document.addEventListener('click', (e) => {
  const modal = document.getElementById('plan-modal')
  if (modal && e.target === modal) {
    closePlanModal()
  }
})

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePlanModal()
  }
})

// ========================================
// 現在のプランバナー表示
// ========================================

function showCurrentPlanBanner() {
  if (currentPlan) {
    const planNameEl = document.getElementById('current-plan-name')
    const bannerEl = document.getElementById('current-plan-banner')
    
    if (planNameEl && bannerEl) {
      planNameEl.textContent = `${currentPlan.name} - ¥${currentPlan.price.toLocaleString()}/月`
      bannerEl.style.display = 'block'
    }
  }
}

// ========================================
// アップグレードオプション表示
// ========================================

function showUpgradeOptions() {
  const plansSection = document.getElementById('plans-section')
  if (plansSection) {
    plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// ========================================
// スクロール
// ========================================

function scrollToPlans() {
  const plansSection = document.getElementById('plans-section')
  if (plansSection) {
    plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// ========================================
// アニメーション初期化
// ========================================

function initAnimations() {
  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1'
        entry.target.style.transform = 'translateY(0)'
      }
    })
  }, { 
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  })
  
  // Observe all fade-in elements
  document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right').forEach(el => {
    observer.observe(el)
  })
}

// ========================================
// トースト通知
// ========================================

function showToast(message, type = 'info') {
  // 既存のトーストを削除
  const existingToast = document.getElementById('toast-notification')
  if (existingToast) {
    existingToast.remove()
  }
  
  // アイコンマップ
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle'
  }
  
  // カラーマップ
  const colors = {
    success: 'var(--commons-primary)',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  }
  
  // トースト要素を作成
  const toast = document.createElement('div')
  toast.id = 'toast-notification'
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    max-width: 400px;
    border-left: 4px solid ${colors[type]};
  `
  
  toast.innerHTML = `
    <i class="fas ${icons[type]}" style="font-size: 20px; color: ${colors[type]};"></i>
    <span style="font-size: 14px; color: var(--commons-text-primary); flex: 1;">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; color: var(--commons-text-tertiary); font-size: 18px;">
      <i class="fas fa-times"></i>
    </button>
  `
  
  document.body.appendChild(toast)
  
  // 3秒後に自動削除
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slideOutRight 0.3s ease'
      setTimeout(() => toast.remove(), 300)
    }
  }, 3000)
}

// トーストアニメーション
const style = document.createElement('style')
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`
document.head.appendChild(style)

// ========================================
// ユーティリティ関数
// ========================================

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ========================================
// ページ読み込み時の初期化
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing plan selection page...')
  
  try {
    await loadPlans()
    await loadCurrentPlan()
    initAnimations()
    
    console.log('Plan selection page initialized successfully')
  } catch (error) {
    console.error('Initialization error:', error)
    showToast('ページの初期化に失敗しました', 'error')
  }
})
