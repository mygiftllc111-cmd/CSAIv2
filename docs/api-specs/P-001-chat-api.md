# P-001 チャット画面 API仕様書

生成日: 2026-02-14
収集元: frontend/src/services/mock/chatService.ts, frontend/src/services/mock/authService.ts
@MOCK_TO_APIマーク数: 7

## エンドポイント一覧

### 1. 利用申請（プロフィール送信）
- **エンドポイント**: `POST /api/auth/profile`
- **APIパス定数**: `API_PATHS.AUTH.SUBMIT_PROFILE`
- **Request**:
  ```json
  {
    "name": "string (1-50文字)",
    "department": "string (1-100文字)",
    "join_date": "string (YYYY-MM形式)"
  }
  ```
- **Response**: `UserProfile`
  ```json
  {
    "profile_id": "string (UUID)",
    "name": "string",
    "department": "string",
    "join_date": "string",
    "status": "pending",
    "approved_at": null,
    "auth_token": null,
    "created_at": "string (ISO 8601)",
    "last_accessed_at": "string (ISO 8601)"
  }
  ```
- **説明**: 新規利用者のプロフィールを登録し、承認待ち状態にする

### 2. 承認ステータス確認
- **エンドポイント**: `GET /api/auth/status`
- **APIパス定数**: `API_PATHS.AUTH.CHECK_STATUS`
- **Request**: Authorization header (token)
- **Response**: `UserProfile | null`
- **説明**: 現在のユーザーの承認ステータスを確認する

### 3. 会話一覧取得
- **エンドポイント**: `GET /api/conversations`
- **APIパス定数**: `API_PATHS.CHAT.CONVERSATIONS`
- **Request**: Authorization header
- **Response**: `Conversation[]` (messages除外、message_count含む)
  ```json
  [
    {
      "conversation_id": "string (UUID)",
      "title": "string",
      "created_at": "string (ISO 8601)",
      "updated_at": "string (ISO 8601)",
      "message_count": "number"
    }
  ]
  ```
- **説明**: ユーザーの対話履歴一覧を取得する（メッセージ本文は含まない）

### 4. 会話詳細取得
- **エンドポイント**: `GET /api/conversations/:id`
- **APIパス定数**: `API_PATHS.CHAT.CONVERSATION_DETAIL(id)`
- **Request**: Authorization header
- **Response**: `Conversation` (messages含む)
  ```json
  {
    "conversation_id": "string",
    "title": "string",
    "created_at": "string",
    "updated_at": "string",
    "messages": [
      {
        "message_id": "string",
        "role": "user | assistant",
        "content": "string",
        "input_method": "text | voice",
        "created_at": "string"
      }
    ]
  }
  ```
- **説明**: 指定した会話の全メッセージを取得する

### 5. メッセージ送信（質問）
- **エンドポイント**: `POST /api/chat`
- **APIパス定数**: `API_PATHS.CHAT.SEND`
- **Request**:
  ```json
  {
    "content": "string (1-5000文字)",
    "input_method": "text | voice",
    "conversation_id": "string | undefined (新規会話時は省略)"
  }
  ```
- **Response**: `ChatResponse`
  ```json
  {
    "message": {
      "message_id": "string",
      "role": "assistant",
      "content": "string",
      "input_method": "text",
      "created_at": "string"
    },
    "conversation_id": "string",
    "sources": [
      {
        "source_title": "string",
        "source_url": "string | null",
        "source_type": "notion | google_drive"
      }
    ]
  }
  ```
- **説明**: ユーザーの質問を送信し、AIエージェントの回答を取得する。新規会話の場合はconversation_idも返却される

### 6. 新規会話作成
- **エンドポイント**: `POST /api/conversations/new`
- **APIパス定数**: `API_PATHS.CHAT.NEW_CONVERSATION`
- **Request**: Authorization header
- **Response**: `Conversation` (空のメッセージリスト)
- **説明**: 空の新規会話セッションを作成する

### 7. ログアウト
- **エンドポイント**: クライアント側のLocalStorage削除
- **説明**: ユーザートークンをLocalStorageから削除する（バックエンド実装時はトークン無効化APIも検討）
