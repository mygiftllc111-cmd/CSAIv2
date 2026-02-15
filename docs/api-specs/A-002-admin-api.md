# A-002 管理画面 API仕様書

生成日: 2026-02-15
収集元: frontend/src/services/mock/adminService.ts, frontend/src/services/mock/authService.ts
対象ページ: A-001 管理者ログイン / A-002 管理画面（4タブ）

## 共通仕様

### 認証

全エンドポイントは管理者セッションが必要。

```
Cookie: csai_admin_session=<session_id>
```

セッション無効時は `401 Unauthorized` を返す。

---

## エンドポイント一覧

### 1. 管理者ログイン
- **エンドポイント**: `POST /api/admin/login`
- **APIパス定数**: `API_PATHS.AUTH.ADMIN_LOGIN`
- **認証**: 不要
- **Request**:
  ```json
  { "password": "string" }
  ```
- **Response**: `AdminSession`
  ```json
  {
    "session_id": "string (UUID)",
    "authenticated": true,
    "created_at": "string (ISO 8601)",
    "expires_at": "string (ISO 8601)"
  }
  ```
- **エラー**: `401 Unauthorized` - パスワード不一致
- **説明**: 管理者パスワードを検証し、セッションを発行

### 2. 管理者ログアウト
- **エンドポイント**: `POST /api/admin/logout`
- **APIパス定数**: `API_PATHS.AUTH.ADMIN_LOGOUT`
- **認証**: Cookie `csai_admin_session`
- **Request**: なし
- **Response**: `204 No Content`
- **説明**: セッションを無効化

---

### 3. 承認待ちユーザー一覧
- **エンドポイント**: `GET /api/admin/users/pending`
- **APIパス定数**: `API_PATHS.ADMIN.PENDING_USERS`
- **Response**: `UserProfile[]`（status=pending のみ）
  ```json
  [
    {
      "profile_id": "user-002",
      "name": "承認待ち花子",
      "department": "カスタマーサポート",
      "join_date": "2026-03",
      "status": "pending",
      "approved_at": null,
      "auth_token": null,
      "created_at": "2026-02-13T14:00:00Z",
      "last_accessed_at": "2026-02-13T14:00:00Z"
    }
  ]
  ```

### 4. 全ユーザー一覧
- **エンドポイント**: `GET /api/admin/users`
- **APIパス定数**: `API_PATHS.ADMIN.ALL_USERS`
- **Response**: `UserProfile[]`（全ステータス含む、登録日降順）

### 5. ユーザー承認
- **エンドポイント**: `PUT /api/admin/users/:id/approve`
- **APIパス定数**: `API_PATHS.ADMIN.APPROVE_USER(id)`
- **パスパラメータ**: `id` - profile_id
- **Response**: `UserProfile`（status=approved, auth_token発行済み）
  ```json
  {
    "profile_id": "user-002",
    "status": "approved",
    "approved_at": "2026-02-15T10:30:00Z",
    "auth_token": "generated-token-xxx"
  }
  ```
- **エラー**: `404 Not Found`

### 6. ユーザー拒否
- **エンドポイント**: `PUT /api/admin/users/:id/reject`
- **APIパス定数**: `API_PATHS.ADMIN.REJECT_USER(id)`
- **パスパラメータ**: `id` - profile_id
- **Response**: `UserProfile`（status=rejected）
- **エラー**: `404 Not Found`

---

### 7. 対話ログ一覧
- **エンドポイント**: `GET /api/admin/logs`
- **APIパス定数**: `API_PATHS.ADMIN.LOGS`
- **クエリパラメータ** (`LogFilter`):
  | パラメータ | 型 | 必須 | 説明 |
  |---|---|---|---|
  | `department` | string | 任意 | 部署名（完全一致） |
  | `join_date` | string | 任意 | YYYY-MM形式 |
  | `date_from` | string | 任意 | YYYY-MM-DD形式 |
  | `date_to` | string | 任意 | YYYY-MM-DD形式（当日23:59:59まで含む） |
- **Request例**: `GET /api/admin/logs?department=研修チーム&date_from=2026-02-12`
- **Response**: `ConversationLog[]`（作成日降順）
  ```json
  [
    {
      "conversation_id": "conv-001",
      "title": "有給休暇の申請方法について",
      "user_name": "テスト太郎",
      "department": "研修チーム",
      "join_date": "2026-02",
      "created_at": "2026-02-14T09:00:00Z",
      "message_count": 4,
      "first_message": "有給休暇の申請方法を教えてください"
    }
  ]
  ```

### 8. 対話ログ詳細
- **エンドポイント**: `GET /api/admin/logs/:id`
- **APIパス定数**: `API_PATHS.ADMIN.LOG_DETAIL(id)`
- **パスパラメータ**: `id` - conversation_id
- **Response**: `Message[]`（時系列順）
  ```json
  [
    {
      "message_id": "log-msg-001",
      "role": "user",
      "content": "経費精算はどこからできますか？",
      "input_method": "text",
      "created_at": "2026-02-11T14:20:00Z"
    },
    {
      "message_id": "log-msg-002",
      "role": "assistant",
      "content": "お疲れさまです。経費精算についてお調べしますね。...",
      "input_method": "text",
      "created_at": "2026-02-11T14:20:08Z"
    }
  ]
  ```
