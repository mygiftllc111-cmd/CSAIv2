# プロジェクト設定

## 基本設定

```yaml
プロジェクト名: Hospitality Agent Infrastructure
開始日: 2026-02-11
技術スタック:
  frontend: React 18 + TypeScript 5 + MUI v6 + Vite 5
  backend: Python 3.12 + FastAPI + LlamaIndex
  database: Supabase (PostgreSQL + pgvector)
```

## 開発環境

```yaml
ポート設定:
  frontend: 3247
  backend: 8432
  database: Supabase Cloud（ローカルDB不要）

環境変数:
  設定ファイル: .env.local（ルートディレクトリ）
  必須項目:
    - OPENAI_API_KEY
    - NOTION_API_TOKEN
    - GOOGLE_SERVICE_ACCOUNT_JSON
    - SUPABASE_URL
    - SUPABASE_ANON_KEY
    - SUPABASE_SERVICE_ROLE_KEY
    - ADMIN_PASSWORD
```

## テスト認証情報

```yaml
開発用アカウント:
  管理者パスワード: dev-admin-2026!

テスト利用者プロフィール:
  name: テスト太郎
  department: 研修チーム
  join_date: 2026-02
```

## コーディング規約

### 命名規則

```yaml
ファイル名:
  - コンポーネント: PascalCase.tsx (例: ChatScreen.tsx)
  - ユーティリティ: camelCase.ts (例: formatDate.ts)
  - 定数: UPPER_SNAKE_CASE.ts (例: API_ENDPOINTS.ts)
  - Pythonモジュール: snake_case.py (例: knowledge_sync.py)

変数・関数:
  - TypeScript変数: camelCase
  - TypeScript関数: camelCase
  - Python変数: snake_case
  - Python関数: snake_case
  - 定数: UPPER_SNAKE_CASE
  - 型/インターフェース: PascalCase
```

### コード品質

```yaml
必須ルール:
  - TypeScript: strictモード有効
  - 未使用の変数/import禁止
  - console.log本番環境禁止
  - エラーハンドリング必須
  - Python: type hints必須

フォーマット:
  - TypeScript: インデント スペース2つ、セミコロンあり、シングルクォート
  - Python: PEP 8準拠、インデント スペース4つ
```

### コミットメッセージ

```yaml
形式: "[type]: [description]"

type:
  - feat: 新機能
  - fix: バグ修正
  - docs: ドキュメント
  - style: フォーマット
  - refactor: リファクタリング
  - test: テスト
  - chore: その他

例: "feat: ユーザープロフィール入力モーダルを追加"
```

## プロジェクト固有ルール

### APIエンドポイント

```yaml
命名規則:
  - RESTful形式を厳守
  - 複数形を使用 (/conversations, /messages)
  - ケバブケース使用 (/knowledge-sources)
  - WebSocket: /ws/chat
```

### 型定義

```yaml
配置:
  frontend: src/types/index.ts
  backend: app/schemas/（Pydanticモデル）

同期ルール:
  - フロントエンドの型とバックエンドのPydanticスキーマは常に同一構造を保つ
  - 片方を更新したら即座にもう片方も更新
```

### 安心感プロンプト設計

```yaml
必須原則:
  - Do Not Deny: ユーザー入力を否定しない
  - Empathy First: 共感を先に返す
  - No Absolutes: 断定表現を避ける
  - Next Action: 次のアクションを必ず提示する

制約:
  - 聞き返し（追加質問）は1回まで
  - 「わかりません」で終わらせない
  - 参照ソースがない場合は正直に伝え、Next Actionを示す
```

## ⚠️ プロジェクト固有の注意事項

```yaml
- Notion API Rate Limit: 3リクエスト/秒。バッチ処理にはリトライ・スリープ実装必須
- NO ACTION原則: AIエージェントはRead-Only。システムへの書き込み操作は一切行わない
- 音声入力: Web Speech APIはHTTPS必須。localhost開発時は例外的に動作
- pgvector: Supabaseで拡張有効化が必要（CREATE EXTENSION vector）
- ナレッジソース: NotionとファイルアップロードのみサポートしてGoogle Driveは廃止済み
- 同期はBackgroundTask化（min-instances=1でCloud Run常時起動）+フロントポーリング方式
- Cloud Run: タイムアウト3600s、min-instances=1、リージョンasia-northeast1、プロジェクトcsai-488800
```

## 📝 作業ログ（最新5件）

```yaml
- 2026-03-02 参照ソースチップのリンク化（source_urlがある場合はクリックでNotion URLを新タブで開く、ホバーエフェクトあり）
- 2026-02-28 Google Drive廃止・Notion一本化（GDriveのDB行/document_chunks 171件/documents 80件をpsqlで削除、UI・GDrive関連コード138行削除）
- 2026-02-28 同期BackgroundTask化+ポーリング+Cloud Run min-instances=1（502タイムアウト解消、フロント5秒ごと最大5分ポーリング）
- 2026-02-28 ファイルアップロード機能追加（admin/knowledge-upload、.txt/.md/.csv/.html/.json、5MB制限）・エラー詳細表示・同期リセット・接続診断エンドポイント追加
- 2026-02-27 LLM/RAG統合完了（OpenAI GPT-4o-mini直接呼び出し、管理者プロンプト・Few-shot・会話履歴接続、ドキュメントチャンク+ベクトル検索、Notion/GDrive同期実装、RAGパイプライン統合、全44テストPASS）
```
