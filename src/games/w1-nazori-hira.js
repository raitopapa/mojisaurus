// games/w1-nazori-hira.js — 【W1】なぞりがき・ひらがな（仕様§4 Pillar A、判定は§7）。
// GameBase契約を実装。手書き文字認識はしない＝「順番通りになぞれたか」だけを見る（§7-7）。
import { GameBase } from './game-base.js';
import { parsePathD, flattenCommands, withLengths, pointAtLength, parseViewBox } from '../core/svg-path.js';
import { rrPath } from '../core/canvas.js';

const COUNT_WORDS = ['いち', 'に', 'さん', 'よん', 'ご', 'ろく'];
const SCREEN_SPACING = 9;      // なぞり判定点の画面上の間隔(px)
const DEMO_PX_PER_SEC = 170;   // 手本アニメの描画速度の目安

// path-space の d文字列 → 画面座標のポリライン（累積距離つき）に変換。
function buildScreenPoly(d, scale, offsetX, offsetY) {
  const flat = flattenCommands(parsePathD(d), 26).map(p => ({ x: offsetX + p.x * scale, y: offsetY + p.y * scale }));
  return withLengths(flat);
}
function evenPoints(poly, spacing) {
  const n = Math.max(2, Math.round(poly.total / spacing));
  const pts = []; for (let i = 0; i <= n; i++) pts.push(pointAtLength(poly, (i / n) * poly.total));
  return pts;
}
// 累積距離 upToLen までの部分ポリライン（手本アニメの「描かれている途中」表現用）。
function partialPoints(poly, upToLen) {
  const out = [];
  for (let i = 0; i < poly.pts.length; i++) { if (poly.acc[i] <= upToLen) out.push(poly.pts[i]); else break; }
  out.push(pointAtLength(poly, upToLen));
  return out;
}

class W1NazoriHira extends GameBase {
  init(ctx, services, params, question) {
    this.services = services || {};
    this.kana = question.kana;
    const { w, h } = parseViewBox(question.viewBox, 100);
    const boxSize = params.boxSize || 220;
    const scale = boxSize / Math.max(w, h);
    const offsetX = (params.centerX || 0) - (w * scale) / 2;
    const offsetY = (params.centerY || 0) - (h * scale) / 2;

    this.strokes = (question.data.strokes || []).map((d) => {
      const poly = buildScreenPoly(d, scale, offsetX, offsetY);
      return { poly, points: evenPoints(poly, SCREEN_SPACING), duration: Math.max(0.5, Math.min(1.3, poly.total / DEMO_PX_PER_SEC)) };
    });

    this.R = params.toleranceR || 26;
    this.strokeIndex = 0; this.cursor = 0; this.trail = [];
    this.mistakes = 0; this._strayCount = 0; this.tracing = false;
    this.state = 'demo'; this.demoT = 0; this._demoStarted = false;
    // 文字の音を強調：まず「し」だけをはっきり、続けて「と かくよ」を（前の発話を止めずに）繋げる
    this._speak(this.kana);
    this._speak('と かくよ', { interrupt: false });
  }

  _speak(text, o) { if (this.services.speech && this.services.speech.speak) this.services.speech.speak(text, o); }
  _sfx(name) { const a = this.services.audio; if (a && typeof a[name] === 'function') a[name](); }
  _speakStrokeStart() { this._speak(COUNT_WORDS[this.strokeIndex] || 'つぎ'); }

  update(dt) {
    if (this.state !== 'demo') return;
    const s = this.strokes[this.strokeIndex]; if (!s) return;
    if (!this._demoStarted) { this._demoStarted = true; this._speak(COUNT_WORDS[this.strokeIndex] || 'いち', { interrupt: false }); }
    this.demoT += dt;
    if (this.demoT >= s.duration) {
      this.strokeIndex++;
      if (this.strokeIndex >= this.strokes.length) {
        this.state = 'trace'; this.strokeIndex = 0; this.cursor = 0; this.trail = [];
        this._speak('なぞってみよう');
      } else { this.demoT = 0; this._speakStrokeStart(); }
    }
  }

