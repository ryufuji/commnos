// ============================================
// いいね機能ルート（Phase 4）
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'
import { createNotification } from './notifications'

const likes = new Hono<AppContext>()

/**
 * POST /api/likes/posts/:postId
 * 投稿にいいねする
 */
likes.post('/posts/:postId', authMiddleware, async (c) => {
  const postId = parseInt(c.req.param('postId'))
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  console.log('[Like Post] Debug info:', {
    postId,
    userId,
    tenantId,
    hasDB: !!DB
  })

  if (!postId || isNaN(postId)) {
    return c.json({ success: false, error: 'Invalid post ID' }, 400)
  }

  if (!userId) {
    console.error('[Like Post] userId is missing from auth context')
    return c.json({ success: false, error: 'Authentication required - userId missing' }, 401)
  }

  if (!tenantId) {
    console.error('[Like Post] tenantId is missing from auth context')
    return c.json({ success: false, error: 'Authentication required - tenantId missing' }, 401)
  }

  try {
    // 投稿が存在し、同じテナントに属しているか確認
    const post = await DB.prepare(
      'SELECT id, user_id, title FROM posts WHERE id = ? AND tenant_id = ?'
    ).bind(postId, tenantId).first()

    console.log('[Like Post] Post lookup result:', {
      found: !!post,
      postId,
      tenantId
    })

    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // いいねを追加（既に存在する場合はエラー）
    try {
      await DB.prepare(
        'INSERT INTO post_likes (tenant_id, post_id, user_id) VALUES (?, ?, ?)'
      ).bind(tenantId, postId, userId).run()

      // 通知を作成（投稿者が自分でない場合）
      if (post.user_id !== userId) {
        const actor = await DB.prepare(
          'SELECT nickname FROM users WHERE id = ?'
        ).bind(userId).first()
        
        await createNotification(DB, {
          tenantId,
          userId: post.user_id,
          actorId: userId,
          type: 'post_like',
          targetType: 'post',
          targetId: postId,
          message: `${actor?.nickname || 'Someone'}さんがあなたの投稿「${post.title}」にいいねしました`
        })
      }

      // いいね数を取得
      const likeCountResult = await DB.prepare(
        'SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?'
      ).bind(postId).first() as any

      return c.json({
        success: true,
        liked: true,
        likeCount: likeCountResult?.count || 0
      })
    } catch (error: any) {
      // UNIQUE制約違反の場合（既にいいね済み）
      if (error.message?.includes('UNIQUE constraint failed')) {
        return c.json({ success: false, error: 'Already liked' }, 409)
      }
      throw error
    }
  } catch (error) {
    console.error('[Like Post Error]', error)
    
    // エラーの詳細をログに出力
    if (error instanceof Error) {
      console.error('[Like Post Error Details]', {
        message: error.message,
        stack: error.stack,
        postId,
        userId,
        tenantId
      })
    }
    
    return c.json({
      success: false,
      error: 'いいねの処理中にエラーが発生しました。ログインしているか確認してください。'
    }, 500)
  }
})

/**
 * DELETE /api/likes/posts/:postId
 * 投稿のいいねを取り消す
 */
likes.delete('/posts/:postId', authMiddleware, async (c) => {
  const postId = parseInt(c.req.param('postId'))
  const userId = c.get('userId')
  const { DB } = c.env

  if (!postId || isNaN(postId)) {
    return c.json({ success: false, error: 'Invalid post ID' }, 400)
  }

  try {
    // いいねを削除
    const result = await DB.prepare(
      'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?'
    ).bind(postId, userId).run()

    if (!result.success) {
      return c.json({ success: false, error: 'Failed to unlike post' }, 500)
    }

    // いいね数を取得
    const likeCountResult = await DB.prepare(
      'SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?'
    ).bind(postId).first() as any

    return c.json({
      success: true,
      liked: false,
      likeCount: likeCountResult?.count || 0
    })
  } catch (error) {
    console.error('[Unlike Post Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlike post'
    }, 500)
  }
})

/**
 * GET /api/likes/posts/:postId
 * 投稿のいいね数と自分がいいねしているかを取得（認証不要）
 */
