// games/l1-shiritori.js — 【L1】しりとり（仕様§4 Pillar D）。ガオと交互に語をつなぐ。ひらがな/カタカナ両対応。
// ・直前の語の最後の音で始まる語カード（3択）から選ぶ。ん(ン)終わり語はトラップ（選ぶと優しく無効・§L1）
// ・長音ー終わりは直前の母音で接続、濁点/半濁点は清音扱いで緩く判定（子ども向けに繋がりやすく）
// ・チェーンは init 時に15回試行して最長を採用（辞書検証で5ターンぶん=11語以上が100%確保できることを確認済み）
// ・ガオの返答は update(dt) 駆動のフェーズ機械（setTimeout不使用＝ヘッドレステストで決定的に進められる）
import { GameBase } from './game-base.js';
import { view, ctx, label, rrPath, drawGao } from '../core/canvas.js';
import { pointInRect } from '../core/utils.js';
import { VOCAB_HIRA, VOCAB_KATA, SHIRI_BAD_END } from '../data/vocab-words.js';

// 濁点・半濁点→清音（しりとり接続を緩くする）。ひらがな・カタカナ両方。
const DAKU_TO_SEI = {
  'が':'か','ぎ':'き','ぐ':'く','げ':'け','ご':'こ','ざ':'さ','じ':'し','ず':'す','ぜ':'せ','ぞ':'そ','だ':'た','ぢ':'ち','づ':'つ','で':'て','ど':'と','ば':'は','び':'ひ','ぶ':'ふ','べ':'へ','ぼ':'ほ','ぱ':'は','ぴ':'ひ','ぷ':'ふ','ぺ':'へ','ぽ':'ほ',
  'ガ':'カ','ギ':'キ','グ':'ク','ゲ':'ケ','ゴ':'コ','ザ':'サ','ジ':'シ','ズ':'ス','ゼ':'セ','ゾ':'ソ','ダ':'タ','ヂ':'チ','ヅ':'ツ','デ':'テ','ド':'ト','バ':'ハ','ビ':'ヒ','ブ':'フ','ベ':'ヘ','ボ':'ホ','パ':'ハ','ピ':'ヒ','プ':'フ','ペ':'ヘ','ポ':'ホ',
};
// カタカナ長音ー用：直前の文字→母音（ひらがな母音で返しても比較は後述のnormで吸収）
const VOWEL = {};
(() => {
  const rows = { 'ア':'アカサタナハマヤラワガザダバパ', 'イ':'イキシチニヒミリギジヂビピ', 'ウ':'ウクスツヌフムユルグズブプ', 'エ':'エケセテネヘメレゲゼデベペ', 'オ':'オコソトノホモヨロゴゾドボポ' };
  for (const [v, chars] of Object.entries(rows)) for (const c of chars) VOWEL[c] = v;
})();

const norm = ch => DAKU_TO_SEI[ch] || ch;
const firstMora = w => norm(w[0]);
function lastMora(w) {
  const last = w[w.length - 1];
  if (last === 'ー') { const prev = w[w.length - 2]; return VOWEL[prev] || norm(prev); }
  return norm(last);
}
const endsN = w => { const l = w[w.length - 1]; return l === 'ん' || l === 'ン'; };
const shiriOk = w => !SHIRI_BAD_END.includes(w[w.length - 1]);

function poolFor(mode) { return mode === 'katakana' ? VOCAB_KATA : VOCAB_HIRA; }

