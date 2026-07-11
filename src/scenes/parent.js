// scenes/parent.js — おうちのかたへ（仕様§8.7）。誤操作防止ゲート（3→1→5タップ）→進捗＋設定パネル。
// 落ち着いた配色にして「おとなの場所」であることを視覚的にも示す（子ども向け画面と差をつける）。
import { COLORS, SCENE } from '../core/constants.js';
import { view, ctx, label, rrPath } from '../core/canvas.js';
import { scenes } from '../core/scene-manager.js';
import { sfxTap } from '../core/audio.js';
import { setSfxVolume, startBgm, stopBgm, setBgmVolume } from '../core/audio.js';
import { setVoiceMode } from '../core/speech.js';
import { loadSave, updateSave, resetSave } from '../core/storage.js';
import { Button } from '../ui/button.js';
import { SAMPLE_CREATURES, CATEGORY_ORDER } from '../data/sample-creatures.js';

const GATE_SEQ = [3, 1, 5];

class ParentScene {
  enter() {
    this.state = 'gate'; this.gateProgress = [];
    this.save = loadSave(); this._confirming = false;
    this.numButtons = [];
    for (let d = 1; d <= 9; d++) this.numButtons.push(new Button({ label: String(d), fill: '#5c6b85', top: '#8492ab', labelSize: 28, onTap: () => this._tapDigit(d) }));
    this.backGate = new Button({ label: 'もどる', fill: '#8a93a6', top: '#b7bfce', labelSize: 22, onTap: () => scenes.set(SCENE.HOME) });
    this.backPanel = new Button({ label: 'もどる', fill: COLORS.btnZukan, top: '#a6e2ff', labelSize: 24, onTap: () => scenes.set(SCENE.HOME) });
    this.sfxMinus = new Button({ label: '－', fill: '#94a3c4', labelSize: 24, onTap: () => this._adjustSfx(-0.1) });
    this.sfxPlus = new Button({ label: '＋', fill: '#94a3c4', labelSize: 24, onTap: () => this._adjustSfx(0.1) });
    this.bgmToggle = new Button({ label: '', fill: '#94a3c4', labelSize: 18, onTap: () => this._toggleBgm() });
    this.bgmMinus = new Button({ label: '－', fill: '#94a3c4', labelSize: 24, onTap: () => this._adjustBgm(-0.1) });
    this.bgmPlus = new Button({ label: '＋', fill: '#94a3c4', labelSize: 24, onTap: () => this._adjustBgm(0.1) });
    this.voiceToggle = new Button({ label: '', fill: '#94a3c4', labelSize: 18, onTap: () => this._toggleVoiceMode() });
    this.nameToggle = new Button({ label: '', fill: '#94a3c4', labelSize: 18, onTap: () => this._toggleNameDisplay() });
    this.lenMinus = new Button({ label: '－', fill: '#94a3c4', labelSize: 24, onTap: () => this._adjustLen(-1) });
    this.lenPlus = new Button({ label: '＋', fill: '#94a3c4', labelSize: 24, onTap: () => this._adjustLen(1) });
    this.resetBtn = new Button({ label: 'データを リセット', fill: '#d9614f', top: '#ea8a7a', labelSize: 20, onTap: () => { this._confirming = true; } });
    this.resetYes = new Button({ label: 'はい、リセットする', fill: '#d9614f', top: '#ea8a7a', labelSize: 18, onTap: () => this._doReset() });
    this.resetNo = new Button({ label: 'キャンセル', fill: '#8a93a6', top: '#b7bfce', labelSize: 18, onTap: () => { this._confirming = false; } });
  }

  _tapDigit(d) {
    sfxTap();
    const i = this.gateProgress.length;
    if (d === GATE_SEQ[i]) { this.gateProgress.push(d); if (this.gateProgress.length === GATE_SEQ.length) { this.state = 'panel'; this.save = loadSave(); } }
    else this.gateProgress = (d === GATE_SEQ[0]) ? [d] : [];
  }
  _adjustSfx(delta) { const s = loadSave(); const v = Math.max(0, Math.min(1, Math.round((s.settings.sfxVolume + delta) * 10) / 10)); this.save = updateSave({ settings: { ...s.settings, sfxVolume: v } }); setSfxVolume(v); }
  _toggleBgm() { const s = loadSave(); const on = !(s.settings.bgmOn !== false); this.save = updateSave({ settings: { ...s.settings, bgmOn: on } }); if (on) startBgm(); else stopBgm(); }
  _adjustBgm(delta) { const s = loadSave(); const v = Math.max(0, Math.min(1, Math.round(((s.settings.bgmVolume ?? 0.35) + delta) * 10) / 10)); this.save = updateSave({ settings: { ...s.settings, bgmVolume: v } }); setBgmVolume(v); }
  _toggleVoiceMode() { const s = loadSave(); const v = s.settings.voiceMode === 'tts' ? 'file' : 'tts'; this.save = updateSave({ settings: { ...s.settings, voiceMode: v } }); setVoiceMode(v); }
  _toggleNameDisplay() { const s = loadSave(); const v = s.settings.kanaNameDisplay === 'katakana' ? 'hiragana' : 'katakana'; this.save = updateSave({ settings: { ...s.settings, kanaNameDisplay: v } }); }
  _adjustLen(delta) { const s = loadSave(); const v = Math.max(3, Math.min(8, (s.settings.sessionLength || 4) + delta)); this.save = updateSave({ settings: { ...s.settings, sessionLength: v } }); }
  _doReset() { resetSave(); this.save = loadSave(); this._confirming = false; }