likes.get('/posts/:postId', async (c) => {
  const postId = parseInt(c.req.param('postId'))
  const subdomain = c.req.query('subdomain')
  const { DB } = c.env

  if (!postId || isNaN(postId)) {
    return c.json({ success: false, error: 'Invalid post ID' }, 400)
  }
  
  if (!subdomain) {
    return c.json({ success: false, error: 'Subdomain is required' }, 400)
  }

  try {
    // テナントを取得
    const tenant = await DB.prepare(
      'SELECT id FROM tenants WHERE subdomain = ? AND status = ?'
    ).bind(subdomain, 'active').first() as any

    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    // いいね数を取得
    const likeCountResult = await DB.prepare(
      'SELECT COUNT(*) as count FROM post_likes WHERE post_id = ? AND tenant_id = ?'
    ).bind(postId, tenant.id).first() as any

    // 認証済みユーザーの場合、自分がいいねしているか確認
    let liked = false
    const authHeader = c.req.header('Authorization')
    if (authHeader) {
      try {
        // トークンからユーザーIDを取得（簡易版）
        const token = authHeader.replace('Bearer ', '')
        // TODO: JWT検証を実装
        // 現時点では認証なしで liked = false を返す
      } catch (e) {
        // トークンが無効な場合は無視
      }
    }

    return c.json({
      success: true,
      liked,
      likeCount: likeCountResult?.count || 0
    })
  } catch (error) {
    console.error('[Get Post Likes Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get likes'
    }, 500)
  }
})

/**
 * POST /api/likes/comments/:commentId
 * コメントにいいねする
 */
likes.post('/comments/:commentId', authMiddleware, async (c) => {
  const commentId = parseInt(c.req.param('commentId'))
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  if (!commentId || isNaN(commentId)) {
    return c.json({ success: false, error: 'Invalid comment ID' }, 400)
  }

  try {
    // コメントが存在し、同じテナントに属しているか確認
    const comment = await DB.prepare(
      'SELECT c.id, c.user_id, c.content, p.title as post_title FROM comments c INNER JOIN posts p ON c.post_id = p.id WHERE c.id = ? AND c.tenant_id = ?'
    ).bind(commentId, tenantId).first()

    if (!comment) {
      return c.json({ success: false, error: 'Comment not found' }, 404)
    }

    // いいねを追加
    try {
      await DB.prepare(
        'INSERT INTO comment_likes (tenant_id, comment_id, user_id) VALUES (?, ?, ?)'
      ).bind(tenantId, commentId, userId).run()

      // 通知を作成（コメント者が自分でない場合）
      if (comment.user_id !== userId) {
        const actor = await DB.prepare(
          'SELECT nickname FROM users WHERE id = ?'
        ).bind(userId).first()
        
        const commentPreview = comment.content.substring(0, 30) + (comment.content.length > 30 ? '...' : '')
        
        await createNotification(DB, {
          tenantId,
          userId: comment.user_id,
          actorId: userId,
          type: 'comment_like',
          targetType: 'comment',
          targetId: commentId,
          message: `${actor?.nickname || 'Someone'}さんがあなたのコメント「${commentPreview}」にいいねしました`
        })
      }

      // いいね数を取得
      const likeCountResult = await DB.prepare(
        'SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?'
      ).bind(commentId).first() as any

      return c.json({
        success: true,
        liked: true,
        likeCount: likeCountResult?.count || 0
      })
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        return c.json({ success: false, error: 'Already liked' }, 409)
      }
      throw error
    }
  } catch (error) {
    console.error('[Like Comment Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to like comment'
    }, 500)
  }
})

/**
 * DELETE /api/likes/comments/:commentId
 * コメントのいいねを取り消す
 */
likes.delete('/comments/:commentId', authMiddleware, async (c) => {
  const commentId = parseInt(c.req.param('commentId'))
  const userId = c.get('userId')
  const { DB } = c.env

  if (!commentId || isNaN(commentId)) {
    return c.json({ success: false, error: 'Invalid comment ID' }, 400)
  }

  try {
    await DB.prepare(
      'DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?'
    ).bind(commentId, userId).run()

    // いいね数を取得
    const likeCountResult = await DB.prepare(
      'SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?'
    ).bind(commentId).first() as any

    return c.json({
      success: true,
      liked: false,
      likeCount: likeCountResult?.count || 0
    })
  } catch (error) {
    console.error('[Unlike Comment Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlike comment'
    }, 500)
  }
})

export default likes