function buildChain(pool, turns) {
  const need = turns * 2 + 1;
  let best = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    const usable = pool.filter(x => shiriOk(x.w) && !endsN(x.w));
    let cur = usable[Math.floor(Math.random() * usable.length)];
    const chain = [cur]; const used = new Set([cur.w]);
    while (chain.length < need) {
      let cands = pool.filter(y => !used.has(y.w) && shiriOk(y.w) && !endsN(y.w) && firstMora(y.w) === lastMora(cur.w));
      const withNext = cands.filter(y => pool.some(z => !used.has(z.w) && z.w !== y.w && shiriOk(z.w) && !endsN(z.w) && firstMora(z.w) === lastMora(y.w)));
      if (withNext.length) cands = withNext;
      if (!cands.length) break;
      cur = cands[Math.floor(Math.random() * cands.length)];
      chain.push(cur); used.add(cur.w);
    }
    if (!best || chain.length > best.length) best = chain;
    if (best.length >= need) break;
  }
  return best;
}

function pickDistractors(pool, correct, requiredMora, count) {
  const out = [];
  const traps = pool.filter(y => endsN(y.w) && firstMora(y.w) === requiredMora && y.w !== correct.w);
  if (traps.length && Math.random() < 0.45) out.push({ ...traps[Math.floor(Math.random() * traps.length)], trap: true });
  const wrongs = pool.filter(y => firstMora(y.w) !== requiredMora && y.w !== correct.w);
  while (out.length < count && wrongs.length) out.push(wrongs.splice(Math.floor(Math.random() * wrongs.length), 1)[0]);
  return out;
}

class L1Shiritori extends GameBase {
  init(ctx2, services, params, question) {
    this.services = services || {};
    this.turns = (params && params.turns) || 5;
    this.pool = poolFor(params && params.kanaMode);
    this.chain = buildChain(this.pool, this.turns);
    this.chainIdx = 0;
    this.turnsDone = 0; this.mistakes = 0; this._missesThisTurn = 0;
    this.itemsPracticed = [];
    this.phase = 'gaoSay'; this.phaseT = 0;
    this.cards = []; this._effect = null;
    this._sayCurrent();
  }

  _speak(t, o) { const s = this.services.speech; if (s && s.speak) s.speak(t, o); }
  _sfx(n) { const a = this.services.audio; if (a && typeof a[n] === 'function') a[n](); }
  _cur() { return this.chain[this.chainIdx]; }
  _sayCurrent() { this._speak(this._cur().w); }

  _makeCards() {
    const correct = this.chain[this.chainIdx + 1];
    const req = lastMora(this._cur().w);
    const list = [{ ...correct, correct: true }, ...pickDistractors(this.pool, correct, req, 2)];
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    this.cards = list;
  }

  update(dt) {
    this.phaseT += dt;
    if (this._effect) { this._effect.t += dt; if (this._effect.t > 0.7) this._effect = null; }
    if (this.phase === 'gaoSay' && this.phaseT > 0.9) {
      if (this.turnsDone >= this.turns || this.chainIdx + 1 >= this.chain.length) { this.phase = 'done'; this._sfx('sfxSparkle'); this._speak('しりとり だいせいこう！'); return; }
      this._makeCards(); this._missesThisTurn = 0;
      this.phase = 'choose'; this.phaseT = 0;
    } else if (this.phase === 'gaoThink' && this.phaseT > 0.8) {
      this.chainIdx++;
      this.phase = 'gaoSay'; this.phaseT = 0;
      this._sayCurrent();
    }
  }

  _layout() {
    const W = view.w, H = view.h;
    const cardW = Math.min(W * 0.29, 240), cardH = Math.min(H * 0.24, 150);
    const gap = (W - cardW * 3) / 4;
    const cy = H * 0.98 - cardH;
    return { cardW, cardH, gap, cy, W, H };
  }

