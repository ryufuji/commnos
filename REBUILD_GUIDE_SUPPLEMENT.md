# Commons プラットフォーム 再構築ガイド - 補足資料

このドキュメントは `REBUILD_PROMPT.md` の補足として、実装時の具体的なコード例とベストプラクティスを提供します。

---

## 📦 Package.json テンプレート

```json
{
  "name": "commons-webapp",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:sandbox": "wrangler pages dev dist --ip 0.0.0.0 --port 3000",
    "dev:d1": "wrangler pages dev dist --d1=commons-webapp-production --local --ip 0.0.0.0 --port 3000",
    "build": "vite build && cp -rf public/static dist/ && cp -f public/_headers dist/",
    "preview": "wrangler pages dev dist",
    "deploy": "npm run build && wrangler pages deploy dist --branch main --project-name commons-webapp",
    "deploy:staging": "npm run build && wrangler pages deploy dist --branch staging --project-name commons-webapp",
    "deploy:preview": "npm run build && wrangler pages deploy dist --project-name commons-webapp",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings",
    "clean-port": "fuser -k 3000/tcp 2>/dev/null || true",
    "test": "curl http://localhost:3000/health",
    "db:migrate:local": "wrangler d1 migrations apply commons-webapp-production --local",
    "db:migrate:prod": "wrangler d1 migrations apply commons-webapp-production",
    "db:seed": "wrangler d1 execute commons-webapp-production --local --file=./seed.sql",
    "db:reset": "rm -rf .wrangler/state/v3/d1 && npm run db:migrate:local && npm run db:seed"
  },
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "4.20250705.0",
    "@hono/vite-cloudflare-pages": "^0.4.2",
    "vite": "^5.0.0",
    "wrangler": "^3.78.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🔧 Vite設定（vite.config.ts）

```typescript
import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig({
  plugins: [pages()],
  build: {
    outDir: 'dist'
  }
})
```

---

## 🗂️ TypeScript型定義（src/types.ts）

```typescript
export interface AppContext {
  Bindings: {
    DB: D1Database
    R2: R2Bucket
    JWT_SECRET: string
    PLATFORM_DOMAIN: string
    STRIPE_SECRET_KEY: string
    RESEND_API_KEY: string
  }
  Variables: {
    userId?: number
    tenantId?: number
  }
}
```

---

## 🎨 Tailwind設定（public/static/tailwind-config.js）

```javascript
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--commons-primary-50)',
          100: 'var(--commons-primary-100)',
          200: 'var(--commons-primary-200)',
          300: 'var(--commons-primary-300)',
          400: 'var(--commons-primary-400)',
          500: 'var(--commons-primary)',
          600: 'var(--commons-primary-600)',
          700: 'var(--commons-primary-700)',
          800: 'var(--commons-primary-800)',
          900: 'var(--commons-primary-900)'
        }
      }
    }
  }
}
```

---

## 🎨 テーマCSS（public/static/commons-theme.css）

```css
:root {
  /* Modern Business (デフォルト) */
  --commons-primary: #6366f1;
  --commons-primary-50: #eef2ff;
  --commons-primary-100: #e0e7ff;
  --commons-primary-200: #c7d2fe;
  --commons-primary-300: #a5b4fc;
  --commons-primary-400: #818cf8;
  --commons-primary-500: #6366f1;
  --commons-primary-600: #4f46e5;
  --commons-primary-700: #4338ca;
  --commons-primary-800: #3730a3;
  --commons-primary-900: #312e81;
  
  --commons-text-primary: #1f2937;
  --commons-text-secondary: #6b7280;
  --commons-bg-primary: #ffffff;
  --commons-bg-secondary: #f9fafb;
  --commons-border: #e5e7eb;
}

[data-theme="dark"] {
  --commons-text-primary: #f9fafb;
  --commons-text-secondary: #d1d5db;
  --commons-bg-primary: #111827;
  --commons-bg-secondary: #1f2937;
  --commons-border: #374151;
}

[data-theme="wellness-nature"] {
  --commons-primary: #10b981;
  --commons-primary-500: #10b981;
}

[data-theme="creative-studio"] {
  --commons-primary: #f97316;
  --commons-primary-500: #f97316;
}

