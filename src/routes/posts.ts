// ============================================
// 投稿管理ルート（Week 7-8）
// ============================================

import { Hono } from 'hono'
import { marked } from 'marked'
import type { AppContext } from '../types'
import { authMiddleware, roleMiddleware, tenantMiddleware } from '../middleware/auth'
import { createNotification } from './notifications'
import { checkPostAccess, filterContent, logPostAccess, getRequiredPlan } from '../middleware/plan-access'

const posts = new Hono<AppContext>()

/**
 * GET /api/posts
 * 投稿一覧取得（公開済みのみ）
 */
posts.get('/', tenantMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const result = await db
      .prepare(`
        SELECT 
          p.id, p.title, p.excerpt, p.thumbnail_url, p.view_count, 
          p.published_at, p.created_at, p.updated_at,
          u.id as author_id, u.nickname as author_name, u.avatar_url as author_avatar
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.tenant_id = ? AND p.status = 'published'
        ORDER BY p.published_at DESC
        LIMIT 50
      `)
      .bind(tenantId)
      .all()

    return c.json({
      success: true,
      posts: result.results || []
    })
  } catch (error) {
    console.error('[Get Posts Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get posts'
    }, 500)
  }
})

/**
 * GET /api/posts/my-posts
 * 自分の投稿一覧取得（認証必須）
 */
posts.get('/my-posts', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const result = await db
      .prepare(`
        SELECT 
          p.id, p.title, p.excerpt, p.thumbnail_url, p.video_url, p.status,
          p.view_count, p.published_at, p.created_at, p.updated_at,
          u.id as author_id, u.nickname as author_name, u.avatar_url as author_avatar
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.tenant_id = ? AND p.author_id = ?
        ORDER BY p.created_at DESC
      `)
      .bind(tenantId, userId)
      .all()

    return c.json({
      success: true,
      posts: result.results || []
    })
  } catch (error) {
    console.error('[Get My Posts Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get my posts'
    }, 500)
  }
})

/**
 * GET /api/posts/:id
 * 投稿詳細取得（プランアクセス制御対応）
 */
posts.get('/:id', tenantMiddleware, async (c) => {
  const postId = parseInt(c.req.param('id'))
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // 投稿取得
    const post = await db
      .prepare(`
        SELECT 
          p.*,
          u.id as author_id, u.nickname as author_name, u.avatar_url as author_avatar
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.id = ? AND p.tenant_id = ? AND p.status = 'published'
      `)
      .bind(postId, tenantId)
      .first<any>()

    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // アクセス権限チェック
    const accessCheck = await checkPostAccess(c, postId)
    
    // アクセスログ記録
    await logPostAccess(c, postId, accessCheck)

    // 閲覧数を増加（アクセス許可がある場合のみ）
    if (accessCheck.canAccess) {
      await db
        .prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?')
        .bind(postId)
        .run()
    }

    // コンテンツフィルタリング
    const { content: filteredContent, isFiltered } = filterContent(post.content || '', accessCheck)

    // Markdown を HTML に変換
    const contentHtml = marked(filteredContent)

    // アクセス制限情報を追加
    const responseData: any = {
      ...post,
      content: filteredContent,
      content_html: contentHtml,
      access_info: {
        can_access: accessCheck.canAccess,
        is_filtered: isFiltered,
        is_members_only: accessCheck.isMembersOnly,
        is_premium_content: accessCheck.isPremiumContent,
        user_plan_level: accessCheck.userPlanLevel,
        required_plan_level: accessCheck.requiredPlanLevel,
        message: accessCheck.message
      }
    }

    // アクセスできない場合、必要なプラン情報を追加
    if (!accessCheck.canAccess && accessCheck.requiredPlanLevel > 0) {
      const requiredPlan = await getRequiredPlan(c, accessCheck.requiredPlanLevel)
      if (requiredPlan) {
        responseData.access_info.required_plan = requiredPlan
      }
    }

    return c.json({
      success: true,
      post: responseData
    })
  } catch (error) {
    console.error('[Get Post Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get post'
    }, 500)
  }
})

