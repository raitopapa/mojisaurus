// ui/star-fx.js — 正解演出「星が飛ぶ」。spawn位置→着地位置へ弧を描いて飛び、
// 到達ごとに onArrive を呼ぶ（星カウント/たまごゲージへの加算は呼び出し側＝シーンが行う）。
import { ctx } from '../core/canvas.js';

class StarField {
  constructor() { this.stars = []; }
  get isEmpty() { return this.stars.length === 0; }
  spawn(fromX, fromY, toX, toY, o = {}) {
    const count = o.count || 1;
    for (let i = 0; i < count; i++) {
      const delay = (o.stagger ?? 0.08) * i;
      this.stars.push({
        fromX, fromY, toX, toY, t: -delay, dur: o.duration || 0.65,
        arc: o.arc ?? (40 + Math.random() * 30),
        rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 2),
        size: o.size || 20, onArrive: o.onArrive || null, done: false,
      });
    }
  }
  update(dt) {
    for (const s of this.stars) {
      if (s.done) continue;
      s.t += dt;
      if (s.t >= s.dur && !s._fired) { s._fired = true; if (s.onArrive) s.onArrive(); }
      if (s.t >= s.dur + 0.05) s.done = true;
    }
    if (this.stars.some(s => s.done)) this.stars = this.stars.filter(s => !s.done);
  }
  render() {
    for (const s of this.stars) {
      if (s.t < 0) continue;
      const p = Math.max(0, Math.min(1, s.t / s.dur));
      const ease = 1 - Math.pow(1 - p, 3);
      const x = s.fromX + (s.toX - s.fromX) * ease;
      const y = s.fromY + (s.toY - s.fromY) * ease - Math.sin(p * Math.PI) * s.arc;
      const scale = 1 - 0.35 * ease;
      ctx.save(); ctx.translate(x, y); ctx.rotate(s.rot + s.rotSpeed * s.t); ctx.scale(scale, scale);
      drawStar(0, 0, s.size);
      ctx.restore();
    }
  }
}

function drawStar(cx, cy, r) {
  ctx.save();
  ctx.fillStyle = '#ffc53a'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2, a2 = a1 + Math.PI / 5;
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const x2 = cx + Math.cos(a2) * r * 0.42, y2 = cy + Math.sin(a2) * r * 0.42;
    if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

export { StarField, drawStar };