[data-theme="tech-innovation"] {
  --commons-primary: #06b6d4;
  --commons-primary-500: #06b6d4;
}
```

---

## 🎨 コンポーネントCSS（public/static/commons-components.css）

```css
/* ボタン */
.btn-primary {
  @apply bg-primary-500 text-white px-6 py-2 rounded-lg font-semibold 
         hover:bg-primary-600 transition-colors duration-200;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold 
         hover:bg-gray-300 transition-colors duration-200;
}

.btn-ghost {
  @apply text-gray-700 px-6 py-2 rounded-lg font-semibold 
         hover:bg-gray-100 transition-colors duration-200;
}

/* カード */
.card {
  @apply bg-white rounded-lg shadow-md p-6;
}

.card-interactive {
  @apply card hover:shadow-lg transition-shadow duration-200 cursor-pointer;
}

/* フォーム */
.input-field {
  @apply w-full px-4 py-2 border border-gray-300 rounded-lg 
         focus:ring-2 focus:ring-primary-500 focus:border-transparent;
}

.label {
  @apply block text-sm font-semibold text-gray-700 mb-2;
}

/* バッジ */
.badge {
  @apply inline-block px-3 py-1 text-sm font-semibold rounded-full;
}

.badge-primary {
  @apply badge bg-primary-100 text-primary-800;
}

.badge-success {
  @apply badge bg-green-100 text-green-800;
}

.badge-warning {
  @apply badge bg-yellow-100 text-yellow-800;
}

.badge-danger {
  @apply badge bg-red-100 text-red-800;
}

/* アニメーション */
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

---

## 📱 フロントエンドJavaScript（public/static/app.js の主要機能）

```javascript
// トースト通知
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    type === 'warning' ? 'bg-yellow-500' :
    'bg-blue-500'
  } text-white`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 認証チェック
async function checkAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    window.location.href = '/login';
    return false;
  }
  
  return true;
}

// ログアウト
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('membership');
  window.location.href = '/';
}

// 画像遅延読み込み
document.addEventListener('DOMContentLoaded', () => {
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });
    
    lazyImages.forEach(img => imageObserver.observe(img));
  }
});

// ダークモード切り替え
function toggleDarkMode() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const isDark = currentTheme?.includes('dark');
  
  if (isDark) {
    html.setAttribute('data-theme', currentTheme.replace('-dark', ''));
  } else {
    html.setAttribute('data-theme', `${currentTheme || 'modern-business'}-dark`);
  }
  
  localStorage.setItem('theme', html.getAttribute('data-theme'));
}
```

---

## 🔐 認証ミドルウェア例

```typescript
import { Context, Next } from 'hono'
import { verify } from 'jose'
import type { AppContext } from '../types'

export async function authMiddleware(c: Context<AppContext>, next: Next) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }
  
  const token = authHeader.substring(7)
  
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await verify(token, secret)
    
    c.set('userId', payload.userId as number)
    
    await next()
  } catch (error) {
    return c.json({ success: false, error: 'Invalid token' }, 401)
  }
}
```

---

## 📧 メールテンプレート例

```typescript
// 会員申請受付メール
export function getApplicationReceivedEmail(nickname: string, communityName: string) {
  return {
    subject: `【${communityName}】会員申請を受け付けました`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>会員申請を受け付けました</h2>
        <p>${nickname} 様</p>
        <p>${communityName} への会員申請を受け付けました。</p>
        <p>管理者による承認をお待ちください。</p>
        <p>承認後、メールでお知らせいたします。</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          このメールは自動送信されています。返信はできません。
        </p>
      </div>
    `
  }
}

// 会員承認通知メール
export function getApprovalEmail(nickname: string, communityName: string, memberNumber: string) {
  return {
    subject: `【${communityName}】会員登録が承認されました`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>会員登録が承認されました</h2>
        <p>${nickname} 様</p>
        <p>${communityName} への会員登録が承認されました。</p>
        <p><strong>会員番号:</strong> ${memberNumber}</p>
        <p>ログインしてご利用いただけます。</p>
        <a href="https://commons-webapp.pages.dev/login" 
           style="display: inline-block; background: #6366f1; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                  margin: 16px 0;">
          ログインする
        </a>
        <hr>
        <p style="color: #666; font-size: 12px;">
          このメールは自動送信されています。返信はできません。
        </p>
      </div>
    `
  }
}
```

---

## 🎮 PM2設定（ecosystem.config.cjs）

```javascript
module.exports = {
  apps: [
    {
      name: 'commons-webapp',
      script: 'npx',
      args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}
```

---

## 🔍 デバッグ用コード例

```typescript
// ログ出力ヘルパー
export function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, data || '')
  }
}

