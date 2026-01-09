# 🔍 デザイン診断方法

## 方法1: ブラウザのコンソールで直接実行

1. ブラウザで問題のページを開く
2. 開発者ツールを開く (F12 または Cmd+Option+I)
3. Console タブを選択
4. 以下のコードをコピー&ペーストして Enter

```javascript
// デバッグスクリプトを読み込んで実行
const script = document.createElement('script');
script.src = '/static/debug-design.js';
document.head.appendChild(script);
```

## 方法2: URLパラメータで自動実行

デザイン診断を自動実行するコードを追加します。
任意のページに `?debug=design` を追加してアクセス:

例:
- https://commons-webapp.pages.dev/?debug=design
- https://commons-webapp.pages.dev/login?subdomain=test&debug=design
- https://commons-webapp.pages.dev/dashboard?debug=design

## 方法3: 個別チェックコマンド

### CSS変数が読み込まれているか確認
```javascript
getComputedStyle(document.documentElement).getPropertyValue('--commons-primary')
// 期待値: "#00BCD4" または "rgb(0, 188, 212)"
```

### CSSファイルの読み込み確認
```javascript
Array.from(document.styleSheets).map(s => s.href).filter(Boolean)
// commons-theme.css と commons-components.css があることを確認
```

### data-theme 確認
```javascript
document.documentElement.getAttribute('data-theme')
// 期待値: "light"
```

### 要素のスタイル確認
```javascript
// ボタンの背景色確認
const btn = document.querySelector('.btn-primary');
if (btn) {
  console.log('Background:', getComputedStyle(btn).backgroundColor);
  console.log('Color:', getComputedStyle(btn).color);
}
```

## 診断結果の見方

### ✅ 正常な場合
- commons-theme.css: ✅ 読込済
- commons-components.css: ✅ 読込済
- data-theme: light
- CSS変数: ✅ 有効
- 検出された問題: 0

### ❌ 問題がある場合

#### パターン1: CSS変数が未定義
**症状**: --commons-primary が空または未定義
**原因**: commons-theme.css が読み込まれていない
**解決**: HTMLに以下を追加
```html
<link href="/static/commons-theme.css" rel="stylesheet">
```

#### パターン2: data-themeがlightでない
**症状**: data-theme が "modern-business" など
**原因**: 古いテーマ設定が残っている
**解決**: HTMLを修正
```html
<html lang="ja" data-theme="light">
```

#### パターン3: CSSファイルが404エラー
**症状**: Network タブで /static/*.css が404
**原因**: ファイルが存在しないか、パスが間違っている
**解決**: 
1. ファイルの存在確認: public/static/ にファイルがあるか
2. ビルド確認: npm run build 後に dist/ にコピーされているか
3. デプロイ確認: wrangler pages deploy で正しくアップロードされているか

