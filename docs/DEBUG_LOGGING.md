# デバッグログシステム

## 📊 概要

Commons Platform のフロントエンドに包括的なデバッグログシステムを追加しました。ブラウザのコンソールで詳細なアプリケーションの動作を追跡できます。

## 🎯 実装内容

### 1. デバッグログ関数

```javascript
const DEBUG = true; // デバッグモードを有効化

function debugLog(category, message, data = null) {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const style = 'color: #00BCD4; font-weight: bold;';
  
  console.group(`%c[${category}] ${timestamp}`, style);
  console.log(message);
  if (data !== null) {
    console.log('Data:', data);
  }
  console.trace('Stack trace:');
  console.groupEnd();
}
```

### 2. ログカテゴリ

| カテゴリ | 説明 |
|---------|------|
| `INIT` | アプリケーション初期化 |
| `API_REQUEST` | API リクエスト開始 |
| `API_RESPONSE` | API レスポンス受信 |
| `API_ERROR` | API エラー |
| `AUTH` | 認証関連（ログイン、登録、ログアウト） |
| `TOAST` | トースト通知 |
| `FORM` | フォーム送信 |
| `UI` | UI インタラクション（ボタン、リンククリック） |
| `STORAGE` | LocalStorage 操作 |
| `FETCH` | Native Fetch API |
| `ERROR` | グローバルエラー |
| `PAGE` | ページライフサイクル |
| `DEBUG` | デバッグシステム自体 |

### 3. トレース機能

#### アプリケーション初期化
```javascript
debugLog('INIT', 'Application initialized', {
  token: AppState.token ? 'Present' : 'None',
  user: AppState.user,
  tenant: AppState.tenant,
  membership: AppState.membership,
  url: window.location.href,
  userAgent: navigator.userAgent
});
```

#### API リクエスト
- リクエスト開始時のURL、メソッド、トークンの有無
- レスポンス受信時のステータス、ヘッダー
- データのパース結果
- エラー発生時の詳細

#### 認証フロー
- 登録開始・成功・失敗
- ログイン開始・成功・失敗・リダイレクト先
- ログアウト処理

#### DOM 操作
- フォーム送信時のフォームID、アクション、メソッド、データ
- ボタン/リンククリック時の要素情報
- LocalStorage の set/remove 操作

#### グローバルエラーハンドラ
- 未処理のエラー
- Promise のリジェクション

#### ページライフサイクル
- DOMContentLoaded イベント
- load イベント（パフォーマンス情報含む）
- beforeunload イベント

### 4. Fetch API のインターセプト

```javascript
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const options = args[1] || {};
  
  debugLog('FETCH', 'Native fetch called', {
    url,
    method: options.method || 'GET',
    headers: options.headers
  });
  
  return originalFetch.apply(this, args).then(response => {
    debugLog('FETCH', 'Native fetch response', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    return response;
  });
};
```

## 🔍 使用方法

### 1. コンソールを開く

- **Chrome/Edge**: `F12` または `Ctrl+Shift+I` (Win) / `Cmd+Option+I` (Mac)
- **Firefox**: `F12` または `Ctrl+Shift+K` (Win) / `Cmd+Option+K` (Mac)
- **Safari**: `Cmd+Option+C` (Mac)

### 2. ログの確認

ブラウザのコンソールに以下の形式でログが表示されます：

```
[INIT] 2026-01-09T12:34:56.789Z
  Application initialized
  Data: {
    token: "Present",
    user: { id: 1, email: "user@example.com", ... },
    url: "https://commons-webapp.pages.dev/",
    ...
  }
  Stack trace:
    at debugLog (app.js:15)
    at app.js:42
    ...
```

### 3. フィルタリング

コンソールの検索機能で特定のカテゴリをフィルタ：
- `[AUTH]` - 認証関連のみ
- `[API_REQUEST]` - API リクエストのみ
- `[ERROR]` - エラーのみ

### 4. デバッグモードのON/OFF

`public/static/app.js` の先頭：
```javascript
const DEBUG = true; // false にするとログを無効化
```

## 📋 デバッグシナリオ例

### シナリオ1: ログインが失敗する

コンソールで以下を確認：
1. `[AUTH] Login started` - ログイン試行の開始
2. `[API_REQUEST]` - `/api/auth/login` へのリクエスト
3. `[API_RESPONSE]` - レスポンスステータス（400, 401など）
4. `[API_ERROR]` - エラーメッセージ
5. `[AUTH] Login failed` - ログイン失敗

### シナリオ2: ページが正しく読み込まれない

コンソールで以下を確認：
1. `[INIT]` - アプリケーション初期化の状態
2. `[PAGE] DOM Content Loaded` - DOM 読み込み完了
3. `[PAGE] Page Fully Loaded` - ページ読み込み完了とパフォーマンス情報
4. `[ERROR]` - 読み込み中のエラー

### シナリオ3: フォーム送信が動作しない

コンソールで以下を確認：
1. `[UI] Button/Link clicked` - ボタンクリック
2. `[FORM] Form submission` - フォームデータ
3. `[API_REQUEST]` - API リクエスト
4. `[API_RESPONSE]` - レスポンス

## 🎨 ログの見た目

- カテゴリ名は **シアンブルー** (#00BCD4) で強調表示
- タイムスタンプは ISO 8601 形式
- データオブジェクトは展開可能
- スタックトレースで呼び出し元を追跡

## ⚠️ 注意事項

### セキュリティ

- **本番環境では `DEBUG = false` に設定することを推奨**
- パスワードなどの機密情報はログに出力されない設計
- トークンは存在の有無のみログ出力

### パフォーマンス

- デバッグモードはパフォーマンスに若干影響
- 本番環境では無効化推奨
- スタックトレースの取得にオーバーヘッド

### ブラウザ互換性

- モダンブラウザ（Chrome, Firefox, Safari, Edge）で動作確認済み
- `console.group` をサポートしないブラウザでは表示が異なる可能性

## 🔧 カスタマイズ

### カテゴリの追加

```javascript
debugLog('CUSTOM_CATEGORY', 'Custom message', { 
  customData: 'value' 
});
```

### ログレベルの追加

```javascript
function debugLog(category, message, data = null, level = 'info') {
  if (!DEBUG) return;
  
  const colors = {
    info: '#00BCD4',
    warn: '#FDB714',
    error: '#EF4444'
  };
  
  const style = `color: ${colors[level]}; font-weight: bold;`;
  // ...
}
```

## 📊 デプロイ情報

- **実装日**: 2026-01-09
- **ファイル**: `public/static/app.js`
- **追加行数**: 約 150 行
- **本番環境**: https://commons-webapp.pages.dev
- **最新デプロイ**: https://dd68bc68.commons-webapp.pages.dev
- **コミット**: `35daee0`

## 🎯 今後の拡張予定

1. **ログレベルの追加**: info, warn, error, debug
2. **ログのエクスポート**: JSON形式でダウンロード
3. **リモートロギング**: エラーログをサーバーに送信
4. **パフォーマンス計測**: より詳細なタイミング情報
5. **ユーザー行動トラッキング**: クリックストリーム分析

---

デバッグログシステムにより、アプリケーションの動作を詳細に追跡できるようになりました。問題が発生した際は、コンソールログを確認することで原因を特定しやすくなります。
