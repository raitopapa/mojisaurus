// scenes/home.js — ホーム。学習4ボタン（かく/しりとり/なかまあつめ/カタカナ・とくべつ）＋ずかん/おうちのかた。
// 「しりとり」はタップでひらがな/カタカナの選択オーバーレイを出す。
import { COLORS, SCENE, STARS_PER_EGG } from '../core/constants.js';
import { view, ctx, fillBg, label, rrPath } from '../core/canvas.js';
import { scenes } from '../core/scene-manager.js';
import { sfxTap, setBgmTrack } from '../core/audio.js';
import { speak } from '../core/speech.js';
import { loadSave } from '../core/storage.js';
import { Button } from '../ui/button.js';
import { Gao } from '../ui/gao.js';
import { EggGauge } from '../ui/egg-gauge.js';

class HomeScene {
  enter() {
    this.t = 0;
    setBgmTrack('home');
    this.save = loadSave();
    this.gao = new Gao({ mood: 'normal' });
    this.egg = new EggGauge({ max: STARS_PER_EGG, value: this.save.eggProgress || 0 });
    this.overlay = null;  // 'shiritori' のときサブ選択を表示
    const specs = [
      { label: 'かく', fill: COLORS.btnKaku, top: '#ffb190', onTap: () => scenes.set(SCENE.LESSON, { mode: 'write' }) },
      { label: 'しりとり', fill: COLORS.btnKotoba, top: '#8fe19a', onTap: () => { this.overlay = 'shiritori'; } },
      { label: 'なかまあつめ', fill: '#ffcf5c', top: '#ffe08a', labelColor: COLORS.ink, onTap: () => scenes.set(SCENE.LESSON, { mode: 'nakama' }) },
      { label: 'カタカナ・とくべつ', fill: COLORS.btnKatakana, top: '#d3b8ff', onTap: () => scenes.set(SCENE.LESSON, { mode: 'katakana' }) },
      { label: 'もじならべ', fill: '#ff9ec6', top: '#ffc1da', onTap: () => scenes.set(SCENE.LESSON, { mode: 'anagram' }) },
      { label: 'もじめいろ', fill: '#7fd0c9', top: '#aee5e0', onTap: () => scenes.set(SCENE.LESSON, { mode: 'maze' }) },
      { label: 'ずかん', fill: COLORS.btnZukan, top: '#a6e2ff', onTap: () => scenes.set(SCENE.ZUKAN) },
      { label: 'おうちのかた', fill: COLORS.btnParent, top: '#e3d3b6', labelColor: COLORS.ink, onTap: () => scenes.set(SCENE.PARENT) },
    ];
    this.buttons = specs.map(s => new Button({ label: s.label, fill: s.fill, top: s.top, labelColor: s.labelColor, onTap: s.onTap }));
    this._meta = specs;
    // オーバーレイ内ボタン
    this.hiraBtn = new Button({ label: 'ひらがな', fill: COLORS.btnKaku, top: '#ffb190', labelSize: 30, onTap: () => scenes.set(SCENE.LESSON, { mode: 'shiritori', kanaMode: 'hiragana' }) });
    this.kataBtn = new Button({ label: 'カタカナ', fill: COLORS.btnKatakana, top: '#d3b8ff', labelSize: 30, onTap: () => scenes.set(SCENE.LESSON, { mode: 'shiritori', kanaMode: 'katakana' }) });
    this.closeBtn = new Button({ label: 'とじる', fill: '#b7bfce', top: '#d5dbe6', labelColor: COLORS.ink, labelSize: 22, onTap: () => { this.overlay = null; } });
    this._layout();
  }

  _layout() {
    const W = view.w, H = view.h;
    // 1) 下段（ずかん・おうちのかた）を先にアンカー
    const sh = Math.max(36, Math.min(H * 0.1, 56));
    const sy = H - sh - Math.max(8, H * 0.025);
    const sw = Math.min(W * 0.34, 240);
    const sgap = Math.min(W * 0.05, 36);
    const sx0 = (W - (sw * 2 + sgap)) / 2;
    this.buttons[6].setRect(sx0, sy, sw, sh); this.buttons[6].labelSize = Math.max(14, Math.min(sh * 0.45, 24));
    this.buttons[7].setRect(sx0 + sw + sgap, sy, sw, sh); this.buttons[7].labelSize = Math.max(12, Math.min(sh * 0.4, 20));
    // 2) 学習6ボタン：ゲージ下〜下段上の「利用可能な高さ」から逆算してはみ出しゼロに
    const gridTop = H * 0.175;
    const gridBottom = sy - Math.max(8, H * 0.02);
    const availH = Math.max(60, gridBottom - gridTop);
    const cols = (W / H > 2.1 && W >= 900) ? 3 : 2;   // 超横長のみ3列
    const rows = Math.ceil(6 / cols);
    const gapY = Math.max(6, Math.min(H * 0.028, 16));
    const bh = Math.min((availH - gapY * (rows - 1)) / rows, 96);
    const gapX = Math.min(W * 0.04, 32);
    const bw = Math.min((W * 0.94 - gapX * (cols - 1)) / cols, 360);
    const gridW = bw * cols + gapX * (cols - 1);
    const x0 = (W - gridW) / 2;
    for (let i = 0; i < 6; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      this.buttons[i].setRect(x0 + col * (bw + gapX), gridTop + row * (bh + gapY), bw, bh);
      const len = Math.max(2, this._meta[i].label.replace('・', '').length);
      this.buttons[i].labelSize = Math.max(13, Math.min(bh * 0.42, (bw * 0.9) / len));
    }
    // 3) ガオ：ヘッダ帯の左（ゲージと重ならない位置に小さく）
    this.gao.size = Math.min(W * 0.04, H * 0.06, 28);
    this.gao.x = Math.max(this.gao.size + 6, W * 0.06);
    this.gao.y = H * 0.075;
  }

