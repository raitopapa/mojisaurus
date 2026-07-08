// core/assets.js — アセット登録/読込の器（Batch1は最小）。画像未用意時は絵文字で代替（仕様§6.5注記）。
// 差し替え可能なよう ID 参照。本読込は将来バッチで拡張。

const EMOJI = {
  egg: '🥚', dino: '🦖', insect: '🐛', ghost: '👻',
  ari: '🐜', ringo: '🍎', densha: '🚃', star: '⭐',
};

const assets = { images: {}, ready: false };

// 将来：画像/音声のプリロード。今は即 resolve。
function loadAssets() { assets.ready = true; return Promise.resolve(assets); }
function getEmoji(id) { return EMOJI[id] || '❓'; }

export { assets, loadAssets, getEmoji, EMOJI };