  render(ctx) {
    // 全画のうすいガイド
    ctx.save(); ctx.strokeStyle = 'rgba(43,58,103,0.18)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of this.strokes) this._strokePath(ctx, s.poly.pts);
    ctx.restore();

    if (this.state === 'demo') {
      for (let i = 0; i < this.strokeIndex; i++) this._drawDone(ctx, this.strokes[i]);
      const cur = this.strokes[this.strokeIndex];
      if (cur) {
        const upTo = (this.demoT / cur.duration) * cur.poly.total;
        const pts = partialPoints(cur.poly, upTo);
        ctx.save(); ctx.strokeStyle = '#ff8a5c'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        this._strokePath(ctx, pts); ctx.restore();
        const tip = pts[pts.length - 1];
        if (tip) this._drawFinger(ctx, tip.x, tip.y);
      }
    } else if (this.state === 'trace') {
      for (let i = 0; i < this.strokeIndex; i++) this._drawDone(ctx, this.strokes[i]);
      const cur = this.strokes[this.strokeIndex];
      if (cur) {
        ctx.save(); ctx.setLineDash([14, 10]); ctx.strokeStyle = 'rgba(87,192,106,0.9)'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        this._strokePath(ctx, cur.points); ctx.restore();
        if (this.trail.length > 1) { ctx.save(); ctx.strokeStyle = '#2b8f43'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; this._strokePath(ctx, this.trail); ctx.restore(); }
        const target = cur.points[Math.min(this.cursor, cur.points.length - 1)];
        ctx.save(); ctx.fillStyle = 'rgba(255,197,58,0.9)'; ctx.beginPath(); ctx.arc(target.x, target.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    } else if (this.state === 'complete') {
      for (const s of this.strokes) this._drawDone(ctx, s);
    }
  }

  _strokePath(ctx, pts) { if (pts.length < 2) return; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
  _drawDone(ctx, s) { ctx.save(); ctx.strokeStyle = '#57c06a'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; this._strokePath(ctx, s.poly.pts); ctx.restore(); }
  _drawFinger(ctx, x, y) { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = '#2b3a67'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }

  onPointerDown(x, y) {
    if (this.state === 'demo') { this.state = 'trace'; this.strokeIndex = 0; this.cursor = 0; this.trail = []; this._speak('なぞってみよう'); }
    if (this.state !== 'trace') return;
    this.tracing = true; this.trail = [{ x, y }];
    this._advanceCursor(x, y);
  }
  onPointerMove(x, y) {
    if (this.state !== 'trace' || !this.tracing) return;
    this.trail.push({ x, y }); if (this.trail.length > 400) this.trail.shift();
    this._advanceCursor(x, y);
  }
  onPointerUp() { this.tracing = false; }

  _advanceCursor(x, y) {
    const s = this.strokes[this.strokeIndex]; if (!s) return;
    const pts = s.points;
    const startR = this.R * 1.6, R = this.R, bigMissR = this.R * 3.5;
    while (this.cursor < pts.length - 1) {
      const targetR = this.cursor === 0 ? startR : R;
      if (Math.hypot(x - pts[this.cursor].x, y - pts[this.cursor].y) <= targetR) this.cursor++; else break;
    }
    const cIdx = Math.min(this.cursor, pts.length - 1);
    const dCur = Math.hypot(x - pts[cIdx].x, y - pts[cIdx].y);
    this._strayCount = (dCur > bigMissR) ? (this._strayCount + 1) : 0;
    if (this._strayCount > 18) {
      this._strayCount = 0; this.cursor = 0; this.trail = []; this.mistakes++;
      this._speak('もういちど、じゅんばんに なぞってね');
      return;
    }
    if (this.cursor >= pts.length - 1) {
      this.strokeIndex++; this.cursor = 0; this.trail = [];
      if (this.strokeIndex >= this.strokes.length) { this.state = 'complete'; this._sfx('sfxSparkle'); }
      else this._sfx('sfxTap');
    }
  }

  isComplete() { return this.state === 'complete'; }
  getResult() { return { correctCount: 1, mistakes: this.mistakes, itemsPracticed: [this.kana] }; }
  dispose() {}
}

export { W1NazoriHira };
