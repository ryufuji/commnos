// ============================================
// テナントカスタマイズAPI
// ロゴ・ファビコン・デザイン設定
// ============================================

import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../middleware/auth'
import type { AppContext } from '../types'

const tenantCustomization = new Hono<AppContext>()

/**
 * GET /api/tenant-customization?subdomain=xxx
 * テナントのカスタマイズ設定を取得（公開API）
 */
tenantCustomization.get('/', async (c) => {
  const subdomain = c.req.query('subdomain')
  const { DB } = c.env

  if (!subdomain) {
    return c.json({ success: false, error: 'Subdomain is required' }, 400)
  }

  try {
    const tenant = await DB.prepare(`
      SELECT id FROM tenants WHERE subdomain = ? AND status = 'active'
    `).bind(subdomain).first() as any

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    const customization = await DB.prepare(`
      SELECT * FROM tenant_customization WHERE tenant_id = ?
    `).bind(tenant.id).first() as any

    // デフォルト値を返却（設定がない場合）
    const defaultCustomization = {
      logo_url: null,
      favicon_url: null,
      cover_image_url: null,
      cover_overlay_opacity: 0.5,
      hero_title: null,
      hero_subtitle: null,
      navigation_config: '{"items":["home","posts","events","members","chat","points","shop"],"order":["home","posts","events","members","chat","points","shop"]}',
      primary_color: '#00BCD4',
      primary_dark: '#0097A7',
      primary_light: '#B2EBF2',
      secondary_color: '#FDB714',
      font_family_heading: 'Noto Sans JP',
      font_family_body: 'Noto Sans JP',
      layout_preset: 'modern',
      custom_css: '',
      enable_dark_mode: 0
    }

    return c.json({
      success: true,
      customization: customization || defaultCustomization
    })
  } catch (error) {
    console.error('[Get Customization Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get customization'
    }, 500)
  }
})

/**
 * PUT /api/tenant-customization
 * テナントのカスタマイズ設定を更新（管理者専用）
 */
