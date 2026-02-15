# Hospitality Agent Infrastructure - 進捗管理表

## 統合ページ管理表

| ID | ページ名 | ルート | 権限レベル | 統合機能 | 着手 | 完了 |
|----|---------|-------|----------|---------|------|------|
| P-001 | チャット画面 | `/` | 利用者 | 利用申請フォーム、承認待ち画面、テキスト/音声入力、対話表示、対話履歴一覧、新規会話開始 | [x] | [x] |
| A-001 | 管理者ログイン | `/admin/login` | 管理者 | パスワード認証 | [x] | [x] |
| A-002 | 管理画面 | `/admin` | 管理者 | 利用者承認タブ、対話ログ分析タブ、プロンプト設定タブ、ナレッジソース設定タブ | [x] | [x] |

## フェーズ進捗

| Phase | 内容 | ステータス |
|-------|------|-----------|
| Phase 1 | 要件定義 | 完了 |
| Phase 2 | Git管理 | 完了 |
| Phase 3 | フロントエンド基盤 | 完了 |
| Phase 4 | ページ実装（前半） | 完了 |
| Phase 5 | ページ実装（後半） | 完了 |
| Phase 6 | バックエンド計画 | 完了 |
| Phase 7 | バックエンド実装 | 完了 |
| Phase 8 | API統合 | 未着手 |
| Phase 9 | 品質チェック | 未着手 |
| Phase 10 | E2Eテスト | 未着手 |
| Phase 11 | デプロイ | 未着手 |

---

## バックエンド実装計画

### 技術スタック

| 項目 | 技術 | バージョン |
|------|------|-----------|
| フレームワーク | FastAPI | latest |
| 言語 | Python | 3.12 |
| ORM | SQLAlchemy (async) | latest |
| LLM統合 | LlamaIndex | latest |
| LLMモデル | GPT-4o-mini | - |
| Embedding | text-embedding-3-small | - |
| DB | Supabase (PostgreSQL + pgvector) | - |
| ポート | 8432 | - |

### DBテーブル設計

| テーブル名 | 主要カラム | 作成スライス |
|-----------|-----------|-------------|
| `user_profiles` | profile_id, name, department, join_date, status, approved_at, auth_token, created_at, last_accessed_at | スライス1 |
| `admin_sessions` | session_id, authenticated, created_at, expires_at | スライス1 |
| `conversations` | conversation_id, user_profile_id, title, created_at, updated_at | スライス2-A |
| `messages` | message_id, conversation_id, role, content, input_method, created_at | スライス2-A |
| `prompt_configs` | config_id, system_prompt, few_shot_examples (JSONB), version, created_at, updated_by | スライス3-B |
| `knowledge_sources` | source_id, type, connection_config (JSONB), sync_interval_minutes, last_synced_at, document_count, status | スライス3-C |
| `documents` | doc_id, source_id, title, content, embedding (vector), synced_at | スライス3-C |

### 垂直スライス実装順序

| 順序 | スライス名 | エンドポイント数 | 依存スライス | 完了 |
|------|-----------|----------------|-------------|------|
| 1 | 認証基盤 + DB基盤 | 4 | なし | [x] |
| 2-A | 利用者チャット基盤 | 4 | スライス1 | [x] |
| 2-B | 管理者ユーザー承認 | 4 | スライス1 | [x] |
| 3-A | ログ分析 | 3 | スライス1, 2-A | [x] |
| 3-B | プロンプト設定 | 3 | スライス1 | [x] |
| 3-C | ナレッジソース管理 | 3 | スライス1 | [x] |

※ 番号-アルファベット表記は並列実装可能（例: 2-A, 2-Bは同時実装可能）

### エンドポイント実装タスクリスト

#### スライス1: 認証基盤 + DB基盤

| タスク | エンドポイント | メソッド | 完了 |
|--------|--------------|---------|------|
| 1.0 | FastAPIプロジェクト構造構築 | - | [x] |
| 1.1 | `/api/auth/profile` | POST | [x] |
| 1.2 | `/api/auth/status` | GET | [x] |
| 1.3 | `/api/admin/login` | POST | [x] |
| 1.4 | `/api/admin/logout` | POST | [x] |

#### スライス2-A: 利用者チャット基盤

| タスク | エンドポイント | メソッド | 完了 |
|--------|--------------|---------|------|
| 2A.1 | `/api/chat` | POST | [x] |
| 2A.2 | `/api/conversations/new` | POST | [x] |
| 2A.3 | `/api/conversations` | GET | [x] |
| 2A.4 | `/api/conversations/:id` | GET | [x] |

