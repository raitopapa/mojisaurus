// games/l2-nakama.js — 【L2】なかまあつめ（仕様§4 Pillar D）。カテゴリのかご2つ＋カードを順に振り分け。
// タブレットの5歳操作を考慮し、ドラッグでなく「カードを見る→正しいかごをタップ」方式（仕様の代替操作）。
// 全問正解（最後まで振り分け）で完成演出。2ミスで正解かごをそっと光らせる（§4）。
import { GameBase } from './game-base.js';
import { view, ctx, label, rrPath, drawGao } from '../core/canvas.js';
import { pointInRect } from '../core/utils.js';
import { VOCAB_WORDS, VOCAB_CATEGORY_LABEL } from '../data/vocab-words.js';

const BASKET_EMOJI = { animal: '🐾', food: '🍽️', vehicle: '🛞', insect: '🍃', nature: '🌤️', object: '🧰' };

function pickGame(baskets, cardsPerGame) {
  // カテゴリを2つ選ぶ（語数が十分あるものから）→ 各カテゴリからカードを半分ずつ
  const byCat = {};
  for (const w of VOCAB_WORDS) (byCat[w.c] = byCat[w.c] || []).push(w);
  const cats = Object.keys(byCat).filter(c => byCat[c].length >= Math.ceil(cardsPerGame / 2));
  for (let i = cats.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cats[i], cats[j]] = [cats[j], cats[i]]; }
  const chosen = cats.slice(0, baskets);
  const per = Math.floor(cardsPerGame / baskets);
  const cards = [];
  for (const c of chosen) {
    const pool = [...byCat[c]];
    for (let k = 0; k < per; k++) cards.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return { categories: chosen, cards };
}

class L2Nakama extends GameBase {
  init(ctx2, services, params) {
    this.services = services || {};
    const baskets = (params && params.baskets) || 2;
    const cardsPerGame = (params && params.cards) || 6;
    const g = pickGame(baskets, cardsPerGame);
    this.categories = g.categories; this.cards = g.cards;
    this.cardIdx = 0; this.correct = 0; this.mistakes = 0; this._missesThisCard = 0;
    this.itemsPracticed = [];
    this.done = false;
    this._fx = null;          // {kind:'ok'|'ng', t, basketIdx}
    this._cardPop = 0;        // カード登場アニメ
    this._speak('おなじ なかまの かごに いれてね');
  }

  _speak(t, o) { const s = this.services.speech; if (s && s.speak) s.speak(t, o); }
  _sfx(n) { const a = this.services.audio; if (a && typeof a[n] === 'function') a[n](); }
  _cur() { return this.cards[this.cardIdx]; }

  update(dt) {
    this._cardPop = Math.min(1, this._cardPop + dt * 4);
    if (this._fx) {
      this._fx.t += dt;
      if (this._fx.t > 0.55) {
        const wasOk = this._fx.kind === 'ok'; this._fx = null;
        if (wasOk) {
          this.cardIdx++; this._cardPop = 0; this._missesThisCard = 0;
          if (this.cardIdx >= this.cards.length) { this.done = true; this._sfx('sfxSparkle'); this._speak('ぜんぶ できた！ なかまわけ めいじんだ！'); }
          else this._speak(this._cur().w);
        }
      }
    }
  }

  _layout() {
    const W = view.w, H = view.h;
    const bw = Math.min(W * 0.36, 300), bh = Math.min(H * 0.24, 150);
    const gapX = (W - bw * this.categories.length) / (this.categories.length + 1);
    const by = H * 0.14;
    const baskets = this.categories.map((c, i) => ({ cat: c, x: gapX + i * (bw + gapX), y: by, w: bw, h: bh }));
    const cw = Math.min(W * 0.34, 260), ch = Math.min(H * 0.3, 190);
    const card = { x: (W - cw) / 2, y: H * 0.62, w: cw, h: ch };
    return { baskets, card, W, H };
  }

