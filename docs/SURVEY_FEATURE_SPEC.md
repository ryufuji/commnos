# アンケート機能 - 仕様設計書

## 📋 概要
コミュニティオーナー/管理者が、会員の入会申請時・退会時に任意のアンケートを設置できる機能です。

---

## 🎯 機能要件

### 1. **アンケートの種類**
| 種類 | タイミング | 表示場所 | 必須/任意 |
|------|-----------|---------|----------|
| 入会時アンケート | 会員申請フォーム送信時 | `/tenant/join?subdomain=xxx` | テナントごとに設定 |
| 退会時アンケート | 退会手続き時 | `/tenant/leave?subdomain=xxx` | テナントごとに設定 |

### 2. **質問タイプ**
| タイプ | 説明 | 入力フォーム | 回答形式 |
|--------|------|-------------|----------|
| text | 短文テキスト | `<input type="text">` | 文字列 |
| textarea | 長文テキスト | `<textarea>` | 文字列 |
| radio | 単一選択 | ラジオボタン | 選択肢1つ |
| checkbox | 複数選択 | チェックボックス | 選択肢の配列 |
| scale | 評価スケール | 1-5, 1-10などの選択 | 数値 |

### 3. **管理機能**
- ✅ アンケートの作成・編集・削除
- ✅ 質問の追加・削除・並び替え
- ✅ 必須/任意の設定
- ✅ アンケートの有効/無効切り替え
- ✅ プレビュー機能

### 4. **回答管理**
- ✅ 回答の保存（ユーザーごと）
- ✅ 回答の閲覧・検索
- ✅ CSV/JSONエクスポート
- ✅ 集計・分析（選択肢の集計、評価平均など）

---

## 🗄️ データベース設計

### 1. **surveys テーブル**（アンケート定義）
```sql
CREATE TABLE surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('join', 'leave')),  -- 入会/退会
  title TEXT NOT NULL,                                   -- アンケートタイトル
  description TEXT,                                      -- 説明文
  is_active BOOLEAN DEFAULT 1,                           -- 有効/無効
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_surveys_tenant ON surveys(tenant_id, type);
```

### 2. **survey_questions テーブル**（質問）
```sql
CREATE TABLE survey_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL,
  question_type TEXT NOT NULL CHECK(question_type IN ('text', 'textarea', 'radio', 'checkbox', 'scale')),
  question_text TEXT NOT NULL,                           -- 質問文
  options TEXT,                                          -- 選択肢（JSON形式: ["選択肢1", "選択肢2"]）
  scale_min INTEGER,                                     -- スケールの最小値（例: 1）
  scale_max INTEGER,                                     -- スケールの最大値（例: 5）
  is_required BOOLEAN DEFAULT 0,                         -- 必須かどうか
  display_order INTEGER DEFAULT 0,                       -- 表示順序
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);

CREATE INDEX idx_survey_questions_survey ON survey_questions(survey_id, display_order);
```

### 3. **survey_responses テーブル**（回答）
```sql
CREATE TABLE survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,                              -- 回答者
  tenant_id INTEGER NOT NULL,                            -- テナント
  response_type TEXT NOT NULL CHECK(response_type IN ('join', 'leave')),
  answer TEXT NOT NULL,                                  -- 回答（JSON形式で保存、複数選択は配列）
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES survey_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_user ON survey_responses(user_id, tenant_id);
CREATE INDEX idx_survey_responses_submitted ON survey_responses(submitted_at);
```

---

## 🎨 UI/UX設計

### 1. **管理画面：アンケート一覧** (`/tenant/surveys?subdomain=xxx`)

