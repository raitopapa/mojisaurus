// scenes/lesson.js — レッスン司会（P1: 「かく」=W1のみ実装。ことばあそび/カタカナ・とくべつは次バッチ）。
// 出題キュー(仮データ)を順に回し、正解ごとに星を集計 → セッション終了時にまとめてstorageへ確定。
// reward.js（本格な孵化演出シーン）は次バッチで切り出す想定。今回は孵化処理をここに簡易実装する。
import { COLORS, SCENE, STARS_PER_EGG } from '../core/constants.js';
import { view, ctx, fillBg, label } from '../core/canvas.js';
import { scenes } from '../core/scene-manager.js';
import { sfxTap, sfxSparkle, sfxCorrect, sfxHatch } from '../core/audio.js';
import { speak } from '../core/speech.js';
import { loadSave, updateSave } from '../core/storage.js';
import { Button } from '../ui/button.js';
import { Gao } from '../ui/gao.js';
import { EggGauge } from '../ui/egg-gauge.js';
import { StarField } from '../ui/star-fx.js';
import { W1NazoriHira } from '../games/w1-nazori-hira.js';
import { SAMPLE_STROKES } from '../data/sample-strokes.js';
import { SAMPLE_CREATURES, CATEGORY_ORDER } from '../data/sample-creatures.js';
import { getEmoji } from '../core/assets.js';

const STAR_PER_CORRECT = 1;

function pickUnclaimed(collection) {
  for (const cat of CATEGORY_ORDER) {
    const have = collection[cat] || [];
    const found = SAMPLE_CREATURES[cat].find(c => !have.includes(c.id));
    if (found) return { cat, creature: found };
  }
  return null;
}

class LessonScene {
  enter(params) {
    this.mode = (params && params.mode) || 'write';
    this.save = loadSave();
    this.gao = new Gao({ x: view.w * 0.09, y: view.h * 0.16, size: Math.min(view.w * 0.05, 40) });
    this.backBtn = new Button({ label: 'もどる', fill: COLORS.btnZukan, top: '#a6e2ff', labelSize: 24, onTap: () => scenes.set(SCENE.HOME) });
    this.stars = new StarField();
    this.homeBtn = new Button({ label: 'ホームへ', fill: COLORS.btnKaku, top: '#ffb190', labelSize: 26, onTap: () => scenes.set(SCENE.HOME) });
    this.zukanBtn = new Button({ label: 'ずかんへ', fill: COLORS.btnZukan, top: '#a6e2ff', labelSize: 24, onTap: () => scenes.set(SCENE.ZUKAN) });

    if (this.mode !== 'write') { this.state = 'unsupported'; return; }

    const n = Math.max(1, Math.min(this.save.settings.sessionLength || 4, SAMPLE_STROKES.order.length));
    this.queue = SAMPLE_STROKES.order.slice(0, n);
    this.qIndex = 0; this.sessionStars = 0; this._wasComplete = false;
    this.state = 'playing';
    this._startQuestion();
  }

  _startQuestion() {
    const kana = this.queue[this.qIndex];
    this.charCenter = { x: view.w / 2, y: view.h * 0.56 };
    const boxSize = Math.min(view.w, view.h) * 0.5;
    this.game = new W1NazoriHira();
    this.game.init(ctx, { audio: { sfxTap, sfxSparkle, sfxCorrect }, speech: { speak } },
      { centerX: this.charCenter.x, centerY: this.charCenter.y, boxSize, toleranceR: 26 },
      { kana, data: SAMPLE_STROKES.characters[kana], viewBox: SAMPLE_STROKES.viewBox });
    this._wasComplete = false;
  }

  _onQuestionComplete() {
    const res = this.game.getResult();
    this.sessionStars += (res.correctCount || 0) * STAR_PER_CORRECT;
    this.gao.setMood('cheer', 1.1);
    this.stars.spawn(this.charCenter.x, this.charCenter.y, view.w - 60, 46, { count: 1, onArrive: () => {} });
    setTimeout(() => { this.qIndex++; if (this.qIndex >= this.queue.length) this._finishSession(); else this._startQuestion(); }, 900);
  }

  _finishSession() {
    const oldEgg = this.save.eggProgress || 0, oldStars = this.save.stars || 0;
    const totalEgg = oldEgg + this.sessionStars;
    const hatchCount = Math.floor(totalEgg / STARS_PER_EGG);
    const newEggProgress = totalEgg % STARS_PER_EGG;
    let collection = { ...this.save.collection };
    const hatchedList = [];
    for (let i = 0; i < hatchCount; i++) {
      const picked = pickUnclaimed(collection);
      if (!picked) break;
      collection = { ...collection, [picked.cat]: [...(collection[picked.cat] || []), picked.creature.id] };
      hatchedList.push(picked);
    }
    updateSave({ stars: oldStars + this.sessionStars, eggProgress: newEggProgress, collection });
    this.save = loadSave();
    this.hatchedList = hatchedList; this._finalEggProgress = newEggProgress;
    this.egg = new EggGauge({ max: STARS_PER_EGG, value: oldEgg, onHatch: () => this._revealHatch() });
    this.egg.setValue(hatchedList.length ? STARS_PER_EGG : newEggProgress);
    this._revealStage = null;
    this.state = 'summary';
  }

  _revealHatch() {
    this._revealStage = 'card'; this._revealCreature = this.hatchedList[0] || null;
    this._extraCount = Math.max(0, this.hatchedList.length - 1);
    sfxHatch();
    if (this._revealCreature) speak(`たまごが われたよ！ ${this._revealCreature.creature.name} が なかまに なった！`);
    else speak('たまごが われたよ！');
    setTimeout(() => { if (this.egg) this.egg.setValue(this._finalEggProgress); }, 1300);
  }