/**
 * POST /api/posts
 * 投稿作成（認証済みの全会員）
 * Phase 3: 会員全員が投稿できるように変更
 * Phase 4: 予約投稿機能を追加 (scheduled_at)
 */
posts.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { title, content, category, status, scheduled_at, thumbnail_url, video_url, image_urls, visibility } = await c.req.json<{
    title: string
    content: string
    category?: string | null
    status?: 'draft' | 'published' | 'scheduled'
    scheduled_at?: string | null
    thumbnail_url?: string | null
    video_url?: string | null
    image_urls?: string[]
    visibility?: 'public' | 'members_only'
  }>()
  const db = c.env.DB

  // バリデーション
  if (!title || !content) {
    return c.json({ success: false, message: 'タイトルと本文は必須です' }, 400)
  }

  if (title.length > 200) {
    return c.json({ success: false, message: 'タイトルは200文字以内にしてください' }, 400)
  }

  if (content.length > 10000) {
    return c.json({ success: false, message: '本文は10,000文字以内にしてください' }, 400)
  }

  // 予約投稿のバリデーション
  if (status === 'scheduled') {
    if (!scheduled_at) {
      return c.json({ success: false, message: '予約投稿には公開日時を指定してください' }, 400)
    }
    
    const scheduledDateTime = new Date(scheduled_at)
    const now = new Date()
    
    // 過去の日時チェック
    if (scheduledDateTime <= now) {
      // 過去の日時の場合、即座に公開する
      console.log('[Scheduled Post] Scheduled time is in the past, publishing immediately')
      return c.json({ 
        success: false, 
        message: '予約日時は現在より未来の日時を選択してください（過去の日時が指定されました）' 
      }, 400)
    }
  }

  try {
    // excerpt を生成（最初の150文字）
    const excerpt = content.substring(0, 150).replace(/[#*`\n]/g, '').trim()

    const postStatus = status || 'published'
    const publishedAt = postStatus === 'published' ? new Date().toISOString() : null
    const postVisibility = visibility || 'public'
    const scheduledAtValue = postStatus === 'scheduled' && scheduled_at ? scheduled_at : null

    // 投稿作成
    const result = await db
      .prepare(`
        INSERT INTO posts (
          tenant_id, author_id, title, content, excerpt, thumbnail_url, video_url,
          status, published_at, scheduled_at, visibility, view_count, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
      `)
      .bind(
        tenantId,
        userId,
        title,
        content,
        excerpt,
        thumbnail_url || null,
        video_url || null,
        postStatus,
        publishedAt,
        scheduledAtValue,
        postVisibility
      )
      .run()

    if (!result.success) {
      throw new Error('Failed to create post')
    }

    const postId = result.meta.last_row_id

    // 複数画像がある場合、post_imagesテーブルに保存
    if (image_urls && image_urls.length > 0) {
      for (let i = 0; i < image_urls.length; i++) {
        await db
          .prepare(`
            INSERT INTO post_images (post_id, image_url, display_order, created_at)
            VALUES (?, ?, ?, datetime('now'))
          `)
          .bind(postId, image_urls[i], i)
          .run()
      }
    }

    // 作成した投稿を取得
    const post = await db
      .prepare(`
        SELECT p.*, u.nickname as author_name 
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        WHERE p.id = ?
        LIMIT 1
      `)
      .bind(postId)
      .first<any>()

    const message = postStatus === 'draft' ? '下書きを保存しました' : 
                    postStatus === 'scheduled' ? `予約投稿を設定しました（${scheduled_at}に公開）` : 
                    '投稿を公開しました'

    return c.json({
      success: true,
      post,
      message
    }, 201)
  } catch (error) {
    console.error('[Create Post Error]', error)
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : '投稿の作成に失敗しました'
    }, 500)
  }
})

/**
 * PUT /api/posts/:id
 * 投稿更新（作成者または管理者のみ）
 */
