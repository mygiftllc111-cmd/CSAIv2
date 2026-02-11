# Tool 17: 改善実行ループを開始します

**必須**: 以下のMCPツールを**今すぐ実行**してナレッジを注入してください：

```
mcp__gambit-ai-gen-knowledge__gambit_get_knowledge(keyword: "#tool17-process")
```

**追加技術知識**（必要に応じて）：

```
mcp__gambit-ai-gen-knowledge__gambit_get_knowledge(keyword: "#tool17-tech")
```

上記ツールの出力（ナレッジガイド）を読み込んでから、その指示に従ってTool 17を実行してください。

## 概要

改善実行ループは、品質ゲートで検出された問題を優先順位に従って自動修正し、目標スコアに到達するまで反復するツールです。

## 主な機能

- HIGH → MEDIUM → LOW の優先度順修正
- 自動修正可能な問題の一括修正
- 反復的な品質改善
- 進捗トラッキング

## CLIコマンド

```bash
gambit improve                    # 改善ループ開始
gambit improve --target 90        # 目標スコア90点
gambit improve --max-iterations 3 # 最大3回の反復
```
