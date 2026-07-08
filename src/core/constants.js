// core/constants.js — 純粋データ（物理・寸法・配色・保存キー）。他モジュール依存なし。
// Bramble系の規約に合わせ、export は末尾に1つだけ置く（build.mjs が行頭 import/export を除去）。

const STEP = 1 / 60;            // 固定タイムステップ（loop）
const BASE_W = 960;             // 内部座標の基準幅（16:9 目安、resize でスケール）
const BASE_H = 540;             // 内部座標の基準高さ

const SAVE_KEY = 'mojisaurus.save.v1';
const SAVE_VERSION = 1;

const VOICE_RATE = 0.95;        // TTS 読み上げ速度（仕様§8.5）
const STARS_PER_EGG = 22;       // たまご孵化に必要な星（仕様§10目安・home/lesson共有）

// シーン名（scene-manager のキー）。文字列直書きの散逸を防ぐ。
const SCENE = {
  TITLE: 'title', HOME: 'home', LESSON: 'lesson', GAME_SELECT: 'game_select',
  REWARD: 'reward', ZUKAN: 'zukan', PARENT: 'parent',
};

// 明るくポップな「もじのしま」パレット（怖い/暗い配色は避ける・仕様§2）
const COLORS = {
  skyTop: '#8fd0ff', skyBot: '#dff4ff',
  grass: '#74d06e', grassDark: '#4bb04a',
  sand: '#ffe3ad', sandDark: '#f4c877',
  ink: '#2b3a67',            // 文字・輪郭（黒でなく深い青）
  accent: '#ffc53a',         // アクセント（金）
  white: '#ffffff',
  // ホームの学習ボタン色（陽気に色分け）
  btnKaku: '#ff8a5c', btnKotoba: '#57c06a', btnKatakana: '#b58cff',
  btnZukan: '#5cc8ff', btnParent: '#c9b191',
  gao: '#7fd47a', gaoDark: '#4fae55', gaoBelly: '#eafbe6',
};

export { STEP, BASE_W, BASE_H, SAVE_KEY, SAVE_VERSION, VOICE_RATE, STARS_PER_EGG, SCENE, COLORS };
