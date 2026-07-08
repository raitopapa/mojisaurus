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
    canvas.js / game-loop.js / scene-manager.js / input.js / audio.js / speech.js / storage.js / assets.js
  data/
    sample-strokes.js    【本データ】KanjiVG由来の筆順データ（し・く・こ・い の4字）→ Batch3で全92字に拡張
    sample-creatures.js  【仮データ】ずかん検証用の仲間9体（3系統×3）→ Batch3でcreatures.jsonに差替
  ui/
    button.js  gao.js  star-fx.js  egg-gauge.js   再利用ウィジェット
  games/
    game-base.js         全ミニゲーム共通契約
    w1-nazori-hira.js     【W1】なぞりがき・ひらがな（§7の寛容な判定を実装）
  scenes/
    title.js  home.js  lesson.js  zukan.js  parent.js   実装済み
    game-select.js  reward.js                            雛形のまま（未使用・次バッチ）
build.mjs / build.shell.html / scripts/serve.mjs / test/smoke.mjs / CREDITS.md
```

## ビルド規約（重要）
- `index.html` は生成物。**手で編集しない**（`src/` を直して `npm run build`）。
- 各モジュールの `export` は**末尾に単一行** `export { ... };`（連結時に行頭 import/export を除去するため）。
- 連結後は単一 IIFE スコープ＝**トップレベル名は全モジュールで一意**に（`build.mjs`実行時に重複チェック推奨）。
- 新モジュールは `build.mjs` の `ORDER` に追加（`main.js` は必ず最後、副作用モジュールは依存の後ろ）。

## ステータス
- **Batch1（土台）＝完了**：タイトル→ホーム遷移。
- **Batch2（MVPの核）＝完了**：`かく`→W1なぞりがきを実プレイ→星集計→たまご孵化→ずかん登録、の一巡が動作。保護者ゲート（3→1→5）→設定/進捗パネル→データリセット（二重確認）も実装。
  - 筆順データは**KanjiVG本データ**（し・く・こ・いの4字、CC BY-SA 3.0・帰属はCREDITS.md）。仲間データは仮データ（9体）のまま、Batch3でcreatures.jsonに差替予定。
  - 未実装：`ことばあそび`/`カタカナ・とくべつ`モード（L1しりとり・L2なかまあつめ等）、独立した`reward.js`演出シーン（孵化処理は今回`lesson.js`に簡易実装）、`game_select`。
- 次：本データ投入（kana.json全92字・KanjiVG由来strokes.json・creatures.json）、L1/L2、`reward.js`切り出し。
