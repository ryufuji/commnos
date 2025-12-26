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
 * JWT トークン生成
 */
export async function generateToken(
  userId: number,
  tenantId: number,
  role: 'owner' | 'admin' | 'member',
  secret: string
): Promise<string> {
  const encoder = new TextEncoder()
  const secretKey = encoder.encode(secret)

  const token = await new SignJWT({
    userId,
    tenantId,
    role
  })
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
): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  try {
    const encoder = new TextEncoder()
    const secretKey = encoder.encode(secret)

    const { payload } = await jwtVerify(token, secretKey)

    // カスタムペイロードの型変換
    const jwtPayload: JWTPayload = {
      userId: payload.userId as number,
      tenantId: payload.tenantId as number,
      role: payload.role as 'owner' | 'admin' | 'member',
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
