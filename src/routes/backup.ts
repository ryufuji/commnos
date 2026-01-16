// ============================================
// データバックアップ/リストアAPI
// ============================================

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const backup = new Hono<AppContext>()

// バックアップ対象テーブル一覧
const BACKUP_TABLES = [
  'users',
  'tenants',
  'tenant_memberships',
  'tenant_customization',
  'tenant_features',
  'tenant_navigation_config',
  'plans',
  'posts',
  'post_images',
  'comments',
  'post_likes',
  'comment_likes',
  'notifications',
  'member_notes',
  'chat_rooms',
  'chat_messages',
  'chat_read_receipts',
  'user_tags',
  'platform_plans',
  'platform_coupons',
  'survey_templates',
  'survey_questions',
  'survey_responses',
  'survey_answers',
  'payment_reminders',
  'birthday_emails',
  'point_rules',
  'point_transactions',
  'point_rewards',
  'point_reward_redemptions',
  'shop_legal_info',
  'products',
  'product_categories',
  'orders',
  'order_items',
  'events',
  'event_participants'
]

// ============================================
// データベース全体をエクスポート
// ============================================
backup.get('/export', authMiddleware, async (c) => {
  const { DB } = c.env
  const { tenantId, role } = c.get('auth')
  
  // 管理者チェック
  if (role !== 'owner' && role !== 'admin') {
    return c.json({ error: 'Permission denied' }, 403)
  }
  
  try {
    const backupData: Record<string, any[]> = {
      metadata: {
        tenant_id: tenantId,
        exported_at: new Date().toISOString(),
        version: '1.0.0'
      }
    }
    
    // 各テーブルのデータを取得
    for (const table of BACKUP_TABLES) {
      try {
        // テナントIDでフィルタリングできるテーブルかチェック
        const hasTenanColumn = await checkTableHasTenantId(DB, table)
        
        let query = `SELECT * FROM ${table}`
        let params: any[] = []
        
        if (hasTenanColumn) {
          query += ` WHERE tenant_id = ?`
          params = [tenantId]
        }
        
        const result = await DB.prepare(query).bind(...params).all()
        backupData[table] = result.results || []
      } catch (error) {
        console.error(`Error backing up table ${table}:`, error)
        // テーブルが存在しない場合はスキップ
        backupData[table] = []
      }
    }
    
    // JSONとして返す
    return c.json({
      success: true,
      backup: backupData
    })
  } catch (error) {
    console.error('Backup error:', error)
    return c.json({ 
      error: 'Backup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// ============================================
// バックアップからリストア
// ============================================
backup.post('/restore', authMiddleware, async (c) => {
  const { DB } = c.env
  const { tenantId, role } = c.get('auth')
  
  // 管理者チェック
  if (role !== 'owner' && role !== 'admin') {
    return c.json({ error: 'Permission denied' }, 403)
  }
  
  try {
    const body = await c.req.json()
    const backupData = body.backup
    
    if (!backupData || !backupData.metadata) {
      return c.json({ error: 'Invalid backup data' }, 400)
    }
    
    // メタデータの検証
    if (backupData.metadata.tenant_id !== tenantId) {
      return c.json({ 
        error: 'Tenant ID mismatch',
        message: 'このバックアップは別のテナントのものです'
      }, 400)
    }
    
    // トランザクション開始（D1ではBATCH APIを使用）
    const statements: D1PreparedStatement[] = []
    
    // 既存データを削除（逆順で削除して外部キー制約を回避）
    for (const table of [...BACKUP_TABLES].reverse()) {
      if (!backupData[table] || backupData[table].length === 0) continue
      
      const hasTenanColumn = await checkTableHasTenantId(DB, table)
      if (hasTenanColumn) {
        statements.push(DB.prepare(`DELETE FROM ${table} WHERE tenant_id = ?`).bind(tenantId))
      }
    }
    
    // バックアップデータを挿入
    for (const table of BACKUP_TABLES) {
      const rows = backupData[table]
      if (!rows || rows.length === 0) continue
      
      for (const row of rows) {
        const columns = Object.keys(row).filter(k => k !== 'id') // IDは自動採番
        const placeholders = columns.map(() => '?').join(', ')
        const values = columns.map(col => row[col])
        
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
        statements.push(DB.prepare(sql).bind(...values))
      }
    }
    
    // バッチ実行
    await DB.batch(statements)
    
    return c.json({
      success: true,
      message: 'バックアップから復元しました'
    })
  } catch (error) {
    console.error('Restore error:', error)
    return c.json({ 
      error: 'Restore failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// ============================================
// テーブルにtenant_idカラムがあるかチェック
// ============================================
async function checkTableHasTenantId(DB: D1Database, table: string): Promise<boolean> {
  try {
    const result = await DB.prepare(`PRAGMA table_info(${table})`).all()
    return result.results.some((col: any) => col.name === 'tenant_id')
  } catch (error) {
    return false
  }
}

export default backup
