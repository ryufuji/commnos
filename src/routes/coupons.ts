// ============================================
// クーポンシステムAPI実装ガイド
// ============================================

/**
 * クーポン適用API
 * POST /api/coupons/apply
 * 
 * リクエスト:
 * {
 *   "code": "PARTNER-PREMIUM",  // クーポンコード
 *   "tenant_id": 1              // テナントID（オーナーのテナント）
 * }
 * 
 * レスポンス:
 * {
 *   "success": true,
 *   "message": "クーポンを適用しました",
 *   "coupon": {
 *     "name": "パートナー企業特別クーポン",
 *     "discount_type": "free_forever",
 *     "description": "永久無料"
 *   }
 * }
 */

// src/routes/coupons.ts
import { Hono } from 'hono';
import type { CloudflareBindings } from '../types';

const coupons = new Hono<{ Bindings: CloudflareBindings }>();

// クーポン検証（コード入力時にリアルタイムチェック）
coupons.post('/validate', async (c) => {
  const { DB } = c.env;
  const { code } = await c.req.json();
  
  // クーポン存在確認
  const coupon = await DB.prepare(`
    SELECT * FROM coupons 
    WHERE code = ? 
      AND is_active = 1
      AND (valid_until IS NULL OR valid_until > datetime('now'))
  `).bind(code).first();
  
  if (!coupon) {
    return c.json({ 
      success: false, 
      message: 'クーポンコードが無効です' 
    }, 400);
  }
  
  // 使用回数チェック
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    return c.json({ 
      success: false, 
      message: 'このクーポンは使用上限に達しています' 
    }, 400);
  }
  
  return c.json({
    success: true,
    coupon: {
      name: coupon.name,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value
    }
  });
});

// クーポン適用
coupons.post('/apply', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const { code, tenant_id } = await c.req.json();
  
  // オーナー確認
  const tenant = await DB.prepare(`
    SELECT * FROM tenants WHERE id = ? AND owner_user_id = ?
  `).bind(tenant_id, userId).first();
  
  if (!tenant) {
    return c.json({ 
      success: false, 
      message: 'テナントが見つかりません、またはあなたはオーナーではありません' 
    }, 403);
  }
  
  // 既にクーポンが適用されているか確認
  const existingUsage = await DB.prepare(`
    SELECT * FROM coupon_usage WHERE tenant_id = ? AND status = 'active'
  `).bind(tenant_id).first();
  
  if (existingUsage) {
    return c.json({ 
      success: false, 
      message: '既にクーポンが適用されています' 
    }, 400);
  }
  
  // クーポン検証
  const coupon = await DB.prepare(`
    SELECT * FROM coupons 
    WHERE code = ? 
      AND is_active = 1
      AND (valid_until IS NULL OR valid_until > datetime('now'))
  `).bind(code).first();
  
  if (!coupon) {
    return c.json({ 
      success: false, 
      message: 'クーポンコードが無効です' 
    }, 400);
  }
  
  // 使用回数チェック
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    return c.json({ 
      success: false, 
      message: 'このクーポンは使用上限に達しています' 
    }, 400);
  }
  
  // プラン適用可能性チェック
  if (coupon.applicable_plans) {
    const applicablePlans = JSON.parse(coupon.applicable_plans);
    const currentPlan = await DB.prepare(`
      SELECT p.name FROM platform_plans p
      JOIN tenants t ON t.platform_plan_id = p.id
      WHERE t.id = ?
    `).bind(tenant_id).first();
    
    if (!applicablePlans.includes(currentPlan.name)) {
      return c.json({ 
        success: false, 
        message: 'このクーポンは現在のプランには適用できません' 
      }, 400);
    }
  }
  
  // 有効期限計算
  let expiresAt = null;
  if (coupon.discount_type === 'free_months') {
    const now = new Date();
    now.setMonth(now.getMonth() + coupon.discount_value);
    expiresAt = now.toISOString();
  }
  
  // トランザクション開始
  try {
    // 1. coupon_usage に登録
    await DB.prepare(`
      INSERT INTO coupon_usage (coupon_id, tenant_id, user_id, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(coupon.id, tenant_id, userId, expiresAt).run();
    
    // 2. tenants テーブルを更新
    await DB.prepare(`
      UPDATE tenants 
      SET has_coupon = 1,
          coupon_discount_type = ?,
          coupon_expires_at = ?
      WHERE id = ?
    `).bind(coupon.discount_type, expiresAt, tenant_id).run();
    
    // 3. クーポンの使用回数を増やす
    await DB.prepare(`
      UPDATE coupons 
      SET used_count = used_count + 1
      WHERE id = ?
    `).bind(coupon.id).run();
    
    return c.json({
      success: true,
      message: 'クーポンを適用しました',
      coupon: {
        name: coupon.name,
        discount_type: coupon.discount_type,
        description: getDiscountDescription(coupon),
        expires_at: expiresAt
      }
    });
  } catch (error) {
    console.error('Coupon application error:', error);
    return c.json({ 
      success: false, 
      message: 'クーポンの適用に失敗しました' 
    }, 500);
  }
});

// クーポン削除（取り消し）
coupons.delete('/:tenant_id', async (c) => {
  const { DB } = c.env;
  const userId = c.get('userId');
  const tenant_id = c.req.param('tenant_id');
  
  // オーナー確認
  const tenant = await DB.prepare(`
    SELECT * FROM tenants WHERE id = ? AND owner_user_id = ?
  `).bind(tenant_id, userId).first();
  
  if (!tenant) {
    return c.json({ 
      success: false, 
      message: '権限がありません' 
    }, 403);
  }
  
  try {
    // 1. coupon_usage のステータスを更新
    await DB.prepare(`
      UPDATE coupon_usage 
      SET status = 'revoked'
      WHERE tenant_id = ? AND status = 'active'
    `).bind(tenant_id).run();
    
    // 2. tenants テーブルを更新
    await DB.prepare(`
      UPDATE tenants 
      SET has_coupon = 0,
          coupon_discount_type = NULL,
          coupon_expires_at = NULL
      WHERE id = ?
    `).bind(tenant_id).run();
    
    return c.json({
      success: true,
      message: 'クーポンを削除しました'
    });
  } catch (error) {
    console.error('Coupon removal error:', error);
    return c.json({ 
      success: false, 
      message: 'クーポンの削除に失敗しました' 
    }, 500);
  }
});

// プラットフォーム管理者用: クーポン一覧
coupons.get('/admin/list', async (c) => {
  const { DB } = c.env;
  // TODO: プラットフォーム管理者認証チェック
  
  const allCoupons = await DB.prepare(`
    SELECT 
      c.*,
      COUNT(cu.id) as usage_count
    FROM coupons c
    LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id AND cu.status = 'active'
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();
  
  return c.json({
    success: true,
    coupons: allCoupons.results
  });
});

