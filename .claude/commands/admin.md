# Admin: gambit-admin コマンド一覧を表示します

以下のコマンドを新規ターミナルで実行してください：

```bash
gambit-admin help
```

**実行手順**:

1. VS Codeで新しいターミナルを開く (Ctrl+Shift+` または Cmd+Shift+`)
2. `gambit-admin help` を実行

**利用可能なコマンド**:

| コマンド                    | 説明                           |
| --------------------------- | ------------------------------ |
| `gambit-admin account`      | 現在のアカウント状態を表示     |
| `gambit-admin switch my`    | 私のアカウントに切り替え       |
| `gambit-admin switch owned` | owned toolに切り替え           |
| `gambit-admin deploy check` | デプロイ前の確認               |
| `gambit-admin auth`         | スーパーアドミン環境変数を設定 |
| `gambit-admin logout`       | セッション終了                 |

**注意**: 初回実行時はパスワード認証が必要です（セッションは1時間有効）
