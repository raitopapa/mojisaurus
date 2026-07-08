// core/input.js — Pointer Events（タッチ/マウス/ペン統一）を canvas に束縛し、
// 内部座標へ正規化して現在シーンへ委譲。マルチタッチは最初の1点のみ採用（仕様§8.4）。
// 副作用（リスナ登録）を持つので ORDER 上は canvas/scene-manager/audio/speech の後ろ。
import { canvasEl, toInternal } from './canvas.js';
import { scenes } from './scene-manager.js';
import { initAudioOnce } from './audio.js';
import { primeSpeech } from './speech.js';

const pointer = { x: 0, y: 0, down: false, id: null };
let primed = false;

function unlockOnce() { initAudioOnce(); if (!primed) { primeSpeech(); primed = true; } }

canvasEl.addEventListener('pointerdown', (e) => {
  if (pointer.down) return;                 // 既に1点追跡中なら無視
  unlockOnce();
  try { canvasEl.setPointerCapture(e.pointerId); } catch (_) {}
  pointer.down = true; pointer.id = e.pointerId;
  const p = toInternal(e.clientX, e.clientY); pointer.x = p.x; pointer.y = p.y;
  scenes.onPointerDown(p.x, p.y);
  e.preventDefault();
}, { passive: false });

canvasEl.addEventListener('pointermove', (e) => {
  if (!pointer.down || e.pointerId !== pointer.id) return;
  const p = toInternal(e.clientX, e.clientY); pointer.x = p.x; pointer.y = p.y;
  scenes.onPointerMove(p.x, p.y);
  e.preventDefault();
}, { passive: false });

function endPointer(e) {
  if (!pointer.down || (e.pointerId != null && e.pointerId !== pointer.id)) return;
  const p = toInternal(e.clientX ?? pointer.x, e.clientY ?? pointer.y);
  pointer.down = false; pointer.id = null;
  scenes.onPointerUp(p.x, p.y);
}
canvasEl.addEventListener('pointerup', endPointer);
canvasEl.addEventListener('pointercancel', endPointer);
canvasEl.addEventListener('lostpointercapture', endPointer);
canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

export { pointer, unlockOnce };
