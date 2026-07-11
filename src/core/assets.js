// core/assets.js — 画像アセットの登録/遅延読込。画像が用意されていない ID は絵文字で代替（安全なフォールバック）。
// 画像は assets/images/ 配下に置き、ID→パスを IMAGE_SRC で対応づける。
// dev(ESM)/single-file(build) どちらでも、HTML からの相対パス 'assets/images/xxx.png' で解決される。
// ※ 単一ファイル配布(index.html)でも、画像は別ファイル参照（リポジトリ同梱）。GitHub Pages 前提。

const EMOJI = {
  egg: '🥚', dino: '🦖', insect: '🐛', ghost: '👻',
  ari: '🐜', ringo: '🍎', densha: '🚃', star: '⭐',
  // 単語カード用の絵文字フォールバック（画像が来るまでの暫定表示）
  shika: '🦌', kuma: '🐻', koara: '🐨', inu: '🐶',
};

// ID → 画像パス。ここに載っているIDは画像を試み、失敗時は呼び出し側指定の絵文字（無指定ならEMOJI）にフォールバック。
// 画像未生成のうちは空にしておけば全て絵文字表示のまま安全に動く。
// 単語カードの ID は "{hiragana|katakana}_{かなのローマ字}" の複合キー（例: hiragana_shi, katakana_a）。
// 実ファイルは assets/images/words/{hiragana|katakana}/{ローマ字}.png に対応。
const IMAGE_SRC = {
  // 例（画像を用意したらコメントアウトを外す）：
  // hiragana_shi: 'assets/images/words/hiragana/shi.png',
  // hiragana_ku:  'assets/images/words/hiragana/ku.png',
  // hiragana_ko:  'assets/images/words/hiragana/ko.png',
  // hiragana_i:   'assets/images/words/hiragana/i.png',
};

const assets = { images: {}, ready: false };

// 画像を並行プリロード。読めたものだけ assets.images[id] に HTMLImageElement を格納。
// 失敗しても reject しない（フォールバックするだけ）＝1枚壊れても全体は動く。
function loadAssets() {
  const ids = Object.keys(IMAGE_SRC);
  if (typeof Image === 'undefined' || ids.length === 0) { assets.ready = true; return Promise.resolve(assets); }
  return Promise.all(ids.map(id => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { assets.images[id] = img; resolve(); };
    img.onerror = () => { resolve(); };  // 失敗は握りつぶす（絵文字フォールバック）
    img.src = IMAGE_SRC[id];
  }))).then(() => { assets.ready = true; return assets; });
}

function getImage(id) { return assets.images[id] || null; }
function hasImage(id) { return !!assets.images[id]; }
function getEmoji(id) { return EMOJI[id] || '❓'; }

// 画像優先・絵文字フォールバックでキャンバスに「絵」を描く共通ヘルパ。
// cx,cy=中心, size=表示させたい一辺の目安(px)。画像はアスペクト比維持で size に収める。
function drawIcon(ctx, id, cx, cy, size, fallbackEmoji) {
  const img = getImage(id);
  if (img && img.width && img.height) {
    const scale = size / Math.max(img.width, img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    return true;
  }
  ctx.save();
  ctx.font = `${Math.round(size)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(fallbackEmoji || getEmoji(id), cx, cy);
  ctx.restore();
  return false;
}

export { assets, loadAssets, getEmoji, getImage, hasImage, drawIcon, EMOJI, IMAGE_SRC };