- **エラー**: `404 Not Found`

### 9. よくある質問分析
- **エンドポイント**: `GET /api/admin/logs/analytics`
- **APIパス定数**: `API_PATHS.ADMIN.LOG_ANALYTICS`
- **Response**: `FrequentQuestion[]`（回数降順）
  ```json
  [
    { "question": "有給休暇の申請方法", "count": 12, "category": "休暇・勤怠" },
    { "question": "経費精算の手順", "count": 8, "category": "経費" },
    { "question": "社内ポータルの使い方", "count": 7, "category": "システム" }
  ]
  ```

---

### 10. プロンプト設定取得
- **エンドポイント**: `GET /api/admin/prompt`
- **APIパス定数**: `API_PATHS.ADMIN.PROMPT`
- **Response**: `PromptConfig`（最新バージョン）
  ```json
  {
    "config_id": "prompt-001",
    "system_prompt": "あなたは「世界一安心して話せるAI」です。...",
    "few_shot_examples": [
      {
        "user_message": "有給休暇の申請ってどうやるんですか？",
        "assistant_message": "お疲れさまです。有給休暇の申請について..."
      }
    ],
    "version": 3,
    "created_at": "2026-02-14T10:00:00Z",
    "updated_by": "管理者"
  }
  ```

### 11. プロンプト設定更新
- **エンドポイント**: `PUT /api/admin/prompt`
- **APIパス定数**: `API_PATHS.ADMIN.PROMPT`
- **Request**:
  ```json
  {
    "system_prompt": "string (1-10000文字)",
    "few_shot_examples": [
      { "user_message": "string", "assistant_message": "string" }
    ]
  }
  ```
- **Response**: `PromptConfig`（version +1 された新レコード）
- **エラー**: `422 Unprocessable Entity` - system_prompt が空
- **説明**: 更新ごとにバージョンがインクリメント。旧バージョンは履歴として保持。

### 12. プロンプト変更履歴
- **エンドポイント**: `GET /api/admin/prompt/history`
- **Response**: `PromptConfig[]`（バージョン降順）
- **説明**: 過去のプロンプト設定バージョン一覧

---

### 13. ナレッジソース一覧
- **エンドポイント**: `GET /api/admin/knowledge-sources`
- **APIパス定数**: `API_PATHS.ADMIN.KNOWLEDGE_SOURCES`
- **Response**: `KnowledgeSource[]`
  ```json
  [
    {
      "source_id": "ks-001",
      "type": "notion",
      "connection_config": {
        "integration_token": "••••••••••••noti_xxx",
        "target_pages": "ワークスペース全体"
      },
      "sync_interval_minutes": 60,
      "last_synced_at": "2026-02-14T08:00:00Z",
      "document_count": 47,
      "status": "active"
    },
    {
      "source_id": "ks-002",
      "type": "google_drive",
      "connection_config": {
        "service_account": "••••••••@project.iam.gserviceaccount.com",
        "target_folder": "社内マニュアル / 研修資料"
      },
      "sync_interval_minutes": 120,
      "last_synced_at": "2026-02-14T06:00:00Z",
      "document_count": 23,
      "status": "active"
    }
  ]
  ```

### 14. ナレッジソース設定更新
- **エンドポイント**: `PUT /api/admin/knowledge-sources/:id`
- **パスパラメータ**: `id` - source_id
- **Request**: `Partial<KnowledgeSource>`
  ```json
  { "sync_interval_minutes": 30 }
  ```
- **Response**: `KnowledgeSource`（更新後）
- **エラー**: `404 Not Found`

### 15. 手動再同期
- **エンドポイント**: `POST /api/admin/sync`
- **APIパス定数**: `API_PATHS.ADMIN.SYNC`
- **Request**:
  ```json
  { "source_id": "ks-001" }
  ```
- **Response**: `KnowledgeSource`（同期完了後の状態。last_synced_at更新、document_count更新）
- **エラー**:
  - `404 Not Found` - source_id不正
  - `409 Conflict` - 既に同期中
  - `502 Bad Gateway` - 外部サービス接続失敗
- **説明**: 即時同期をトリガー。同期中は status が `"syncing"` になる。

---

## 型定義サマリー

```typescript
// ConversationLog
interface ConversationLog {
  conversation_id: string;
  title: string;
  user_name: string;
  department: string;
  join_date: string;
  created_at: string;
  message_count: number;
  first_message: string;
}

// LogFilter（クエリパラメータ）
interface LogFilter {
  department?: string;
  join_date?: string;
  date_from?: string;
  date_to?: string;
}

// PromptConfig
interface PromptConfig {
  config_id: string;
  system_prompt: string;
  few_shot_examples: FewShotExample[];
  version: number;
  created_at: string;
  updated_by: string;
}

// FewShotExample
interface FewShotExample {
  user_message: string;
  assistant_message: string;
}

// KnowledgeSource
interface KnowledgeSource {
  source_id: string;
  type: 'notion' | 'google_drive';
  connection_config: Record<string, string>;
  sync_interval_minutes: number;
  last_synced_at: string | null;
  document_count: number;
  status: 'active' | 'error' | 'syncing';
}

// FrequentQuestion
interface FrequentQuestion {
  question: string;
  count: number;
  category: string;
}
```