  update() {}

  _bg() {
    const g = ctx.createLinearGradient(0, 0, 0, view.h);
    g.addColorStop(0, '#c7d3e6'); g.addColorStop(1, '#eef1f7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
  }

  render() {
    this._bg();
    if (this.state === 'gate') this._renderGate(); else this._renderPanel();
  }

  _renderGate() {
    label('おうちの かた専用', view.w / 2, view.h * 0.18, { size: Math.min(view.w * 0.05, 30), color: '#33415e', weight: 800 });
    label('３ → １ → ５ の じゅんに おしてください', view.w / 2, view.h * 0.27, { size: Math.min(view.w * 0.038, 22), color: '#33415e', weight: 700 });
    for (let i = 0; i < 3; i++) {
      const cx = view.w / 2 + (i - 1) * 34, cy = view.h * 0.34;
      ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = i < this.gateProgress.length ? '#33415e' : 'rgba(51,65,94,0.25)'; ctx.fill();
    }
    const cols = 3, size = Math.min(view.w * 0.16, 84), gap = size * 0.25;
    const gridW = size * cols + gap * (cols - 1), gx0 = (view.w - gridW) / 2, gy0 = view.h * 0.42;
    this.numButtons.forEach((b, i) => { const c = i % cols, r = Math.floor(i / cols); b.setRect(gx0 + c * (size + gap), gy0 + r * (size + gap), size, size); b.render(); });
    this.backGate.setRect(view.w * 0.04, view.h * 0.04, Math.min(view.w * 0.24, 140), Math.min(view.h * 0.09, 50));
    this.backGate.render();
  }

  _row(y) { return { y, x: view.w * 0.08, w: view.w * 0.84 }; }

  _renderPanel() {
    label('おうちのかたへ', view.w / 2, view.h * 0.09, { size: Math.min(view.w * 0.06, 34), color: '#243352', weight: 800 });
    const stars = this.save.stars || 0;
    const obtained = CATEGORY_ORDER.reduce((n, c) => n + (this.save.collection[c] || []).length, 0);
    const totalAll = CATEGORY_ORDER.reduce((n, c) => n + SAMPLE_CREATURES[c].length, 0);
    label(`⭐ ほし ${stars}こ　／　ずかん ${obtained}/${totalAll} しゅるい`, view.w / 2, view.h * 0.17, { size: Math.min(view.w * 0.038, 22), color: '#33415e', weight: 700 });
    label('（もじ・カタカナ別の くわしい習得状況は 今後のアップデートで追加）', view.w / 2, view.h * 0.225, { size: Math.min(view.w * 0.026, 14), color: '#5a6a8a', weight: 500 });

    const labelX = view.w * 0.08, rightX = view.w * 0.92;
    const bgmOn = this.save.settings.bgmOn !== false;
    const rows = [
      { y: view.h * 0.30, text: `BGM おんりょう　${bgmOn ? Math.round((this.save.settings.bgmVolume ?? 0.35) * 100) + '%' : 'オフ'}`, minus: this.bgmMinus, plus: this.bgmPlus, dim: !bgmOn },
      { y: view.h * 0.39, text: `こうかおん おんりょう　${Math.round((this.save.settings.sfxVolume ?? 0.8) * 100)}%`, minus: this.sfxMinus, plus: this.sfxPlus },
      { y: view.h * 0.48, text: `1かいの もんだいすう　${this.save.settings.sessionLength || 4}もん`, minus: this.lenMinus, plus: this.lenPlus },
    ];
    for (const r of rows) {
      label(r.text, labelX, r.y, { size: Math.min(view.w * 0.032, 20), align: 'left', color: r.dim ? '#8896b0' : '#243352', weight: 700 });
      const bs = Math.min(view.h * 0.075, 46);
      r.minus.setRect(rightX - bs * 2.3, r.y - bs / 2, bs, bs); r.minus.render();
      r.plus.setRect(rightX - bs, r.y - bs / 2, bs, bs); r.plus.render();
    }
    // トグル行（BGM ON/OFF ／ よみあげ ／ 表記）
    this.bgmToggle.label = `BGM：${bgmOn ? 'オン' : 'オフ'}`;
    this.voiceToggle.label = `よみあげ：${this.save.settings.voiceMode === 'tts' ? '合成音声' : 'ろくおん（準備中）'}`;
    this.nameToggle.label = `なかまの表記：${this.save.settings.kanaNameDisplay === 'hiragana' ? 'ひらがな' : 'カタカナ'}`;
    const tw = Math.min(view.w * 0.5, 320), th = Math.min(view.h * 0.07, 44);
    this.bgmToggle.setRect(view.w * 0.08, view.h * 0.545, tw, th); this.bgmToggle.render();
    this.voiceToggle.setRect(view.w * 0.08, view.h * 0.625, tw, th); this.voiceToggle.render();
    this.nameToggle.setRect(view.w * 0.08, view.h * 0.705, tw, th); this.nameToggle.render();

    // リセット
    const rb = Math.min(view.h * 0.08, 50), rw = Math.min(view.w * 0.4, 260);
    this.resetBtn.setRect((view.w - rw) / 2, view.h * 0.80, rw, rb); this.resetBtn.render();

    if (this._confirming) {
      const boxW = Math.min(view.w * 0.7, 440), boxH = view.h * 0.22, bx = (view.w - boxW) / 2, by = view.h * 0.5 - boxH / 2;
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.97)'; ctx.strokeStyle = '#d9614f'; ctx.lineWidth = 3; rrPath(bx, by, boxW, boxH, 20); ctx.fill(); ctx.stroke(); ctx.restore();
      label('ほんとうに リセットしますか？', view.w / 2, by + boxH * 0.28, { size: 20, color: '#243352', weight: 800 });
      label('（ほし・ずかん・せっていが ぜんぶ きえます）', view.w / 2, by + boxH * 0.48, { size: 14, color: '#5a6a8a', weight: 600 });
      const bw2 = boxW * 0.42, bh2 = boxH * 0.32, byB = by + boxH * 0.6;
      this.resetYes.setRect(bx + boxW * 0.06, byB, bw2, bh2); this.resetYes.render();
      this.resetNo.setRect(bx + boxW * 0.52, byB, bw2, bh2); this.resetNo.render();
    }
    this.backPanel.setRect(view.w * 0.04, view.h * 0.04, Math.min(view.w * 0.24, 140), Math.min(view.h * 0.09, 50));
    this.backPanel.render();
  }

