// games/g2-maze.js — 【G2】もじめいろ。ことば（2〜4文字）の字を分岐で1つずつ集めながらゴールを目指す。
// ・分岐ごとに「正しい形」vs「まちがい形（鏡文字 or にてる別の字）」。正しい方だけが先へ続く。
// ・正解ルートの字をつなぐと1つの ことば になり、ゴールで絵カード（絵文字＋単語）を披露＆読み上げ。
// ・迷路の形は毎回ランダム生成（分岐位置・上下・曲がり・袋小路の向きにジッター）＝同じパターンにならない。
// ・道はエッジグラフ（E0→F1→C1→…→Cn→GOAL、各Fkにハズレ Wk）。カーソルはW1同様の寛容な窓式追従。
import { GameBase } from './game-base.js';
import { view, ctx, label, rrPath, drawGao } from '../core/canvas.js';
import { parsePathD, flattenCommands, parseViewBox } from '../core/svg-path.js';
import { KANA_DATA } from '../data/kana-data.js';
import { HIRA_CONFUSE } from '../data/confusables.js';
import { VOCAB_HIRA } from '../data/vocab-words.js';

const R = 30;                 // 追従許容半径
const CORRIDOR = 40;          // 道の太さ

function densify(pts, spacing = 10) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.round(d / spacing));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
  }
  return out;
}

const rr = (a, b) => a + Math.random() * (b - a);
const SMALLS = /[っゃゅょ]/;

// お題の ことば：2〜4文字・基本かなのみ（迷路の分岐数＝文字数になる）
function pickWord() {
  const cands = VOCAB_HIRA.filter(x => x.w.length >= 2 && x.w.length <= 4 && /^[ぁ-ん]+$/.test(x.w) && !SMALLS.test(x.w));
  return cands[Math.floor(Math.random() * cands.length)];
}

// 迷路の形を毎回ランダム生成。バンド y∈[0.30,0.86]、x∈[0.07,0.90]。
// 分岐Fkから：正解枝Ck＝縦（ジッター付きレーンへ）→横で次のFk+1（最終はGOAL）、ハズレWk＝逆側レーンへ落ちて袋小路。
function buildGeometry(W, H, forks) {
  const yMin = 0.30, yMax = 0.86;
  const clampY = (v) => Math.max(yMin, Math.min(yMax, v));
  const P = (x, y) => ({ x: W * x, y: H * y });
  const edges = [];
  const forkMap = {};
  const forkOrder = [];

  const x0 = rr(0.06, 0.09);
  let fy = rr(0.45, 0.70);                       // スタートの高さもランダム
  let fx = rr(0.19, 0.24);
  edges.push({ id: 'E0', from: 'S', to: 'F1', pts: [P(x0, fy), P((x0 + fx) / 2, clampY(fy + rr(-0.06, 0.06))), P(fx, fy)] });

  const stepX = (0.90 - fx) / forks;               // 残り幅を分岐数で分割
  for (let k = 1; k <= forks; k++) {
    const fid = `F${k}`;
    forkOrder.push(fid);
    const dir = Math.random() < 0.5 ? -1 : 1;      // 正解が上か下かは毎回ランダム
    const laneC = clampY(fy + dir * rr(0.20, 0.30));
    const laneW = clampY(fy - dir * rr(0.18, 0.28));
    const nx = Math.min(0.90, fx + stepX * rr(0.85, 1.05));
    const isLast = k === forks;
    // 正解枝：縦→横（最後の分岐はGOALへ、途中に軽いジッター曲げ）
    const cPts = [P(fx, fy), P(fx, laneC)];
    if (!isLast) {
      if (Math.random() < 0.5) cPts.push(P((fx + nx) / 2, clampY(laneC + rr(-0.05, 0.05))));
      cPts.push(P(nx, laneC));
    } else {
      cPts.push(P(rr(0.86, 0.90), laneC));
    }
    edges.push({ id: `C${k}`, from: fid, to: isLast ? 'G' : `F${k + 1}`, pts: cPts, correct: true });
    // ハズレ枝：逆レーンに落ちて短い袋小路（尻尾の向きもランダム）
    const tail = rr(0.05, 0.09) * (Math.random() < 0.5 ? 1 : -1);
    edges.push({ id: `W${k}`, from: fid, to: `D${k}`, pts: [P(fx, fy), P(fx, laneW), P(Math.min(0.9, Math.max(0.08, fx + Math.abs(tail))), clampY(laneW + tail * 0.5))], correct: false });
    forkMap[fid] = { correct: `C${k}`, wrong: `W${k}` };
    fx = nx; fy = laneC;
  }
  return { edges: edges.map(e => ({ ...e, pts: densify(e.pts) })), forks: forkMap, forkOrder };
}

