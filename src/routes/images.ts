import { Hono } from 'hono'

type Bindings = {
  R2: R2Bucket
}

const images = new Hono<{ Bindings: Bindings }>()

// R2から画像を取得
images.get('/:path{.+}', async (c) => {
  try {
    const path = c.req.param('path')
    console.log('[Images API] Fetching image:', path)
    
    // R2からオブジェクトを取得
    const object = await c.env.R2.get(path)

    if (!object) {
      console.log('[Images API] Image not found in R2:', path)
      return c.notFound()
    }

    console.log('[Images API] Image found, content-type:', object.httpMetadata?.contentType)
    
    // 画像データとメタデータを返す
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000', // 1年間キャッシュ
        'ETag': object.etag
      }
    })

  } catch (error: any) {
    console.error('[Images API] Image fetch error:', error)
    return c.json({ 
      success: false, 
      error: error.message || 'Image not found' 
    }, 500)
  }
})

export default images
