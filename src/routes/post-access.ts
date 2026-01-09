// ============================================
// 投稿アクセス制御管理API（管理者/オーナー用）
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware, roleMiddleware } from '../middleware/auth'

const postAccess = new Hono<AppContext>()

/**
 * PATCH /api/posts/:id/access
 * 投稿のアクセス制御設定を更新（オーナー/管理者のみ）
 */
postAccess.patch('/:id/access', authMiddleware, roleMiddleware(['owner', 'admin']), async (c) => {
  const postId = parseInt(c.req.param('id'))
  const tenantId = c.get('tenantId')
  const {
    required_plan_level,
    is_members_only,
    is_premium_content,
    preview_length
  } = await c.req.json<{
    required_plan_level?: number
    is_members_only?: boolean
    is_premium_content?: boolean
    preview_length?: number
  }>()

  try {
    // 投稿の存在確認
    const post = await c.env.DB.prepare(`
      SELECT id FROM posts WHERE id = ? AND tenant_id = ?
    `).bind(postId, tenantId).first()

    if (!post) {
      return c.json({ success: false, error: '投稿が見つかりません' }, 404)
    }

    // 更新するフィールドを構築
    const updates: string[] = []
    const values: any[] = []

    if (required_plan_level !== undefined) {
      updates.push('required_plan_level = ?')
      values.push(required_plan_level)
    }

    if (is_members_only !== undefined) {
      updates.push('is_members_only = ?')
      values.push(is_members_only ? 1 : 0)
    }

    if (is_premium_content !== undefined) {
      updates.push('is_premium_content = ?')
      values.push(is_premium_content ? 1 : 0)
    }

    if (preview_length !== undefined) {
      updates.push('preview_length = ?')
      values.push(preview_length)
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: '更新する項目がありません' }, 400)
    }

    updates.push('updated_at = datetime("now")')

    // 更新実行
    await c.env.DB.prepare(`
      UPDATE posts SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?
    `).bind(...values, postId, tenantId).run()

    return c.json({
      success: true,
      message: 'アクセス制御設定を更新しました',
      data: {
        post_id: postId,
        required_plan_level,
        is_members_only,
        is_premium_content,
        preview_length
      }
    })
  } catch (error) {
    console.error('[Update Post Access Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'アクセス制御設定の更新に失敗しました'
    }, 500)
  }
})

/**
 * GET /api/posts/:id/access
 * 投稿のアクセス制御設定を取得（オーナー/管理者のみ）
 */
postAccess.get('/:id/access', authMiddleware, roleMiddleware(['owner', 'admin']), async (c) => {
  const postId = parseInt(c.req.param('id'))
  const tenantId = c.get('tenantId')

  try {
    const post = await c.env.DB.prepare(`
      SELECT 
        id, title,
        required_plan_level,
        is_members_only,
        is_premium_content,
        preview_length
      FROM posts 
      WHERE id = ? AND tenant_id = ?
    `).bind(postId, tenantId).first<{
      id: number
      title: string
      required_plan_level: number
      is_members_only: number
      is_premium_content: number
      preview_length: number
    }>()

    if (!post) {
      return c.json({ success: false, error: '投稿が見つかりません' }, 404)
    }

    return c.json({
      success: true,
      data: {
        ...post,
        is_members_only: !!post.is_members_only,
        is_premium_content: !!post.is_premium_content
      }
    })
  } catch (error) {
    console.error('[Get Post Access Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'アクセス制御設定の取得に失敗しました'
    }, 500)
  }
})

/**
 * GET /api/posts/access/stats
 * アクセス制御統計（オーナー/管理者のみ）
 */
postAccess.get('/access/stats', authMiddleware, roleMiddleware(['owner', 'admin']), async (c) => {
  const tenantId = c.get('tenantId')

  try {
    // 投稿の制限レベル別集計
    const postStats = await c.env.DB.prepare(`
      SELECT 
        required_plan_level,
        COUNT(*) as count,
        SUM(view_count) as total_views
      FROM posts
      WHERE tenant_id = ? AND status = 'published'
      GROUP BY required_plan_level
      ORDER BY required_plan_level
    `).bind(tenantId).all()

    // 会員限定投稿数
    const membersOnlyCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM posts
      WHERE tenant_id = ? AND status = 'published' AND is_members_only = 1
    `).bind(tenantId).first<{ count: number }>()

    // プレミアムコンテンツ数
    const premiumCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM posts
      WHERE tenant_id = ? AND status = 'published' AND is_premium_content = 1
    `).bind(tenantId).first<{ count: number }>()

    // アクセスログ統計（最近30日）
    const accessStats = await c.env.DB.prepare(`
      SELECT 
        access_granted,
        COUNT(*) as count
      FROM post_access_logs
      WHERE tenant_id = ? AND accessed_at >= datetime('now', '-30 days')
      GROUP BY access_granted
    `).bind(tenantId).all()

    return c.json({
      success: true,
      stats: {
        by_plan_level: postStats.results,
        members_only_count: membersOnlyCount?.count || 0,
        premium_count: premiumCount?.count || 0,
        access_logs: {
          granted: accessStats.results?.find((s: any) => s.access_granted === 1)?.count || 0,
          denied: accessStats.results?.find((s: any) => s.access_granted === 0)?.count || 0
        }
      }
    })
  } catch (error) {
    console.error('[Get Access Stats Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '統計の取得に失敗しました'
    }, 500)
  }
})

/**
 * POST /api/posts/access/batch-update
 * 複数投稿のアクセス制御を一括更新（オーナーのみ）
 */
postAccess.post('/access/batch-update', authMiddleware, roleMiddleware(['owner']), async (c) => {
  const tenantId = c.get('tenantId')
  const {
    post_ids,
    required_plan_level,
    is_members_only,
    is_premium_content,
    preview_length
  } = await c.req.json<{
    post_ids: number[]
    required_plan_level?: number
    is_members_only?: boolean
    is_premium_content?: boolean
    preview_length?: number
  }>()

  if (!post_ids || post_ids.length === 0) {
    return c.json({ success: false, error: '投稿IDを指定してください' }, 400)
  }

  try {
    // 更新するフィールドを構築
    const updates: string[] = []
    const values: any[] = []

    if (required_plan_level !== undefined) {
      updates.push('required_plan_level = ?')
      values.push(required_plan_level)
    }

    if (is_members_only !== undefined) {
      updates.push('is_members_only = ?')
      values.push(is_members_only ? 1 : 0)
    }

    if (is_premium_content !== undefined) {
      updates.push('is_premium_content = ?')
      values.push(is_premium_content ? 1 : 0)
    }

    if (preview_length !== undefined) {
      updates.push('preview_length = ?')
      values.push(preview_length)
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: '更新する項目がありません' }, 400)
    }

    updates.push('updated_at = datetime("now")')

    // プレースホルダーを作成
    const placeholders = post_ids.map(() => '?').join(',')
    
    // 一括更新実行
    await c.env.DB.prepare(`
      UPDATE posts 
      SET ${updates.join(', ')} 
      WHERE tenant_id = ? AND id IN (${placeholders})
    `).bind(...values, tenantId, ...post_ids).run()

    return c.json({
      success: true,
      message: `${post_ids.length}件の投稿のアクセス制御設定を更新しました`,
      updated_count: post_ids.length
    })
  } catch (error) {
    console.error('[Batch Update Post Access Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '一括更新に失敗しました'
    }, 500)
  }
})

export default postAccess
