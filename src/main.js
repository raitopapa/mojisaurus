// main.js — 起動エントリ。シーン登録 → UIボタン配線 → title 表示 → resize → ループ開始。
// ORDER 上は最後。dev(ESM) では input.js を副作用 import して pointer リスナを確実に読み込む。
import './core/input.js';
import { canvasEl, stageEl, resize } from './core/canvas.js';
import { scenes } from './core/scene-manager.js';
import { startLoop } from './core/game-loop.js';
import { SCENE } from './core/constants.js';
import { initAudioOnce, toggleMute, startBgm, setBgmVolume } from './core/audio.js';
import { setVoiceMode } from './core/speech.js';
import { loadAssets } from './core/assets.js';
import { loadSave } from './core/storage.js';
import { TitleScene } from './scenes/title.js';
import { HomeScene } from './scenes/home.js';
import { LessonScene } from './scenes/lesson.js';
import { GameSelectScene } from './scenes/game-select.js';
import { RewardScene } from './scenes/reward.js';
import { ZukanScene } from './scenes/zukan.js';
import { ParentScene } from './scenes/parent.js';

// 保存済み設定を反映
try {
  const sv = loadSave();
  if (sv && sv.settings) {
    setVoiceMode(sv.settings.voiceMode);
    setBgmVolume(sv.settings.bgmVolume ?? 0.35);
    // BGM ON なら開始を予約（実際の再生は初回タップでの音声アンロック後）
    if (sv.settings.bgmOn !== false) startBgm();
  }
} catch (_) {}

// シーン登録（クラスは全て定義済み＝登録は最後にまとめて＝連結順に強い）
scenes.register(SCENE.TITLE, new TitleScene());
scenes.register(SCENE.HOME, new HomeScene());
scenes.register(SCENE.LESSON, new LessonScene());
scenes.register(SCENE.GAME_SELECT, new GameSelectScene());
scenes.register(SCENE.REWARD, new RewardScene());
scenes.register(SCENE.ZUKAN, new ZukanScene());
scenes.register(SCENE.PARENT, new ParentScene());

// 画面右上アイコン（build.shell.html 由来）
const muteBtn = document.getElementById('muteBtn');
if (muteBtn) muteBtn.addEventListener('click', () => {
  initAudioOnce(); const m = toggleMute();
  muteBtn.textContent = m ? '🔇' : '🔊'; muteBtn.setAttribute('aria-pressed', String(m));
});
const fsBtn = document.getElementById('fsBtn');
if (fsBtn) fsBtn.addEventListener('click', () => {
  const el = stageEl || canvasEl;
  if (!document.fullscreenElement) { const f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) { try { f.call(el); } catch (_) {} } }
  else if (document.exitFullscreen) document.exitFullscreen();
});

loadAssets();
scenes.set(SCENE.TITLE);
resize();
startLoop();
