// Cloudflare Workers Cron Trigger Entry Point
// This worker runs scheduled tasks, specifically publishing scheduled posts

type Bindings = {
  DB: D1Database
}

type CronEvent = {
  scheduledTime: number
  cron: string
  type: string
  noRetry?: boolean
}

/**
 * Cron Trigger: 予約投稿を自動公開
 * 毎分実行され、scheduled_atが現在時刻を過ぎた投稿を公開する
 */
async function handleScheduledPosts(event: CronEvent, env: Bindings) {
  console.log('[Scheduled Posts Cron] Starting scheduled posts check...')
  console.log('[Scheduled Posts Cron] Cron expression:', event.cron)
  console.log('[Scheduled Posts Cron] Scheduled time:', new Date(event.scheduledTime).toISOString())
  
  const db = env.DB
  const now = new Date().toISOString()
  
  try {
    // scheduled_atが現在時刻を過ぎている投稿を取得
    // status='scheduled' かつ scheduled_at <= 現在時刻
    const postsToPublish = await db.prepare(`
      SELECT id, title, scheduled_at, tenant_id
      FROM posts
      WHERE status = 'scheduled' 
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= ?
      ORDER BY scheduled_at ASC
      LIMIT 100
    `).bind(now).all()
    
    const posts = postsToPublish.results || []
    
    if (posts.length === 0) {
      console.log('[Scheduled Posts Cron] No posts to publish')
      return
    }
    
    console.log(`[Scheduled Posts Cron] Found ${posts.length} post(s) to publish`)
    
    // 各投稿を公開状態に更新
    let publishedCount = 0
    let failedCount = 0
    
    for (const post of posts) {
      try {
        console.log(`[Scheduled Posts Cron] Publishing post ID: ${post.id}, scheduled at: ${post.scheduled_at}`)
        
        // ステータスをpublishedに更新し、published_atを設定
        const result = await db.prepare(`
          UPDATE posts
          SET status = 'published',
              published_at = datetime('now'),
              updated_at = datetime('now')
          WHERE id = ? AND status = 'scheduled'
        `).bind(post.id).run()
        
        if (result.success) {
          publishedCount++
          console.log(`[Scheduled Posts Cron] ✓ Published post ID: ${post.id} - "${post.title}"`)
        } else {
          failedCount++
          console.error(`[Scheduled Posts Cron] ✗ Failed to publish post ID: ${post.id}`)
        }
      } catch (postError) {
        failedCount++
        console.error(`[Scheduled Posts Cron] ✗ Error publishing post ID: ${post.id}`, postError)
      }
    }
    
    console.log(`[Scheduled Posts Cron] Completed: ${publishedCount} published, ${failedCount} failed`)
    
  } catch (error) {
    console.error('[Scheduled Posts Cron] Fatal error:', error)
  }
}

export default {
  async scheduled(event: CronEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduledPosts(event, env))
  },
}
