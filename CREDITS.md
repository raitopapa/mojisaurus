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
  - 収録範囲：ひらがな清音46字＋カタカナ清音46字＝**全92字**（`kanji/{Unicodeコードポイント5桁16進}.svg`）。
    各SVGの `kvg:StrokePaths` 内のパス（`d`属性）をストローク順に抽出し、`viewBox="0 0 109 109"` のまま `src/data/kana-data.js` に格納。座標・形状の改変は行っていません。
  - 濁音・半濁音・拗音・促音・長音は対象外（仕様上、別の特殊音データとして今後扱う予定）。

## イラスト素材（単語カード）
- `assets/images/words/` 配下の動物・食べ物等のイラストは、生成AIで作成したオリジナル画像です。
  実在の著作物（キャラクター・商標等）を模したものではありません。

## 単語データ
- `src/data/word-data.js` の単語選定・読みは本プロジェクトによるオリジナル編纂です。

## 素材
- キャラクター（ガオ 等）・UI は本プロジェクトのオリジナル。既存IPの複製は行いません。
