import { Hono } from 'hono'
import { verifyToken } from '../lib/jwt'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const adminPosts = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/admin/posts
 * 管理者用：投稿一覧取得（全ステータス対応）
 */
adminPosts.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const tenantId = result.payload.tenantId
    const role = result.payload.role

    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403)
    }

    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const status = c.req.query('status') || 'all' // all, published, draft
    const offset = (page - 1) * limit

    let whereClause = 'p.tenant_id = ?'
    const params: any[] = [tenantId]

    if (status !== 'all') {
      whereClause += ' AND p.status = ?'
      params.push(status)
    }

    // 投稿一覧取得
    const postsResult = await c.env.DB.prepare(`
      SELECT 
        p.id, p.title, p.content, p.excerpt, p.thumbnail_url, p.video_url,
        p.status, p.visibility, p.published_at, p.view_count, p.created_at, p.updated_at,
        u.nickname as author_name, u.avatar_url as author_avatar,
        COUNT(DISTINCT l.id) as like_count,
        COUNT(DISTINCT cm.id) as comment_count
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN post_likes l ON p.id = l.post_id
      LEFT JOIN comments cm ON p.id = cm.post_id
      WHERE ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all()

    // 総数取得
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM posts p
      WHERE ${whereClause}
    `).bind(...params).first()

    const total = countResult?.total || 0

    return c.json({
      success: true,
      posts: postsResult.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('[Admin Posts List Error]', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * PUT /api/admin/posts/:id
 * 管理者用：投稿編集
 */
adminPosts.put('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const tenantId = result.payload.tenantId
    const role = result.payload.role

    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403)
    }

    const postId = parseInt(c.req.param('id'))
    const { title, content, status, thumbnail_url, video_url, visibility } = await c.req.json<{
      title?: string
      content?: string
      status?: 'draft' | 'published'
      thumbnail_url?: string | null
      video_url?: string | null
      visibility?: 'public' | 'members_only'
    }>()

    // 投稿存在確認
    const post = await c.env.DB.prepare(
      'SELECT * FROM posts WHERE id = ? AND tenant_id = ?'
    ).bind(postId, tenantId).first()

    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // 更新するフィールドを構築
    const updates: string[] = []
    const values: any[] = []

    if (title !== undefined) {
      updates.push('title = ?')
      values.push(title)
    }
    if (content !== undefined) {
      updates.push('content = ?')
      values.push(content)
      // excerptも更新
      const excerpt = content.substring(0, 150).replace(/[#*`\n]/g, '').trim()
      updates.push('excerpt = ?')
      values.push(excerpt)
    }
    if (status !== undefined) {
      updates.push('status = ?')
      values.push(status)
      // 公開ステータスが変更された場合
      if (status === 'published' && post.status !== 'published') {
        updates.push('published_at = ?')
        values.push(new Date().toISOString())
      }
    }
    if (thumbnail_url !== undefined) {
      updates.push('thumbnail_url = ?')
      values.push(thumbnail_url)
    }
    if (video_url !== undefined) {
      updates.push('video_url = ?')
      values.push(video_url)
    }
    if (visibility !== undefined) {
      updates.push('visibility = ?')
      values.push(visibility)
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())

    values.push(postId, tenantId)

    // 更新実行
    await c.env.DB.prepare(`
      UPDATE posts
      SET ${updates.join(', ')}
      WHERE id = ? AND tenant_id = ?
    `).bind(...values).run()

    // 更新後の投稿を取得
    const updatedPost = await c.env.DB.prepare(`
      SELECT p.*, u.nickname as author_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.id = ? AND p.tenant_id = ?
    `).bind(postId, tenantId).first()

    return c.json({
      success: true,
      post: updatedPost,
      message: '投稿を更新しました'
    })
  } catch (error: any) {
    console.error('[Admin Update Post Error]', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * DELETE /api/admin/posts/:id
 * 管理者用：投稿削除
 */
adminPosts.delete('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    const result = await verifyToken(token, c.env.JWT_SECRET)
    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const tenantId = result.payload.tenantId
    const role = result.payload.role

    // 管理者権限チェック
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403)
    }

    const postId = parseInt(c.req.param('id'))

    // 投稿存在確認
    const post = await c.env.DB.prepare(
      'SELECT * FROM posts WHERE id = ? AND tenant_id = ?'
    ).bind(postId, tenantId).first()

    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // 削除実行（CASCADE で関連データも削除される）
    await c.env.DB.prepare(
      'DELETE FROM posts WHERE id = ? AND tenant_id = ?'
    ).bind(postId, tenantId).run()

    return c.json({
      success: true,
      message: '投稿を削除しました'
    })
  } catch (error: any) {
    console.error('[Admin Delete Post Error]', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default adminPosts
