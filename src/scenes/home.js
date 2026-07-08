// scenes/home.js — ホーム。大ボタン＋たまごゲージ＋ガオ。ui/ の再利用ウィジェットを使用。
// 学習ボタンは target(遷移先)に加え mode を持たせ、lesson側で出題モードを判別する。
import { COLORS, SCENE, STARS_PER_EGG } from '../core/constants.js';
import { view, fillBg, label } from '../core/canvas.js';
import { scenes } from '../core/scene-manager.js';
import { sfxTap } from '../core/audio.js';
import { speak } from '../core/speech.js';
import { loadSave } from '../core/storage.js';
import { Button } from '../ui/button.js';
import { Gao } from '../ui/gao.js';
import { EggGauge } from '../ui/egg-gauge.js';

class HomeScene {
  enter() {
    this.t = 0;
    this.save = loadSave();
    this.gao = new Gao({ mood: 'normal' });
    this.egg = new EggGauge({ max: STARS_PER_EGG, value: this.save.eggProgress || 0 });
    const specs = [
      { label: 'かく', target: SCENE.LESSON, mode: 'write', fill: COLORS.btnKaku, top: '#ffb190' },
      { label: 'ことばあそび', target: SCENE.LESSON, mode: 'vocab', fill: COLORS.btnKotoba, top: '#8fe19a' },
      { label: 'カタカナ・とくべつ', target: SCENE.LESSON, mode: 'katakana', fill: COLORS.btnKatakana, top: '#d3b8ff' },
      { label: 'ずかん', target: SCENE.ZUKAN, fill: COLORS.btnZukan, top: '#a6e2ff', small: true },
      { label: 'おうちのかた', target: SCENE.PARENT, fill: COLORS.btnParent, top: '#e3d3b6', labelColor: COLORS.ink, small: true },
    ];
    this.buttons = specs.map(s => new Button({ label: s.label, fill: s.fill, top: s.top, labelColor: s.labelColor, onTap: () => scenes.set(s.target, { mode: s.mode }) }));
    this._meta = specs;
    this._layout();
  }

  _layout() {
    const W = view.w, H = view.h;
    this.gao.x = W * 0.12; this.gao.y = H * 0.6; this.gao.size = Math.min(W * 0.075, 56);
    const topPad = H * 0.20;
    const cols = W >= 720 ? 3 : 1;
    const bw = cols === 3 ? Math.min(W * 0.27, 300) : Math.min(W * 0.8, 460);
    const bh = cols === 3 ? Math.min(H * 0.28, 150) : Math.min(H * 0.13, 84);
    const gapX = cols === 3 ? (W - bw * 3) / 4 : 0;
    const gapY = bh * 0.28;
    for (let i = 0; i < 3; i++) {
      let x, y;
      if (cols === 3) { x = gapX + i * (bw + gapX); y = topPad + (H - topPad) * 0.12; }
      else { x = (W - bw) / 2; y = topPad + i * (bh + gapY); }
      this.buttons[i].setRect(x, y, bw, bh); this.buttons[i].labelSize = cols === 3 ? 34 : 30;
    }
    const sw = Math.min(W * 0.32, 240), sh = Math.min(H * 0.12, 72);
    const sy = H - sh - H * 0.05, sgap = Math.min(W * 0.06, 40);
    const totalW = sw * 2 + sgap, sx0 = (W - totalW) / 2;
    this.buttons[3].setRect(sx0, sy, sw, sh); this.buttons[3].labelSize = 28;
    this.buttons[4].setRect(sx0 + sw + sgap, sy, sw, sh); this.buttons[4].labelSize = 22;
  }

  drawEggGauge() {
    const W = view.w, H = view.h, bw = Math.min(W * 0.6, 460), bh = 26, x = (W - bw) / 2, y = H * 0.09;
    label('たまごまで', x - 8, y + bh / 2, { size: 22, align: 'right', color: COLORS.ink, weight: 800 });
    this.egg.render(x, y, bw, bh);
    label(`${this.save.stars || 0}こ の ⭐`, W / 2, y + bh + 22, { size: 18, color: COLORS.ink, weight: 700 });
  }

  update(dt) { this.t += dt; this.gao.update(dt); this.egg.update(dt); }
  render() {
    fillBg(); this._layout(); this.drawEggGauge();
    this.gao.render();
    for (const b of this.buttons) b.render();
  }
  onPointerDown(x, y) {
    for (let i = 0; i < this.buttons.length; i++) {
      const b = this.buttons[i];
      if (b.hitTest(x, y)) { sfxTap(); speak(this._meta[i].label.replace('・', ' ')); b.tap(); return; }
    }
  }
}

export { HomeScene };
