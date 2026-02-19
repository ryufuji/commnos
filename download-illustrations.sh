#!/bin/bash

# Commons プラットフォーム用イラストダウンロードスクリプト

echo "🎨 Commonsイラストのダウンロードを開始します..."

# 出力ディレクトリの作成
mkdir -p public/static/illustrations

# 1. ヒーローセクション（トップページ）
echo "📥 1/8: ヒーローセクションイラストをダウンロード中..."
curl -L "https://www.genspark.ai/api/files/s/DLVl6pdn?cache_control=3600" \
  -o public/static/illustrations/hero-community.png

# 2. 会員機能アイコン
echo "📥 2/8: 会員機能アイコンをダウンロード中..."
curl -L "https://www.genspark.ai/api/files/s/lFgYhVgo?cache_control=3600" \
  -o public/static/illustrations/icon-membership.png

# 3. 投稿機能アイコン
echo "📥 3/8: 投稿機能アイコンをダウンロード中..."
curl -L "https://www.genspark.ai/api/files/s/mxczDzNF?cache_control=3600" \
  -o public/static/illustrations/icon-posts.png

# 4. イベント機能アイコン
echo "📥 4/8: イベント機能アイコンをダウンロード中..."
curl -L "https://www.genspark.ai/api/files/s/5vzZu0Tv?cache_control=3600" \
  -o public/static/illustrations/icon-events.png

# 5. ポイントシステムアイコン
echo "📥 5/8: ポイントシステムアイコンをダウンロード中..."
curl -L "https://www.genspark.ai/api/files/s/V5Mb3SSY?cache_control=3600" \
  -o public/static/illustrations/icon-points.png

# 6. ショップ機能アイコン
echo "📥 6/8: ショップ機能アイコンをダウンロード中..."
curl -L "https://www.genspark.ai/api/files/s/6zDEI0A9?cache_control=3600" \
  -o public/static/illustrations/icon-shop.png

# 7. ウェルカムイラスト（ウォークスルー用）
echo "📥 7/8: ウェルカムイラストをダウンロード中..."
curl -L "https://www.genspark.ai/api/files/s/wsFllQkd?cache_control=3600" \
  -o public/static/illustrations/walkthrough-welcome.png

# 8. 分析・統計アイコン
echo "📥 8/8: 分析・統計アイコンをダウンロード中..."
curl -L "https://www.genspark.ai/api/files/s/labH9LxR?cache_control=3600" \
  -o public/static/illustrations/icon-analytics.png

echo "✅ すべてのイラストのダウンロードが完了しました！"
echo "📁 保存先: public/static/illustrations/"
echo ""
echo "次のステップ:"
echo "  1. ls -lh public/static/illustrations/ でファイルを確認"
echo "  2. npm run build でビルド"
echo "  3. npx wrangler pages deploy dist --project-name commons-webapp でデプロイ"
