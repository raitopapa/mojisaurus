// scenes/game-select.js — Batch1 は雛形（じゅんびちゅう）。もどる で home へ。実装は後続バッチ。
import { COLORS, SCENE } from '../core/constants.js';
import { view, fillBg, label, pill } from '../core/canvas.js';
import { pointInRect } from '../core/utils.js';
import { scenes } from '../core/scene-manager.js';
import { sfxTap } from '../core/audio.js';
import { speak } from '../core/speech.js';

class GameSelectScene {
  enter() { this.t = 0; speak('じゅんびちゅう だよ'); }
  update(dt) { this.t += dt; }
  backRect() { const w = Math.min(view.w * 0.28, 190), h = Math.min(view.h * 0.11, 66); return { x: view.w * 0.04, y: view.h * 0.04, w, h }; }
  render() {
    fillBg();
    label('ゲームせんたく', view.w / 2, view.h * 0.4, { size: Math.min(view.w * 0.08, 56), color: COLORS.ink, weight: 800, shadow: 2 });
    label('じゅんびちゅう（Batch2いこう）', view.w / 2, view.h * 0.56, { size: Math.min(view.w * 0.048, 30), color: COLORS.ink, weight: 700 });
    this._back = this.backRect();
    pill(this._back, { fill: COLORS.btnZukan, top: '#a6e2ff', label: 'もどる', labelSize: 26 });
  }
  onPointerDown(x, y) { if (pointInRect(x, y, this._back || this.backRect())) { sfxTap(); scenes.set(SCENE.HOME); } }
}

export { GameSelectScene };