  onPointerDown(x, y) {
    if (this.state === 'gate') {
      if (this.backGate.hitTest(x, y)) { sfxTap(); this.backGate.tap(); return; }
      for (const b of this.numButtons) if (b.hitTest(x, y)) { b.tap(); return; }
      return;
    }
    if (this._confirming) {
      if (this.resetYes.hitTest(x, y)) { sfxTap(); this.resetYes.tap(); return; }
      if (this.resetNo.hitTest(x, y)) { sfxTap(); this.resetNo.tap(); return; }
      return;
    }
    if (this.backPanel.hitTest(x, y)) { sfxTap(); this.backPanel.tap(); return; }
    if (this.sfxMinus.hitTest(x, y)) { sfxTap(); this.sfxMinus.tap(); return; }
    if (this.sfxPlus.hitTest(x, y)) { sfxTap(); this.sfxPlus.tap(); return; }
    if (this.bgmMinus.hitTest(x, y)) { sfxTap(); this.bgmMinus.tap(); return; }
    if (this.bgmPlus.hitTest(x, y)) { sfxTap(); this.bgmPlus.tap(); return; }
    if (this.bgmToggle.hitTest(x, y)) { sfxTap(); this.bgmToggle.tap(); return; }
    if (this.lenMinus.hitTest(x, y)) { sfxTap(); this.lenMinus.tap(); return; }
    if (this.lenPlus.hitTest(x, y)) { sfxTap(); this.lenPlus.tap(); return; }
    if (this.voiceToggle.hitTest(x, y)) { sfxTap(); this.voiceToggle.tap(); return; }
    if (this.nameToggle.hitTest(x, y)) { sfxTap(); this.nameToggle.tap(); return; }
    if (this.resetBtn.hitTest(x, y)) { sfxTap(); this.resetBtn.tap(); return; }
  }
}

export { ParentScene };
