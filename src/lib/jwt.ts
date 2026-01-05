// ============================================
// JWT 認証ヘルパー (jose ライブラリ使用)
// ============================================

import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from '../types'

/**
 * JWT 設定
 */
const JWT_EXPIRES_IN = '7d' // 7日間

/**
 * JWT トークン生成（オーバーロード対応）
 * 
 * 通常ユーザー用:
 *   generateToken(userId, tenantId, role, secret)
 * 
 * プラットフォーム管理者用:
 *   generateToken(payload, secret)
 */
export async function generateToken(
  userIdOrPayload: number | {
    userId: number
    tenantId: number | null
    role: string
    email?: string
    isPlatformAdmin?: boolean
  },
  tenantIdOrSecret: number | string,
  roleOrUndefined?: 'owner' | 'admin' | 'member' | 'platform_admin',
  secretOrUndefined?: string
): Promise<string> {
  let payload: {
    userId: number
    tenantId: number | null
    role: string
    email?: string
    isPlatformAdmin?: boolean
  }
  let secret: string

  // オーバーロード判定
  if (typeof userIdOrPayload === 'object') {
    // プラットフォーム管理者用: generateToken(payload, secret)
    payload = userIdOrPayload
    secret = tenantIdOrSecret as string
  } else {
    // 通常ユーザー用: generateToken(userId, tenantId, role, secret)
    payload = {
      userId: userIdOrPayload,
      tenantId: tenantIdOrSecret as number,
      role: roleOrUndefined!,
    }
    secret = secretOrUndefined!
  }

  const encoder = new TextEncoder()
  const secretKey = encoder.encode(secret)

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secretKey)

  return token
}

/**
 * JWT トークン検証
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<{ valid: boolean; payload?: JWTPayload & { isPlatformAdmin?: boolean; email?: string }; error?: string }> {
  try {
    const encoder = new TextEncoder()
    const secretKey = encoder.encode(secret)

    const { payload } = await jwtVerify(token, secretKey)

    // カスタムペイロードの型変換（プラットフォーム管理者フィールドを含む）
    const jwtPayload: JWTPayload & { isPlatformAdmin?: boolean; email?: string } = {
      userId: payload.userId as number,
      tenantId: payload.tenantId as number | null,
      role: payload.role as 'owner' | 'admin' | 'member' | 'platform_admin',
      isPlatformAdmin: payload.isPlatformAdmin as boolean | undefined,
      email: payload.email as string | undefined,
      iat: payload.iat as number,
      exp: payload.exp as number
    }

    return { valid: true, payload: jwtPayload }
  } catch (error) {
    console.error('[JWT Error]', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token verification failed'
    }
  }
}

/**
 * Authorization ヘッダーから JWT を抽出
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}
