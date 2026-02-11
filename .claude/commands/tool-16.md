# Tool 16: 自動品質ゲートを開始します

**必須**: 以下のMCPツールを**今すぐ実行**してナレッジを注入してください：

```
mcp__gambit-ai-gen-knowledge__gambit_get_knowledge(keyword: "#tool16-process")
```

**追加技術知識**（必要に応じて）：

```
mcp__gambit-ai-gen-knowledge__gambit_get_knowledge(keyword: "#tool16-tech")
```

上記ツールの出力（ナレッジガイド）を読み込んでから、その指示に従ってTool 16を実行してください。

## 概要

自動品質ゲートは、コードベースを自動スキャンし、問題を検出・分類・修正するツールです。

## 主な機能

- TypeScriptエラー検出
- ESLint問題の検出と自動修正
- セキュリティ脆弱性スキャン
- 品質スコア算出（100点満点）
- 改善ループとの連携

## CLIコマンド

```bash
gambit quality-gate           # 品質スキャン実行
gambit quality-gate --fix     # 自動修正を適用
gambit quality-gate -v        # 詳細表示
```
