/**
 * Commons Walkthrough System
 * 初回ログインユーザー向けのウォークスルー機能
 */

class CommonsWalkthrough {
  constructor() {
    this.steps = []
    this.currentStep = 0
    this.overlay = null
    this.modal = null
    this.isActive = false
    this.currentTarget = null
    this.resizeObserver = null
    this.updateHighlightBound = this.updateHighlight.bind(this)
  }

  /**
   * ウォークスルーを初期化
   */
  init(steps) {
    this.steps = steps
    this.currentStep = 0
    this.createOverlay()
    this.createModal()
  }

  /**
   * オーバーレイを作成
   */
  createOverlay() {
    this.overlay = document.createElement('div')
    this.overlay.id = 'walkthrough-overlay'
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9998;
      display: none;
      animation: fadeIn 0.3s ease-in-out;
    `
    document.body.appendChild(this.overlay)
  }

  /**
   * モーダルを作成
   */
  createModal() {
    this.modal = document.createElement('div')
    this.modal.id = 'walkthrough-modal'
    this.modal.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: calc(100% - 40px);
      z-index: 10000;
      display: none;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideInRight 0.3s ease-out;
    `
    
    // モバイル対応
    const updateModalPosition = () => {
      const width = window.innerWidth
      if (width < 768) {
        // モバイル：画面下部中央
        this.modal.style.bottom = '20px'
        this.modal.style.right = '50%'
        this.modal.style.left = 'auto'
        this.modal.style.transform = 'translateX(50%)'
        this.modal.style.maxWidth = 'calc(100% - 32px)'
        this.modal.style.padding = '20px'
      } else {
        // デスクトップ：右下
        this.modal.style.bottom = '32px'
        this.modal.style.right = '32px'
        this.modal.style.left = 'auto'
        this.modal.style.transform = 'none'
        this.modal.style.maxWidth = '420px'
        this.modal.style.padding = '32px'
      }
    }
    
    updateModalPosition()
    window.addEventListener('resize', updateModalPosition)
    
    document.body.appendChild(this.modal)
  }

  /**
   * ウォークスルーを開始
   */
  start() {
    if (this.steps.length === 0) return

    this.isActive = true
    this.overlay.style.display = 'block'
    this.modal.style.display = 'block'
    
    // 背景のスクロールを無効化
    document.body.style.overflow = 'hidden'
    
    // ウィンドウリサイズとスクロールのイベントリスナーを追加
    window.addEventListener('resize', this.updateHighlightBound)
    window.addEventListener('scroll', this.updateHighlightBound, true)
    
    this.showStep(0)
  }

  /**
   * ステップを表示
   */
  showStep(index) {
    if (index < 0 || index >= this.steps.length) return

    this.currentStep = index
    const step = this.steps[index]

    // 先にハイライトを設定（スクロールとポジショニング）
    if (step.target) {
      this.highlightElement(step.target)
      // ハイライト完了後にモーダルを更新
      setTimeout(() => this.updateModalContent(step, index), 50)
    } else {
      // ターゲットがない場合は即座にモーダルを更新
      this.updateModalContent(step, index)
    }
  }

