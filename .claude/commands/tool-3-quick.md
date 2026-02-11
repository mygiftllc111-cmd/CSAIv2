# Tool 3 Quick: デバッグメモを記録します

開発中に遭遇した小さなエラーと解決策を素早く記録します。

## 使い方

```
/tool-3-quick "エラー内容 → 解決策"
```

## 例

```
/tool-3-quick "zustand hydration → useEffect で mounted 待ち"
/tool-3-quick "MUI SSR エラー → 'use client' 追加"
/tool-3-quick "Next.js fetch キャッシュ → cache: 'no-store'"
```

## 処理内容

1. `.claude/debug-notes.md` にメモを追記
2. 同じメモがあれば回数をカウントアップ
3. 3回以上のパターンは正式登録を提案

---

**引数**: $ARGUMENTS

以下の手順で処理してください：

1. 引数からメモ内容を取得
2. `.claude/debug-notes.md` を読み込み（なければ作成）
3. 同じパターンがあるか確認
   - あれば：回数を+1
   - なければ：新規追加
4. ファイルを更新
5. 3回以上のパターンがあれば「正式登録しますか？」と提案

**注意**: 引数が空の場合は、最近のメモ一覧を表示してください。
