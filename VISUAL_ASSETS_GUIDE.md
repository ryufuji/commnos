# Commons プラットフォーム - ビジュアル素材の統合ガイド

## 📦 生成された画像一覧

以下の8つのイラストが nano-banana-pro で生成されました：

### 1. ヒーローセクション（トップページ用）- 16:9
**説明**: コミュニティのつながりを表現した温かみのあるイラスト  
**サイズ**: 1376x768px  
**URL**: https://www.genspark.ai/api/files/s/DLVl6pdn  
**保存名**: `hero-community.png`  
**用途**: トップページのヒーローセクション背景

### 2. 会員機能アイコン - 1:1
**説明**: 会員証とバッジを表現したアイコン  
**サイズ**: 1024x1024px  
**URL**: https://www.genspark.ai/api/files/s/lFgYhVgo  
**保存名**: `icon-membership.png`  
**用途**: 会員機能説明、ダッシュボード

### 3. 投稿機能アイコン - 1:1
**説明**: ソーシャルメディア投稿を表現したアイコン  
**サイズ**: 1024x1024px  
**URL**: https://www.genspark.ai/api/files/s/mxczDzNF  
**保存名**: `icon-posts.png`  
**用途**: 投稿機能説明、ダッシュボード

### 4. イベント機能アイコン - 1:1
**説明**: カレンダーとイベントを表現したアイコン  
**サイズ**: 1024x1024px  
**URL**: https://www.genspark.ai/api/files/s/5vzZu0Tv  
**保存名**: `icon-events.png`  
**用途**: イベント機能説明、ダッシュボード

### 5. ポイントシステムアイコン - 1:1
**説明**: コインとトロフィーを表現したアイコン  
**サイズ**: 1024x1024px  
**URL**: https://www.genspark.ai/api/files/s/V5Mb3SSY  
**保存名**: `icon-points.png`  
**用途**: ポイント機能説明、マイページ

### 6. ショップ機能アイコン - 1:1
**説明**: ショッピングバッグとカートを表現したアイコン  
**サイズ**: 1024x1024px  
**URL**: https://www.genspark.ai/api/files/s/6zDEI0A9  
**保存名**: `icon-shop.png`  
**用途**: ショップ機能説明、ダッシュボード

### 7. ウェルカムイラスト（ウォークスルー用）- 4:3
**説明**: 手を振る友好的なキャラクターのイラスト  
**サイズ**: 1200x896px  
**URL**: https://www.genspark.ai/api/files/s/wsFllQkd  
**保存名**: `walkthrough-welcome.png`  
**用途**: ウォークスルーの初回画面

### 8. 分析・統計アイコン - 1:1
**説明**: チャートとグラフを表現したアイコン  
**サイズ**: 1024x1024px  
**URL**: https://www.genspark.ai/api/files/s/labH9LxR  
**保存名**: `icon-analytics.png`  
**用途**: 統計ダッシュボード、分析機能

---

## 🚀 Claude Codeへの画像の渡し方

### 方法1: ブラウザから手動ダウンロード（推奨）

1. **各URLをブラウザで開く**
   - 上記のURLをクリックまたはコピー＆ペーストしてブラウザで開く
   - 画像が表示されたら右クリック→「名前を付けて保存」

2. **ファイル名を指定して保存**
   - 上記の「保存名」を使用してダウンロード
   - 推奨保存先: デスクトップまたはダウンロードフォルダ

3. **Claude Codeにアップロード**
   - Claude Codeのチャット画面で📎クリップアイコンをクリック
   - ダウンロードした画像を選択してアップロード
   - 以下のようなメッセージと一緒に送信:
   
   ```
   生成したイラストをアップロードします。
   これらを /home/user/webapp/public/static/illustrations/ に配置してください。
   
   ファイル名:
   - hero-community.png（ヒーローセクション用）
   - icon-membership.png（会員機能アイコン）
   - icon-posts.png（投稿機能アイコン）
   - icon-events.png（イベント機能アイコン）
   - icon-points.png（ポイントシステムアイコン）
   - icon-shop.png（ショップ機能アイコン）
   - walkthrough-welcome.png（ウォークスルー用）
   - icon-analytics.png（分析・統計アイコン）
   ```

