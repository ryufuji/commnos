// ============================================
// Points System Routes
// ポイントシステム
// ============================================

import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../middleware/auth'

const points = new Hono()

/**
 * GET /api/points/balance
 * ユーザーのポイント残高取得
 */
points.get('/balance', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const balance = await DB.prepare(`
      SELECT balance, total_earned, total_spent, created_at
      FROM user_points
      WHERE user_id = ? AND tenant_id = ?
    `).bind(userId, tenantId).first() as any

    return c.json({
      success: true,
      balance: balance || { balance: 0, total_earned: 0, total_spent: 0 }
    })
  } catch (error) {
    console.error('[Get Points Balance Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get balance'
    }, 500)
  }
})

/**
 * GET /api/points/transactions
 * ポイント履歴取得
 */
points.get('/transactions', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const transactions = await DB.prepare(`
      SELECT 
        pt.id,
        pt.action_type,
        pt.points,
        pt.reason,
        pt.balance_after,
        pt.note,
        pt.created_at,
        u.nickname as admin_name
      FROM point_transactions pt
      LEFT JOIN users u ON pt.admin_id = u.id
      WHERE pt.user_id = ? AND pt.tenant_id = ?
      ORDER BY pt.created_at DESC
      LIMIT 100
    `).bind(userId, tenantId).all()

    return c.json({
      success: true,
      transactions: transactions.results || []
    })
  } catch (error) {
    console.error('[Get Points Transactions Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get transactions'
    }, 500)
  }
})

/**
 * POST /api/points/earn
 * ポイント付与（内部API、認証済みアクションで自動呼び出し）
 */
points.post('/earn', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const { action, reference_id, note } = await c.req.json()

    // ポイントルールを取得
    const rule = await DB.prepare(`
      SELECT points FROM point_rules
      WHERE tenant_id = ? AND action = ? AND is_active = 1
    `).bind(tenantId, action).first() as any

    if (!rule || rule.points <= 0) {
      return c.json({ success: false, error: 'ポイントルールが見つかりません' }, 404)
    }

    const points = rule.points

    // サイト訪問の場合は1日1回のみ
    if (action === 'site_visit') {
      const today = new Date().toISOString().split('T')[0]
      const lastVisit = await DB.prepare(`
        SELECT created_at FROM point_transactions
        WHERE user_id = ? AND tenant_id = ? AND reason = 'site_visit'
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(userId, tenantId).first() as any

      if (lastVisit) {
        const lastVisitDate = new Date(lastVisit.created_at).toISOString().split('T')[0]
        if (lastVisitDate === today) {
          return c.json({ success: true, message: '本日のサイト訪問ポイントは付与済みです', already_earned: true })
        }
      }
    }

    // トランザクション開始
    // 1. ポイント残高を取得または作成
    let balance = await DB.prepare(`
      SELECT balance, total_earned FROM user_points
      WHERE user_id = ? AND tenant_id = ?
    `).bind(userId, tenantId).first() as any

    if (!balance) {
      await DB.prepare(`
        INSERT INTO user_points (user_id, tenant_id, balance, total_earned)
        VALUES (?, ?, 0, 0)
      `).bind(userId, tenantId).run()
      balance = { balance: 0, total_earned: 0 }
    }

    const newBalance = balance.balance + points
    const newTotalEarned = balance.total_earned + points

    // 2. ポイント残高を更新
    await DB.prepare(`
      UPDATE user_points
      SET balance = ?, total_earned = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(newBalance, newTotalEarned, userId, tenantId).run()

    // 3. ポイント履歴を記録
    await DB.prepare(`
      INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after, note)
      VALUES (?, ?, 'earn', ?, ?, ?, ?, ?)
    `).bind(userId, tenantId, points, action, reference_id || null, newBalance, note || null).run()

    return c.json({
      success: true,
      points,
      balance: newBalance,
      message: `${points}ポイント獲得しました！`
    })
  } catch (error) {
    console.error('[Earn Points Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to earn points'
    }, 500)
  }
})

/**
 * POST /api/points/admin/grant
 * 管理者によるポイント付与
 */