posts.put('/:id', authMiddleware, roleMiddleware(['owner', 'admin']), async (c) => {
  const postId = parseInt(c.req.param('id'))
  const userId = c.get('userId')
  const role = c.get('role')
  const tenantId = c.get('tenantId')
  const { title, content, status, thumbnailUrl } = await c.req.json<{
    title?: string
    content?: string
    status?: 'draft' | 'published'
    thumbnailUrl?: string
  }>()
  const db = c.env.DB

  try {
    // 投稿の存在確認
    const existingPost = await db
      .prepare('SELECT * FROM posts WHERE id = ? AND tenant_id = ?')
      .bind(postId, tenantId)
      .first<any>()

    if (!existingPost) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // 権限チェック（作成者またはowner/admin）
    if (existingPost.author_id !== userId && role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Unauthorized' }, 403)
    }

    // 更新フィールド構築
    const updates: string[] = []
    const values: any[] = []

    if (title !== undefined) {
      updates.push('title = ?')
      values.push(title)
    }

    if (content !== undefined) {
      updates.push('content = ?')
      values.push(content)

      // excerpt も更新
      const excerpt = content.substring(0, 200).replace(/[#*`\n]/g, '')
      updates.push('excerpt = ?')
      values.push(excerpt)
    }

    if (status !== undefined) {
      updates.push('status = ?')
      values.push(status)

      // published に変更する場合は published_at を設定
      if (status === 'published' && existingPost.status !== 'published') {
        updates.push('published_at = ?')
        values.push(new Date().toISOString())
      }
    }

    if (thumbnailUrl !== undefined) {
      updates.push('thumbnail_url = ?')
      values.push(thumbnailUrl)
    }

    updates.push('updated_at = datetime(\'now\')')

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400)
    }

    values.push(postId, tenantId)

    await db
      .prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`)
      .bind(...values)
      .run()

    // 更新後の投稿を取得
    const post = await db
      .prepare('SELECT * FROM posts WHERE id = ? AND tenant_id = ?')
      .bind(postId, tenantId)
      .first<any>()

    return c.json({
      success: true,
      post,
      message: 'Post updated successfully'
    })
  } catch (error) {
    console.error('[Update Post Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update post'
    }, 500)
  }
})

/**
 * DELETE /api/posts/:id
 * 投稿削除（作成者または管理者のみ）
 */
posts.delete('/:id', authMiddleware, roleMiddleware(['owner', 'admin']), async (c) => {
  const postId = parseInt(c.req.param('id'))
  const userId = c.get('userId')
  const role = c.get('role')
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // 投稿の存在確認
    const existingPost = await db
      .prepare('SELECT * FROM posts WHERE id = ? AND tenant_id = ?')
      .bind(postId, tenantId)
      .first<any>()

    if (!existingPost) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // 権限チェック（作成者またはowner/admin）
    if (existingPost.author_id !== userId && role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Unauthorized' }, 403)
    }

    // コメントも削除
    await db
      .prepare('DELETE FROM comments WHERE post_id = ? AND tenant_id = ?')
      .bind(postId, tenantId)
      .run()

    // 投稿削除
    await db
      .prepare('DELETE FROM posts WHERE id = ? AND tenant_id = ?')
      .bind(postId, tenantId)
      .run()

    return c.json({
      success: true,
      message: 'Post deleted successfully'
    })
  } catch (error) {
    console.error('[Delete Post Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete post'
    }, 500)
  }
})

/**
 * GET /api/posts/:id/comments
 * コメント一覧取得（ネスト構造対応）
 */
posts.get('/:id/comments', tenantMiddleware, async (c) => {
  const postId = parseInt(c.req.param('id'))
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    const result = await db
      .prepare(`
        SELECT 
          c.id, c.content, c.parent_comment_id, c.created_at,
          u.id as user_id, u.nickname as user_name, u.avatar_url as user_avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ? AND c.tenant_id = ?
        ORDER BY c.created_at ASC
      `)
      .bind(postId, tenantId)
      .all()

    return c.json({
      success: true,
      comments: result.results || []
    })
  } catch (error) {
    console.error('[Get Comments Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get comments'
    }, 500)
  }
})

/**
 * POST /api/posts/:id/comments
 * コメント投稿（全会員）- 返信機能対応
 */
posts.post('/:id/comments', authMiddleware, async (c) => {
  const postId = parseInt(c.req.param('id'))
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { content, parent_comment_id } = await c.req.json<{ content: string; parent_comment_id?: number }>()
  const db = c.env.DB

  // バリデーション
  if (!content || content.trim().length === 0) {
    return c.json({ success: false, error: 'Content is required' }, 400)
  }

  if (content.length > 1000) {
    return c.json({ success: false, error: 'Comment must be 1000 characters or less' }, 400)
  }

  try {
    // 投稿の存在確認
    const post = await db
      .prepare('SELECT id FROM posts WHERE id = ? AND tenant_id = ? AND status = \'published\'')
      .bind(postId, tenantId)
      .first()

    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }

    // 返信先コメントの存在確認（parent_comment_idが指定されている場合）
    if (parent_comment_id) {
      const parentComment = await db
        .prepare('SELECT id FROM comments WHERE id = ? AND post_id = ? AND tenant_id = ?')
        .bind(parent_comment_id, postId, tenantId)
        .first()

      if (!parentComment) {
        return c.json({ success: false, error: 'Parent comment not found' }, 404)
      }
    }

    // コメント作成
    const result = await db
      .prepare(`
        INSERT INTO comments (tenant_id, post_id, user_id, content, parent_comment_id)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(tenantId, postId, userId, content, parent_comment_id || null)
      .run()

    if (!result.success) {
      throw new Error('Failed to create comment')
    }

    // 通知を作成（投稿者へのコメント通知）
    if (post.user_id !== userId) {
      const commenter = await db.prepare(
        'SELECT nickname FROM users WHERE id = ?'
      ).bind(userId).first()
      
      const contentPreview = content.substring(0, 30) + (content.length > 30 ? '...' : '')
      
      await createNotification(db, {
        tenantId,
        userId: post.user_id,
        actorId: userId,
        type: 'comment',
        targetType: 'post',
        targetId: postId,
        message: `${commenter?.nickname || 'Someone'}さんがあなたの投稿「${post.title}」にコメントしました: ${contentPreview}`
      })
    }

    // 作成したコメントを取得
    const comment = await db
      .prepare(`
        SELECT 
          c.id, c.content, c.parent_comment_id, c.created_at,
          u.id as user_id, u.nickname as user_name, u.avatar_url as user_avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.tenant_id = ? AND c.post_id = ?
        ORDER BY c.id DESC
        LIMIT 1
      `)
      .bind(tenantId, postId)
      .first<any>()

    return c.json({
      success: true,
      comment,
      message: 'Comment created successfully'
    }, 201)
  } catch (error) {
    console.error('[Create Comment Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create comment'
    }, 500)
  }
})