  render() {
    const { cardW, cardH, gap, cy, W, H } = this._layout();
    const gx = W * 0.18, gy = H * 0.30;
    drawGao(gx, gy, Math.min(W * 0.06, 46), this.phase === 'done' ? 'happy' : 'normal');
    const cur = this._cur();
    const bw = Math.min(W * 0.5, 380), bh = Math.min(H * 0.22, 130), bx = gx + W * 0.08, by = gy - bh / 2;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = '#5cc8ff'; ctx.lineWidth = 4;
    rrPath(bx, by, bw, bh, 22); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 2, by + bh * 0.55); ctx.lineTo(bx - 16, by + bh * 0.68); ctx.lineTo(bx + 2, by + bh * 0.8); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    label(cur.e, bx + bw * 0.18, by + bh * 0.5, { size: bh * 0.5 });
    label(cur.w, bx + bw * 0.6, by + bh * 0.5, { size: Math.min(bh * 0.34, bw * 0.13), color: '#2b3a67', weight: 800 });
    if (this.phase === 'choose') {
      label(`「${lastMora(cur.w)}」から はじまる ことばは？`, W / 2, H * 0.52, { size: Math.min(W * 0.038, 24), color: '#2b3a67', weight: 800 });
    } else if (this.phase === 'done') {
      label('しりとり だいせいこう！ 🎉', W / 2, H * 0.55, { size: Math.min(W * 0.05, 32), color: '#2b3a67', weight: 800 });
    }
    for (let i = 0; i < this.turns; i++) {
      const px = W / 2 + (i - (this.turns - 1) / 2) * 30;
      label(i < this.turnsDone ? '⭐' : '・', px, H * 0.09, { size: 20, color: '#2b3a67' });
    }
    if (this.phase === 'choose') {
      this._cardRects = this.cards.map((c, i) => {
        const x = gap + i * (cardW + gap);
        const fx = this._effect && this._effect.cardIdx === i ? this._effect : null;
        let dx = 0;
        if (fx && (fx.kind === 'ng' || fx.kind === 'trap')) dx = Math.sin(fx.t * 30) * 6 * Math.max(0, 1 - fx.t / 0.5);
        const r = { x: x + dx, y: cy, w: cardW, h: cardH };
        ctx.save(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = fx && fx.kind === 'ok' ? '#57c06a' : '#c9d5ea'; ctx.lineWidth = fx && fx.kind === 'ok' ? 6 : 3;
        if (this._missesThisTurn >= 2 && c.correct) { ctx.strokeStyle = '#ffc53a'; ctx.lineWidth = 6; }
        rrPath(r.x, r.y, r.w, r.h, 18); ctx.fill(); ctx.stroke(); ctx.restore();
        label(c.e, r.x + r.w / 2, r.y + r.h * 0.38, { size: r.h * 0.38 });
        label(c.w, r.x + r.w / 2, r.y + r.h * 0.78, { size: Math.min(r.h * 0.19, r.w * 0.135), color: '#2b3a67', weight: 800 });
        return r;
      });
    } else { this._cardRects = null; }
  }

  onPointerDown(x, y) {
    if (this.phase !== 'choose' || !this._cardRects) return;
    for (let i = 0; i < this._cardRects.length; i++) {
      if (!pointInRect(x, y, this._cardRects[i])) continue;
      const c = this.cards[i];
      this._speak(c.w);
      if (c.correct) {
        this._sfx('sfxCorrect');
        this._effect = { kind: 'ok', t: 0, cardIdx: i };
        this.turnsDone++; this.itemsPracticed.push(c.w);
        this.chainIdx++;
        this.phase = 'gaoThink'; this.phaseT = 0;
      } else if (c.trap) {
        this._sfx('sfxWrong');
        this._effect = { kind: 'trap', t: 0, cardIdx: i };
        this._speak('あーっ、ん が ついちゃう！', { interrupt: false });
        this.mistakes++; this._missesThisTurn++;
      } else {
        this._sfx('sfxWrong');
        this._effect = { kind: 'ng', t: 0, cardIdx: i };
        this.mistakes++; this._missesThisTurn++;
      }
      return;
    }
  }

  isComplete() { return this.phase === 'done'; }
  getResult() { return { correctCount: this.turnsDone, mistakes: this.mistakes, itemsPracticed: this.itemsPracticed }; }
  dispose() {}
}

export { L1Shiritori };