```
┌─────────────────────────────────────────────────────────┐
│ 📋 アンケート管理                    [+ 新規作成]      │
├─────────────────────────────────────────────────────────┤
│ タブ: [入会時アンケート] [退会時アンケート]            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📝 入会時アンケート                                     │
│    「このコミュニティをどこで知りましたか？」           │
│    ステータス: ✅ 有効                                  │
│    質問数: 3問                                          │
│    回答数: 42件                                         │
│    [編集] [プレビュー] [結果を見る] [無効化]           │
│                                                         │
│ （アンケートが未作成の場合）                             │
│ 💡 入会時アンケートが設定されていません                  │
│    [今すぐ作成]                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. **管理画面：アンケート作成・編集** (`/tenant/surveys/edit?subdomain=xxx`)

```
┌─────────────────────────────────────────────────────────┐
│ 📝 入会時アンケート作成                  [保存] [戻る]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ タイトル: [このコミュニティをどこで知りましたか？]     │
│                                                         │
│ 説明文:                                                 │
│ [ご入会前に簡単なアンケートにご協力ください]            │
│                                                         │
│ ステータス: ○ 有効  ○ 無効                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 📋 質問一覧                              [+ 質問を追加] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 質問 1  [↑] [↓]                        [編集] [削除]  │
│   種類: 単一選択 (ラジオボタン)                         │
│   質問: 「このコミュニティをどこで知りましたか？」       │
│   必須: ✅                                              │
│   選択肢:                                               │
│     - Twitter/X                                        │
│     - Instagram                                        │
│     - 友人の紹介                                        │
│     - その他                                            │
│                                                         │
│ 質問 2  [↑] [↓]                        [編集] [削除]  │
│   種類: 長文テキスト                                    │
│   質問: 「参加の動機を教えてください」                   │
│   必須: □                                              │
│                                                         │
│ 質問 3  [↑] [↓]                        [編集] [削除]  │
│   種類: 評価スケール (1-5)                              │
│   質問: 「コミュニティへの期待度は？」                   │
│   必須: ✅                                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3. **質問追加/編集モーダル**

```
┌─────────────────────────────────────────┐
│ 質問を追加                    [×]       │
├─────────────────────────────────────────┤
│                                         │
│ 質問タイプ:                             │
│   ○ 短文テキスト                        │
│   ○ 長文テキスト                        │
│   ● 単一選択（ラジオボタン）            │
│   ○ 複数選択（チェックボックス）        │
│   ○ 評価スケール                        │
│                                         │
│ 質問文:                                 │
│ [このコミュニティをどこで知りましたか？] │
│                                         │
│ 選択肢:                      [+ 追加]   │
│   1. [Twitter/X          ] [×]         │
│   2. [Instagram          ] [×]         │
│   3. [友人の紹介          ] [×]         │
│   4. [その他             ] [×]         │
│                                         │
│ ☑ この質問を必須にする                  │
│                                         │
│             [キャンセル] [保存]         │
└─────────────────────────────────────────┘
```

### 4. **フロントエンド：入会申請フォーム with アンケート**

```
┌─────────────────────────────────────────────────────────┐
│ 🎉 testコミュニティに参加する                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 基本情報                                                │
│ ──────────────────────────────────────                  │
│ お名前: [山田太郎                    ]                  │
│ メールアドレス: [yamada@example.com  ]                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 📋 アンケート                                           │
│ ご入会前に簡単なアンケートにご協力ください               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. このコミュニティをどこで知りましたか？ *             │
│    ○ Twitter/X                                         │
│    ○ Instagram                                         │
│    ○ 友人の紹介                                         │
│    ○ その他                                             │
│                                                         │
│ 2. 参加の動機を教えてください                           │
│    [                                           ]        │
│    [                                           ]        │
│    [                                           ]        │
│                                                         │
│ 3. コミュニティへの期待度は？ *                         │
│    1  2  3  4  5                                       │
│    ○ ○ ○ ○ ○                                         │
│    低い      高い                                       │
│                                                         │
│             [参加申請を送信]                            │
└─────────────────────────────────────────────────────────┘
```

### 5. **管理画面：アンケート結果一覧** (`/tenant/surveys/results?id=xxx`)