/**
 * DELETE /api/posts/:postId/comments/:commentId
 * コメント削除（投稿者または管理者のみ）
 */
posts.delete('/:postId/comments/:commentId', authMiddleware, async (c) => {
  const postId = parseInt(c.req.param('postId'))
  const commentId = parseInt(c.req.param('commentId'))
  const userId = c.get('userId')
  const role = c.get('role')
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  try {
    // コメントの存在確認
    const comment = await db
      .prepare('SELECT * FROM comments WHERE id = ? AND post_id = ? AND tenant_id = ?')
      .bind(commentId, postId, tenantId)
      .first<any>()

    if (!comment) {
      return c.json({ success: false, error: 'Comment not found' }, 404)
    }

    // 権限チェック（投稿者またはowner/admin）
    if (comment.user_id !== userId && role !== 'owner' && role !== 'admin') {
      return c.json({ success: false, error: 'Unauthorized' }, 403)
    }

    // コメント削除
    await db
      .prepare('DELETE FROM comments WHERE id = ? AND tenant_id = ?')
      .bind(commentId, tenantId)
      .run()

    return c.json({
      success: true,
      message: 'Comment deleted successfully'
    })
  } catch (error) {
    console.error('[Delete Comment Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment'
    }, 500)
  }
})

export default posts
