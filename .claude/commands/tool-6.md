# Tool 6: セキュリティ超強化を開始します

**必須**: 以下のMCPツールを**今すぐ実行**してナレッジを注入してください：

```
mcp__gambit-ai-gen-knowledge__gambit_get_knowledge(keyword: "#tool6-process")
```

**追加技術知識**（必要に応じて）：

```
mcp__gambit-ai-gen-knowledge__gambit_get_knowledge(keyword: "#tool6-tech")
```

上記ツールの出力（ナレッジガイド）を読み込んでから、その指示に従ってTool 6を実行してください。

## Tool 6の機能概要

- **診断・監査**: OWASP Top 10、脆弱性スキャン、コードレビュー
- **防御機能**: AIクローラーブロック、WAF、レートリミット（ON/OFF設定可能）
- **アップデート対応**: CVE監視、依存関係の脆弱性チェック、自動パッチ提案

## 実行オプション

このToolは引数によって動作を変えることができます：

- `/tool-6` - フル診断（推奨）
- `/tool-6 --quick` - クイック診断
- `/tool-6 --ai-block` - AIクローラーブロック設定のみ
- `/tool-6 --deps` - 依存関係脆弱性チェックのみ
- `/tool-6 --update` - セキュリティアップデートチェック
