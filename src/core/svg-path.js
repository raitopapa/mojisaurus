// core/svg-path.js — 依存ゼロの軽量SVGパス(d属性)パーサ＆等間隔サンプラ。
// DOMのSVG要素やgetPointAtLengthに依存しない自前実装＝ブラウザ/Node(テスト)で同一動作。
// 対応コマンド: M/m L/l C/c Q/q Z/z（KanjiVG由来のなぞりデータに十分な範囲）。

function parsePathD(d) {
  const toks = String(d).match(/[MLCQZmlcqz]|-?\d*\.\d+(?:e-?\d+)?|-?\d+(?:e-?\d+)?/g) || [];
  const commands = [];
  let i = 0, cmd = null;
  const nums = (n) => { const out = []; for (let k = 0; k < n; k++) out.push(parseFloat(toks[i++])); return out; };
  while (i < toks.length) {
    if (/^[MLCQZmlcqz]$/.test(toks[i])) { cmd = toks[i]; i++; }
    if (cmd == null) { i++; continue; }
    switch (cmd) {
      case 'M': case 'm': { const [x, y] = nums(2); commands.push({ t: 'M', x, y, rel: cmd === 'm' }); cmd = (cmd === 'M') ? 'L' : 'l'; break; }
      case 'L': case 'l': { const [x, y] = nums(2); commands.push({ t: 'L', x, y, rel: cmd === 'l' }); break; }
      case 'C': case 'c': { const [x1, y1, x2, y2, x, y] = nums(6); commands.push({ t: 'C', x1, y1, x2, y2, x, y, rel: cmd === 'c' }); break; }
      case 'Q': case 'q': { const [x1, y1, x, y] = nums(4); commands.push({ t: 'Q', x1, y1, x, y, rel: cmd === 'q' }); break; }
      case 'Z': case 'z': { commands.push({ t: 'Z' }); break; }
      default: i++;
    }
  }
  return commands;
}

// 三次/二次ベジェを線分列へ分割し、稠密なポリラインにする。
function flattenCommands(commands, segments = 24) {
  const pts = []; let cx = 0, cy = 0, sx = 0, sy = 0;
  const push = (x, y) => pts.push({ x, y });
  for (const c of commands) {
    if (c.t === 'M') { const x = c.rel ? cx + c.x : c.x, y = c.rel ? cy + c.y : c.y; cx = x; cy = y; sx = x; sy = y; push(x, y); }
    else if (c.t === 'L') { const x = c.rel ? cx + c.x : c.x, y = c.rel ? cy + c.y : c.y; push(x, y); cx = x; cy = y; }
    else if (c.t === 'C') {
      const x1 = c.rel ? cx + c.x1 : c.x1, y1 = c.rel ? cy + c.y1 : c.y1;
      const x2 = c.rel ? cx + c.x2 : c.x2, y2 = c.rel ? cy + c.y2 : c.y2;
      const x = c.rel ? cx + c.x : c.x, y = c.rel ? cy + c.y : c.y;
      for (let s = 1; s <= segments; s++) {
        const t = s / segments, mt = 1 - t;
        push(mt * mt * mt * cx + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x,
             mt * mt * mt * cy + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y);
      }
      cx = x; cy = y;
    } else if (c.t === 'Q') {
      const x1 = c.rel ? cx + c.x1 : c.x1, y1 = c.rel ? cy + c.y1 : c.y1;
      const x = c.rel ? cx + c.x : c.x, y = c.rel ? cy + c.y : c.y;
      for (let s = 1; s <= segments; s++) {
        const t = s / segments, mt = 1 - t;
        push(mt * mt * cx + 2 * mt * t * x1 + t * t * x, mt * mt * cy + 2 * mt * t * y1 + t * t * y);
      }
      cx = x; cy = y;
    } else if (c.t === 'Z') { push(sx, sy); cx = sx; cy = sy; }
  }
  return pts;
}

function withLengths(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, acc, total: acc[acc.length - 1] || 0 };
}

function pointAtLength(poly, len) {
  const { pts, acc, total } = poly;
  if (!pts.length) return { x: 0, y: 0 };
  if (total <= 0) return { x: pts[0].x, y: pts[0].y };
  len = Math.max(0, Math.min(total, len));
  let i = 1; while (i < acc.length && acc[i] < len) i++;
  const i0 = Math.max(0, i - 1), i1 = Math.min(pts.length - 1, i);
  const segLen = acc[i1] - acc[i0] || 1, t = (len - acc[i0]) / segLen;
  return { x: pts[i0].x + (pts[i1].x - pts[i0].x) * t, y: pts[i0].y + (pts[i1].y - pts[i0].y) * t };
}

// d文字列 → { points, length, poly } を返す。points は約 spacing px 間隔の等間隔点列（なぞり判定用）。
function samplePath(d, spacing = 8, curveSegments = 24) {
  const poly = withLengths(flattenCommands(parsePathD(d), curveSegments));
  const n = Math.max(2, Math.round(poly.total / spacing));
  const points = []; for (let i = 0; i <= n; i++) points.push(pointAtLength(poly, (i / n) * poly.total));
  return { points, length: poly.total, poly };
}

function parseViewBox(vb, fallback = 100) {
  const m = String(vb || '').trim().split(/\s+/).map(Number);
  if (m.length === 4 && m.every(n => !isNaN(n))) return { w: m[2], h: m[3] };
  return { w: fallback, h: fallback };
}

export { parsePathD, flattenCommands, withLengths, pointAtLength, samplePath, parseViewBox };