  render() {
    const { baskets, card, W, H } = this._layout();
    this._basketRects = baskets;
    // 進捗
    label(`${Math.min(this.cardIdx + (this.done ? 0 : 1), this.cards.length)} / ${this.cards.length} まい`, W / 2, H * 0.08, { size: 20, color: '#2b3a67', weight: 700 });
    // かご
    baskets.forEach((b, i) => {
      const fx = this._fx && this._fx.basketIdx === i ? this._fx : null;
      let dy = 0, glow = false;
      if (fx && fx.kind === 'ok') { dy = -Math.sin(Math.min(1, fx.t / 0.3) * Math.PI) * 8; glow = true; }
      let dx = 0; if (fx && fx.kind === 'ng') dx = Math.sin(fx.t * 30) * 5 * Math.max(0, 1 - fx.t / 0.5);
      ctx.save(); ctx.fillStyle = '#fff7e8'; ctx.strokeStyle = glow ? '#57c06a' : '#e0b96f'; ctx.lineWidth = glow ? 6 : 4;
      // 2ミス後は正解かごをそっと光らせる
      if (this._missesThisCard >= 2 && !this.done && this._cur() && b.cat === this._cur().c) { ctx.strokeStyle = '#ffc53a'; ctx.lineWidth = 6; }
      rrPath(b.x + dx, b.y + dy, b.w, b.h, 20); ctx.fill(); ctx.stroke(); ctx.restore();
      label(BASKET_EMOJI[b.cat] || '🧺', b.x + b.w / 2 + dx, b.y + dy + b.h * 0.36, { size: b.h * 0.34 });
      label(VOCAB_CATEGORY_LABEL[b.cat] || b.cat, b.x + b.w / 2 + dx, b.y + dy + b.h * 0.78, { size: Math.min(b.h * 0.2, b.w * 0.11), color: '#6b4e16', weight: 800 });
    });
    // 現在のカード or 完成
    if (this.done) {
      drawGao(W / 2, H * 0.66, Math.min(W * 0.08, 60), 'happy');
      label('なかまわけ かんせい！ 🎉', W / 2, H * 0.84, { size: Math.min(W * 0.05, 30), color: '#2b3a67', weight: 800 });
      this._cardRect = null;
      return;
    }
    const c = this._cur();
    const pop = 1 - Math.pow(1 - this._cardPop, 3);
    const cw = card.w * (0.7 + 0.3 * pop), ch = card.h * (0.7 + 0.3 * pop);
    const r = { x: (W - cw) / 2, y: card.y + (card.h - ch) / 2, w: cw, h: ch };
    ctx.save(); ctx.globalAlpha = pop; ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c9d5ea'; ctx.lineWidth = 4;
    rrPath(r.x, r.y, r.w, r.h, 20); ctx.fill(); ctx.stroke(); ctx.restore();
    label(c.e, r.x + r.w / 2, r.y + r.h * 0.4, { size: r.h * 0.4 });
    label(c.w, r.x + r.w / 2, r.y + r.h * 0.8, { size: Math.min(r.h * 0.16, r.w * 0.13), color: '#2b3a67', weight: 800 });
    label('うえの かごを タップ！', W / 2, r.y - 18, { size: 16, color: 'rgba(43,58,103,0.7)', weight: 700 });
    this._cardRect = r;
  }

  onPointerDown(x, y) {
    if (this.done || this._fx || !this._basketRects) return;
    for (let i = 0; i < this._basketRects.length; i++) {
      const b = this._basketRects[i];
      if (!pointInRect(x, y, b)) continue;
      const c = this._cur();
      if (b.cat === c.c) {
        this._sfx('sfxCorrect');
        this._fx = { kind: 'ok', t: 0, basketIdx: i };
        this.correct++; this.itemsPracticed.push(c.w);
      } else {
        this._sfx('sfxWrong');
        this._fx = { kind: 'ng', t: 0, basketIdx: i };
        this.mistakes++; this._missesThisCard++;
      }
      return;
    }
  }

  isComplete() { return this.done; }
  getResult() { return { correctCount: this.correct, mistakes: this.mistakes, itemsPracticed: this.itemsPracticed }; }
  dispose() {}
}

export { L2Nakama };
