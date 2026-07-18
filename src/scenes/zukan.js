// scenes/zukan.js — ずかん（仕様§5.3）。3系統タブ、取得済み=絵入り／未取得=シルエット＋「？」。
// タップで名前を音声再生。名前表記は settings.kanaNameDisplay（ひらがな/カタカナ）で切替。
import { COLORS, SCENE } from '../core/constants.js';
import { view, ctx, fillBg, label, rrPath } from '../core/canvas.js';
import { pointInRect } from '../core/utils.js';
import { scenes } from '../core/scene-manager.js';
import { sfxTap , setBgmTrack } from '../core/audio.js';
import { speak } from '../core/speech.js';
import { loadSave } from '../core/storage.js';
import { Button } from '../ui/button.js';
import { SAMPLE_CREATURES, CATEGORY_ORDER, CATEGORY_LABEL } from '../data/sample-creatures.js';
import { getEmoji } from '../core/assets.js';

const TAB_FILL = { dino: COLORS.btnKaku, insect: COLORS.btnKotoba, ghost: COLORS.btnKatakana };

class ZukanScene {
  enter() {
    setBgmTrack('home');
    this.save = loadSave(); this.tab = 'dino';
    this.tabButtons = CATEGORY_ORDER.map(cat => new Button({ label: CATEGORY_LABEL[cat], fill: TAB_FILL[cat], labelSize: 22, onTap: () => { this.tab = cat; } }));
    this.backBtn = new Button({ label: 'もどる', fill: COLORS.btnZukan, top: '#a6e2ff', labelSize: 24, onTap: () => scenes.set(SCENE.HOME) });
  }

  _totalObtained() { return CATEGORY_ORDER.reduce((n, c) => n + ((this.save.collection[c] || []).length), 0); }
  _totalAll() { return CATEGORY_ORDER.reduce((n, c) => n + SAMPLE_CREATURES[c].length, 0); }

  _layout() {
    const W = view.w, H = view.h;
    const tw = Math.min(W * 0.26, 200), th = Math.min(H * 0.09, 56), tgap = 12;
    const totalW = tw * 3 + tgap * 2, tx0 = (W - totalW) / 2, ty = H * 0.1;
    this.tabButtons.forEach((b, i) => b.setRect(tx0 + i * (tw + tgap), ty, tw, th));
    this.backBtn.setRect(W * 0.04, H * 0.04, Math.min(W * 0.24, 150), Math.min(H * 0.09, 54));

    const list = SAMPLE_CREATURES[this.tab];
    const cols = 3, cellW = Math.min(W * 0.24, 190), cellH = cellW * 1.05;
    const gapX = (W - cellW * cols) / (cols + 1);
    const gridTop = ty + th + H * 0.05;
    this.slots = list.map((creature, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = gapX + col * (cellW + gapX), y = gridTop + row * (cellH + H * 0.03);
      return { creature, x, y, w: cellW, h: cellH };
    });
  }

  update() {}
  render() {
    fillBg(); this._layout();
    label('ずかん', view.w / 2, view.h * 0.045, { size: Math.min(view.w * 0.06, 36), color: COLORS.ink, weight: 800, shadow: 2 });
    if (this._totalObtained() >= this._totalAll()) label('🎉 コンプリート！ 🎉', view.w / 2, view.h * 0.045 + 34, { size: 18, color: '#c9820a', weight: 800 });
    this.backBtn.render();
    this.tabButtons.forEach((b, i) => { b.labelColor = this.tab === CATEGORY_ORDER[i] ? '#ffffff' : '#ffffff'; b.render(); if (this.tab === CATEGORY_ORDER[i]) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; rrPath(b.x - 2, b.y - 2, b.w + 4, b.h + 4, Math.min(b.w, b.h) * 0.34); ctx.stroke(); ctx.restore(); } });

    const have = this.save.collection[this.tab] || [];
    for (const s of this.slots) {
      const obtained = have.includes(s.creature.id);
      ctx.save(); ctx.fillStyle = obtained ? 'rgba(255,255,255,0.9)' : 'rgba(120,130,150,0.25)'; rrPath(s.x, s.y, s.w, s.h, 20); ctx.fill();
      ctx.strokeStyle = obtained ? COLORS.accent : 'rgba(120,130,150,0.4)'; ctx.lineWidth = 3; rrPath(s.x, s.y, s.w, s.h, 20); ctx.stroke(); ctx.restore();
      if (obtained) {
        label(getEmoji(this.tab), s.x + s.w / 2, s.y + s.h * 0.42, { size: s.w * 0.34 });
        const name = this.save.settings.kanaNameDisplay === 'hiragana' ? s.creature.kana : s.creature.name;
        label(name, s.x + s.w / 2, s.y + s.h * 0.8, { size: Math.min(s.w * 0.13, 20), color: COLORS.ink, weight: 700 });
      } else {
        label('？', s.x + s.w / 2, s.y + s.h * 0.42, { size: s.w * 0.3, color: 'rgba(80,90,110,0.6)' });
        label('？？？', s.x + s.w / 2, s.y + s.h * 0.8, { size: Math.min(s.w * 0.12, 18), color: 'rgba(80,90,110,0.55)' });
      }
    }
  }

  onPointerDown(x, y) {
    if (this.backBtn.hitTest(x, y)) { sfxTap(); this.backBtn.tap(); return; }
    for (const b of this.tabButtons) if (b.hitTest(x, y)) { sfxTap(); b.tap(); return; }
    const have = this.save.collection[this.tab] || [];
    for (const s of (this.slots || [])) {
      if (pointInRect(x, y, s)) {
        if (have.includes(s.creature.id)) { sfxTap(); const name = this.save.settings.kanaNameDisplay === 'hiragana' ? s.creature.kana : s.creature.name; speak(name); }
        return;
      }
    }
  }
}

export { ZukanScene };
