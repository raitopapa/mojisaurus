// core/canvas.js — Canvas と ctx の保持、リサイズ、client→内部座標変換、共通描画ヘルパ。
// 内部座標 = CSS px（等倍）。ctx を dpr スケールして描画は常に CSS px で行う＝タップずれ防止（仕様§13）。
import { COLORS } from './constants.js';

const FONT = "'Baloo 2','Hiragino Maru Gothic ProN','Yu Gothic UI','M PLUS Rounded 1c',sans-serif";

const canvasEl = document.getElementById('game');
const ctx = canvasEl.getContext('2d');
const stageEl = document.getElementById('stage') || (canvasEl.parentElement || canvasEl);

const view = { w: 960, h: 540, dpr: 1 };

function resize() {
  const cssW = stageEl.clientWidth || canvasEl.clientWidth || 960;
  const cssH = stageEl.clientHeight || canvasEl.clientHeight || 540;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasEl.width = Math.max(1, Math.round(cssW * dpr));
  canvasEl.height = Math.max(1, Math.round(cssH * dpr));
  view.w = cssW; view.h = cssH; view.dpr = dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // 以降 CSS px で描ける
  ctx.imageSmoothingEnabled = true;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
if (window.ResizeObserver) { try { new ResizeObserver(resize).observe(stageEl); } catch (_) {} }

// client 座標 → 内部座標（CSS px）。rect と view のズレも吸収。
function toInternal(clientX, clientY) {
  const r = canvasEl.getBoundingClientRect();
  const sx = view.w / (r.width || view.w || 1);
  const sy = view.h / (r.height || view.h || 1);
  return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
}

// ---- 描画ヘルパ ----
function rrPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function label(txt, x, y, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 800} ${o.size || 28}px ${FONT}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.baseline || 'middle';
  if (o.shadow) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillText(txt, x + (o.shadow), y + (o.shadow)); }
  ctx.fillStyle = o.color || COLORS.ink;
  ctx.fillText(txt, x, y);
  ctx.restore();
}

// 実測テキスト幅（label と同一フォント設定で measureText）。フォント差・端末差に依存しないレイアウト用。
function textWidth(txt, size, weight) {
  ctx.save();
  ctx.font = `${weight || 800} ${size || 28}px ${FONT}`;
  const w = ctx.measureText(txt).width;
  ctx.restore();
  return w;
}

// ふんわり角丸ボタン（押下時 pressed で少し沈む）
function pill(rect, o = {}) {
  const p = o.pressed ? 3 : 0;
  const x = rect.x, y = rect.y + p, w = rect.w, h = rect.h, r = o.radius ?? Math.min(w, h) * 0.32;
  ctx.save();
  if (!o.pressed) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; rrPath(x, y + 6, w, h, r); ctx.fill(); }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, o.top || '#ffffff'); g.addColorStop(1, o.fill || '#dddddd');
  ctx.fillStyle = g; rrPath(x, y, w, h, r); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.65)'; rrPath(x + 2, y + 2, w - 4, h - 4, r - 2); ctx.stroke();
  ctx.restore();
  if (o.label) label(o.label, x + w / 2, y + h / 2, { size: o.labelSize || 30, color: o.labelColor || '#ffffff', shadow: 1.5 });
}

// 背景（空→地面）。もじのしまの明るい配色。
function fillBg() {
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, COLORS.skyTop); g.addColorStop(1, COLORS.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
  const gh = Math.min(view.h * 0.22, 150), gy = view.h - gh;
  const gg = ctx.createLinearGradient(0, gy, 0, view.h);
  gg.addColorStop(0, COLORS.grass); gg.addColorStop(1, COLORS.grassDark);
  ctx.fillStyle = gg; ctx.fillRect(0, gy, view.w, gh);
}

// ナビキャラ「ガオ」の暫定描画（差し替え可・本デザインはアセット/ui でBatch2）
function drawGao(x, y, size, mood = 'normal') {
  const s = size;
  ctx.save();
  // からだ
  const bg = ctx.createRadialGradient(x, y - s * 0.15, s * 0.2, x, y, s);
  bg.addColorStop(0, COLORS.gao); bg.addColorStop(1, COLORS.gaoDark);
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(x, y, s * 0.9, s, 0, 0, Math.PI * 2); ctx.fill();
  // せなかのトゲ（三角3つ）
  ctx.fillStyle = COLORS.gaoDark;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); const bx = x + i * s * 0.42, by = y - s * 0.86; ctx.moveTo(bx - s * 0.14, by + s * 0.16); ctx.lineTo(bx, by - s * 0.18); ctx.lineTo(bx + s * 0.14, by + s * 0.16); ctx.closePath(); ctx.fill(); }
  // おなか
  ctx.fillStyle = COLORS.gaoBelly; ctx.beginPath(); ctx.ellipse(x, y + s * 0.2, s * 0.5, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  // め
  const eo = mood === 'cheer' ? s * 0.06 : 0;
  for (const dx of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + dx * s * 0.34, y - s * 0.3, s * 0.2, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.ink; ctx.beginPath(); ctx.ellipse(x + dx * s * 0.34, y - s * 0.26 - eo, s * 0.1, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  }
  // ほっぺ
  ctx.fillStyle = 'rgba(255,120,120,0.5)';
  for (const dx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + dx * s * 0.55, y - s * 0.05, s * 0.13, s * 0.09, 0, 0, Math.PI * 2); ctx.fill(); }
  // くち（にっこり）
  ctx.strokeStyle = COLORS.ink; ctx.lineWidth = Math.max(2, s * 0.045); ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'happy' || mood === 'cheer') ctx.arc(x, y - s * 0.02, s * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
  else ctx.arc(x, y + s * 0.02, s * 0.16, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

export { FONT, canvasEl, ctx, stageEl, view, resize, toInternal, rrPath, label, textWidth, pill, fillBg, drawGao };