#### スライス2-B: 管理者ユーザー承認

| タスク | エンドポイント | メソッド | 完了 |
|--------|--------------|---------|------|
| 2B.1 | `/api/admin/users/pending` | GET | [x] |
| 2B.2 | `/api/admin/users` | GET | [x] |
| 2B.3 | `/api/admin/users/:id/approve` | PUT | [x] |
| 2B.4 | `/api/admin/users/:id/reject` | PUT | [x] |

#### スライス3-A: ログ分析

| タスク | エンドポイント | メソッド | 完了 |
|--------|--------------|---------|------|
| 3A.1 | `/api/admin/logs` | GET | [x] |
| 3A.2 | `/api/admin/logs/:id` | GET | [x] |
| 3A.3 | `/api/admin/logs/analytics` | GET | [x] |

#### スライス3-B: プロンプト設定

| タスク | エンドポイント | メソッド | 完了 |
|--------|--------------|---------|------|
| 3B.1 | `/api/admin/prompt` | GET | [x] |
| 3B.2 | `/api/admin/prompt` | PUT | [x] |
| 3B.3 | `/api/admin/prompt/history` | GET | [x] |

#### スライス3-C: ナレッジソース管理

| タスク | エンドポイント | メソッド | 完了 |
|--------|--------------|---------|------|
| 3C.1 | `/api/admin/knowledge-sources` | GET | [x] |
| 3C.2 | `/api/admin/knowledge-sources/:id` | PUT | [x] |
| 3C.3 | `/api/admin/sync` | POST | [x] |

### 並列実装スケジュール

```
Week 1: |=== スライス1: 認証基盤 + DB基盤 ===|
Week 2: |== スライス2-A: チャット基盤 ==|
        |== スライス2-B: ユーザー承認 ==|  ← 並列
Week 3: |== スライス3-A: ログ分析 =======|
        |== スライス3-B: プロンプト設定 ==|  ← 並列
        |== スライス3-C: ナレッジソース ==|  ← 並列
```

### クリティカルパス

```
認証基盤(Week1) → チャット基盤(Week2) → ログ分析(Week3)
```

リスクポイント: スライス2-AのLLM統合（LlamaIndex + RAG + pgvector）

### バックエンド実装への引き継ぎ

#### 実装順序の厳守事項
1. **スライス1（認証基盤）を必ず最初に完成させる**
2. **番号-アルファベット表記（2-A, 2-B等）は並列実装可能**
3. **スライスの依存関係を確認し、前提条件を満たす**

#### 並列実装時の注意事項
- DBマイグレーションの競合を避ける（スライス1でuser_profiles作成、以降は追加テーブルのみ）
- 共通ユーティリティ（認証ミドルウェア、エラーハンドリング）はスライス1で作成
- 型定義（`frontend/src/types/index.ts`）との同期を厳守

#### プロジェクト構造（予定）

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPIアプリ・CORS設定
│   ├── config.py             # 環境変数読み込み
│   ├── database.py           # Supabase/SQLAlchemy接続
│   ├── dependencies.py       # 認証依存関数
│   ├── models/               # SQLAlchemyモデル
│   │   ├── user.py
│   │   ├── conversation.py
│   │   ├── prompt.py
│   │   └── knowledge.py
│   ├── schemas/              # Pydanticスキーマ
│   │   ├── auth.py
│   │   ├── chat.py
│   │   ├── admin.py
│   │   └── knowledge.py
│   ├── routers/              # APIルーター
│   │   ├── auth.py
│   │   ├── chat.py
│   │   ├── admin_users.py
│   │   ├── admin_logs.py
│   │   ├── admin_prompt.py
│   │   └── admin_knowledge.py
│   ├── services/             # ビジネスロジック
│   │   ├── auth_service.py
│   │   ├── chat_service.py
│   │   ├── llm_service.py    # LlamaIndex統合
│   │   ├── knowledge_sync.py # Notion/GDrive同期
│   │   └── analytics_service.py
│   └── utils/
│       └── security.py       # トークン生成・検証
├── requirements.txt
├── .env.local
└── Dockerfile
```

#### 環境変数（.env.local）

```
OPENAI_API_KEY=
NOTION_API_TOKEN=
GOOGLE_SERVICE_ACCOUNT_JSON=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=dev-admin-2026!
```
