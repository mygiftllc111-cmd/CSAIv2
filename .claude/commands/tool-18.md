# Tool 18: 効果測定ダッシュボードを開始します

**必須**: 以下のMCPツールを**今すぐ実行**してナレッジを注入してください：

```
mcp__gambit-ai-gen-knowledge__gambit_get_knowledge(keyword: "#tool18-process")
```

**追加技術知識**（必要に応じて）：

```
mcp__gambit-ai-gen-knowledge__gambit_get_knowledge(keyword: "#tool18-tech")
```

上記ツールの出力（ナレッジガイド）を読み込んでから、その指示に従ってTool 18を実行してください。

## 概要

効果測定ダッシュボードは、品質改善の効果を可視化し、Before/After比較やトレンド分析を行うツールです。

## 主な機能

- 品質スコアのトレンド表示
- 改善効果のBefore/After比較
- カテゴリ別の問題分析
- 修正率の追跡

## CLIコマンド

```bash
gambit metrics              # メトリクス表示
gambit metrics --detailed   # 詳細分析
gambit metrics --json       # JSON出力
```
