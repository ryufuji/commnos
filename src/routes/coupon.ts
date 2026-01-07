import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const coupon = new Hono<{ Bindings: Bindings }>();

// ============================================
// クーポン適用API（テナントオーナー向け）
// ============================================

coupon.post('/redeem', async (c) => {
  try {
    const { DB } = c.env;
    const userId = c.get('userId');
    const { code } = await c.req.json();

    if (!code) {
      return c.json({ success: false, message: 'クーポンコードを入力してください' }, 400);
    }

    // オーナーのテナントを取得
    const tenant = await DB.prepare(`
      SELECT * FROM tenants WHERE owner_user_id = ?
    `).bind(userId).first();

    if (!tenant) {
      return c.json({ success: false, message: 'テナントが見つかりません' }, 404);
    }

    // クーポンを検証
    const coupon = await DB.prepare(`
      SELECT * FROM coupons 
      WHERE code = ? AND is_active = 1
    `).bind(code.toUpperCase()).first();

    if (!coupon) {
      return c.json({ success: false, message: '無効なクーポンコードです' }, 404);
    }

    // 有効期限チェック
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return c.json({ success: false, message: 'このクーポンはまだ有効になっていません' }, 400);
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return c.json({ success: false, message: 'このクーポンは有効期限が切れています' }, 400);
    }

    // 使用回数チェック
    if (coupon.max_redemptions !== -1 && coupon.redemptions_count >= coupon.max_redemptions) {
      return c.json({ success: false, message: 'このクーポンは使用上限に達しています' }, 400);
    }

    // 既に使用済みかチェック
    const existingRedemption = await DB.prepare(`
      SELECT * FROM tenant_coupon_redemptions 
      WHERE tenant_id = ? AND coupon_id = ?
    `).bind(tenant.id, coupon.id).first();

    if (existingRedemption) {
      return c.json({ success: false, message: 'このクーポンは既に使用済みです' }, 400);
    }

    // クーポンを適用
    const expiresAt = coupon.discount_type === 'free_months' 
      ? new Date(Date.now() + coupon.discount_value * 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await DB.prepare(`
      INSERT INTO tenant_coupon_redemptions (tenant_id, coupon_id, expires_at, is_active)
      VALUES (?, ?, ?, 1)
    `).bind(tenant.id, coupon.id, expiresAt).run();

    // クーポン使用回数を更新
    await DB.prepare(`
      UPDATE coupons SET redemptions_count = redemptions_count + 1 WHERE id = ?
    `).bind(coupon.id).run();

    // テナントのクーポンフラグを更新
    await DB.prepare(`
      UPDATE tenants SET is_coupon_active = 1 WHERE id = ?
    `).bind(tenant.id).run();

    console.log(`[Coupon] Tenant ${tenant.id} redeemed coupon ${coupon.code}`);

    return c.json({
      success: true,
      message: 'クーポンを適用しました！',
      coupon: {
        name: coupon.name,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        expires_at: expiresAt
      }
    });

  } catch (error) {
    console.error('[Coupon Redeem Error]', error);
    return c.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'クーポンの適用に失敗しました' 
    }, 500);
  }
});

// ============================================
// テナントの有効なクーポン取得API
// ============================================

coupon.get('/active', async (c) => {
  try {
    const { DB } = c.env;
    const userId = c.get('userId');

    const tenant = await DB.prepare(`
      SELECT * FROM tenants WHERE owner_user_id = ?
    `).bind(userId).first();

    if (!tenant) {
      return c.json({ success: false, message: 'テナントが見つかりません' }, 404);
    }

    // 有効なクーポンを取得
    const activeCoupons = await DB.prepare(`
      SELECT 
        tcr.*,
        c.code,
        c.name,
        c.description,
        c.discount_type,
        c.discount_value
      FROM tenant_coupon_redemptions tcr
      JOIN coupons c ON tcr.coupon_id = c.id
      WHERE tcr.tenant_id = ? 
        AND tcr.is_active = 1
        AND (tcr.expires_at IS NULL OR tcr.expires_at > datetime('now'))
      ORDER BY tcr.redeemed_at DESC
    `).bind(tenant.id).all();

    return c.json({
      success: true,
      coupons: activeCoupons.results,
      has_active_coupon: activeCoupons.results.length > 0
    });

  } catch (error) {
    console.error('[Get Active Coupons Error]', error);
    return c.json({ 
      success: false, 
      message: 'クーポン情報の取得に失敗しました' 
    }, 500);
  }
});

// ============================================
// プラットフォーム管理者向けクーポン管理API
// ============================================

// 全クーポン一覧取得
coupon.get('/admin/list', async (c) => {
  try {
    const { DB } = c.env;
    // TODO: プラットフォーム管理者認証チェック

    const coupons = await DB.prepare(`
      SELECT 
        c.*,
        COUNT(tcr.id) as total_redemptions
      FROM coupons c
      LEFT JOIN tenant_coupon_redemptions tcr ON c.id = tcr.coupon_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    return c.json({ success: true, coupons: coupons.results });

  } catch (error) {
    console.error('[Admin List Coupons Error]', error);
    return c.json({ success: false, message: 'クーポン一覧の取得に失敗しました' }, 500);
  }
});

// 新規クーポン作成
coupon.post('/admin/create', async (c) => {
  try {
    const { DB } = c.env;
    // TODO: プラットフォーム管理者認証チェック

    const { 
      code, 
      name, 
      description, 
      discount_type, 
      discount_value, 
      max_redemptions, 
      valid_until 
    } = await c.req.json();

    if (!code || !name || !discount_type) {
      return c.json({ 
        success: false, 
        message: 'コード、名前、割引タイプは必須です' 
      }, 400);
    }

    const result = await DB.prepare(`
      INSERT INTO coupons (
        code, name, description, discount_type, discount_value, 
        max_redemptions, valid_until, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      code.toUpperCase(), 
      name, 
      description, 
      discount_type, 
      discount_value || null, 
      max_redemptions || -1, 
      valid_until || null
    ).run();

    return c.json({ 
      success: true, 
      message: 'クーポンを作成しました',
      id: result.meta.last_row_id 
    });

  } catch (error) {
    console.error('[Admin Create Coupon Error]', error);
    return c.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'クーポンの作成に失敗しました' 
    }, 500);
  }
});

// クーポンの有効化/無効化
coupon.patch('/admin/:id/toggle', async (c) => {
  try {
    const { DB } = c.env;
    const couponId = c.req.param('id');
    // TODO: プラットフォーム管理者認証チェック

    const coupon = await DB.prepare(`
      SELECT * FROM coupons WHERE id = ?
    `).bind(couponId).first();

    if (!coupon) {
      return c.json({ success: false, message: 'クーポンが見つかりません' }, 404);
    }

    const newStatus = coupon.is_active === 1 ? 0 : 1;

    await DB.prepare(`
      UPDATE coupons SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(newStatus, couponId).run();

    return c.json({ 
      success: true, 
      message: newStatus === 1 ? 'クーポンを有効にしました' : 'クーポンを無効にしました',
      is_active: newStatus 
    });

  } catch (error) {
    console.error('[Admin Toggle Coupon Error]', error);
    return c.json({ success: false, message: 'クーポンの更新に失敗しました' }, 500);
  }
});

export { coupon };
