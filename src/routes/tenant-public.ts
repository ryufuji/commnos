// ============================================
// テナント公開ページルート（Phase 3）
// 会員がアクセスするコミュニティページ
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'

const tenantPublic = new Hono<AppContext>()

// テスト用シンプルルート
tenantPublic.get('/test', (c) => {
  return c.text('Test route works!')
})

// --------------------------------------------
// テナントホームページ
// --------------------------------------------
tenantPublic.get('/home', async (c) => {
  const { DB } = c.env
  
  // 開発環境：クエリパラメータからsubdomainを取得
  const subdomain = c.req.query('subdomain')
  
  if (!subdomain) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>開発環境 - Commons</title>
</head>
<body>
    <h1>開発環境</h1>
    <p>URLに?subdomain=your-subdomainを追加してください</p>
    <a href="/">ホームに戻る</a>
</body>
</html>`)
  }
  
  // テナント情報を取得
  const tenant = await DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = ?'
  ).bind(subdomain, 'active').first()
  
  if (!tenant) {
    return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>コミュニティが見つかりません - Commons</title>
</head>
<body>
    <h1>404</h1>
    <p>コミュニティが見つかりません: ${subdomain}</p>
</body>
</html>`)
  }
  
  const tenantName = String(tenant.name || '')
  const tenantSubtitle = String(tenant.subtitle || '')
  
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>${tenantName} - Commons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-8">
    <h1 class="text-3xl font-bold">${tenantName}</h1>
    <p class="text-gray-600">${tenantSubtitle}</p>
    <p>Subdomain: ${subdomain}</p>
</body>
</html>`)
})

export default tenantPublic
