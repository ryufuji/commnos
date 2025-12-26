// ============================================
// パスワードハッシュヘルパー
// ============================================

import bcrypt from 'bcryptjs'

/**
 * bcrypt 設定
 */
const SALT_ROUNDS = 10

/**
 * パスワードをハッシュ化
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * パスワードを検証
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * パスワード強度チェック
 * 
 * 要件:
 * - 8文字以上
 * - （Phase 1 では最小限の検証のみ）
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('パスワードは8文字以上である必要があります')
  }

  // Phase 2 で追加予定:
  // - 大文字・小文字・数字・記号の組み合わせチェック
  // - よくあるパスワードのブラックリストチェック

  return {
    valid: errors.length === 0,
    errors
  }
}
