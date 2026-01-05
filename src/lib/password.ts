// ============================================
// パスワードハッシュヘルパー（Cloudflare Workers対応）
// ============================================

const PBKDF2_ITERATIONS = 100000

/**
 * Web Crypto APIを使用してパスワードをハッシュ化
 * Cloudflare Workers環境ではbcryptjsではなくPBKDF2を使用
 * フォーマット: iterations:saltHex:hashHex
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  )
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )
  
  const hashArray = Array.from(new Uint8Array(derivedBits))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  
  // フォーマット: iterations:saltHex:hashHex
  return `${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`
}

/**
 * パスワードを検証
 * 新形式: iterations:saltHex:hashHex
 * 旧形式: saltHex:hashHex（互換性のため対応）
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(':')
    
    let iterations: number
    let saltHex: string
    let hashHex: string
    
    if (parts.length === 3) {
      // 新形式: iterations:saltHex:hashHex
      iterations = parseInt(parts[0])
      saltHex = parts[1]
      hashHex = parts[2]
    } else if (parts.length === 2) {
      // 旧形式: saltHex:hashHex（デフォルトiterations）
      iterations = PBKDF2_ITERATIONS
      saltHex = parts[0]
      hashHex = parts[1]
    } else {
      console.error('[Password Verify] Invalid hash format')
      return false
    }
    
    if (!saltHex || !hashHex) {
      console.error('[Password Verify] Missing hash components')
      return false
    }
    
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      data,
      'PBKDF2',
      false,
      ['deriveBits']
    )
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    )
    
    const hashArray = Array.from(new Uint8Array(derivedBits))
    const computedHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    const isValid = computedHashHex === hashHex
    console.log('[Password Verify] Format:', parts.length === 3 ? 'new' : 'legacy', 'Result:', isValid)
    return isValid
  } catch (error) {
    console.error('[Password Verify Error]', error)
    return false
  }
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