```
┌─────────────────────────────────────────────────────────┐
│ 📊 入会時アンケート結果                        [CSV出力] │
│ 「このコミュニティをどこで知りましたか？」               │
├─────────────────────────────────────────────────────────┤
│ 回答数: 42件                                            │
│ 期間: 2026-01-01 〜 2026-01-09                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 質問1: このコミュニティをどこで知りましたか？            │
│ ──────────────────────────────────────                  │
│   Twitter/X        █████████████ 18件 (42.9%)          │
│   Instagram        ████████ 12件 (28.6%)               │
│   友人の紹介        █████ 8件 (19.0%)                   │
│   その他           ██ 4件 (9.5%)                        │
│                                                         │
│ 質問2: 参加の動機を教えてください（自由記述）            │
│ ──────────────────────────────────────                  │
│   [回答一覧を表示] （42件）                             │
│                                                         │
│ 質問3: コミュニティへの期待度は？                       │
│ ──────────────────────────────────────                  │
│   平均: 4.2 / 5.0                                      │
│   1: ██ 2件 (4.8%)                                     │
│   2: ███ 4件 (9.5%)                                    │
│   3: ████ 6件 (14.3%)                                  │
│   4: ████████ 12件 (28.6%)                             │
│   5: ████████████ 18件 (42.9%)                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 個別回答一覧                             [検索: ______] │
├─────────────────────────────────────────────────────────┤
│ │ 回答者       │ 回答日時        │ アクション          │
│ ├─────────────┼────────────────┼────────────────────│
│ │ 山田太郎     │ 2026-01-09 10:00│ [詳細を見る]       │
│ │ 佐藤花子     │ 2026-01-08 15:30│ [詳細を見る]       │
│ │ 鈴木一郎     │ 2026-01-07 09:15│ [詳細を見る]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 データフロー

### 入会申請フロー
```
1. ユーザーが /tenant/join?subdomain=xxx にアクセス
   ↓
2. バックエンドが有効な入会アンケートを取得
   GET /api/surveys?tenant_id=xxx&type=join&active=true
   ↓
3. フォームにアンケートを動的に追加
   ↓
4. ユーザーが申請フォーム送信
   POST /api/members/apply
   body: {
     name, email, ...,
     survey_responses: [
       { question_id: 1, answer: "Twitter/X" },
       { question_id: 2, answer: "興味があったから..." },
       { question_id: 3, answer: 5 }
     ]
   }
   ↓
5. バックエンドが会員申請とアンケート回答を同時保存
```

### 退会フロー
```
1. 会員が /tenant/leave?subdomain=xxx にアクセス
   ↓
2. バックエンドが有効な退会アンケートを取得
   GET /api/surveys?tenant_id=xxx&type=leave&active=true
   ↓
3. 退会確認画面にアンケートを表示
   ↓
4. ユーザーが退会を確定
   POST /api/members/leave
   body: {
     reason, ...,
     survey_responses: [
       { question_id: 10, answer: "時間がなくなった" },
       { question_id: 11, answer: 3 }
     ]
   }
   ↓