points.post('/admin/grant', authMiddleware, requireRole('admin'), async (c) => {
  const adminId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const { user_id, points: pointsToGrant, note } = await c.req.json()

    if (!user_id || !pointsToGrant || pointsToGrant <= 0) {
      return c.json({ success: false, error: '無効なパラメータです' }, 400)
    }

    // ユーザーが存在するか確認
    const user = await DB.prepare(`
      SELECT id FROM users WHERE id = ?
    `).bind(user_id).first()

    if (!user) {
      return c.json({ success: false, error: 'ユーザーが見つかりません' }, 404)
    }

    // ポイント残高を取得または作成
    let balance = await DB.prepare(`
      SELECT balance, total_earned FROM user_points
      WHERE user_id = ? AND tenant_id = ?
    `).bind(user_id, tenantId).first() as any

    if (!balance) {
      await DB.prepare(`
        INSERT INTO user_points (user_id, tenant_id, balance, total_earned)
        VALUES (?, ?, 0, 0)
      `).bind(user_id, tenantId).run()
      balance = { balance: 0, total_earned: 0 }
    }

    const newBalance = balance.balance + pointsToGrant
    const newTotalEarned = balance.total_earned + pointsToGrant

    // ポイント残高を更新
    await DB.prepare(`
      UPDATE user_points
      SET balance = ?, total_earned = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(newBalance, newTotalEarned, user_id, tenantId).run()

    // ポイント履歴を記録
    await DB.prepare(`
      INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, balance_after, admin_id, note)
      VALUES (?, ?, 'earn', ?, 'admin_grant', ?, ?, ?)
    `).bind(user_id, tenantId, pointsToGrant, newBalance, adminId, note || null).run()

    return c.json({
      success: true,
      message: `${pointsToGrant}ポイントを付与しました`,
      balance: newBalance
    })
  } catch (error) {
    console.error('[Admin Grant Points Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grant points'
    }, 500)
  }
})

/**
 * GET /api/points/rules
 * ポイントルール取得（管理者のみ）
 */
points.get('/rules', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const rules = await DB.prepare(`
      SELECT id, action, points, is_active, note, created_at, updated_at
      FROM point_rules
      WHERE tenant_id = ?
      ORDER BY action
    `).bind(tenantId).all()

    return c.json({
      success: true,
      rules: rules.results || []
    })
  } catch (error) {
    console.error('[Get Point Rules Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rules'
    }, 500)
  }
})

/**
 * PUT /api/points/rules/:action
 * ポイントルール更新（管理者のみ）
 */
points.put('/rules/:action', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const action = c.req.param('action')
  const { DB } = c.env

  try {
    const { points: newPoints, is_active, note } = await c.req.json()

    if (newPoints === undefined || newPoints < 0) {
      return c.json({ success: false, error: '無効なポイント数です' }, 400)
    }

    await DB.prepare(`
      UPDATE point_rules
      SET points = ?, is_active = ?, note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ? AND action = ?
    `).bind(newPoints, is_active ? 1 : 0, note || null, tenantId, action).run()

    return c.json({
      success: true,
      message: 'ポイントルールを更新しました'
    })
  } catch (error) {
    console.error('[Update Point Rule Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update rule'
    }, 500)
  }
})

/**
 * GET /api/points/rewards
 * 報酬一覧取得
 */
points.get('/rewards', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    // 認証済みユーザーの場合、ユーザーのタグを取得
    const userId = c.get('userId')
    let userTagIds: number[] = []
    
    if (userId) {
      const userTags = await DB.prepare(`
        SELECT tag_id FROM user_tag_assignments
        WHERE user_id = ? AND tenant_id = ?
      `).bind(userId, tenantId).all()
      
      userTagIds = (userTags.results || []).map((t: any) => t.tag_id)
    }

    // 全報酬を取得
    const rewards = await DB.prepare(`
      SELECT id, name, description, points_required, image_url, stock, display_order, eligibility_type, eligible_tag_ids
      FROM point_rewards
      WHERE tenant_id = ? AND is_active = 1
      ORDER BY display_order, points_required
    `).bind(tenantId).all()

    // 各報酬の交換資格をチェック
    const rewardsWithEligibility = (rewards.results || []).map((reward: any) => {
      let canExchange = true
      let eligibilityMessage = ''

      if (reward.eligibility_type === 'tags' && reward.eligible_tag_ids) {
        try {
          const requiredTagIds = JSON.parse(reward.eligible_tag_ids)
          const hasRequiredTag = requiredTagIds.some((tagId: number) => userTagIds.includes(tagId))
          
          if (!hasRequiredTag && userId) {
            canExchange = false
            eligibilityMessage = '交換対象外です（指定されたタグが必要です）'
          }
        } catch (e) {
          console.error('Failed to parse eligible_tag_ids:', e)
        }
      }

      return {
        ...reward,
        can_exchange: canExchange,
        eligibility_message: eligibilityMessage
      }
    })

    return c.json({
      success: true,
      rewards: rewardsWithEligibility
    })
  } catch (error) {
    console.error('[Get Rewards Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rewards'
    }, 500)
  }
})

/**
 * GET /api/points/admin/rewards
 * 報酬一覧取得（管理者用、非アクティブ含む）
 */
points.get('/admin/rewards', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const rewards = await DB.prepare(`
      SELECT id, name, description, points_required, image_url, stock, is_active, display_order, eligibility_type, eligible_tag_ids, created_at, updated_at
      FROM point_rewards
      WHERE tenant_id = ?
      ORDER BY display_order, points_required
    `).bind(tenantId).all()

    return c.json({
      success: true,
      rewards: rewards.results || []
    })
  } catch (error) {
    console.error('[Get Admin Rewards Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rewards'
    }, 500)
  }
})

/**
 * POST /api/points/admin/rewards
 * 報酬作成（管理者のみ）
 */
points.post('/admin/rewards', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const { name, description, points_required, image_url, stock, display_order, eligibility_type, eligible_tag_ids } = await c.req.json()

    if (!name || !points_required || points_required <= 0) {
      return c.json({ success: false, error: '無効なパラメータです' }, 400)
    }

    // eligible_tag_idsがある場合、JSON文字列に変換
    let eligibleTagIdsStr = null
    if (eligibility_type === 'tags' && eligible_tag_ids && Array.isArray(eligible_tag_ids)) {
      eligibleTagIdsStr = JSON.stringify(eligible_tag_ids)
    }

    await DB.prepare(`
      INSERT INTO point_rewards (tenant_id, name, description, points_required, image_url, stock, display_order, eligibility_type, eligible_tag_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(tenantId, name, description || null, points_required, image_url || null, stock || -1, display_order || 0, eligibility_type || 'all', eligibleTagIdsStr).run()

    return c.json({
      success: true,
      message: '報酬を作成しました'
    })
  } catch (error) {
    console.error('[Create Reward Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create reward'
    }, 500)
  }
})