// プラットフォーム管理者用: クーポン作成
coupons.post('/admin/create', async (c) => {
  const { DB } = c.env;
  // TODO: プラットフォーム管理者認証チェック
  
  const { code, name, description, discount_type, discount_value, max_uses, applicable_plans } = await c.req.json();
  
  const result = await DB.prepare(`
    INSERT INTO coupons (code, name, description, discount_type, discount_value, max_uses, applicable_plans, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    code, 
    name, 
    description, 
    discount_type, 
    discount_value, 
    max_uses, 
    applicable_plans ? JSON.stringify(applicable_plans) : null,
    'admin@valuearchitects.jp'  // TODO: 実際のログイン管理者メール
  ).run();
  
  return c.json({
    success: true,
    id: result.meta.last_row_id
  });
});

// ヘルパー関数
function getDiscountDescription(coupon: any): string {
  switch (coupon.discount_type) {
    case 'free_forever':
      return '永久無料';
    case 'free_months':
      return `${coupon.discount_value}ヶ月間無料`;
    case 'percent_off':
      return `${coupon.discount_value}% 割引`;
    case 'amount_off':
      return `¥${coupon.discount_value.toLocaleString()} 割引`;
    default:
      return '不明な割引';
  }
}

export { coupons }
export default coupons;

/**
 * ============================================
 * 請求時のクーポン適用ロジック
 * ============================================
 * 
 * Stripe Checkout時やサブスクリプション更新時に使用
 * 
 * async function calculatePrice(tenant_id: number): Promise<number> {
 *   const tenant = await DB.prepare(`
 *     SELECT t.*, p.price, p.name as plan_name
 *     FROM tenants t
 *     JOIN platform_plans p ON t.platform_plan_id = p.id
 *     WHERE t.id = ?
 *   `).bind(tenant_id).first();
 *   
 *   if (!tenant.has_coupon) {
 *     return tenant.price;
 *   }
 *   
 *   const usage = await DB.prepare(`
 *     SELECT cu.*, c.*
 *     FROM coupon_usage cu
 *     JOIN coupons c ON cu.coupon_id = c.id
 *     WHERE cu.tenant_id = ? AND cu.status = 'active'
 *   `).bind(tenant_id).first();
 *   
 *   if (!usage) {
 *     return tenant.price;
 *   }
 *   
 *   // 期限チェック
 *   if (usage.expires_at && new Date(usage.expires_at) < new Date()) {
 *     // 期限切れ: クーポンを無効化
 *     await DB.prepare(`UPDATE coupon_usage SET status = 'expired' WHERE id = ?`).bind(usage.id).run();
 *     await DB.prepare(`UPDATE tenants SET has_coupon = 0 WHERE id = ?`).bind(tenant_id).run();
 *     return tenant.price;
 *   }
 *   
 *   // 割引適用
 *   switch (usage.discount_type) {
 *     case 'free_forever':
 *     case 'free_months':
 *       return 0;
 *     case 'percent_off':
 *       return Math.round(tenant.price * (100 - usage.discount_value) / 100);
 *     case 'amount_off':
 *       return Math.max(0, tenant.price - usage.discount_value);
 *     default:
 *       return tenant.price;
 *   }
 * }
 */
