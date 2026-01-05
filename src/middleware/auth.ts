// ============================================
// 認証ミドルウェア
// ============================================

import { Context, Next } from 'hono'
import type { AppContext } from '../types'
import { extractToken, verifyToken } from '../lib/jwt'
import { checkUserPermission } from '../lib/db'

/**
 * JWT 認証ミドルウェア
 * 
 * Authorization ヘッダーから JWT を取得して検証
 * 検証成功時、c.set() で userId, tenantId, role を設定
 */
export async function authMiddleware(c: Context<AppContext>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization')
    const token = extractToken(authHeader)

    if (!token) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const secret = c.env.JWT_SECRET
    
    if (!secret) {
      console.error('[Auth Error] JWT_SECRET is not configured')
      return c.json({ success: false, error: 'Server configuration error' }, 500)
    }
    
    const result = await verifyToken(token, secret)

    if (!result.valid || !result.payload) {
      return c.json({ success: false, error: result.error || 'Invalid token' }, 401)
    }

    // Context に認証情報を設定
    c.set('userId', result.payload.userId)
    c.set('tenantId', result.payload.tenantId)
    c.set('role', result.payload.role)

    await next()
  } catch (error) {
    console.error('[Auth Middleware Error]', error)
    return c.json({ 
      success: false, 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}

/**
 * 役割チェックミドルウェア
 * 
 * 特定の役割以上のユーザーのみアクセス可能
 * 
 * 使用例:
 * app.post('/api/posts', authMiddleware, requireRole('admin'), createPost)
 */
export function requireRole(requiredRole: 'owner' | 'admin' | 'member') {
  return async (c: Context<AppContext>, next: Next) => {
    const role = c.get('role')
    const roleHierarchy = { owner: 3, admin: 2, member: 1 }

    const userRoleLevel = roleHierarchy[role] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0

    if (userRoleLevel < requiredRoleLevel) {
      return c.json({ success: false, error: 'Insufficient permissions' }, 403)
    }

    await next()
  }
}

/**
 * 役割リストチェックミドルウェア
 * 
 * 指定された役割のいずれかに該当するユーザーのみアクセス可能
 * 
 * 使用例:
 * app.post('/api/posts', authMiddleware, roleMiddleware(['owner', 'admin']), createPost)
 */
export function roleMiddleware(allowedRoles: ('owner' | 'admin' | 'member')[]) {
  return async (c: Context<AppContext>, next: Next) => {
    const role = c.get('role')

    if (!allowedRoles.includes(role)) {
      return c.json({ success: false, error: 'Insufficient permissions' }, 403)
    }

    await next()
  }
}

/**
 * テナント存在チェックミドルウェア
 * 
 * サブドメインから tenant_id を取得し、
 * テナントが存在するかチェック
 */
export async function tenantMiddleware(c: Context<AppContext>, next: Next) {
  const host = c.req.header('Host')

  if (!host) {
    return c.json({ success: false, error: 'Invalid host' }, 400)
  }

  // サブドメインを抽出
  // 例: golf-club.commons.com -> golf-club
  const platformDomain = c.env.PLATFORM_DOMAIN // commons.com
  const subdomain = host.replace(`.${platformDomain}`, '').replace(`:${new URL(c.req.url).port}`, '')

  // サブドメインからテナントを取得
  const db = c.env.DB
  const result = await db
    .prepare('SELECT id, status FROM tenants WHERE subdomain = ?')
    .bind(subdomain)
    .first<{ id: number; status: string }>()

  if (!result) {
    return c.json({ success: false, error: 'Tenant not found' }, 404)
  }

  if (result.status !== 'active') {
    return c.json({ success: false, error: 'Tenant is suspended' }, 403)
  }

  // Context にテナント ID を設定
  c.set('tenantId', result.id)

  await next()
}

/**
 * 会員ステータスチェックミドルウェア
 * 
 * ユーザーが active な会員であることを確認
 */
export async function activeMemberMiddleware(c: Context<AppContext>, next: Next) {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')
  const db = c.env.DB

  const permission = await checkUserPermission(db, userId, tenantId)

  if (!permission.hasPermission) {
    return c.json({ success: false, error: 'Not an active member' }, 403)
  }

  await next()
}