// ことばの各文字 → 分岐のお題（まちがい形は 50% 鏡文字／にてる字があれば 50% でそれ）
function targetsFromWord(word) {
  return [...word].map(kana => {
    const conf = HIRA_CONFUSE[kana];
    const useMirror = Math.random() < 0.5 || !conf;
    return { kana, pool: 'hiragana', wrongKind: useMirror ? 'mirror' : 'confuse', wrongKana: useMirror ? kana : conf };
  });
}

// KanjiVGストロークから字をミニ描画。mirror=true で左右反転（x' = vbW - x）。
function drawKana(kana, pool, cx, cy, size, mirror, color) {
  const data = KANA_DATA[pool].characters[kana];
  if (!data) return;
  const { w: vw, h: vh } = parseViewBox(KANA_DATA.viewBox, 109);
  const scale = size / Math.max(vw, vh);
  const ox = cx - (vw * scale) / 2, oy = cy - (vh * scale) / 2;
  ctx.save(); ctx.strokeStyle = color || '#2b3a67'; ctx.lineWidth = Math.max(3, size * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const d of data.strokes) {
    const flat = flattenCommands(parsePathD(d), 18).map(p => ({ x: ox + (mirror ? (vw - p.x) : p.x) * scale, y: oy + p.y * scale }));
    ctx.beginPath(); ctx.moveTo(flat[0].x, flat[0].y);
    for (const p of flat.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.restore();
}

class G2Maze extends GameBase {
  init(ctx2, services) {
    this.services = services || {};
    this.word = pickWord();                             // 正解ルートで完成する ことば
    this.targets = targetsFromWord(this.word.w);        // forkOrder に対応（分岐数＝文字数）
    this.geo = buildGeometry(view.w, view.h, this.targets.length);
    this.collected = [];                                // 集めた字
    this.pos = { kind: 'edge', edgeId: 'E0', idx: 0 };  // kind: edge | fork
    this.progress = {};                                 // edgeId → 最深到達idx
    this.forksPassed = 0; this.mistakes = 0; this.itemsPracticed = [];
    this.done = false; this.tracing = false;
    this._announcedFork = null; this._msg = null; this._goalT = 0;
    this._speak('もじを あつめて ゴールを めざそう！');
  }

  _speak(t, o) { const s = this.services.speech; if (s && s.speak) s.speak(t, o); }
  _sfx(n) { const a = this.services.audio; if (a && typeof a[n] === 'function') a[n](); }
  _edge(id) { return this.geo.edges.find(e => e.id === id); }
  _forkTarget(forkId) { return this.targets[this.geo.forkOrder.indexOf(forkId)]; }

  update(dt) {
    if (this._msg) { this._msg.t += dt; if (this._msg.t > 1.6) this._msg = null; }
    if (this.done) this._goalT += dt;
  }

  _announce(forkId) {
    if (this._announcedFork === forkId) return;
    this._announcedFork = forkId;
    const t = this._forkTarget(forkId);
    this._speak(`つぎは 「${t.kana}」 だよ！`);
  }

  onPointerDown(x, y) { this.tracing = true; this._advance(x, y); }
  onPointerMove(x, y) { if (this.tracing) this._advance(x, y); }
  onPointerUp() { this.tracing = false; }

  _advance(x, y) {
    if (this.done) return;
    if (this.pos.kind === 'fork') {
      // 両枝の入口候補（各枝の先頭1〜3点）から「指に最も近い点」を選ぶ。
      // 固定順で判定すると分岐直後の重なり領域で意図しない枝に吸い付くため、必ず最近傍で決める。
      const fk = this.geo.forks[this.pos.forkId];
      let best = null;
      for (const eid of [fk.correct, fk.wrong]) {
        const e = this._edge(eid);
        for (let k = 1; k <= 3 && k < e.pts.length; k++) {
          const d = Math.hypot(x - e.pts[k].x, y - e.pts[k].y);
          if (d <= R && (!best || d < best.d)) best = { eid, k, d };
        }
      }
      if (best) {
        this.pos = { kind: 'edge', edgeId: best.eid, idx: best.k };
        this.progress[best.eid] = Math.max(this.progress[best.eid] || 0, best.k);
      }
      return;
    }
    const e = this._edge(this.pos.edgeId);
    // 窓式カーソル：現在idxの前後K点で指に最も近い点へ（前進も後退も自然・振動しない）
    const K = 4;
    let bestK = this.pos.idx, bestD = Infinity;
    for (let k = Math.max(0, this.pos.idx - K); k <= Math.min(e.pts.length - 1, this.pos.idx + K); k++) {
      const d = Math.hypot(x - e.pts[k].x, y - e.pts[k].y);
      if (d < bestD) { bestD = d; bestK = k; }
    }
    if (bestD <= R) this.pos.idx = bestK;
    this.progress[e.id] = Math.max(this.progress[e.id] || 0, this.pos.idx);

    if (this.pos.idx <= 0 && e.from.startsWith('F')) {
      this.pos = { kind: 'fork', forkId: e.from };
      return;
    }
    if (this.pos.idx >= e.pts.length - 1) {
      if (e.to === 'G') {
        if (e.correct) { this.forksPassed++; const t = this._forkTarget(e.from); this.collected.push(t.kana); this.itemsPracticed.push(t.kana); }
        this.done = true; this._sfx('sfxSparkle');
        this._speak(`ゴール！ ${this.word.w}、かんせい！`);
        return;
      }
      if (e.to.startsWith('F')) {
        if (e.correct) {
          this.forksPassed++;
          const t = this._forkTarget(e.from);
          this.collected.push(t.kana); this.itemsPracticed.push(t.kana);
          this._sfx('sfxCorrect');
          this._speak(`「${t.kana}」 げっと！`, { interrupt: false });
        }
        this.pos = { kind: 'fork', forkId: e.to };
        this._announce(e.to);
        return;
      }
      if (e.to.startsWith('D')) {
        this.mistakes++;
        this._sfx('sfxWrong');
        this._msg = { text: 'あれれ、こっちは ちがう じ！', t: 0 };
        this._speak('あれれ、ちがう じ だ！ もどろう');
        this.pos = { kind: 'fork', forkId: e.from };
        return;
      }
    }
  }

  _labelPosFor(edgeId) {
    const e = this._edge(edgeId);
    const p = e.pts[Math.min(8, e.pts.length - 1)];
    const p0 = e.pts[0];
    const dx = p.x - p0.x, dy = p.y - p0.y, len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * 22, y: p.y + (dy / len) * 22 };
  }

  render() {
    const W = view.w, H = view.h;
    // 道（下地→通過分）
    for (const e of this.geo.edges) {
      ctx.save(); ctx.strokeStyle = '#f5efdf'; ctx.lineWidth = CORRIDOR; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      this._poly(e.pts); ctx.stroke();
      ctx.strokeStyle = 'rgba(140,120,80,0.35)'; ctx.lineWidth = CORRIDOR + 6; ctx.globalCompositeOperation = 'destination-over';
      this._poly(e.pts); ctx.stroke();
      ctx.restore();
    }
    for (const e of this.geo.edges) {
      const upto = this.progress[e.id] || 0;
      if (upto > 0) {
        ctx.save(); ctx.strokeStyle = e.correct === false ? 'rgba(230,120,110,0.55)' : 'rgba(87,192,106,0.75)';
        ctx.lineWidth = CORRIDOR * 0.55; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        this._poly(e.pts.slice(0, upto + 1)); ctx.stroke(); ctx.restore();
      }
    }
    // スタート/ゴール
    const s0 = this._edge('E0').pts[0];
    label('🐣', s0.x - 26, s0.y, { size: 30 });
    const gEdge = this._edge(`C${this.targets.length}`); const gp = gEdge.pts[gEdge.pts.length - 1];
    label('🥚', gp.x + 24, gp.y, { size: 32 });
    label('ゴール', gp.x + 24, gp.y + 28, { size: 13, color: '#2b3a67', weight: 700 });
    // 分岐の字（正しい形＝正解エッジ側、まちがい形＝ハズレ側）
    this.geo.forkOrder.forEach((fid, i) => {
      const t = this.targets[i];
      const fk = this.geo.forks[fid];
      const cp = this._labelPosFor(fk.correct);
      const wp = this._labelPosFor(fk.wrong);
      const size = Math.min(W, H) * 0.105;
      this._badge(cp.x, cp.y, size);
      drawKana(t.kana, t.pool, cp.x, cp.y, size * 0.72, false, '#2b3a67');
      this._badge(wp.x, wp.y, size);
      if (t.wrongKind === 'mirror') drawKana(t.kana, t.pool, wp.x, wp.y, size * 0.72, true, '#2b3a67');
      else drawKana(t.wrongKana, t.pool, wp.x, wp.y, size * 0.72, false, '#2b3a67');
    });
    // 現在地カーソル
    const cur = this._curPoint();
    ctx.save(); ctx.fillStyle = 'rgba(255,197,58,0.95)'; ctx.beginPath(); ctx.arc(cur.x, cur.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    // 上部：お題＋あつめた字（？ボックス）
    if (!this.done) {
      const fid = this.pos.kind === 'fork' ? this.pos.forkId : this._nextForkAhead();
      if (fid) {
        const t = this._forkTarget(fid);
        label(`つぎは 「${t.kana}」！`, W / 2, H * 0.115, { size: Math.min(W * 0.042, 24), color: '#2b3a67', weight: 800 });
      }
    }
    this._renderCollected(W, H);
    if (this._msg) {
      const a = Math.max(0, 1 - this._msg.t / 1.6);
      label(this._msg.text, W / 2, H * 0.245, { size: 19, color: `rgba(200,70,60,${a.toFixed(2)})`, weight: 800 });
    }
    // ゴール演出：ことばの絵カード
    if (this.done) this._renderGoalCard(W, H);
  }

  _renderCollected(W, H) {
    // 「あつめた じ」ボックス列：未取得は ？
    const n = this.targets.length;
    const s = Math.min(W * 0.055, H * 0.075, 34);
    const gap = s * 0.25;
    const total = n * s + (n - 1) * gap;
    let x = (W - total) / 2;                          // 上部中央（お題の直下・通路帯 y≥0.30H と被らない）
    const y = H * 0.165;
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.strokeStyle = i < this.collected.length ? '#57c06a' : '#c9d5ea'; ctx.lineWidth = 3;
      rrPath(x, y, s, s, 8); ctx.fill(); ctx.stroke(); ctx.restore();
      label(i < this.collected.length ? this.collected[i] : '？', x + s / 2, y + s / 2, { size: s * 0.6, color: i < this.collected.length ? '#2b3a67' : '#a6b2c8', weight: 800 });
      x += s + gap;
    }
  }

  _renderGoalCard(W, H) {
    const t = Math.min(1, this._goalT / 0.35);
    const ease = 1 - Math.pow(1 - t, 3);
    ctx.save(); ctx.fillStyle = `rgba(255,255,255,${(0.55 * ease).toFixed(2)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    const bw = Math.min(W * 0.6, 420) * (0.7 + 0.3 * ease), bh = Math.min(H * 0.52, 300) * (0.7 + 0.3 * ease);
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    ctx.save(); ctx.globalAlpha = ease;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#57c06a'; ctx.lineWidth = 5;
    rrPath(bx, by, bw, bh, 24); ctx.fill(); ctx.stroke();
    label(this.word.e, W / 2, by + bh * 0.34, { size: bh * 0.34 });
    label(this.word.w, W / 2, by + bh * 0.66, { size: Math.min(bh * 0.17, bw * 0.9 / Math.max(2, this.word.w.length)), color: '#2b3a67', weight: 800 });
    label('もじを つないだら できた！ 🎉', W / 2, by + bh * 0.86, { size: Math.min(bh * 0.075, 17), color: '#2b3a67', weight: 700 });
    ctx.restore();
    drawGao(bx + bw * 0.06, by - 8, Math.min(W * 0.05, 38), 'happy');
  }

  _nextForkAhead() {
    if (this.pos.kind !== 'edge') return null;
    const e = this._edge(this.pos.edgeId);
    return e.to.startsWith('F') ? e.to : null;
  }
  _badge(cx, cy, size) {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = '#c9d5ea'; ctx.lineWidth = 3;
    rrPath(cx - size / 2, cy - size / 2, size, size, 14); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  _poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y); }
  _curPoint() {
    if (this.pos.kind === 'fork') { const fk = this.geo.forks[this.pos.forkId]; return this._edge(fk.correct).pts[0]; }
    const e = this._edge(this.pos.edgeId); return e.pts[Math.min(this.pos.idx, e.pts.length - 1)];
  }

  isComplete() { return this.done; }
  getResult() { return { correctCount: this.forksPassed, mistakes: this.mistakes, itemsPracticed: this.itemsPracticed }; }
  dispose() {}
}

export { G2Maze };