5. バックエンドが退会処理とアンケート回答を同時保存
```

---

## 🛠️ API設計

### 1. アンケート管理API

#### `GET /api/surveys?tenant_id=xxx&type=join`
アンケート一覧取得

**Response:**
```json
{
  "success": true,
  "surveys": [
    {
      "id": 1,
      "tenant_id": 5,
      "type": "join",
      "title": "入会時アンケート",
      "description": "ご入会前に簡単なアンケートにご協力ください",
      "is_active": true,
      "questions": [
        {
          "id": 1,
          "question_type": "radio",
          "question_text": "このコミュニティをどこで知りましたか？",
          "options": ["Twitter/X", "Instagram", "友人の紹介", "その他"],
          "is_required": true,
          "display_order": 1
        },
        {
          "id": 2,
          "question_type": "textarea",
          "question_text": "参加の動機を教えてください",
          "is_required": false,
          "display_order": 2
        },
        {
          "id": 3,
          "question_type": "scale",
          "question_text": "コミュニティへの期待度は？",
          "scale_min": 1,
          "scale_max": 5,
          "is_required": true,
          "display_order": 3
        }
      ],
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-05T10:00:00Z"
    }
  ]
}
```

#### `POST /api/surveys`
アンケート作成

**Request:**
```json
{
  "tenant_id": 5,
  "type": "join",
  "title": "入会時アンケート",
  "description": "ご入会前に簡単なアンケートにご協力ください",
  "is_active": true,
  "questions": [
    {
      "question_type": "radio",
      "question_text": "このコミュニティをどこで知りましたか？",
      "options": ["Twitter/X", "Instagram", "友人の紹介", "その他"],
      "is_required": true,
      "display_order": 1
    }
  ]
}
```

#### `PUT /api/surveys/:id`
アンケート更新

#### `DELETE /api/surveys/:id`
アンケート削除

---

### 2. アンケート回答API

#### `POST /api/survey-responses`
アンケート回答を保存

**Request:**
```json
{
  "survey_id": 1,
  "user_id": 42,
  "tenant_id": 5,
  "response_type": "join",
  "responses": [
    {
      "question_id": 1,
      "answer": "Twitter/X"
    },
    {
      "question_id": 2,
      "answer": "コミュニティに興味があったため参加しました。"
    },
    {
      "question_id": 3,
      "answer": 5
    }
  ]
}
```

#### `GET /api/survey-responses?survey_id=1`
アンケート回答一覧取得

**Response:**
```json
{
  "success": true,
  "total": 42,
  "responses": [
    {
      "id": 100,
      "survey_id": 1,
      "user_id": 42,
      "user_name": "山田太郎",
      "submitted_at": "2026-01-09T10:00:00Z",
      "answers": [
        {
          "question_id": 1,
          "question_text": "このコミュニティをどこで知りましたか？",
          "answer": "Twitter/X"
        },
        {
          "question_id": 2,
          "question_text": "参加の動機を教えてください",
          "answer": "コミュニティに興味があったため..."
        },
        {
          "question_id": 3,
          "question_text": "コミュニティへの期待度は？",
          "answer": 5
        }
      ]
    }
  ]
}
```

#### `GET /api/survey-responses/stats?survey_id=1`
アンケート統計データ取得

**Response:**
```json
{
  "success": true,
  "survey_id": 1,
  "total_responses": 42,
  "statistics": [
    {
      "question_id": 1,
      "question_text": "このコミュニティをどこで知りましたか？",
      "question_type": "radio",
      "stats": {
        "Twitter/X": { "count": 18, "percentage": 42.9 },
        "Instagram": { "count": 12, "percentage": 28.6 },
        "友人の紹介": { "count": 8, "percentage": 19.0 },
        "その他": { "count": 4, "percentage": 9.5 }
      }
    },
    {
      "question_id": 3,
      "question_text": "コミュニティへの期待度は？",
      "question_type": "scale",
      "stats": {
        "average": 4.2,
        "distribution": {
          "1": { "count": 2, "percentage": 4.8 },
          "2": { "count": 4, "percentage": 9.5 },
          "3": { "count": 6, "percentage": 14.3 },
          "4": { "count": 12, "percentage": 28.6 },
          "5": { "count": 18, "percentage": 42.9 }
        }
      }
    }
  ]
}
```

---

## 🔐 権限設計

| 機能 | オーナー | 管理者 | 一般会員 | 未ログイン |
|------|---------|--------|---------|-----------|
| アンケート作成・編集・削除 | ✅ | ✅ | ❌ | ❌ |
| アンケート結果閲覧 | ✅ | ✅ | ❌ | ❌ |
| アンケート回答（入会時） | - | - | - | ✅ |
| アンケート回答（退会時） | ✅ | ✅ | ✅ | ❌ |

---

## 📊 実装優先順位

### Phase 1: 基本機能（MVP）
1. ✅ データベーステーブル作成
2. ✅ 管理画面：アンケート一覧
3. ✅ 管理画面：アンケート作成（シンプル版）
4. ✅ フロントエンド：入会申請フォームにアンケート表示
5. ✅ バックエンドAPI：アンケート回答の保存

### Phase 2: 高度な機能
6. ✅ 管理画面：アンケート結果閲覧
7. ✅ 退会時アンケート
8. ✅ 質問の並び替え機能
9. ✅ アンケートのプレビュー機能

### Phase 3: 分析機能
10. ✅ 統計データの表示（グラフ、平均値など）
11. ✅ CSV/JSONエクスポート
12. ✅ 回答の検索・フィルタリング

---

## 🎯 想定ユースケース

### 入会時アンケート例
1. **マーケティング分析**
   - 「どこでコミュニティを知りましたか？」
   - 「参加の動機は何ですか？」
   
2. **メンバー理解**
   - 「興味のある分野を教えてください」
   - 「どんな活動に参加したいですか？」
   
3. **適切な対応**
   - 「コミュニティへの期待度は？」
   - 「初心者ですか？経験者ですか？」

### 退会時アンケート例
1. **退会理由の把握**
   - 「退会の理由を教えてください」
   - 「改善してほしい点はありますか？」
   
2. **満足度調査**
   - 「コミュニティの満足度を教えてください」
   - 「また戻ってきたいと思いますか？」

---

## ✅ 次のステップ

仕様設計が完了しました。次は以下の順で実装を進めます：

1. **データベースマイグレーション作成**
2. **バックエンドAPI実装**
3. **管理画面UI実装**
4. **入会/退会フォームへの統合**
5. **テスト＆デプロイ**

実装を開始してよろしいでしょうか？それとも仕様について修正・追加したい点はありますか？
