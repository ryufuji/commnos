// デバッグ用ルート
import { Hono } from 'hono'
import type { AppContext } from '../types'

const debug = new Hono<AppContext>()

// データベース接続テスト
debug.get('/db-test', async (c) => {
  const { DB } = c.env
  
  try {
    // post_likes テーブルの構造を確認
    const tableInfo = await DB.prepare(
      'PRAGMA table_info(post_likes)'
    ).all()
    
    // データベース名を確認（メタ情報）
    const tables = await DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all()
    
    return c.json({
      success: true,
      hasDB: !!DB,
      post_likes_columns: tableInfo.results,
      all_tables: tables.results
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hasDB: !!DB
    }, 500)
  }
})

export default debug
