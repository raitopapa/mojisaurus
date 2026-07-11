// games/g1-anagram.js — 【G1】もじならべ（アナグラム）。絵をヒントに、シャッフルされた文字カードを
// ドラッグで入れ替えて単語を完成させる。3ラウンド制。update(dt)駆動（setTimeout不使用）。
// 操作：カードを掴んで別のスロットへドロップ→2枚が入れ替わる。全スロットが正順になったらクリア。
import { GameBase } from './game-base.js';
import { view, ctx, label, rrPath } from '../core/canvas.js';
import { VOCAB_HIRA } from '../data/vocab-words.js';

const ROUNDS = 3;

function pickWords() {
  // 3〜4文字の語から3つ（重複なし・4文字は最大1つ＝難度調整）
  const c3 = VOCAB_HIRA.filter(w => w.w.length === 3);
  const c4 = VOCAB_HIRA.filter(w => w.w.length === 4);
  const take = (arr) => arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
  const p3 = [...c3], p4 = [...c4];
  const words = [take(p3), take(p3)];
  words.push(Math.random() < 0.5 && p4.length ? take(p4) : take(p3));
  for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
  return words;
}

function shuffledOrder(n, avoidIdentity) {
  const idx = Array.from({ length: n }, (_, i) => i);
  do {
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  } while (avoidIdentity && idx.every((v, i) => v === i));
  return idx;
}

class G1Anagram extends GameBase {
  init(ctx2, services) {
    this.services = services || {};
    this.words = pickWords();
    this.round = 0; this.cleared = 0; this.mistakes = 0; this.itemsPracticed = [];
    this.state = 'play';           // play → roundclear → play … → done
    this._clearT = 0;
    this.drag = null;              // { slotIdx, x, y }
    this._startRound();
  }

  _speak(t, o) { const s = this.services.speech; if (s && s.speak) s.speak(t, o); }
  _sfx(n) { const a = this.services.audio; if (a && typeof a[n] === 'function') a[n](); }

  _startRound() {
    this.word = this.words[this.round];
    const chars = [...this.word.w];
    const order = shuffledOrder(chars.length, true);
    // slots[i] に入っているカードの「正解位置」を持つ（slots[i] === i で全一致ならクリア）
    this.slots = order.slice();
    this.chars = chars;
    this.drag = null;
    this._speak(`「${this.word.w}」を つくってね`);
  }

  _isSolved() { return this.slots.every((v, i) => v === i); }

  update(dt) {
    if (this.state === 'roundclear') {
      this._clearT += dt;
      if (this._clearT >= 1.4) {
        this.round++;
        if (this.round >= ROUNDS) { this.state = 'done'; this._sfx('sfxSparkle'); this._speak('もじならべ だいせいこう！'); }
        else { this.state = 'play'; this._startRound(); }
      }
    }
  }

  _layout() {
    const W = view.w, H = view.h;
    const n = this.chars ? this.chars.length : 3;
    const cw = Math.min(W * 0.18, 130, (W * 0.8) / n - 12), ch = cw;
    const gap = Math.min(W * 0.035, 24);
    const totalW = cw * n + gap * (n - 1);
    const x0 = (W - totalW) / 2, sy = H * 0.58;
    const slots = Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + gap), y: sy, w: cw, h: ch }));
    return { slots, cw, ch, W, H };
  }

  render() {
    const { slots, cw, W, H } = this._layout();
    this._slotRects = slots;
    // ヒント絵＋ラウンド進捗
    label(`${Math.min(this.round + 1, ROUNDS)} / ${ROUNDS} もんめ`, W / 2, H * 0.14, { size: 18, color: '#2b3a67', weight: 700 });
    if (this.state === 'done') {
      label('🎉', W / 2, H * 0.4, { size: H * 0.2 });
      label('もじならべ だいせいこう！', W / 2, H * 0.62, { size: Math.min(W * 0.05, 32), color: '#2b3a67', weight: 800 });
      return;
    }
    label(this.word.e, W / 2, H * 0.33, { size: H * 0.2 });
    if (this.state === 'roundclear') {
      label(this.word.w, W / 2, H * 0.62, { size: Math.min(W * 0.09, 54), color: '#2b8f43', weight: 800, shadow: 2 });
      label('できた！', W / 2, H * 0.78, { size: 24, color: '#2b3a67', weight: 800 });
      return;
    }
    label('カードを うごかして ならべてね', W / 2, H * 0.47, { size: Math.min(W * 0.032, 19), color: 'rgba(43,58,103,0.75)', weight: 700 });
    // スロット枠＋カード（ドラッグ中のカードは最後に浮かせて描く）
    slots.forEach((s, i) => {
      ctx.save(); ctx.strokeStyle = 'rgba(43,58,103,0.25)'; ctx.setLineDash([8, 7]); ctx.lineWidth = 3;
      rrPath(s.x, s.y, s.w, s.h, 16); ctx.stroke(); ctx.restore();
      if (this.drag && this.drag.slotIdx === i) return;   // 掴んでいるカードは後で描く
      this._drawCard(this.chars[this.slots[i]], s.x, s.y, s.w, false);
    });
    if (this.drag) {
      const s = slots[this.drag.slotIdx];
      this._drawCard(this.chars[this.slots[this.drag.slotIdx]], this.drag.x - s.w / 2, this.drag.y - s.h / 2, s.w, true);
    }
  }

  _drawCard(chr, x, y, size, lifted) {
    ctx.save();
    if (lifted) { ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; }
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = lifted ? '#ffc53a' : '#c9d5ea'; ctx.lineWidth = lifted ? 5 : 3;
    rrPath(x, y, size, size, 16); ctx.fill(); ctx.stroke();
    ctx.restore();
    label(chr, x + size / 2, y + size / 2, { size: size * 0.55, color: '#2b3a67', weight: 800 });
  }

  onPointerDown(x, y) {
    if (this.state !== 'play' || !this._slotRects) return;
    for (let i = 0; i < this._slotRects.length; i++) {
      const s = this._slotRects[i];
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        this.drag = { slotIdx: i, x, y };
        this._sfx('sfxTap');
        this._speak(this.chars[this.slots[i]]);
        return;
      }
    }
  }
  onPointerMove(x, y) { if (this.drag) { this.drag.x = x; this.drag.y = y; } }
  onPointerUp(x, y) {
    if (!this.drag || this.state !== 'play') { this.drag = null; return; }
    const from = this.drag.slotIdx;
    // 最も近いスロットへドロップ（カード中心距離）
    let best = -1, bestD = Infinity;
    this._slotRects.forEach((s, i) => {
      const d = Math.hypot(x - (s.x + s.w / 2), y - (s.y + s.h / 2));
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0 && best !== from && bestD < this._slotRects[0].w * 1.4) {
      [this.slots[from], this.slots[best]] = [this.slots[best], this.slots[from]];
      this._sfx('sfxTap');
    }
    this.drag = null;
    if (this._isSolved()) {
      this.cleared++; this.itemsPracticed.push(this.word.w);
      this._sfx('sfxCorrect');
      this._speak(`せいかい！ ${this.word.w}！`);
      this.state = 'roundclear'; this._clearT = 0;
    }
  }

  isComplete() { return this.state === 'done'; }
  getResult() { return { correctCount: this.cleared, mistakes: this.mistakes, itemsPracticed: this.itemsPracticed }; }
  dispose() {}
}

export { G1Anagram };