### 方法2: wgetコマンドでダウンロード（Linux/Mac）

```bash
# illustrationsディレクトリを作成
mkdir -p public/static/illustrations

# 各画像をダウンロード
wget -O public/static/illustrations/hero-community.png "https://www.genspark.ai/api/files/s/DLVl6pdn"
wget -O public/static/illustrations/icon-membership.png "https://www.genspark.ai/api/files/s/lFgYhVgo"
wget -O public/static/illustrations/icon-posts.png "https://www.genspark.ai/api/files/s/mxczDzNF"
wget -O public/static/illustrations/icon-events.png "https://www.genspark.ai/api/files/s/5vzZu0Tv"
wget -O public/static/illustrations/icon-points.png "https://www.genspark.ai/api/files/s/V5Mb3SSY"
wget -O public/static/illustrations/icon-shop.png "https://www.genspark.ai/api/files/s/6zDEI0A9"
wget -O public/static/illustrations/walkthrough-welcome.png "https://www.genspark.ai/api/files/s/wsFllQkd"
wget -O public/static/illustrations/icon-analytics.png "https://www.genspark.ai/api/files/s/labH9LxR"

# ダウンロード確認
ls -lh public/static/illustrations/
```

### 方法3: curlコマンドでダウンロード（どのOSでも可能）

```bash
# illustrationsディレクトリを作成
mkdir -p public/static/illustrations

# 各画像をダウンロード
curl -o public/static/illustrations/hero-community.png "https://www.genspark.ai/api/files/s/DLVl6pdn"
curl -o public/static/illustrations/icon-membership.png "https://www.genspark.ai/api/files/s/lFgYhVgo"
curl -o public/static/illustrations/icon-posts.png "https://www.genspark.ai/api/files/s/mxczDzNF"
curl -o public/static/illustrations/icon-events.png "https://www.genspark.ai/api/files/s/5vzZu0Tv"
curl -o public/static/illustrations/icon-points.png "https://www.genspark.ai/api/files/s/V5Mb3SSY"
curl -o public/static/illustrations/icon-shop.png "https://www.genspark.ai/api/files/s/6zDEI0A9"
curl -o public/static/illustrations/walkthrough-welcome.png "https://www.genspark.ai/api/files/s/wsFllQkd"
curl -o public/static/illustrations/icon-analytics.png "https://www.genspark.ai/api/files/s/labH9LxR"

# ダウンロード確認
ls -lh public/static/illustrations/
```

---

## 💻 HTMLへの統合コード例

### トップページのヒーローセクション

```html
<div class="hero-section relative overflow-hidden">
    <img src="/static/illustrations/hero-community.png" 
         alt="Community Connection" 
         class="absolute inset-0 w-full h-full object-cover opacity-30">
    <div class="relative z-10">
        <h1 class="text-5xl font-bold">Commonsへようこそ</h1>
        <p class="text-xl mt-4">コミュニティをつなげる、新しいプラットフォーム</p>
    </div>
</div>
```

### 機能紹介セクション