  /**
   * モーダルの内容を更新
   */
  updateModalContent(step, index) {
    // モーダルの内容を更新
    this.modal.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">${step.icon || '👋'}</div>
        <h2 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 12px;">
          ${step.title}
        </h2>
        <p style="font-size: 16px; color: #6b7280; line-height: 1.6; margin-bottom: 24px;">
          ${step.description}
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 16px;">
          ${index > 0 ? `
            <button id="walkthrough-prev" style="
              padding: 12px 24px;
              background: #e5e7eb;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">
              <i class="fas fa-arrow-left mr-2"></i>前へ
            </button>
          ` : ''}
          ${index < this.steps.length - 1 ? `
            <button id="walkthrough-next" style="
              padding: 12px 24px;
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">
              次へ<i class="fas fa-arrow-right ml-2"></i>
            </button>
          ` : `
            <button id="walkthrough-finish" style="
              padding: 12px 32px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">
              <i class="fas fa-check mr-2"></i>始める
            </button>
          `}
        </div>
        <div style="margin-top: 16px;">
          <button id="walkthrough-skip" style="
            background: none;
            border: none;
            color: #9ca3af;
            font-size: 14px;
            cursor: pointer;
            text-decoration: underline;
          ">
            スキップ
          </button>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: center;">
          ${this.steps.map((_, i) => `
            <div style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: ${i === index ? '#3b82f6' : '#e5e7eb'};
              transition: all 0.3s;
            "></div>
          `).join('')}
        </div>
      </div>
    `

    // イベントリスナーを追加
    const prevBtn = document.getElementById('walkthrough-prev')
    const nextBtn = document.getElementById('walkthrough-next')
    const finishBtn = document.getElementById('walkthrough-finish')
    const skipBtn = document.getElementById('walkthrough-skip')

    if (prevBtn) prevBtn.addEventListener('click', () => this.prev())
    if (nextBtn) nextBtn.addEventListener('click', () => this.next())
    if (finishBtn) finishBtn.addEventListener('click', () => this.finish())
    if (skipBtn) skipBtn.addEventListener('click', () => this.skip())

    // ホバーエフェクト
    const buttons = this.modal.querySelectorAll('button')
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-2px)'
        btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
      })
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)'
        btn.style.boxShadow = 'none'
      })
    })
  }

  /**
   * 要素をハイライト
   */
  highlightElement(selector) {
    // 既存のハイライトを削除
    const existingHighlight = document.getElementById('walkthrough-highlight')
    if (existingHighlight) existingHighlight.remove()

    const element = document.querySelector(selector)
    if (!element) {
      this.currentTarget = null
      return
    }

    this.currentTarget = element

    // 先にスクロール（即座に）
    element.scrollIntoView({ behavior: 'instant', block: 'center' })
    
    // スクロール完了を待つ（requestAnimationFrameで確実に）
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // ハイライト要素を作成
        const highlight = document.createElement('div')
        highlight.id = 'walkthrough-highlight'
        highlight.style.cssText = `
          position: fixed;
          border: 4px solid #3b82f6;
          border-radius: 12px;
          z-index: 9999;
          pointer-events: none;
          animation: pulse 2s infinite;
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7),
                      0 0 20px 5px rgba(59, 130, 246, 0.3);
          background: rgba(59, 130, 246, 0.1);
          transition: all 0.2s ease;
          opacity: 0;
        `
        document.body.appendChild(highlight)

        // 位置を設定してフェードイン
        this.updateHighlight()
        requestAnimationFrame(() => {
          highlight.style.opacity = '1'
        })
      })
    })
  }

  /**
   * ハイライト位置を更新
   */
  updateHighlight() {
    if (!this.currentTarget) return

    const highlight = document.getElementById('walkthrough-highlight')
    if (!highlight) return

    const rect = this.currentTarget.getBoundingClientRect()
    
    // 位置を更新
    highlight.style.top = `${rect.top - 8}px`
    highlight.style.left = `${rect.left - 8}px`
    highlight.style.width = `${rect.width + 16}px`
    highlight.style.height = `${rect.height + 16}px`
  }

  /**
   * 次のステップへ
   */
  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.showStep(this.currentStep + 1)
    }
  }

  /**
   * 前のステップへ
   */
  prev() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1)
    }
  }

  /**
   * ウォークスルーを終了
   */
  finish() {
    this.close()
    localStorage.setItem('commons_walkthrough_completed', 'true')
    
    // 完了メッセージを表示
    this.showCompletionMessage()
  }

  /**
   * ウォークスルーをスキップ
   */
  skip() {
    if (confirm('ウォークスルーをスキップしますか？\n後からヘルプメニューで確認できます。')) {
      this.close()
      localStorage.setItem('commons_walkthrough_completed', 'true')
    }
  }

  /**
   * ウォークスルーを閉じる
   */
  close() {
    this.isActive = false
    this.overlay.style.display = 'none'
    this.modal.style.display = 'none'
    this.currentTarget = null
    
    // 背景のスクロールを再有効化
    document.body.style.overflow = ''
    
    // イベントリスナーを削除
    window.removeEventListener('resize', this.updateHighlightBound)
    window.removeEventListener('scroll', this.updateHighlightBound, true)
    
    // ハイライトを削除
    const highlight = document.getElementById('walkthrough-highlight')
    if (highlight) highlight.remove()
  }

  /**
   * 完了メッセージを表示
   */
  showCompletionMessage() {
    const message = document.createElement('div')
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
    `
    message.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <i class="fas fa-check-circle" style="font-size: 24px;"></i>
        <div>
          <div style="font-weight: bold; margin-bottom: 4px;">ウォークスルー完了！</div>
          <div style="font-size: 14px; opacity: 0.9;">Commonsを楽しんでください 🎉</div>
        </div>
      </div>
    `
    document.body.appendChild(message)

    setTimeout(() => {
      message.style.animation = 'slideOutRight 0.3s ease-in'
      setTimeout(() => message.remove(), 300)
    }, 3000)
  }

  /**
   * ウォークスルーが完了しているか確認
   */
  static isCompleted() {
    return localStorage.getItem('commons_walkthrough_completed') === 'true'
  }

  /**
   * ウォークスルーをリセット（テスト用）
   */
  static reset() {
    localStorage.removeItem('commons_walkthrough_completed')
    console.log('ウォークスルーをリセットしました')
  }
}

// アニメーション用のCSSを追加
const style = document.createElement('style')
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translate(-50%, -40%);
    }
    to { 
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100px);
    }
  }
`
document.head.appendChild(style)

// グローバルに公開
window.CommonsWalkthrough = CommonsWalkthrough
