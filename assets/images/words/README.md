# 単語カード用イラストの置き場所

**最新版**：詳しい一覧・プロンプトは `docs/word-image-list.md` を参照（ひらがな46＋カタカナ46＝92枚）。
このファイルは配置方法だけの簡易メモです。

## 保存先とファイル名
- ひらがな → `assets/images/words/hiragana/{ローマ字}.png`（例: `shi.png`＝し）
- カタカナ → `assets/images/words/katakana/{ローマ字}.png`（例: `a.png`＝ア）
- ローマ字は**かなの読み**（単語名ではない）。例：し→`shi.png`、く→`ku.png`、こ→`ko.png`、い→`i.png`
- 正方形・512〜1024px・背景は白か透過PNG推奨

※ ひらがなとカタカナで同じローマ字（`a.png`等）を使いますが、フォルダが違うので衝突しません。

## 置いたあとの有効化
`src/core/assets.js` の `IMAGE_SRC` に、`{hiragana|katakana}_{ローマ字}` の複合キーで追加します：

```js
const IMAGE_SRC = {
  hiragana_shi: 'assets/images/words/hiragana/shi.png',
  hiragana_ku:  'assets/images/words/hiragana/ku.png',
  hiragana_ko:  'assets/images/words/hiragana/ko.png',
  hiragana_i:   'assets/images/words/hiragana/i.png',
  // 増えたらここに追記していく
};
```

そのあと `npm run build` すると、単語カードが絵文字から画像に切り替わります。
画像が無い／読めない場合は自動で絵文字にフォールバックするので、1枚ずつ追加してもOKです。

## 生成プロンプト・全92枚の一覧
`docs/word-image-list.md` を参照してください。共通スタイル指定とキャラクター別の被写体・ファイル名がまとまっています。