  update(dt) {
    this.gao.update(dt); this.stars.update(dt);
    if (this.state === 'playing' && this.game) {
      this.game.update(dt);
      if (!this._wasComplete && this.game.isComplete()) { this._wasComplete = true; this._onQuestionComplete(); }
    }
    if (this.state === 'summary' && this.egg) this.egg.update(dt);
  }

  render() {
    fillBg();
    if (this.state === 'unsupported') { this._renderUnsupported(); return; }
    if (this.state === 'playing') { this._renderPlaying(); return; }
    if (this.state === 'summary') { this._renderSummary(); return; }
  }

  _renderUnsupported() {
    label('このモードは', view.w / 2, view.h * 0.38, { size: Math.min(view.w * 0.06, 38), color: COLORS.ink, weight: 800 });
    label('じゅんびちゅう だよ', view.w / 2, view.h * 0.46, { size: Math.min(view.w * 0.07, 44), color: COLORS.ink, weight: 800, shadow: 2 });
    label('（つぎのアップデートで あそべるようになるよ）', view.w / 2, view.h * 0.55, { size: Math.min(view.w * 0.04, 22), color: COLORS.ink, weight: 600 });
    this.backBtn.setRect(view.w * 0.04, view.h * 0.04, Math.min(view.w * 0.28, 190), Math.min(view.h * 0.11, 66));
    this.backBtn.render();
  }

  _renderPlaying() {
    this.gao.render();
    label(`${this.qIndex + 1} / ${this.queue.length} もんめ`, view.w / 2, view.h * 0.08, { size: 22, color: COLORS.ink, weight: 700 });
    // セッション中のほしバッジ（本ゲージへの反映はセッション終了時にまとめて）
    label('⭐', view.w - 60, 46, { size: 30 });
    label(String(this.sessionStars), view.w - 30, 50, { size: 24, color: COLORS.ink, weight: 800, align: 'left' });
    if (this.game) this.game.render(ctx);
    this.stars.render();
  }

  _renderSummary() {
    label('よくできました！', view.w / 2, view.h * 0.16, { size: Math.min(view.w * 0.07, 44), color: COLORS.ink, weight: 800, shadow: 2 });
    label(`⭐ ${this.sessionStars}こ ふえたよ`, view.w / 2, view.h * 0.25, { size: Math.min(view.w * 0.045, 26), color: COLORS.ink, weight: 700 });
    const gw = Math.min(view.w * 0.55, 420), gh = 26, gx = (view.w - gw) / 2, gy = view.h * 0.34;
    if (this.egg) this.egg.render(gx, gy, gw, gh);
    this.gao.x = view.w * 0.5; this.gao.y = view.h * 0.56; this.gao.size = Math.min(view.w * 0.09, 66);
    this.gao.render();

    if (this._revealStage === 'card') {
      const c = this._revealCreature;
      const boxW = Math.min(view.w * 0.7, 460), boxH = view.h * 0.24, bx = (view.w - boxW) / 2, by = view.h * 0.68;
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 4;
      const r = 24; ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.arcTo(bx + boxW, by, bx + boxW, by + boxH, r); ctx.arcTo(bx + boxW, by + boxH, bx, by + boxH, r); ctx.arcTo(bx, by + boxH, bx, by, r); ctx.arcTo(bx, by, bx + boxW, by, r); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      if (c) {
        label(getEmoji(c.cat), view.w / 2, by + boxH * 0.38, { size: 56 });
        label(`${c.creature.name} が なかまに なった！`, view.w / 2, by + boxH * 0.78, { size: Math.min(view.w * 0.04, 22), color: COLORS.ink, weight: 700 });
      } else {
        label('たまごが われたよ！', view.w / 2, by + boxH * 0.5, { size: 24, color: COLORS.ink, weight: 700 });
      }
      if (this._extraCount > 0) label(`（ほかにも ${this._extraCount}ひき！）`, view.w / 2, by + boxH * 0.95, { size: 16, color: COLORS.ink, weight: 600 });
    }

    const bw = Math.min(view.w * 0.36, 220), bh = Math.min(view.h * 0.1, 64), by2 = view.h * 0.94 - bh, gap = 20;
    const showZukan = this.hatchedList && this.hatchedList.length > 0;
    if (showZukan) { this.zukanBtn.setRect(view.w / 2 - bw - gap / 2, by2, bw, bh); this.zukanBtn.render(); this.homeBtn.setRect(view.w / 2 + gap / 2, by2, bw, bh); this.homeBtn.render(); }
    else { this.homeBtn.setRect((view.w - bw) / 2, by2, bw, bh); this.homeBtn.render(); }
    this._btnRects = showZukan ? [this.zukanBtn, this.homeBtn] : [this.homeBtn];
  }

  onPointerDown(x, y) {
    if (this.state === 'unsupported') { if (this.backBtn.hitTest(x, y)) { sfxTap(); this.backBtn.tap(); } return; }
    if (this.state === 'playing') { if (this.game) this.game.onPointerDown(x, y); return; }
    if (this.state === 'summary') { for (const b of (this._btnRects || [])) if (b.hitTest(x, y)) { sfxTap(); b.tap(); return; } }
  }
  onPointerMove(x, y) { if (this.state === 'playing' && this.game) this.game.onPointerMove(x, y); }
  onPointerUp(x, y) { if (this.state === 'playing' && this.game) this.game.onPointerUp(x, y); }
}

export { LessonScene };
