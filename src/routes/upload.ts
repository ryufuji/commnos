import { Hono } from 'hono'
import { verifyToken } from '../lib/jwt'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  JWT_SECRET: string
}

const upload = new Hono<{ Bindings: Bindings }>()

// 画像アップロードAPI（プロフィール画像）
upload.post('/avatar', async (c) => {
  try {
    // 認証チェック
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const userId = result.payload.userId

    // ファイルデータの取得
    const formData = await c.req.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return c.json({ success: false, error: 'No file uploaded' }, 400)
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        success: false, 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' 
      }, 400)
    }

    // ファイルサイズチェック（5MB制限）
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return c.json({ 
        success: false, 
        error: 'File too large. Maximum size is 5MB.' 
      }, 400)
    }

    // ファイル名生成（ユーザーID + タイムスタンプ + 拡張子）
    const ext = file.name.split('.').pop()
    const key = `avatars/${userId}-${Date.now()}.${ext}`

    // R2にアップロード
    const arrayBuffer = await file.arrayBuffer()
    await c.env.R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    // データベースのユーザー情報を更新
    const avatarUrl = `/api/images/${key}`
    await c.env.DB.prepare(`
      UPDATE users 
      SET avatar_url = ?
      WHERE id = ?
    `).bind(avatarUrl, userId).run()

    return c.json({ 
      success: true, 
      avatar_url: avatarUrl 
    })

  } catch (error: any) {
    console.error('Avatar upload error:', error)
    return c.json({ 
      success: false, 
      error: error.message || 'Upload failed' 
    }, 500)
  }
})

// 画像アップロードAPI（投稿サムネイル）
upload.post('/post-thumbnail', async (c) => {
  try {
    // 認証チェック
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    // ファイルデータの取得
    const formData = await c.req.formData()
    const file = formData.get('thumbnail') as File

    if (!file) {
      return c.json({ success: false, error: 'No file uploaded' }, 400)
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        success: false, 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' 
      }, 400)
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return c.json({ 
        success: false, 
        error: 'File too large. Maximum size is 10MB.' 
      }, 400)
    }

    // ファイル名生成（投稿用: タイムスタンプ + ランダム文字列 + 拡張子）
    const ext = file.name.split('.').pop()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const key = `thumbnails/${Date.now()}-${randomStr}.${ext}`

    // R2にアップロード
    const arrayBuffer = await file.arrayBuffer()
    await c.env.R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    const thumbnailUrl = `/api/images/${key}`

    return c.json({ 
      success: true, 
      thumbnail_url: thumbnailUrl 
    })

  } catch (error: any) {
    console.error('Thumbnail upload error:', error)
    return c.json({ 
      success: false, 
      error: error.message || 'Upload failed' 
    }, 500)
  }
})

// 動画アップロードAPI（投稿用）
upload.post('/post-video', async (c) => {
  try {
    // 認証チェック
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    // ファイルデータの取得
    const formData = await c.req.formData()
    const file = formData.get('video') as File

    if (!file) {
      return c.json({ success: false, error: 'No file uploaded' }, 400)
    }

    // ファイルタイプチェック（動画形式）
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        success: false, 
        error: 'Invalid file type. Only MP4, WebM, OGG, and MOV are allowed.' 
      }, 400)
    }

    // ファイルサイズチェック（100MB制限）
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return c.json({ 
        success: false, 
        error: 'File too large. Maximum size is 100MB.' 
      }, 400)
    }

    // ファイル名生成（動画用: タイムスタンプ + ランダム文字列 + 拡張子）
    const ext = file.name.split('.').pop()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const key = `videos/${Date.now()}-${randomStr}.${ext}`

    // R2にアップロード
    const arrayBuffer = await file.arrayBuffer()
    await c.env.R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    const videoUrl = `/api/images/${key}`

    return c.json({ 
      success: true, 
      video_url: videoUrl,
      file_size: file.size,
      mime_type: file.type
    })

  } catch (error: any) {
    console.error('Video upload error:', error)
    return c.json({ 
      success: false, 
      error: error.message || 'Upload failed' 
    }, 500)
  }
})

// メディアアップロードAPI（画像・動画両対応）
upload.post('/post-media', async (c) => {
  try {
    // 認証チェック
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    // ファイルデータの取得
    const formData = await c.req.formData()
    const file = formData.get('media') as File

    if (!file) {
      return c.json({ success: false, error: 'No file uploaded' }, 400)
    }

    // ファイルタイプ判定
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
    
    let mediaType: 'image' | 'video'
    let maxSize: number
    let folder: string

    if (imageTypes.includes(file.type)) {
      mediaType = 'image'
      maxSize = 10 * 1024 * 1024 // 10MB
      folder = 'thumbnails'
    } else if (videoTypes.includes(file.type)) {
      mediaType = 'video'
      maxSize = 100 * 1024 * 1024 // 100MB
      folder = 'videos'
    } else {
      return c.json({ 
        success: false, 
        error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, OGG, MOV) are allowed.' 
      }, 400)
    }

    // ファイルサイズチェック
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024)
      return c.json({ 
        success: false, 
        error: `File too large. Maximum size is ${maxSizeMB}MB for ${mediaType}.` 
      }, 400)
    }

    // ファイル名生成
    const ext = file.name.split('.').pop()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const key = `${folder}/${Date.now()}-${randomStr}.${ext}`

    // R2にアップロード
    const arrayBuffer = await file.arrayBuffer()
    await c.env.R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    const mediaUrl = `/api/images/${key}`

    return c.json({ 
      success: true, 
      media_url: mediaUrl,
      media_type: mediaType,
      file_size: file.size,
      mime_type: file.type
    })

  } catch (error: any) {
    console.error('Media upload error:', error)
    return c.json({ 
      success: false, 
      error: error.message || 'Upload failed' 
    }, 500)
  }
})

export default upload
