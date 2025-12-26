// ============================================
// データベースヘルパー（Row-Level Security）
// ============================================

/**
 * Row-Level Security を強制するクエリヘルパー
 * 
 * 設計原則:
 * - すべてのクエリに tenant_id を自動付与
 * - 直接クエリは禁止（このヘルパー経由必須）
 * - エラーハンドリングを統一
 */

export interface QueryResult<T = unknown> {
  success: boolean
  results?: T[]
  meta?: {
    duration: number
    rows_read: number
    rows_written: number
  }
  error?: string
}

/**
 * SELECT クエリ（tenant_id 自動フィルタ）
 */
export async function safeQuery<T = unknown>(
  db: D1Database,
  sql: string,
  params: unknown[],
  tenantId: number
): Promise<QueryResult<T>> {
  try {
    // tenant_id を自動追加（WHERE 句がない場合）
    let finalSql = sql
    let finalParams = params

    if (!sql.toLowerCase().includes('where')) {
      // WHERE 句がない場合、追加
      finalSql = `${sql} WHERE tenant_id = ?`
      finalParams = [...params, tenantId]
    } else {
      // WHERE 句がある場合、AND tenant_id を追加
      finalSql = sql.replace(/WHERE/i, 'WHERE tenant_id = ? AND')
      finalParams = [tenantId, ...params]
    }

    const result = await db.prepare(finalSql).bind(...finalParams).all()

    return {
      success: result.success,
      results: result.results as T[],
      meta: result.meta
    }
  } catch (error) {
    console.error('[DB Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error'
    }
  }
}

/**
 * INSERT/UPDATE/DELETE クエリ（tenant_id 検証付き）
 */
export async function safeMutation(
  db: D1Database,
  sql: string,
  params: unknown[],
  tenantId: number
): Promise<QueryResult> {
  try {
    // INSERT の場合、tenant_id を自動追加
    if (sql.toLowerCase().startsWith('insert')) {
      // カラム名リストに tenant_id を追加
      const match = sql.match(/INSERT INTO \w+ \((.*?)\) VALUES/i)
      if (match && !match[1].includes('tenant_id')) {
        const columns = match[1]
        const placeholders = params.map(() => '?').join(', ')
        const tableName = sql.match(/INSERT INTO (\w+)/i)?.[1]
        
        const finalSql = `INSERT INTO ${tableName} (tenant_id, ${columns}) VALUES (?, ${placeholders})`
        const finalParams = [tenantId, ...params]
        
        const result = await db.prepare(finalSql).bind(...finalParams).run()
        
        return {
          success: result.success,
          meta: result.meta
        }
      }
    }

    // UPDATE/DELETE の場合、WHERE tenant_id を強制
    if (sql.toLowerCase().startsWith('update') || sql.toLowerCase().startsWith('delete')) {
      if (!sql.toLowerCase().includes('where tenant_id')) {
        throw new Error('UPDATE/DELETE must include WHERE tenant_id condition')
      }
    }

    const result = await db.prepare(sql).bind(...params).run()

    return {
      success: result.success,
      meta: result.meta
    }
  } catch (error) {
    console.error('[DB Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error'
    }
  }
}

/**
 * グローバルクエリ（tenant_id フィルタなし）
 * 
 * 注意: 以下の場合のみ使用
 * - users テーブルへのクエリ
 * - tenants テーブルへのクエリ
 * - 管理者機能
 */
export async function globalQuery<T = unknown>(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  try {
    const result = await db.prepare(sql).bind(...params).all()

    return {
      success: result.success,
      results: result.results as T[],
      meta: result.meta
    }
  } catch (error) {
    console.error('[DB Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error'
    }
  }
}

/**
 * トランザクション実行
 */
export async function transaction(
  db: D1Database,
  queries: Array<{ sql: string; params: unknown[] }>
): Promise<QueryResult> {
  try {
    // D1 は現在トランザクションをサポートしていないため、
    // 順次実行で代用（Phase 2 でトランザクション対応を検討）
    for (const query of queries) {
      const result = await db.prepare(query.sql).bind(...query.params).run()
      if (!result.success) {
        throw new Error('Transaction failed')
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Transaction Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction error'
    }
  }
}

/**
 * テナント存在チェック
 */
export async function checkTenantExists(
  db: D1Database,
  tenantId: number
): Promise<boolean> {
  const result = await globalQuery<{ id: number }>(
    db,
    'SELECT id FROM tenants WHERE id = ? AND status = ?',
    [tenantId, 'active']
  )

  return result.success && result.results && result.results.length > 0
}

/**
 * ユーザーのテナント権限チェック
 */
export async function checkUserPermission(
  db: D1Database,
  userId: number,
  tenantId: number,
  requiredRole?: 'owner' | 'admin' | 'member'
): Promise<{ hasPermission: boolean; role?: string }> {
  const result = await globalQuery<{ role: string; status: string }>(
    db,
    'SELECT role, status FROM tenant_memberships WHERE user_id = ? AND tenant_id = ?',
    [userId, tenantId]
  )

  if (!result.success || !result.results || result.results.length === 0) {
    return { hasPermission: false }
  }

  const membership = result.results[0]

  // status が active でない場合は権限なし
  if (membership.status !== 'active') {
    return { hasPermission: false, role: membership.role }
  }

  // requiredRole が指定されている場合、役割をチェック
  if (requiredRole) {
    const roleHierarchy = { owner: 3, admin: 2, member: 1 }
    const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0

    return {
      hasPermission: userRoleLevel >= requiredRoleLevel,
      role: membership.role
    }
  }

  return { hasPermission: true, role: membership.role }
}