tenantCustomization.put('/', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const data = await c.req.json()

    // 既存の設定を確認
    const existing = await DB.prepare(`
      SELECT id FROM tenant_customization WHERE tenant_id = ?
    `).bind(tenantId).first()

    if (existing) {
      // 更新
      await DB.prepare(`
        UPDATE tenant_customization
        SET 
          logo_url = COALESCE(?, logo_url),
          favicon_url = COALESCE(?, favicon_url),
          cover_image_url = COALESCE(?, cover_image_url),
          cover_overlay_opacity = COALESCE(?, cover_overlay_opacity),
          welcome_title = COALESCE(?, welcome_title),
          welcome_subtitle = COALESCE(?, welcome_subtitle),
          navigation_config = COALESCE(?, navigation_config),
          updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?
      `).bind(
        data.logo_url || null,
        data.favicon_url || null,
        data.cover_image_url || null,
        data.cover_overlay_opacity !== undefined ? data.cover_overlay_opacity : null,
        data.welcome_title || null,
        data.welcome_subtitle || null,
        data.navigation_config || null,
        tenantId
      ).run()
    } else {
      // 新規挿入
      await DB.prepare(`
        INSERT INTO tenant_customization (
          tenant_id, logo_url, favicon_url, cover_image_url,
          cover_overlay_opacity, welcome_title, welcome_subtitle, navigation_config
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        tenantId,
        data.logo_url || null,
        data.favicon_url || null,
        data.cover_image_url || null,
        data.cover_overlay_opacity !== undefined ? data.cover_overlay_opacity : 0.5,
        data.welcome_title || null,
        data.welcome_subtitle || null,
        data.navigation_config || '{"items":["home","posts","events","members","chat","points","shop"],"order":["home","posts","events","members","chat","points","shop"]}'
      ).run()
    }

    return c.json({
      success: true,
      message: 'カスタマイズ設定を更新しました'
    })
  } catch (error) {
    console.error('[Update Customization Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update customization'
    }, 500)
  }
})

/**
 * POST /api/tenant-customization/upload-logo
 * ロゴ画像アップロード（管理者専用）
 */
tenantCustomization.post('/upload-logo', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { R2 } = c.env

  try {
    const formData = await c.req.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return c.json({ success: false, error: '画像ファイルが必要です' }, 400)
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return c.json({
        success: false,
        error: '対応していないファイル形式です（JPEG、PNG、GIF、WebP、SVGのみ）'
      }, 400)
    }

    // ファイルサイズチェック（2MB以下）
    if (file.size > 2 * 1024 * 1024) {
      return c.json({ success: false, error: 'ファイルサイズは2MB以下にしてください' }, 400)
    }

    // ユニークなファイル名を生成
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    const key = `tenant-logos/${tenantId}/${timestamp}-${randomString}.${extension}`

    // R2にアップロード
    const arrayBuffer = await file.arrayBuffer()
    await R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    // 公開URL
    const logoUrl = `/api/tenant-customization/images/${key}`

    return c.json({
      success: true,
      logo_url: logoUrl,
      key: key
    })
  } catch (error) {
    console.error('[Upload Logo Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload logo'
    }, 500)
  }
})

/**
 * POST /api/tenant-customization/upload-favicon
 * ファビコン画像アップロード（管理者専用）
 */
tenantCustomization.post('/upload-favicon', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { R2 } = c.env

  try {
    const formData = await c.req.formData()
    const file = formData.get('favicon') as File

    if (!file) {
      return c.json({ success: false, error: '画像ファイルが必要です' }, 400)
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return c.json({
        success: false,
        error: '対応していないファイル形式です（ICO、PNG、SVGのみ）'
      }, 400)
    }

    // ファイルサイズチェック（1MB以下）
    if (file.size > 1 * 1024 * 1024) {
      return c.json({ success: false, error: 'ファイルサイズは1MB以下にしてください' }, 400)
    }

    // ユニークなファイル名を生成
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    const key = `tenant-favicons/${tenantId}/${timestamp}-${randomString}.${extension}`

    // R2にアップロード
    const arrayBuffer = await file.arrayBuffer()
    await R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    // 公開URL
    const faviconUrl = `/api/tenant-customization/images/${key}`

    return c.json({
      success: true,
      favicon_url: faviconUrl,
      key: key
    })
  } catch (error) {
    console.error('[Upload Favicon Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload favicon'
    }, 500)
  }
})

/**
 * POST /api/tenant-customization/upload-cover
 * カバー画像アップロード（管理者専用）
 */
tenantCustomization.post('/upload-cover', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { R2 } = c.env

  try {
    const formData = await c.req.formData()
    const file = formData.get('cover') as File

    if (!file) {
      return c.json({ success: false, error: '画像ファイルが必要です' }, 400)
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json({
        success: false,
        error: '対応していないファイル形式です（JPEG、PNG、GIF、WebPのみ）'
      }, 400)
    }

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'ファイルサイズは5MB以下にしてください' }, 400)
    }

    // ユニークなファイル名を生成
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    const key = `tenant-covers/${tenantId}/${timestamp}-${randomString}.${extension}`

    // R2にアップロード
    const arrayBuffer = await file.arrayBuffer()
    await R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    // 公開URL
    const coverUrl = `/api/tenant-customization/images/${key}`

    return c.json({
      success: true,
      cover_image_url: coverUrl,
      key: key
    })
  } catch (error) {
    console.error('[Upload Cover Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload cover'
    }, 500)
  }
})

/**
 * GET /api/tenant-customization/images/:key
 * カスタマイズ画像取得
 */
tenantCustomization.get('/images/*', async (c) => {
  const { R2 } = c.env
  const path = c.req.path.replace('/api/tenant-customization/images/', '')

  try {
    const object = await R2.get(path)

    if (!object) {
      return c.notFound()
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error) {
    console.error('[Get Customization Image Error]', error)
    return c.notFound()
  }
})

export default tenantCustomization
