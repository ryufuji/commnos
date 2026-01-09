// ============================================
// プランベースのアクセス制御ミドルウェア
// ============================================

import { Context, Next } from 'hono'
import type { AppContext } from '../index'

/**
 * プラン情報の取得
 */
export async function getUserPlanLevel(c: Context<AppContext>): Promise<number> {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  
  if (!userId || !tenantId) {
    return 0 // 未ログインは無料レベル
  }

  try {
    const membership = await c.env.DB.prepare(`
      SELECT tm.plan_id, tp.plan_level
      FROM tenant_memberships tm
      LEFT JOIN tenant_plans tp ON tm.plan_id = tp.id
      WHERE tm.user_id = ? AND tm.tenant_id = ? AND tm.status = 'active'
      LIMIT 1
    `).bind(userId, tenantId).first<{ plan_id: number | null, plan_level: number | null }>()

    return membership?.plan_level || 0
  } catch (error) {
    console.error('Error fetching user plan level:', error)
    return 0
  }
}

/**
 * 投稿のアクセス権限チェック
 */
export interface PostAccessCheck {
  canAccess: boolean
  userPlanLevel: number
  requiredPlanLevel: number
  isMembersOnly: boolean
  isPremiumContent: boolean
  previewLength: number
  message?: string
}

export async function checkPostAccess(
  c: Context<AppContext>,
  postId: number
): Promise<PostAccessCheck> {
  const userId = c.get('userId')
  const userPlanLevel = await getUserPlanLevel(c)

  // 投稿情報の取得
  const post = await c.env.DB.prepare(`
    SELECT 
      required_plan_level,
      is_members_only,
      is_premium_content,
      preview_length,
      status
    FROM posts
    WHERE id = ?
  `).bind(postId).first<{
    required_plan_level: number
    is_members_only: number
    is_premium_content: number
    preview_length: number
    status: string
  }>()

  if (!post) {
    return {
      canAccess: false,
      userPlanLevel,
      requiredPlanLevel: 0,
      isMembersOnly: false,
      isPremiumContent: false,
      previewLength: 0,
      message: '投稿が見つかりません'
    }
  }

  // 下書きチェック
  if (post.status !== 'published') {
    return {
      canAccess: false,
      userPlanLevel,
      requiredPlanLevel: post.required_plan_level,
      isMembersOnly: !!post.is_members_only,
      isPremiumContent: !!post.is_premium_content,
      previewLength: post.preview_length,
      message: 'この投稿は公開されていません'
    }
  }

  // 会員限定チェック
  if (post.is_members_only && !userId) {
    return {
      canAccess: false,
      userPlanLevel,
      requiredPlanLevel: post.required_plan_level,
      isMembersOnly: true,
      isPremiumContent: !!post.is_premium_content,
      previewLength: post.preview_length,
      message: 'この投稿は会員限定です。ログインしてください。'
    }
  }

  // プランレベルチェック
  const canAccess = userPlanLevel >= post.required_plan_level

  return {
    canAccess,
    userPlanLevel,
    requiredPlanLevel: post.required_plan_level,
    isMembersOnly: !!post.is_members_only,
    isPremiumContent: !!post.is_premium_content,
    previewLength: post.preview_length,
    message: canAccess 
      ? undefined 
      : 'この投稿を閲覧するには上位プランへのアップグレードが必要です'
  }
}

/**
 * コンテンツのフィルタリング（プレビュー表示）
 */
export function filterContent(
  content: string,
  accessCheck: PostAccessCheck
): { content: string; isFiltered: boolean } {
  if (accessCheck.canAccess) {
    return { content, isFiltered: false }
  }

  // プレビュー長が指定されている場合
  if (accessCheck.previewLength > 0) {
    const preview = content.substring(0, accessCheck.previewLength)
    return {
      content: preview + '...\n\n[続きを読むには上位プランが必要です]',
      isFiltered: true
    }
  }

  // プレビューなしの場合
  return {
    content: '[この投稿を閲覧するには上位プランへのアップグレードが必要です]',
    isFiltered: true
  }
}

/**
 * アクセスログの記録（分析用）
 */
export async function logPostAccess(
  c: Context<AppContext>,
  postId: number,
  accessCheck: PostAccessCheck
): Promise<void> {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')

  if (!tenantId) return

  try {
    await c.env.DB.prepare(`
      INSERT INTO post_access_logs (
        post_id, user_id, tenant_id, access_granted,
        user_plan_level, required_plan_level
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      userId || null,
      tenantId,
      accessCheck.canAccess ? 1 : 0,
      accessCheck.userPlanLevel,
      accessCheck.requiredPlanLevel
    ).run()
  } catch (error) {
    console.error('Error logging post access:', error)
    // ログ記録の失敗はユーザーに影響させない
  }
}

/**
 * プランレベル名の取得
 */
export function getPlanLevelName(level: number): string {
  const levels: Record<number, string> = {
    0: '無料',
    1: 'ベーシック',
    2: 'スタンダード',
    3: 'プレミアム'
  }
  return levels[level] || `レベル${level}`
}

/**
 * 必要なプラン情報の取得
 */
export async function getRequiredPlan(
  c: Context<AppContext>,
  requiredLevel: number
): Promise<{ id: number; name: string; price: number; plan_level: number } | null> {
  const tenantId = c.get('tenantId')
  
  if (!tenantId) return null

  try {
    const plan = await c.env.DB.prepare(`
      SELECT id, name, price, plan_level
      FROM tenant_plans
      WHERE tenant_id = ? AND plan_level >= ? AND is_active = 1
      ORDER BY plan_level ASC, price ASC
      LIMIT 1
    `).bind(tenantId, requiredLevel).first<{
      id: number
      name: string
      price: number
      plan_level: number
    }>()

    return plan || null
  } catch (error) {
    console.error('Error fetching required plan:', error)
    return null
  }
}