// エラーハンドリング
export function handleError(error: any, context: string) {
  console.error(`[ERROR] ${context}:`, error)
  return {
    success: false,
    error: error.message || 'Internal server error',
    context
  }
}

// クエリログ
export async function logQuery(query: string, params: any[]) {
  console.log('[QUERY]', query)
  console.log('[PARAMS]', params)
}
```

---

## 📊 SQLクエリのベストプラクティス

```typescript
// ✅ 良い例: プリペアドステートメント
const user = await DB.prepare(
  'SELECT * FROM users WHERE email = ?'
).bind(email).first()

// ✅ 良い例: トランザクション
await DB.batch([
  DB.prepare('UPDATE users SET points = points + ? WHERE id = ?')
    .bind(10, userId),
  DB.prepare('INSERT INTO point_transactions (user_id, amount) VALUES (?, ?)')
    .bind(userId, 10)
])

// ❌ 悪い例: 文字列結合（SQLインジェクションの危険）
const user = await DB.prepare(
  `SELECT * FROM users WHERE email = '${email}'`
).first()

// ✅ 良い例: ページネーション
const limit = 20
const offset = (page - 1) * limit
const posts = await DB.prepare(
  'SELECT * FROM posts WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
).bind(tenantId, limit, offset).all()

// ✅ 良い例: JOINクエリ
const posts = await DB.prepare(`
  SELECT 
    p.*,
    u.nickname as author_name,
    (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count
  FROM posts p
  LEFT JOIN users u ON p.author_id = u.id
  WHERE p.tenant_id = ?
  ORDER BY p.created_at DESC
`).bind(tenantId).all()
```

---

## 🚨 エラーハンドリングパターン

```typescript
// APIルートのエラーハンドリング
app.post('/api/posts', async (c) => {
  try {
    const { title, content } = await c.req.json()
    
    // バリデーション
    if (!title || !content) {
      return c.json({
        success: false,
        error: 'Title and content are required'
      }, 400)
    }
    
    // データベース操作
    const result = await DB.prepare(
      'INSERT INTO posts (title, content, tenant_id) VALUES (?, ?, ?)'
    ).bind(title, content, tenantId).run()
    
    return c.json({
      success: true,
      post: { id: result.meta.last_row_id, title, content }
    })
    
  } catch (error) {
    console.error('[POST] Error creating post:', error)
    return c.json({
      success: false,
      error: 'Failed to create post'
    }, 500)
  }
})
```

---

## 📝 コーディング規約

### 命名規則
- **ファイル名**: kebab-case（例: `tenant-auth.ts`）
- **変数名**: camelCase（例: `userName`）
- **定数**: UPPER_SNAKE_CASE（例: `MAX_FILE_SIZE`）
- **クラス名**: PascalCase（例: `UserService`）
- **データベーステーブル**: snake_case（例: `tenant_memberships`）

### コメント
- **英語**: 技術的な説明
- **日本語**: ビジネスロジックの説明

```typescript
// ✅ 良い例
// ユーザーの会員ステータスを確認
const membership = await checkMembershipStatus(userId, tenantId)

// ✅ 良い例: JSDoc
/**
 * ポイントを付与する
 * @param userId - ユーザーID
 * @param points - 付与ポイント数
 * @param action - アクション種別
 * @returns トランザクションID
 */
async function awardPoints(
  userId: number, 
  points: number, 
  action: string
): Promise<number> {
  // 実装
}
```

### エラーメッセージ
- **ユーザー向け**: 日本語、分かりやすく
- **ログ**: 英語、詳細情報を含む

```typescript
// ✅ 良い例
try {
  // 処理
} catch (error) {
  console.error('[AUTH] Failed to verify token:', error)
  return c.json({
    success: false,
    error: '認証に失敗しました。もう一度ログインしてください。'
  }, 401)
}
```

---

生成日時: 2026-02-06
バージョン: 1.0.0
