# クレジット / Credits

## フォント
- 端末内蔵の丸ゴシック（Hiragino Maru Gothic ProN / Yu Gothic UI / M PLUS Rounded 1c 等）にフォールバック。
  外部フォント読込に依存せず、オフラインで動作します。

## 音声
- 効果音: Web Audio API による合成（同梱データ不要）。
- 読み上げ: Web Speech API（`speechSynthesis`, ja-JP）。端末のTTSを利用します。
  将来 `voiceMode:"file"` で録音音声への差し替えに対応予定。

## 筆順データ
- ひらがな・カタカナの筆順表示には **KanjiVG** を使用しています。
  - © Ulrich Apel / KanjiVG project — ライセンス: **Creative Commons BY-SA 3.0**
  - https://kanjivg.tagaini.net/
  - 現在の収録範囲：し・く・こ・い の4字（`kanji/03057.svg`, `kanji/0304f.svg`, `kanji/03053.svg`, `kanji/03044.svg`）。
    各SVGの `kvg:StrokePaths` 内のパス（`d`属性）をストローク順に抽出し、`viewBox="0 0 109 109"` のまま `src/data/sample-strokes.js` に格納。座標・形状の改変は行っていません。
  - ひらがな・カタカナ全92字への拡張はBatch3で同じ手順により実施予定。

## 素材
- キャラクター（ガオ 等）・UI は本プロジェクトのオリジナル。既存IPの複製は行いません。