```html
<div class="features-grid grid grid-cols-3 gap-6">
    <!-- 会員機能 -->
    <div class="feature-card">
        <img src="/static/illustrations/icon-membership.png" 
             alt="Membership" 
             class="w-24 h-24 mx-auto mb-4">
        <h3 class="text-xl font-bold">会員管理</h3>
        <p>簡単な会員登録とプロフィール管理</p>
    </div>
    
    <!-- 投稿機能 -->
    <div class="feature-card">
        <img src="/static/illustrations/icon-posts.png" 
             alt="Posts" 
             class="w-24 h-24 mx-auto mb-4">
        <h3 class="text-xl font-bold">投稿機能</h3>
        <p>コミュニティで情報を共有</p>
    </div>
    
    <!-- イベント機能 -->
    <div class="feature-card">
        <img src="/static/illustrations/icon-events.png" 
             alt="Events" 
             class="w-24 h-24 mx-auto mb-4">
        <h3 class="text-xl font-bold">イベント管理</h3>
        <p>コミュニティイベントの企画・管理</p>
    </div>
</div>
```

### ウォークスルーへの統合

```javascript
// walkthrough.jsに追加
const walkthroughSteps = [
  {
    icon: '👋',
    title: 'Commonsへようこそ！',
    description: 'コミュニティの主な機能をご案内します',
    image: '/static/illustrations/walkthrough-welcome.png' // 追加
  },
  // ... 他のステップ
];

// モーダル表示時に画像を追加
if (step.image) {
  const img = document.createElement('img');
  img.src = step.image;
  img.className = 'w-full h-48 object-contain mb-4';
  img.alt = step.title;
  modal.insertBefore(img, modal.firstChild);
}
```

### ダッシュボードのクイックアクション

```html
<a href="/members" class="card-interactive p-6 text-center">
    <img src="/static/illustrations/icon-membership.png" 
         alt="Members" 
         class="w-16 h-16 mx-auto mb-3">
    <h3 class="font-bold text-gray-900 mb-2">会員管理</h3>
    <p class="text-sm text-secondary-600">申請の承認・会員一覧</p>
</a>
```

---

## 🎨 CSS最適化（オプション）

```css
/* イラストの遅延読み込み */
.illustration {
    loading: lazy;
    transition: opacity 0.3s ease;
}

.illustration:not([src]) {
    opacity: 0;
}

.illustration[src] {
    opacity: 1;
}

/* ホバー効果 */
.feature-card img:hover {
    transform: scale(1.1);
    transition: transform 0.3s ease;
}
```

---

## ✅ 配置確認チェックリスト

配置後、以下を確認してください：

- [ ] `/home/user/webapp/public/static/illustrations/` ディレクトリが存在する
- [ ] 8つの画像ファイルがすべて配置されている
- [ ] 各ファイルサイズが妥当（数百KB〜数MB）
- [ ] ファイル名が正確（hero-community.png など）
- [ ] `npm run build` が正常に完了する
- [ ] ビルド後、`dist/static/illustrations/` に画像がコピーされている

---

## 🚢 デプロイ手順

1. **ビルド**:
   ```bash
   cd /home/user/webapp
   npm run build
   ```

2. **配置確認**:
   ```bash
   ls -lh dist/static/illustrations/
   ```

3. **デプロイ**:
   ```bash
   npx wrangler pages deploy dist --project-name commons-webapp
   ```

4. **動作確認**:
   - ブラウザで https://commons-webapp.pages.dev を開く
   - DevToolsで画像のロードを確認
   - 各ページで画像が正しく表示されているか確認

---

## 📝 画像使用箇所の一覧

| 画像 | 使用ページ | HTML要素 |
|------|-----------|----------|
| hero-community.png | トップページ | ヒーローセクション背景 |
| icon-membership.png | ダッシュボード、機能説明 | クイックアクション、機能カード |
| icon-posts.png | ダッシュボード、機能説明 | クイックアクション、機能カード |
| icon-events.png | ダッシュボード、機能説明 | クイックアクション、機能カード |
| icon-points.png | マイページ、ダッシュボード | ポイントセクション |
| icon-shop.png | ダッシュボード、ショップ | ショップ機能紹介 |
| walkthrough-welcome.png | ウォークスルー | 初回ガイドモーダル |
| icon-analytics.png | ダッシュボード | 統計機能カード |

---

生成日時: 2026-02-06
