// ============================================
// 統計ダッシュボードAPI
// 管理者向け統計データAPI
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware, requireRole } from '../middleware/auth'

const analytics = new Hono<AppContext>()

// ============================================
// 認証ミドルウェア（owner/admin のみ）
// ============================================
analytics.use('/*', authMiddleware, requireRole('admin'))

// ============================================
// GET /api/analytics/overview
// 概要統計（全カテゴリの主要KPI）
// ============================================
analytics.get('/overview', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  console.log('[Analytics Overview] tenantId:', tenantId)

  try {
    // 会員統計
    console.log('[Analytics] Fetching member stats...')
    const memberStats = await DB.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as total_members,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_members,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_members,
        COUNT(CASE WHEN status = 'active' AND joined_at >= date('now', '-30 days') THEN 1 END) as new_members_month
      FROM tenant_memberships
      WHERE tenant_id = ?
    `).bind(tenantId).first() as any
    console.log('[Analytics] Member stats:', memberStats)

    // 投稿統計
    console.log('[Analytics] Fetching post stats...')
    const postStats = await DB.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_posts,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_posts,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_posts,
        COALESCE(SUM(view_count), 0) as total_views
      FROM posts
      WHERE tenant_id = ?
    `).bind(tenantId).first() as any
    console.log('[Analytics] Post stats:', postStats)

    // いいね・コメント統計
    console.log('[Analytics] Fetching engagement stats...')
    const engagementStats = await DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM post_likes WHERE post_id IN (SELECT id FROM posts WHERE tenant_id = ?)) as total_likes,
        (SELECT COUNT(*) FROM comments WHERE tenant_id = ?) as total_comments
    `).bind(tenantId, tenantId).first() as any
    console.log('[Analytics] Engagement stats:', engagementStats)

    // サブスクリプション統計
    console.log('[Analytics] Fetching subscription stats...')
    const subscriptionStats = await DB.prepare(`
      SELECT 
        COUNT(*) as active_subscriptions
      FROM tenant_memberships
      WHERE tenant_id = ? AND status = 'active' AND stripe_subscription_id IS NOT NULL
    `).bind(tenantId).first() as any
    console.log('[Analytics] Subscription stats:', subscriptionStats)

    // アンケート統計
    console.log('[Analytics] Fetching survey stats...')
    let surveyStats = { join_responses: 0, leave_responses: 0 }
    
    try {
      const result = await DB.prepare(`
        SELECT 
          COUNT(DISTINCT CASE WHEN s.type = 'join' THEN sr.user_id END) as join_responses,
          COUNT(DISTINCT CASE WHEN s.type = 'leave' THEN sr.user_id END) as leave_responses
        FROM surveys s
        LEFT JOIN survey_responses sr ON s.id = sr.survey_id
        WHERE s.tenant_id = ?
      `).bind(tenantId).first() as any
      
      if (result) {
        surveyStats = result
      }
    } catch (err) {
      console.error('[Analytics] Survey stats error:', err)
      // アンケート統計が取得できなくても続行
    }
    console.log('[Analytics] Survey stats:', surveyStats)

    return c.json({
      success: true,
      data: {
        members: {
          total: memberStats?.total_members || 0,
          pending: memberStats?.pending_members || 0,
          inactive: memberStats?.inactive_members || 0,
          new_this_month: memberStats?.new_members_month || 0
        },
        posts: {
          published: postStats?.published_posts || 0,
          draft: postStats?.draft_posts || 0,
          scheduled: postStats?.scheduled_posts || 0,
          total_views: postStats?.total_views || 0
        },
        engagement: {
          total_likes: engagementStats?.total_likes || 0,
          total_comments: engagementStats?.total_comments || 0
        },
        subscriptions: {
          active: subscriptionStats?.active_subscriptions || 0
        },
        surveys: {
          join_responses: surveyStats?.join_responses || 0,
          leave_responses: surveyStats?.leave_responses || 0
        }
      }
    })
  } catch (error: any) {
    console.error('[Analytics Overview Error]', error)
    console.error('[Analytics Overview Error Stack]', error.stack)
    return c.json({ 
      success: false, 
      message: error.message || 'Failed to fetch analytics data',
      error: error.toString(),
      stack: error.stack
    }, 500)
  }
})

// ============================================
// GET /api/analytics/members
// 会員統計詳細
// ============================================
analytics.get('/members', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  try {
    // 基本統計
    const basicStats = await DB.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as total_active,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as total_inactive,
        COUNT(CASE WHEN role = 'owner' THEN 1 END) as owner_count,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'member' THEN 1 END) as member_count
      FROM tenant_memberships
      WHERE tenant_id = ?
    `).bind(tenantId).first() as any

    // 月次推移（過去12ヶ月）
    const monthlyTrend = await DB.prepare(`
      SELECT 
        strftime('%Y-%m', joined_at) as month,
        COUNT(*) as count
      FROM tenant_memberships
      WHERE tenant_id = ? AND status IN ('active', 'inactive')
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).bind(tenantId).all()

    // プラン別分布
    const planDistribution = await DB.prepare(`
      SELECT 
        COALESCE(pp.name, 'Free') as plan_name,
        COUNT(*) as count
      FROM tenant_memberships tm
      LEFT JOIN platform_plans pp ON tm.plan_id = pp.id
      WHERE tm.tenant_id = ? AND tm.status = 'active'
      GROUP BY plan_name
    `).bind(tenantId).all()

    return c.json({
      success: true,
      data: {
        basic: basicStats,
        monthly_trend: monthlyTrend.results || [],
        plan_distribution: planDistribution.results || []
      }
    })
  } catch (error: any) {
    console.error('[Analytics Members Error]', error)
    return c.json({ success: false, message: error.message }, 500)
  }
})

// ============================================
// GET /api/analytics/posts
// 投稿・コンテンツ統計詳細
// ============================================
analytics.get('/posts', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  try {
    // 基本統計
    const basicStats = await DB.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
        COALESCE(SUM(view_count), 0) as total_views,
        COALESCE(AVG(view_count), 0) as avg_views
      FROM posts
      WHERE tenant_id = ?
    `).bind(tenantId).first() as any

    // 人気投稿トップ10（閲覧数順）
    const topPosts = await DB.prepare(`
      SELECT 
        p.id,
        p.title,
        p.view_count,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        u.nickname as author_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.tenant_id = ? AND p.status = 'published'
      ORDER BY p.view_count DESC
      LIMIT 10
    `).bind(tenantId).all()

    // 月次投稿数推移
    const monthlyPosts = await DB.prepare(`
      SELECT 
        strftime('%Y-%m', published_at) as month,
        COUNT(*) as count
      FROM posts
      WHERE tenant_id = ? AND status = 'published'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).bind(tenantId).all()

    // 投稿者別統計
    const authorStats = await DB.prepare(`
      SELECT 
        u.nickname as author_name,
        COUNT(*) as post_count,
        SUM(p.view_count) as total_views
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.tenant_id = ? AND p.status = 'published'
      GROUP BY u.id
      ORDER BY post_count DESC
      LIMIT 10
    `).bind(tenantId).all()

    return c.json({
      success: true,
      data: {
        basic: basicStats,
        top_posts: topPosts.results || [],
        monthly_posts: monthlyPosts.results || [],
        author_stats: authorStats.results || []
      }
    })
  } catch (error: any) {
    console.error('[Analytics Posts Error]', error)
    return c.json({ success: false, message: error.message }, 500)
  }
})

// ============================================
// GET /api/analytics/surveys
// アンケート統計詳細
// ============================================
analytics.get('/surveys', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  try {
    // 入会時アンケート統計
    const joinSurveyStats = await DB.prepare(`
      SELECT 
        s.id as survey_id,
        s.title as survey_title,
        COUNT(DISTINCT sr.user_id) as total_responses,
        (SELECT COUNT(*) FROM tenant_memberships WHERE tenant_id = ? AND status = 'active') as total_members
      FROM surveys s
      LEFT JOIN survey_responses sr ON s.id = sr.survey_id
      WHERE s.tenant_id = ? AND s.type = 'join' AND s.is_active = 1
      GROUP BY s.id
      LIMIT 1
    `).bind(tenantId, tenantId).first() as any

    // 退会時アンケート統計
    const leaveSurveyStats = await DB.prepare(`
      SELECT 
        s.id as survey_id,
        s.title as survey_title,
        COUNT(DISTINCT sr.user_id) as total_responses,
        (SELECT COUNT(*) FROM tenant_memberships WHERE tenant_id = ? AND status = 'inactive') as total_exits
      FROM surveys s
      LEFT JOIN survey_responses sr ON s.id = sr.survey_id
      WHERE s.tenant_id = ? AND s.type = 'leave' AND s.is_active = 1
      GROUP BY s.id
      LIMIT 1
    `).bind(tenantId, tenantId).first() as any

    return c.json({
      success: true,
      data: {
        join_survey: joinSurveyStats || null,
        leave_survey: leaveSurveyStats || null
      }
    })
  } catch (error: any) {
    console.error('[Analytics Surveys Error]', error)
    return c.json({ success: false, message: error.message }, 500)
  }
})

// ============================================
// GET /api/analytics/surveys/:surveyId/questions
// アンケート質問別統計
// ============================================
analytics.get('/surveys/:surveyId/questions', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const surveyId = parseInt(c.req.param('surveyId'))

  try {
    // サーベイが存在し、テナントに属しているか確認
    const survey = await DB.prepare(`
      SELECT * FROM surveys WHERE id = ? AND tenant_id = ?
    `).bind(surveyId, tenantId).first() as any

    if (!survey) {
      return c.json({ success: false, message: 'アンケートが見つかりません' }, 404)
    }

    // 質問一覧を取得
    const questions = await DB.prepare(`
      SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY question_order ASC
    `).bind(surveyId).all()

    // 各質問の回答統計を取得
    const questionStats = []
    for (const question of questions.results || []) {
      const q: any = question
      
      if (q.question_type === 'text' || q.question_type === 'textarea') {
        // テキスト回答一覧
        const responses = await DB.prepare(`
          SELECT 
            sr.answer,
            u.nickname as user_nickname,
            sr.created_at
          FROM survey_responses sr
          LEFT JOIN users u ON sr.user_id = u.id
          WHERE sr.question_id = ?
          ORDER BY sr.created_at DESC
        `).bind(q.id).all()

        questionStats.push({
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          responses: responses.results || []
        })
      } else if (q.question_type === 'radio' || q.question_type === 'checkbox') {
        // 選択肢別集計
        const aggregation = await DB.prepare(`
          SELECT 
            answer,
            COUNT(*) as count
          FROM survey_responses
          WHERE question_id = ?
          GROUP BY answer
          ORDER BY count DESC
        `).bind(q.id).all()

        const totalResponses = (aggregation.results || []).reduce((sum: number, item: any) => sum + item.count, 0)

        questionStats.push({
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options ? JSON.parse(q.options) : [],
          aggregation: (aggregation.results || []).map((item: any) => ({
            answer: item.answer,
            count: item.count,
            percentage: totalResponses > 0 ? Math.round((item.count / totalResponses) * 1000) / 10 : 0
          })),
          total_responses: totalResponses
        })
      } else if (q.question_type === 'scale') {
        // スケール評価の平均とヒストグラム
        const aggregation = await DB.prepare(`
          SELECT 
            CAST(answer AS INTEGER) as score,
            COUNT(*) as count
          FROM survey_responses
          WHERE question_id = ?
          GROUP BY score
          ORDER BY score ASC
        `).bind(q.id).all()

        const scores = aggregation.results || []
        const totalResponses = scores.reduce((sum: number, item: any) => sum + item.count, 0)
        const avgScore = totalResponses > 0 
          ? scores.reduce((sum: number, item: any) => sum + (item.score * item.count), 0) / totalResponses
          : 0

        questionStats.push({
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          scale_min: q.scale_min,
          scale_max: q.scale_max,
          scale_label_min: q.scale_label_min,
          scale_label_max: q.scale_label_max,
          avg_score: Math.round(avgScore * 10) / 10,
          distribution: scores,
          total_responses: totalResponses
        })
      }
    }

    return c.json({
      success: true,
      data: {
        survey: survey,
        question_stats: questionStats
      }
    })
  } catch (error: any) {
    console.error('[Analytics Survey Questions Error]', error)
    return c.json({ success: false, message: error.message }, 500)
  }
})

// ============================================
// GET /api/analytics/subscriptions
// サブスクリプション・収益統計詳細
// ============================================
analytics.get('/subscriptions', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const role = c.get('role')

  // Ownerのみ収益データにアクセス可能
  if (role !== 'owner') {
    return c.json({ success: false, message: '収益データはオーナーのみ閲覧可能です' }, 403)
  }

  try {
    // アクティブサブスクリプション統計
    const subscriptionStats = await DB.prepare(`
      SELECT 
        COUNT(*) as active_count,
        COUNT(CASE WHEN billing_interval = 'month' THEN 1 END) as monthly_count,
        COUNT(CASE WHEN billing_interval = 'year' THEN 1 END) as yearly_count
      FROM tenant_memberships
      WHERE tenant_id = ? AND status = 'active' AND stripe_subscription_id IS NOT NULL
    `).bind(tenantId).first() as any

    // プラン別内訳
    const planBreakdown = await DB.prepare(`
      SELECT 
        COALESCE(pp.name, 'Unknown') as plan_name,
        COUNT(*) as count
      FROM tenant_memberships tm
      LEFT JOIN platform_plans pp ON tm.plan_id = pp.id
      WHERE tm.tenant_id = ? AND tm.status = 'active' AND tm.stripe_subscription_id IS NOT NULL
      GROUP BY plan_name
    `).bind(tenantId).all()

    return c.json({
      success: true,
      data: {
        subscription_stats: subscriptionStats,
        plan_breakdown: planBreakdown.results || []
      }
    })
  } catch (error: any) {
    console.error('[Analytics Subscriptions Error]', error)
    return c.json({ success: false, message: error.message }, 500)
  }
})

export default analytics