  drawEggGauge() {
    const W = view.w, H = view.h;
    const bh = Math.max(14, Math.min(24, H * 0.045));
    const bw = Math.min(W * 0.58, 460), x = (W - bw) / 2, y = Math.max(12, H * 0.045);
    const narrow = x < 110;   // 左にラベルを置く余白がない
    if (narrow) {
      label('たまごまで', W / 2, y - 2, { size: Math.min(14, bh * 0.7), color: COLORS.ink, weight: 800 });
      this.egg.render(x, y + 8, bw, bh);
      label(`${this.save.stars || 0}こ の ⭐`, W / 2, y + 8 + bh + 13, { size: Math.min(14, bh * 0.65), color: COLORS.ink, weight: 700 });
    } else {
      label('たまごまで', x - 8, y + bh / 2, { size: Math.min(20, bh * 0.85), align: 'right', color: COLORS.ink, weight: 800 });
      this.egg.render(x, y, bw, bh);
      label(`${this.save.stars || 0}こ の ⭐`, W / 2, y + bh + 15, { size: Math.min(16, bh * 0.7), color: COLORS.ink, weight: 700 });
    }
  }

  _layoutOverlay() {
    const W = view.w, H = view.h;
    const pw = Math.min(W * 0.8, 520), ph = Math.min(H * 0.5, 340);
    const px = (W - pw) / 2, py = (H - ph) / 2;
    const bw = Math.min(pw * 0.38, 200), bh = Math.min(ph * 0.34, 110);
    this.hiraBtn.setRect(px + pw * 0.08, py + ph * 0.34, bw, bh);
    this.kataBtn.setRect(px + pw - pw * 0.08 - bw, py + ph * 0.34, bw, bh);
    this.closeBtn.setRect((W - Math.min(pw * 0.3, 150)) / 2, py + ph - Math.min(ph * 0.2, 56), Math.min(pw * 0.3, 150), Math.min(ph * 0.18, 48));
    return { px, py, pw, ph };
  }

  update(dt) { this.t += dt; this.gao.update(dt); this.egg.update(dt); }

  render() {
    fillBg(); this._layout(); this.drawEggGauge();
    this.gao.render();
    for (const b of this.buttons) b.render();
    if (this.overlay === 'shiritori') this._renderOverlay();
  }

  _renderOverlay() {
    const W = view.w, H = view.h;
    ctx.save(); ctx.fillStyle = 'rgba(30,45,70,0.45)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const { px, py, pw, ph } = this._layoutOverlay();
    ctx.save(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = COLORS.btnKotoba; ctx.lineWidth = 5;
    rrPath(px, py, pw, ph, 28); ctx.fill(); ctx.stroke(); ctx.restore();
    label('しりとり を えらんでね', W / 2, py + ph * 0.16, { size: Math.min(pw * 0.06, 30), color: COLORS.ink, weight: 800 });
    this.hiraBtn.render(); this.kataBtn.render(); this.closeBtn.render();
  }

  onPointerDown(x, y) {
    if (this.overlay === 'shiritori') {
      if (this.hiraBtn.hitTest(x, y)) { sfxTap(); speak('ひらがな しりとり'); this.hiraBtn.tap(); return; }
      if (this.kataBtn.hitTest(x, y)) { sfxTap(); speak('カタカナ しりとり'); this.kataBtn.tap(); return; }
      if (this.closeBtn.hitTest(x, y)) { sfxTap(); this.closeBtn.tap(); return; }
      return; // オーバーレイ表示中は背面ボタンを無効化
    }
    for (let i = 0; i < this.buttons.length; i++) {
      const b = this.buttons[i];
      if (b.hitTest(x, y)) { sfxTap(); speak(this._meta[i].label.replace('・', ' ')); b.tap(); return; }
    }
  }
}

export { HomeScene };
