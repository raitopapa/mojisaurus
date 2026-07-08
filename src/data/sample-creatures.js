// data/sample-creatures.js — 【仮データ・プレースホルダ】ずかん動作確認用の仲間リスト（各系統3体）。
// バッチ3で data/creatures.json（本データ・画像）に差し替え予定。絵文字はcore/assets.jsのEMOJIで代替。
const SAMPLE_CREATURES = {
  dino: [
    { id: 'dino_01', name: 'ガオン', kana: 'がおん' },
    { id: 'dino_02', name: 'ステゴン', kana: 'すてごん' },
    { id: 'dino_03', name: 'プテラン', kana: 'ぷてらん' },
  ],
  insect: [
    { id: 'ins_01', name: 'クワガー', kana: 'くわがー' },
    { id: 'ins_02', name: 'テントン', kana: 'てんとん' },
    { id: 'ins_03', name: 'アリンコ', kana: 'ありんこ' },
  ],
  ghost: [
    { id: 'gho_01', name: 'ボヤン', kana: 'ぼやん' },
    { id: 'gho_02', name: 'ヒュード', kana: 'ひゅーど' },
    { id: 'gho_03', name: 'ポワワ', kana: 'ぽわわ' },
  ],
};
const CATEGORY_ORDER = ['dino', 'insect', 'ghost'];
const CATEGORY_LABEL = { dino: 'きょうりゅう', insect: 'むし', ghost: 'おばけ' };

export { SAMPLE_CREATURES, CATEGORY_ORDER, CATEGORY_LABEL };
