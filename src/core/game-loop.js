// core/game-loop.js — 固定タイムステップのメインループ（dash 同型）。scenes に委譲。
import { STEP } from './constants.js';
import { scenes } from './scene-manager.js';

const clock = { t: 0 };          // 経過秒（演出の時間基準・シーンから参照可）
let _last = 0, _acc = 0, _running = false;

function frame(t) {
  if (!_running) return;
  if (!_last) _last = t;
  let dt = (t - _last) / 1000; _last = t;
  if (dt > 0.1) dt = 0.1;        // タブ復帰などの巨大 dt を抑制
  clock.t += dt; _acc += dt;
  let steps = 0;
  while (_acc >= STEP && steps < 5) { scenes.update(STEP); _acc -= STEP; steps++; }
  if (_acc > STEP) _acc = 0;
  scenes.render();
  requestAnimationFrame(frame);
}
function startLoop() { if (_running) return; _running = true; _last = 0; _acc = 0; requestAnimationFrame(frame); }
function stopLoop() { _running = false; }

export { clock, startLoop, stopLoop, frame };
