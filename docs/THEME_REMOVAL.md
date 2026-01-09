# テーマ設定機能の削除とVivoo風デザイン統一

## 概要
Commons全体で統一されたVivoo風デザインを使用するため、テーマ設定機能（tenant_customization）を削除しました。

## 変更内容

### 1. データベース変更
- **マイグレーション**: `0019_remove_theme_customization.sql`
- **削除**: `tenant_customization` テーブル
- **理由**: 統一デザインシステムへの移行

### 2. コード変更

#### 削除されたファイル/機能
- テーマプリセット選択機能
- テーマカスタマイズAPI
- `TenantCustomization` インターフェース（types/index.ts）

#### 更新されたファイル
- **src/routes/tenant-public.ts**
  - テーマ設定クエリの削除
  - `data-theme="light"` に統一
  
- **src/routes/tenant.ts**
  - テーマカラーオブジェクトの削除
  - JOINクエリからtenant_customization削除
  
- **src/routes/auth.ts**
  - テナント作成時のテーマ挿入削除
  
- **src/types/index.ts**
  - `TenantCustomization` インターフェースをコメントアウト

### 3. 統一デザイン

#### すべてのページで使用
- **デザインシステム**: Vivoo風
- **テーマ属性**: `data-theme="light"`
- **CSSファイル**: 
  - `/static/commons-theme.css` - グローバル変数
  - `/static/commons-components.css` - 共通コンポーネント

#### カラーパレット
```css
--commons-primary: #00BCD4;
--commons-accent-yellow: #FDB714;
--commons-accent-purple: #6B4C9A;
--commons-accent-terracotta: #C97865;
--commons-accent-cyan: #00D4E0;
--commons-accent-lime: #7ED957;
```

## 影響範囲

### 削除された機能
- ❌ テーマプリセット選択（modern-business, wellness-nature, creative-studio, tech-innovation）
- ❌ テーマごとのカラーカスタマイズ
- ❌ tenant_customizationテーブル

### 維持される機能
- ✅ すべてのコア機能（会員管理、投稿管理、プラン管理等）
- ✅ 認証・認可システム
- ✅ Stripeサブスクリプション統合
- ✅ データベース構造（テナント、ユーザー、投稿等）

## 移行ガイド

### 既存のテナント
- データベース内の `tenant_customization` データは削除されます
- すべてのテナントがVivoo風デザインに自動移行
- 既存の投稿、会員データは影響を受けません

### 開発者向け
- `theme_preset` への参照をすべて削除
- `data-theme="light"` を標準として使用
- カスタムCSSは `/static/commons-theme.css` の変数を使用

## メリット

### ユーザー体験
- 統一された美しいデザイン
- 一貫性のあるブランディング
- パフォーマンス向上（テーマクエリの削除）

### 開発・保守
- コードの簡素化
- テーマ関連のバグ削減
- デザイン変更が容易
- テストの簡素化

### パフォーマンス
- データベースクエリ削減（テーマ取得不要）
- CSS/JSの最適化（単一テーマ）
- ページロード時間の改善

## ロールバック方法

万が一ロールバックが必要な場合：

1. **データベース**: `tenant_customization` テーブルを再作成
2. **コード**: 前のコミット（3f9d7b6）に戻す
3. **マイグレーション**: 0019をロールバック

```bash
git revert 1bf8c9a 2c9aa86
# または
git checkout 3f9d7b6
```

## 今後の拡張

### カスタマイズオプション（将来）
統一デザイン内での限定的なカスタマイズ：
- ロゴのアップロード
- アクセントカラーの微調整（プライマリカラーの範囲内）
- ヘッダー/フッターテキストのカスタマイズ

### ダークモード（将来）
- `data-theme="dark"` の実装
- システム設定に基づく自動切り替え

## 関連ドキュメント
- [GLOBAL_DESIGN_SYSTEM.md](./GLOBAL_DESIGN_SYSTEM.md)
- [AUTH_PAGES_DESIGN.md](./AUTH_PAGES_DESIGN.md)
- [PREMIUM_PLAN_PAGE.md](./PREMIUM_PLAN_PAGE.md)

## バージョン
- **実装日**: 2026-01-09
- **マイグレーション**: 0019_remove_theme_customization.sql
- **コミット**: 1bf8c9a, 2c9aa86
