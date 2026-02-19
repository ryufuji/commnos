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

  console.log('[Like Post] Starting like request:', { postId, userId, tenantId })

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
    console.log('[Like Post] Checking if post exists...')
    const post = await DB.prepare(
      'SELECT id, author_id, title FROM posts WHERE id = ? AND tenant_id = ?'
    ).bind(postId, tenantId).first()

    console.log('[Like Post] Post found:', !!post)

    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // いいねを追加（既に存在する場合はエラー）
    try {
      console.log('[Like Post] Attempting to insert like:', { tenantId, postId, userId })
      console.log('[Like Post] Data types:', {
        tenantIdType: typeof tenantId,
        postIdType: typeof postId,
        userIdType: typeof userId,
        tenantIdValue: tenantId,
        postIdValue: postId,
        userIdValue: userId
      })
      
      // まずテーブルの存在を確認
      const tableCheck = await DB.prepare(
        'SELECT name FROM sqlite_master WHERE type="table" AND name="post_likes"'
      ).first()
      console.log('[Like Post] Table exists:', !!tableCheck, tableCheck)
      
      // カラム情報を確認
      const columnsCheck = await DB.prepare(
        'PRAGMA table_info(post_likes)'
      ).all()
      console.log('[Like Post] Table columns:', columnsCheck)
      
      // 明示的なカラム指定（idはAUTOINCREMENTなので省略）
      const insertResult = await DB.prepare(
        'INSERT INTO post_likes (tenant_id, post_id, user_id, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
      ).bind(tenantId, postId, userId).run()
      
      console.log('[Like Post] Insert result:', insertResult)

      // ポイント付与処理
      // 1. いいねをしたユーザーにポイントを付与（post_like）
      const likerRule = await DB.prepare(
        'SELECT points FROM point_rules WHERE tenant_id = ? AND action = ? AND is_active = 1'
      ).bind(tenantId, 'post_like').first() as any

      if (likerRule && likerRule.points > 0) {
        // ユーザーポイント残高を取得または作成
        let userPoints = await DB.prepare(
          'SELECT id, balance, total_earned FROM user_points WHERE user_id = ? AND tenant_id = ?'
        ).bind(userId, tenantId).first() as any

        if (!userPoints) {
          await DB.prepare(
            'INSERT INTO user_points (user_id, tenant_id, balance, total_earned) VALUES (?, ?, ?, ?)'
          ).bind(userId, tenantId, likerRule.points, likerRule.points).run()
          userPoints = { balance: 0, total_earned: 0 }
        } else {
          await DB.prepare(
            'UPDATE user_points SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ? AND tenant_id = ?'
          ).bind(likerRule.points, likerRule.points, userId, tenantId).run()
        }

        const newBalance = (userPoints.balance || 0) + likerRule.points

        // トランザクション記録
        await DB.prepare(
          'INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(userId, tenantId, 'earn', likerRule.points, 'post_like', postId, newBalance, '投稿にいいね').run()
      }

      // 2. 投稿者にポイントを付与（received_post_like）
      if (post.author_id !== userId) {
        const authorRule = await DB.prepare(
          'SELECT points FROM point_rules WHERE tenant_id = ? AND action = ? AND is_active = 1'
        ).bind(tenantId, 'received_post_like').first() as any

        if (authorRule && authorRule.points > 0) {
          let authorPoints = await DB.prepare(
            'SELECT id, balance, total_earned FROM user_points WHERE user_id = ? AND tenant_id = ?'
          ).bind(post.author_id, tenantId).first() as any

          if (!authorPoints) {
            await DB.prepare(
              'INSERT INTO user_points (user_id, tenant_id, balance, total_earned) VALUES (?, ?, ?, ?)'
            ).bind(post.author_id, tenantId, authorRule.points, authorRule.points).run()
            authorPoints = { balance: 0, total_earned: 0 }
          } else {
            await DB.prepare(
              'UPDATE user_points SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ? AND tenant_id = ?'
            ).bind(authorRule.points, authorRule.points, post.author_id, tenantId).run()
          }

          const authorNewBalance = (authorPoints.balance || 0) + authorRule.points

          await DB.prepare(
            'INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(post.author_id, tenantId, 'earn', authorRule.points, 'received_post_like', postId, authorNewBalance, '投稿にいいねされた').run()
        }
      }

      // 通知を作成（投稿者が自分でない場合）
      if (post.author_id !== userId) {
        console.log('[Like Post] Creating notification...')
        const actor = await DB.prepare(
          'SELECT nickname FROM users WHERE id = ?'
        ).bind(userId).first()
        
        await createNotification(DB, {
          tenantId,
          userId: post.author_id,
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
      
      // デバッグ用: エラー詳細を返す
      return c.json({
        success: false,
        error: error.message || 'いいねの処理中にエラーが発生しました',
        details: {
          postId,
          userId,
          tenantId,
          errorMessage: error.message
        }
      }, 500)
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
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  if (!postId || isNaN(postId)) {
    return c.json({ success: false, error: 'Invalid post ID' }, 400)
  }

  try {
    // 投稿情報を取得
    const post = await DB.prepare(
      'SELECT id, author_id FROM posts WHERE id = ? AND tenant_id = ?'
    ).bind(postId, tenantId).first()

    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // いいねを削除
    const result = await DB.prepare(
      'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?'
    ).bind(postId, userId).run()

    if (!result.success) {
      return c.json({ success: false, error: 'Failed to unlike post' }, 500)
    }

    // ポイント減算処理
    // 1. いいねを取り消したユーザーからポイントを減算（post_like）
    const likerRule = await DB.prepare(
      'SELECT points FROM point_rules WHERE tenant_id = ? AND action = ? AND is_active = 1'
    ).bind(tenantId, 'post_like').first() as any

    if (likerRule && likerRule.points > 0) {
      const userPoints = await DB.prepare(
        'SELECT id, balance, total_earned FROM user_points WHERE user_id = ? AND tenant_id = ?'
      ).bind(userId, tenantId).first() as any

      if (userPoints) {
        // ポイントを減算（残高が負にならないように）
        const newBalance = Math.max(0, (userPoints.balance || 0) - likerRule.points)
        
        await DB.prepare(
          'UPDATE user_points SET balance = ? WHERE user_id = ? AND tenant_id = ?'
        ).bind(newBalance, userId, tenantId).run()

        // トランザクション記録
        await DB.prepare(
          'INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(userId, tenantId, 'spend', -likerRule.points, 'post_unlike', postId, newBalance, '投稿のいいねを取り消し').run()
      }
    }

    // 2. 投稿者からポイントを減算（received_post_like）
    if (post.author_id !== userId) {
      const authorRule = await DB.prepare(
        'SELECT points FROM point_rules WHERE tenant_id = ? AND action = ? AND is_active = 1'
      ).bind(tenantId, 'received_post_like').first() as any

      if (authorRule && authorRule.points > 0) {
        const authorPoints = await DB.prepare(
          'SELECT id, balance, total_earned FROM user_points WHERE user_id = ? AND tenant_id = ?'
        ).bind(post.author_id, tenantId).first() as any

        if (authorPoints) {
          const authorNewBalance = Math.max(0, (authorPoints.balance || 0) - authorRule.points)
          
          await DB.prepare(
            'UPDATE user_points SET balance = ? WHERE user_id = ? AND tenant_id = ?'
          ).bind(authorNewBalance, post.author_id, tenantId).run()

          await DB.prepare(
            'INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(post.author_id, tenantId, 'spend', -authorRule.points, 'post_unlike_received', postId, authorNewBalance, '投稿のいいねが取り消された').run()
        }
      }
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
        const token = authHeader.replace('Bearer ', '')
        const { JWT_SECRET } = c.env
        
        // JWTを検証してユーザーIDを取得
        const { Jwt } = await import('hono/utils/jwt')
        const payload = await Jwt.verify(token, JWT_SECRET) as any
        
        if (payload && payload.userId) {
          // ユーザーがこの投稿にいいねしているか確認
          const likeCheck = await DB.prepare(
            'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ? AND tenant_id = ?'
          ).bind(postId, payload.userId, tenant.id).first()
          
          liked = !!likeCheck
        }
      } catch (e) {
        // トークンが無効な場合は無視（liked = false のまま）
        console.error('[Get Post Likes] JWT verification failed:', e)
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

      // ポイント付与処理
      // 1. いいねをしたユーザーにポイントを付与（comment_like）
      const likerRule = await DB.prepare(
        'SELECT points FROM point_rules WHERE tenant_id = ? AND action = ? AND is_active = 1'
      ).bind(tenantId, 'comment_like').first() as any

      if (likerRule && likerRule.points > 0) {
        let userPoints = await DB.prepare(
          'SELECT id, balance, total_earned FROM user_points WHERE user_id = ? AND tenant_id = ?'
        ).bind(userId, tenantId).first() as any

        if (!userPoints) {
          await DB.prepare(
            'INSERT INTO user_points (user_id, tenant_id, balance, total_earned) VALUES (?, ?, ?, ?)'
          ).bind(userId, tenantId, likerRule.points, likerRule.points).run()
          userPoints = { balance: 0, total_earned: 0 }
        } else {
          await DB.prepare(
            'UPDATE user_points SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ? AND tenant_id = ?'
          ).bind(likerRule.points, likerRule.points, userId, tenantId).run()
        }

        const newBalance = (userPoints.balance || 0) + likerRule.points

        await DB.prepare(
          'INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(userId, tenantId, 'earn', likerRule.points, 'comment_like', commentId, newBalance, 'コメントにいいね').run()
      }

      // 2. コメント作成者にポイントを付与（received_comment_like）
      if (comment.user_id !== userId) {
        const authorRule = await DB.prepare(
          'SELECT points FROM point_rules WHERE tenant_id = ? AND action = ? AND is_active = 1'
        ).bind(tenantId, 'received_comment_like').first() as any

        if (authorRule && authorRule.points > 0) {
          let authorPoints = await DB.prepare(
            'SELECT id, balance, total_earned FROM user_points WHERE user_id = ? AND tenant_id = ?'
          ).bind(comment.user_id, tenantId).first() as any

          if (!authorPoints) {
            await DB.prepare(
              'INSERT INTO user_points (user_id, tenant_id, balance, total_earned) VALUES (?, ?, ?, ?)'
            ).bind(comment.user_id, tenantId, authorRule.points, authorRule.points).run()
            authorPoints = { balance: 0, total_earned: 0 }
          } else {
            await DB.prepare(
              'UPDATE user_points SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ? AND tenant_id = ?'
            ).bind(authorRule.points, authorRule.points, comment.user_id, tenantId).run()
          }

          const authorNewBalance = (authorPoints.balance || 0) + authorRule.points

          await DB.prepare(
            'INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(comment.user_id, tenantId, 'earn', authorRule.points, 'received_comment_like', commentId, authorNewBalance, 'コメントにいいねされた').run()
        }
      }

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
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  if (!commentId || isNaN(commentId)) {
    return c.json({ success: false, error: 'Invalid comment ID' }, 400)
  }

  try {
    // コメント情報を取得
    const comment = await DB.prepare(
      'SELECT id, user_id FROM comments WHERE id = ? AND tenant_id = ?'
    ).bind(commentId, tenantId).first()

    if (!comment) {
      return c.json({ success: false, error: 'Comment not found' }, 404)
    }

    // いいねを削除
    await DB.prepare(
      'DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?'
    ).bind(commentId, userId).run()

    // ポイント減算処理
    // 1. いいねを取り消したユーザーからポイントを減算（comment_like）
    const likerRule = await DB.prepare(
      'SELECT points FROM point_rules WHERE tenant_id = ? AND action = ? AND is_active = 1'
    ).bind(tenantId, 'comment_like').first() as any

    if (likerRule && likerRule.points > 0) {
      const userPoints = await DB.prepare(
        'SELECT id, balance, total_earned FROM user_points WHERE user_id = ? AND tenant_id = ?'
      ).bind(userId, tenantId).first() as any

      if (userPoints) {
        const newBalance = Math.max(0, (userPoints.balance || 0) - likerRule.points)
        
        await DB.prepare(
          'UPDATE user_points SET balance = ? WHERE user_id = ? AND tenant_id = ?'
        ).bind(newBalance, userId, tenantId).run()

        await DB.prepare(
          'INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(userId, tenantId, 'spend', -likerRule.points, 'comment_unlike', commentId, newBalance, 'コメントのいいねを取り消し').run()
      }
    }

    // 2. コメント作成者からポイントを減算（received_comment_like）
    if (comment.user_id !== userId) {
      const authorRule = await DB.prepare(
        'SELECT points FROM point_rules WHERE tenant_id = ? AND action = ? AND is_active = 1'
      ).bind(tenantId, 'received_comment_like').first() as any

      if (authorRule && authorRule.points > 0) {
        const authorPoints = await DB.prepare(
          'SELECT id, balance, total_earned FROM user_points WHERE user_id = ? AND tenant_id = ?'
        ).bind(comment.user_id, tenantId).first() as any

        if (authorPoints) {
          const authorNewBalance = Math.max(0, (authorPoints.balance || 0) - authorRule.points)
          
          await DB.prepare(
            'UPDATE user_points SET balance = ? WHERE user_id = ? AND tenant_id = ?'
          ).bind(authorNewBalance, comment.user_id, tenantId).run()

          await DB.prepare(
            'INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(comment.user_id, tenantId, 'spend', -authorRule.points, 'comment_unlike_received', commentId, authorNewBalance, 'コメントのいいねが取り消された').run()
        }
      }
    }

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

/**
 * GET /api/likes/comments/:commentId
 * コメントのいいね数と自分がいいねしているかを取得（認証不要）
 */
likes.get('/comments/:commentId', async (c) => {
  const commentId = parseInt(c.req.param('commentId'))
  const subdomain = c.req.query('subdomain')
  const { DB } = c.env

  if (!commentId || isNaN(commentId)) {
    return c.json({ success: false, error: 'Invalid comment ID' }, 400)
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
      'SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ? AND tenant_id = ?'
    ).bind(commentId, tenant.id).first() as any

    // 認証済みユーザーの場合、自分がいいねしているか確認
    let liked = false
    const authHeader = c.req.header('Authorization')
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const { JWT_SECRET } = c.env
        
        // JWTを検証してユーザーIDを取得
        const { Jwt } = await import('hono/utils/jwt')
        const payload = await Jwt.verify(token, JWT_SECRET) as any
        
        if (payload && payload.userId) {
          // ユーザーがこのコメントにいいねしているか確認
          const likeCheck = await DB.prepare(
            'SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ? AND tenant_id = ?'
          ).bind(commentId, payload.userId, tenant.id).first()
          
          liked = !!likeCheck
        }
      } catch (e) {
        // トークンが無効な場合は無視（liked = false のまま）
        console.error('[Get Comment Likes] JWT verification failed:', e)
      }
    }

    return c.json({
      success: true,
      liked,
      likeCount: likeCountResult?.count || 0
    })
  } catch (error) {
    console.error('[Get Comment Likes Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get comment likes'
    }, 500)
  }
})

/**
 * GET /api/likes/user/posts
 * ユーザーがいいねした投稿一覧を取得
 */
likes.get('/user/posts', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    // ユーザーがいいねした投稿を取得
    const likedPosts = await DB.prepare(`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.excerpt,
        p.created_at,
        pl.created_at as liked_at
      FROM post_likes pl
      INNER JOIN posts p ON pl.post_id = p.id
      WHERE pl.user_id = ? AND pl.tenant_id = ?
      ORDER BY pl.created_at DESC
      LIMIT 50
    `).bind(userId, tenantId).all()

    return c.json({
      success: true,
      posts: likedPosts.results || []
    })
  } catch (error) {
    console.error('[Get User Liked Posts Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get liked posts'
    }, 500)
  }
})

export default likes
