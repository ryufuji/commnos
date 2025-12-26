// PM2 設定ファイル（CommonJS版）
// Phase 1: 開発環境用
module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=webapp-production --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false, // PM2のファイル監視を無効化（wranglerが自動リロード）
      instances: 1, // 開発モードは1インスタンス
      exec_mode: 'fork'
    }
  ]
}
