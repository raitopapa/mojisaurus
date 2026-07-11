# もじざうるす

ひらがな・カタカナが読める子ども（5歳目安）向けの国語ゲーム。
純 Canvas 2D + ネイティブ ES Modules + 独自ビルド（Bramble系と同方式）。外部ライブラリ0・完全オフライン。

## 動かす

**開発（そのまま実行・ビルド不要）**
```bash
npm run serve      # → http://localhost:5173/ で index.dev.html を配信（ESMを直読み）
```
※ ES Modules は file:// 直開き不可のため、必ずローカルサーバ経由で開いてください。

**配布用ビルド（単一ファイル）**
```bash
npm run build      # src/ を連結して index.html（単一HTML）と index.dev.html を生成
```
`index.html` は全部入りの単一ファイルなので、ダブルクリックで直接開けます（GitHub Pages 配信用）。

**テスト（ヘッドレス起動・無回帰）**
```bash
npm test           # build → test/smoke.mjs（起動と title→home→lesson 遷移を検証）
```

## 構成（Batch1: 土台 → Batch2: MVPの核）
```
src/
  main.js                起動エントリ
  core/
    constants.js         寸法・配色・保存キー・共有バランス定数（STARS_PER_EGG等）
    utils.js             純関数（clamp/lerp/rand/pointInRect等）
    svg-path.js          依存ゼロのSVGパスパーサ＆等間隔サンプラ（なぞり判定の土台）
    canvas.js / game-loop.js / scene-manager.js / input.js / audio.js（BGM合成込み） / speech.js / storage.js / assets.js（画像/絵文字フォールバック）
  data/
    kana-data.js         【本データ】KanjiVG由来の筆順（ひらがな清音46＋カタカナ清音46＝全92字）
    word-data.js         【本データ】各字を頭文字とする単語＋絵文字（92字ぶん・単語カード用）
    vocab-words.js       【本データ】ことばあそび用の語彙辞書 約100語（しりとり接続性を検証済み・mora/category付き）
    confusables.js       【本データ】にてる字の対応表（G2と将来のK1で使用）
    sample-creatures.js  【仮データ】ずかん検証用の仲間9体（3系統×3）→ 後日creatures.jsonに差替
  ui/
    button.js  gao.js  star-fx.js  egg-gauge.js   再利用ウィジェット
  games/
    game-base.js         全ミニゲーム共通契約
    w1-nazori-hira.js     【W1】なぞりがき（§7の寛容な判定。ひらがな/カタカナ共用）
    l1-shiritori.js       【L1】しりとり（ガオと交互・語尾音マッチ・ん終わりトラップ）
    l2-nakama.js          【L2】なかまあつめ（カテゴリのかごへ振り分け）
    g1-anagram.js         【G1】もじならべ（アナグラム：絵をヒントに文字カードをドラッグで並べ替え）
    g2-maze.js            【G2】もじめいろ（指なぞり迷路：分岐で正しい字 vs 鏡文字/にてる字を見分けて進む）
  scenes/
    title.js  home.js  lesson.js  zukan.js  parent.js   実装済み
    game-select.js  reward.js                            雛形のまま（未使用・次バッチ）
build.mjs / build.shell.html / scripts/serve.mjs / test/smoke.mjs / CREDITS.md
docs/word-image-list.md   単語カード用イラスト92枚の生成リスト（AI画像生成に渡す用）
assets/images/words/{hiragana|katakana}/  単語カード用画像の置き場所（未配置分は絵文字表示）
```

## ビルド規約（重要）
- `index.html` は生成物。**手で編集しない**（`src/` を直して `npm run build`）。
- 各モジュールの `export` は**末尾に単一行** `export { ... };`（連結時に行頭 import/export を除去するため）。
- 連結後は単一 IIFE スコープ＝**トップレベル名は全モジュールで一意**に（`build.mjs`実行時に重複チェック推奨）。
- 新モジュールは `build.mjs` の `ORDER` に追加（`main.js` は必ず最後、副作用モジュールは依存の後ろ）。

## ステータス
- **Batch1（土台）＝完了**：タイトル→ホーム遷移。
- **Batch2（MVPの核）＝完了・拡張済み**：`かく`(ひらがな)／`カタカナ・とくべつ`の両モードでW1なぞりがきを実プレイ→星集計→たまご孵化→ずかん登録、の一巡が動作。
  - **筆順データはKanjiVG本データでひらがな・カタカナ全92字**（CC BY-SA 3.0・帰属はCREDITS.md）。出題は「まだ練習が少ない字」を優先しつつランダムに選出（`save.mastery`で軽く進捗管理）。
  - **単語カード**：なぞり完了ごとに単語＋絵（画像 or 絵文字フォールバック）をごほうび表示。92字ぶんの単語データ・生成用プロンプトは`docs/word-image-list.md`。
  - **BGM**：合成音の控えめループ。おうちのかた画面でON/OFF・音量調整可。
  - **プレイ中の戻るボタン**：なぞり判定より優先してヒット判定。
  - 仲間（ずかん）データは仮データ（9体）のまま、後日creatures.jsonに差替予定。
- **しりとり／なかまあつめ＝完了（独立ボタン化）**：ホームを再編し、`しりとり`と`なかまあつめ`を別ボタンに分離。
  - **しりとり**：タップで**ひらがな/カタカナを選択**→ガオと交互・語尾音マッチ・ん(ン)終わりトラップ・2ミスヒント。カタカナは長音ー/濁点の接続も処理。両プールとも5ターン継続を機械検証済み。
  - **なかまあつめ**：カテゴリのかごへカードを振り分け（当面ひらがな語彙）。
  - 語彙辞書は独自編纂（`data/vocab-words.js`：ひらがな約100語＋カタカナ約80語、mora/category付き）。
  - **もじならべ（G1）**：絵をヒントに、シャッフルされた文字カードをドラッグ入替で並べて単語を完成（3ラウンド）。
  - **もじめいろ（G2）**：指でなぞって進む迷路。分岐3箇所に「正しい字」と「まちがい形（50%鏡文字／50%にてる字：シ↔ツ・ぬ↔め等）」が現れ、正しい方だけがゴールへ続く。鏡文字はKanjiVG筆順のx反転で生成（新データ不要・字形が正確）。
  - これで**学習6ボタン（かく／しりとり／なかまあつめ／カタカナ・とくべつ／もじならべ／もじめいろ）が全て遊べる状態**。
  - 未実装：独立した`reward.js`演出シーン（孵化処理は今回`lesson.js`に簡易実装）、`game_select`、濁音・半濁音・拗音等の特殊音、L1の「バラのかなで自分で作る」発展モード、L3反対ことば等。
- 次：`reward.js`切り出し、特殊音データ、仲間データの本実装、単語カード画像の差し込み。