/**
 * PUT /api/points/admin/rewards/:id
 * 報酬更新（管理者のみ）
 */
points.put('/admin/rewards/:id', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const rewardId = c.req.param('id')
  const { DB } = c.env

  try {
    const { name, description, points_required, image_url, stock, is_active, display_order, eligibility_type, eligible_tag_ids } = await c.req.json()

    // eligible_tag_idsがある場合、JSON文字列に変換
    let eligibleTagIdsStr = null
    if (eligibility_type === 'tags' && eligible_tag_ids && Array.isArray(eligible_tag_ids)) {
      eligibleTagIdsStr = JSON.stringify(eligible_tag_ids)
    }

    await DB.prepare(`
      UPDATE point_rewards
      SET name = ?, description = ?, points_required = ?, image_url = ?, stock = ?, is_active = ?, display_order = ?, eligibility_type = ?, eligible_tag_ids = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(name, description || null, points_required, image_url || null, stock, is_active ? 1 : 0, display_order || 0, eligibility_type || 'all', eligibleTagIdsStr, rewardId, tenantId).run()

    return c.json({
      success: true,
      message: '報酬を更新しました'
    })
  } catch (error) {
    console.error('[Update Reward Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update reward'
    }, 500)
  }
})

/**
 * DELETE /api/points/admin/rewards/:id
 * 報酬削除（管理者のみ）
 */
points.delete('/admin/rewards/:id', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const rewardId = c.req.param('id')
  const { DB } = c.env

  try {
    await DB.prepare(`
      DELETE FROM point_rewards
      WHERE id = ? AND tenant_id = ?
    `).bind(rewardId, tenantId).run()

    return c.json({
      success: true,
      message: '報酬を削除しました'
    })
  } catch (error) {
    console.error('[Delete Reward Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete reward'
    }, 500)
  }
})

/**
 * POST /api/points/rewards/:id/exchange
 * 報酬交換申請
 */
points.post('/rewards/:id/exchange', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const rewardId = c.req.param('id')
  const { DB } = c.env

  try {
    // 報酬情報を取得
    const reward = await DB.prepare(`
      SELECT id, name, points_required, stock, eligibility_type, eligible_tag_ids
      FROM point_rewards
      WHERE id = ? AND tenant_id = ? AND is_active = 1
    `).bind(rewardId, tenantId).first() as any

    if (!reward) {
      return c.json({ success: false, error: '報酬が見つかりません' }, 404)
    }

    // 交換資格チェック
    if (reward.eligibility_type === 'tags' && reward.eligible_tag_ids) {
      try {
        const requiredTagIds = JSON.parse(reward.eligible_tag_ids)
        
        // ユーザーのタグを取得
        const userTags = await DB.prepare(`
          SELECT tag_id FROM user_tag_assignments
          WHERE user_id = ? AND tenant_id = ?
        `).bind(userId, tenantId).all()
        
        const userTagIds = (userTags.results || []).map((t: any) => t.tag_id)
        const hasRequiredTag = requiredTagIds.some((tagId: number) => userTagIds.includes(tagId))
        
        if (!hasRequiredTag) {
          return c.json({ 
            success: false, 
            error: 'この報酬の交換資格がありません（必要なタグを持っていません）' 
          }, 403)
        }
      } catch (e) {
        console.error('Failed to check eligibility:', e)
        return c.json({ success: false, error: '交換資格の確認に失敗しました' }, 500)
      }
    }

    // 在庫確認
    if (reward.stock === 0) {
      return c.json({ success: false, error: '在庫がありません' }, 400)
    }

    // ポイント残高を確認
    const balance = await DB.prepare(`
      SELECT balance FROM user_points
      WHERE user_id = ? AND tenant_id = ?
    `).bind(userId, tenantId).first() as any

    if (!balance || balance.balance < reward.points_required) {
      return c.json({ success: false, error: 'ポイントが不足しています' }, 400)
    }

    const newBalance = balance.balance - reward.points_required

    // トランザクション処理
    // 1. ポイント残高を更新
    await DB.prepare(`
      UPDATE user_points
      SET balance = ?, total_spent = total_spent + ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(newBalance, reward.points_required, userId, tenantId).run()

    // 2. ポイント履歴を記録
    await DB.prepare(`
      INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after)
      VALUES (?, ?, 'spend', ?, 'reward_exchange', ?, ?)
    `).bind(userId, tenantId, reward.points_required, rewardId, newBalance).run()

    // 3. 交換履歴を記録
    const exchangeResult = await DB.prepare(`
      INSERT INTO reward_exchanges (user_id, tenant_id, reward_id, points_spent, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).bind(userId, tenantId, rewardId, reward.points_required).run()

    // 4. 在庫を減らす（無制限でない場合）
    if (reward.stock > 0) {
      await DB.prepare(`
        UPDATE point_rewards
        SET stock = stock - 1
        WHERE id = ? AND tenant_id = ?
      `).bind(rewardId, tenantId).run()
    }

    return c.json({
      success: true,
      message: `${reward.name}と交換しました（承認待ち）`,
      balance: newBalance,
      exchange_id: exchangeResult.meta.last_row_id
    })
  } catch (error) {
    console.error('[Exchange Reward Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to exchange reward'
    }, 500)
  }
})

/**
 * GET /api/points/exchanges
 * 自分の交換履歴取得
 */
points.get('/exchanges', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const exchanges = await DB.prepare(`
      SELECT 
        re.id,
        re.points_spent,
        re.status,
        re.admin_note,
        re.created_at,
        re.approved_at,
        pr.name as reward_name,
        pr.description as reward_description,
        u.nickname as approved_by_name
      FROM reward_exchanges re
      JOIN point_rewards pr ON re.reward_id = pr.id
      LEFT JOIN users u ON re.approved_by = u.id
      WHERE re.user_id = ? AND re.tenant_id = ?
      ORDER BY re.created_at DESC
      LIMIT 100
    `).bind(userId, tenantId).all()

    return c.json({
      success: true,
      exchanges: exchanges.results || []
    })
  } catch (error) {
    console.error('[Get Exchanges Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get exchanges'
    }, 500)
  }
})

/**
 * GET /api/points/admin/exchanges
 * 全交換履歴取得（管理者のみ）
 */
points.get('/admin/exchanges', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const exchanges = await DB.prepare(`
      SELECT 
        re.id,
        re.points_spent,
        re.status,
        re.admin_note,
        re.created_at,
        re.approved_at,
        pr.name as reward_name,
        u.nickname as user_name,
        u.email as user_email,
        approver.nickname as approved_by_name
      FROM reward_exchanges re
      JOIN point_rewards pr ON re.reward_id = pr.id
      JOIN users u ON re.user_id = u.id
      LEFT JOIN users approver ON re.approved_by = approver.id
      WHERE re.tenant_id = ?
      ORDER BY re.created_at DESC
      LIMIT 200
    `).bind(tenantId).all()

    return c.json({
      success: true,
      exchanges: exchanges.results || []
    })
  } catch (error) {
    console.error('[Get Admin Exchanges Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get exchanges'
    }, 500)
  }
})

/**
 * POST /api/points/admin/exchanges/:id/approve
 * 交換承認（管理者のみ）
 */
points.post('/admin/exchanges/:id/approve', authMiddleware, requireRole('admin'), async (c) => {
  const adminId = c.get('userId')
  const tenantId = c.get('tenantId')
  const exchangeId = c.req.param('id')
  const { DB } = c.env

  try {
    const { admin_note } = await c.req.json()

    await DB.prepare(`
      UPDATE reward_exchanges
      SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, admin_note = ?
      WHERE id = ? AND tenant_id = ? AND status = 'pending'
    `).bind(adminId, admin_note || null, exchangeId, tenantId).run()

    return c.json({
      success: true,
      message: '交換を承認しました'
    })
  } catch (error) {
    console.error('[Approve Exchange Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve exchange'
    }, 500)
  }
})

/**
 * POST /api/points/admin/exchanges/:id/reject
 * 交換却下（管理者のみ）
 */
points.post('/admin/exchanges/:id/reject', authMiddleware, requireRole('admin'), async (c) => {
  const adminId = c.get('userId')
  const tenantId = c.get('tenantId')
  const exchangeId = c.req.param('id')
  const { DB } = c.env

  try {
    const { admin_note } = await c.req.json()

    // 交換情報を取得
    const exchange = await DB.prepare(`
      SELECT user_id, reward_id, points_spent
      FROM reward_exchanges
      WHERE id = ? AND tenant_id = ? AND status = 'pending'
    `).bind(exchangeId, tenantId).first() as any

    if (!exchange) {
      return c.json({ success: false, error: '交換申請が見つかりません' }, 404)
    }

    // ポイントを返却
    const balance = await DB.prepare(`
      SELECT balance FROM user_points
      WHERE user_id = ? AND tenant_id = ?
    `).bind(exchange.user_id, tenantId).first() as any

    const newBalance = (balance?.balance || 0) + exchange.points_spent

    await DB.prepare(`
      UPDATE user_points
      SET balance = ?, total_spent = total_spent - ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).bind(newBalance, exchange.points_spent, exchange.user_id, tenantId).run()

    // ポイント履歴を記録（返却）
    await DB.prepare(`
      INSERT INTO point_transactions (user_id, tenant_id, action_type, points, reason, reference_id, balance_after, note)
      VALUES (?, ?, 'earn', ?, 'exchange_rejected', ?, ?, '交換却下によるポイント返却')
    `).bind(exchange.user_id, tenantId, exchange.points_spent, exchangeId, newBalance).run()

    // 在庫を戻す
    const reward = await DB.prepare(`
      SELECT stock FROM point_rewards WHERE id = ?
    `).bind(exchange.reward_id).first() as any

    if (reward && reward.stock >= 0) {
      await DB.prepare(`
        UPDATE point_rewards
        SET stock = stock + 1
        WHERE id = ?
      `).bind(exchange.reward_id).run()
    }

    // 交換ステータスを更新
    await DB.prepare(`
      UPDATE reward_exchanges
      SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP, admin_note = ?
      WHERE id = ? AND tenant_id = ?
    `).bind(adminId, admin_note || null, exchangeId, tenantId).run()

    return c.json({
      success: true,
      message: '交換を却下し、ポイントを返却しました'
    })
  } catch (error) {
    console.error('[Reject Exchange Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject exchange'
    }, 500)
  }
})

/**
 * POST /api/points/admin/upload-reward-image
 * 報酬画像アップロード
 */
points.post('/admin/upload-reward-image', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')
  const { REWARDS_BUCKET } = c.env

  try {
    const formData = await c.req.formData()
    const file = formData.get('image') as File
    
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
    const key = `rewards/${tenantId}/${timestamp}-${randomString}.${extension}`

    // R2にアップロード
    const arrayBuffer = await file.arrayBuffer()
    await REWARDS_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    // 公開URL（Cloudflare R2の公開URLは設定が必要）
    // 仮のURL形式（実際のドメインは後で設定）
    const imageUrl = `/api/points/images/${key}`

    return c.json({
      success: true,
      image_url: imageUrl,
      key: key
    })
  } catch (error) {
    console.error('[Upload Reward Image Error]', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image'
    }, 500)
  }
})

/**
 * GET /api/points/images/:key
 * 報酬画像取得
 */
points.get('/images/*', async (c) => {
  const { REWARDS_BUCKET } = c.env
  const path = c.req.path.replace('/api/points/images/', '')

  try {
    const object = await REWARDS_BUCKET.get(path)
    
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
    console.error('[Get Reward Image Error]', error)
    return c.notFound()
  }
})

export default points
